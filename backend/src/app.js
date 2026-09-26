import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { bulkImportSchema } from "./schemas/bulk-import.js";
import { authMiddleware, roleGuard } from "./services/auth.js";

const MAX_JSON_SIZE = "1mb";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function sanitizedText(maxLength) {
  return z
    .string()
    .trim()
    .min(1)
    .max(maxLength)
    .transform((value) => value.replace(/[<>]/g, ""));
}

function optionalSanitizedText(maxLength) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .transform((value) => value.replace(/[<>]/g, ""))
    .optional()
    .or(z.literal(""));
}

const loginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
});

const productSchema = z.object({
  name: sanitizedText(200),
  sku: z.string().trim().min(1).max(100),
  categoryId: z.string().trim().min(1).max(100),
  availableBranches: z.array(z.string().trim().min(1).max(100)).optional(),
  quantity: z.number().int().min(0),
  mrp: z.number().min(0).max(1_000_000),
  minStock: z.number().int().min(0).max(1_000_000),
  monthsInInventory: z.number().int().min(0).max(1_000_000).optional(),
  monthlyInterest: z.number().min(0).max(100),
  previousQuantity: z.number().int().min(0).max(1_000_000),
  paidAmount: z.number().min(0).max(1_000_000),
  status: z.enum(["in-stock", "low-stock", "out-of-stock", "discontinued"]),
  description: optionalSanitizedText(500),
  image: z.string().trim().url().optional().or(z.literal("")),
});

const movementSchema = z.object({
  productId: z.string().trim().min(1).max(100),
  type: z.enum(["in", "out", "adjustment", "transfer"]),
  quantity: z.number().int().min(1).max(1_000_000),
  reason: sanitizedText(200),
  location: optionalSanitizedText(200),
  reference: optionalSanitizedText(200),
});

const orderRequestSchema = z.object({
  customerName: sanitizedText(200),
  customerEmail: z.string().trim().email().max(320),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1).max(100),
        productName: sanitizedText(200),
        quantity: z.number().int().positive().max(1_000_000),
      })
    )
    .min(1)
    .max(100),
});

const orderStatusSchema = z.enum(["approved", "rejected"]);

const userSchema = z.object({
  name: sanitizedText(200),
  username: z.string().trim().min(1).max(100),
  password: z.string().trim().min(1).max(200),
  role: z.enum(["admin", "manager", "executive"]),
});

const userUpdateSchema = z
  .object({
    name: sanitizedText(200).optional(),
    username: z.string().trim().min(1).max(100).optional(),
    password: z.string().trim().min(1).max(200).optional(),
    role: z.enum(["admin", "manager", "executive"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

function getSecurityConfig(overrides = {}) {
  const allowedOrigins = overrides.allowedOrigins ?? process.env.CORS_ORIGIN?.split(",").map((value) => value.trim()).filter(Boolean) ?? [];

  return {
    allowedOrigins,
    cookieSecure: overrides.cookieSecure ?? process.env.NODE_ENV === "production",
    trustProxy: overrides.trustProxy ?? process.env.NODE_ENV === "production",
    loginRateLimitWindowMs: overrides.loginRateLimitWindowMs ?? 15 * 60 * 1000,
    loginRateLimitMax: overrides.loginRateLimitMax ?? 10,
  };
}

function createCorsOptions(security) {
  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (security.allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  };
}

function createCsrfToken() {
  return crypto.randomBytes(24).toString("hex");
}

function attachSessionCookies(res, session, security) {
  const csrfToken = session.csrfToken ?? createCsrfToken();

  res.cookie("token", session.token, {
    httpOnly: true,
    secure: security.cookieSecure,
    sameSite: "strict",
    path: "/",
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.cookie("csrf-token", csrfToken, {
    httpOnly: false,
    secure: security.cookieSecure,
    sameSite: "strict",
    path: "/",
    maxAge: 24 * 60 * 60 * 1000,
  });

  return csrfToken;
}

function requiresCsrfProtection(req) {
  return MUTATING_METHODS.has(req.method) && !req.path.startsWith("/auth/");
}

function csrfProtection(req, res, next) {
  if (!requiresCsrfProtection(req)) {
    next();
    return;
  }

  const cookieToken = req.cookies?.["csrf-token"];
  const headerToken = req.get("x-csrf-token");
  const sessionToken = req.session?.csrfToken;
  const expectedToken = sessionToken ?? cookieToken;

  if (!expectedToken || !headerToken || headerToken !== expectedToken) {
    res.status(403).json({ message: "Invalid CSRF token" });
    return;
  }

  next();
}

function sanitizeServerError(res, error, context = "Unhandled server error") {
  if (error instanceof z.ZodError) {
    res.status(400).json({ message: "Invalid request", issues: error.issues });
    return;
  }

  if (error instanceof Error && error.message === "Admin users cannot be deleted") {
    res.status(400).json({ message: error.message });
    return;
  }

  console.error(context, error);
  res.status(500).json({ message: "Internal server error" });
}

function withSession(auth, handler) {
  return [
    authMiddleware(auth),
    (req, _res, next) => {
      const csrfToken = req.cookies?.["csrf-token"] ?? req.headers["x-csrf-token"];
      req.session = {
        user: req.user,
        csrfToken,
      };
      next();
    },
    handler,
  ];
}

export function createApp(dependencies) {
  const { health, auth, inventory, security: securityOverrides } = dependencies;
  const security = getSecurityConfig(securityOverrides);
  const app = express();

  if (security.trustProxy) {
    app.set("trust proxy", 1);
  }

  app.disable("x-powered-by");
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "same-site" },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          connectSrc: ["'self'", ...security.allowedOrigins],
        },
      },
      hsts: security.cookieSecure
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
    })
  );
  app.use(cookieParser());
  app.use(cors(createCorsOptions(security)));
  app.use(express.json({ limit: MAX_JSON_SIZE }));

  const loginLimiter = rateLimit({
    windowMs: security.loginRateLimitWindowMs,
    max: security.loginRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many login attempts, please try again later" },
  });

  app.get("/health", async (_req, res) => {
    try {
      const result = await health();
      res.status(200).json(result);
    } catch {
      res.status(500).json({ message: "Health check failed" });
    }
  });

  app.post("/auth/login", loginLimiter, async (req, res) => {
    try {
      const input = loginSchema.parse(req.body);
      const session = await auth.login(input);

      if (!session) {
        res.status(401).json({ message: "Invalid username or password" });
        return;
      }

      const csrfToken = attachSessionCookies(res, session, security);

      res.status(200).json({
        user: session.user,
        token: session.token,
        csrfToken,
      });
    } catch (error) {
      sanitizeServerError(res, error);
    }
  });

  app.post("/auth/logout", authMiddleware(auth), (req, res) => {
    res.clearCookie("token", { path: "/", sameSite: "strict", secure: security.cookieSecure, httpOnly: true });
    res.clearCookie("csrf-token", { path: "/", sameSite: "strict", secure: security.cookieSecure });
    res.status(204).send();
  });

  app.get("/auth/session", async (req, res) => {
    try {
      const token = req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");
      const session = await auth.getSession(token);
      const csrfToken = req.cookies?.["csrf-token"] ?? createCsrfToken();

      res.cookie("csrf-token", csrfToken, {
        httpOnly: false,
        secure: security.cookieSecure,
        sameSite: "strict",
        path: "/",
        maxAge: 24 * 60 * 60 * 1000,
      });

      if (!session) {
        res.status(401).json({ message: "Session not found" });
        return;
      }

      res.status(200).json({
        ...session,
        csrfToken,
      });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/products", async (req, res) => {
    try {
      const products = await inventory.listProducts(req.query);
      const normalizedProducts = products.map((product) => ({
        ...product,
        availableBranches:
          product.availableBranches ??
          (Array.isArray(product.branches)
            ? product.branches.map((branch) => branch?.name ?? branch?.branch?.name ?? branch)
            : []),
      }));
      res.status(200).json({ products: normalizedProducts });
    } catch (error) {
      sanitizeServerError(res, error, "GET /products failed");
    }
  });

  app.get("/categories", async (_req, res) => {
    try {
      const categories = await inventory.listCategories();
      res.status(200).json({ categories });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(
    "/categories/gst",
    ...withSession(auth, (_req, _res, next) => {
      next();
    }),
    roleGuard("admin"),
    csrfProtection,
    async (req, res) => {
      try {
        console.log(`[${new Date().toISOString()}] PATCH /categories/gst received`, {
          body: req.body,
        });
        const gstPercent = Number(req.body?.gstPercent);
        if (Number.isNaN(gstPercent) || gstPercent < 0) {
          res.status(400).json({ message: "GST percentage must be 0 or greater" });
          return;
        }

        console.log(`[${new Date().toISOString()}] PATCH /categories/gst updating categories`, {
          gstPercent,
        });
        const categories = await inventory.updateAllCategoriesGst(gstPercent);
        console.log(`[${new Date().toISOString()}] PATCH /categories/gst success`, {
          updatedCount: categories.length,
        });
        res.status(200).json({ categories });
      } catch (error) {
        sanitizeServerError(res, error, "PATCH /categories/gst failed");
      }
    }
  );

  app.get(
    "/users",
    ...withSession(auth, (_req, _res, next) => {
      next();
    }),
    roleGuard("admin"),
    async (_req, res) => {
      try {
        const users = await inventory.listUsers();
        res.status(200).json({ users });
      } catch (error) {
        sanitizeServerError(res, error, "GET /users failed");
      }
    }
  );

  app.post(
    "/users",
    ...withSession(auth, (_req, _res, next) => {
      next();
    }),
    roleGuard("admin"),
    csrfProtection,
    async (req, res) => {
      try {
        const data = userSchema.parse(req.body);
        const user = await inventory.createUser(data);
        res.status(201).json({ user });
      } catch (error) {
        if (error instanceof Error && error.message === "Username already exists") {
          res.status(409).json({ message: error.message });
          return;
        }

        sanitizeServerError(res, error, "POST /users failed");
      }
    }
  );

  app.patch(
    "/users/:id",
    ...withSession(auth, (_req, _res, next) => {
      next();
    }),
    roleGuard("admin"),
    csrfProtection,
    async (req, res) => {
      try {
        const data = userUpdateSchema.parse(req.body);
        const user = await inventory.updateUser(req.params.id, data);
        res.status(200).json(user);
      } catch (error) {
        if (error instanceof Error && error.message === "Username already exists") {
          res.status(409).json({ message: error.message });
          return;
        }

        sanitizeServerError(res, error, "PATCH /users/:id failed");
      }
    }
  );

  app.delete(
    "/users/:id",
    ...withSession(auth, (_req, _res, next) => {
      next();
    }),
    roleGuard("admin"),
    csrfProtection,
    async (req, res) => {
      try {
        await inventory.deleteUser(req.params.id);
        res.status(204).send();
      } catch (error) {
        sanitizeServerError(res, error, "DELETE /users/:id failed");
      }
    }
  );

  app.get("/branches", async (_req, res) => {
    try {
      const branches = await inventory.listBranches();
      res.status(200).json({ branches });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(
    "/order-requests",
    ...withSession(auth, (_req, _res, next) => {
      next();
    }),
    roleGuard("admin", "manager"),
    async (_req, res) => {
      try {
        const orders = await inventory.listOrderRequests();
        res.status(200).json({ orders });
      } catch (error) {
        sanitizeServerError(res, error, "GET /order-requests failed");
      }
    }
  );

  app.post(
    "/products/import",
    ...withSession(auth, (req, res, next) => {
      next();
    }),
    roleGuard("admin", "manager"),
    csrfProtection,
    async (req, res) => {
      try {
        const input = bulkImportSchema.parse(req.body);
        const results = await inventory.importProducts(input.rows);
        res.status(200).json(results);
      } catch (error) {
        sanitizeServerError(res, error);
      }
    }
  );

  app.post(
    "/products",
    ...withSession(auth, (req, res, next) => {
      next();
    }),
    roleGuard("admin", "manager"),
    csrfProtection,
    async (req, res) => {
      try {
        const data = productSchema.parse(req.body);
        const product = await inventory.createProduct(data);
        res.status(201).json(product);
      } catch (error) {
        sanitizeServerError(res, error);
      }
    }
  );

  app.patch(
    "/products/:id",
    ...withSession(auth, (req, res, next) => {
      next();
    }),
    roleGuard("admin", "manager"),
    csrfProtection,
    async (req, res) => {
      const timestamp = new Date().toISOString();
      try {
        const data = productSchema.partial().parse(req.body);
        console.log(`[${timestamp}] PATCH /products/${req.params.id} received`, {
          productId: req.params.id,
          sku: data.sku,
          payload: data,
        });
        const product = await inventory.updateProduct(req.params.id, data);
        const responseProduct = {
          ...product,
          availableBranches:
            product.availableBranches ??
            (Array.isArray(product.branches)
              ? product.branches.map((branch) => branch?.name ?? branch?.branch?.name ?? branch)
              : []),
        };
        console.log(`[${new Date().toISOString()}] PATCH /products/${req.params.id} success`, responseProduct);
        res.status(200).json(responseProduct);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] PATCH /products/${req.params.id} failed`, error);
        sanitizeServerError(res, error);
      }
    }
  );

  app.delete(
    "/products/:id",
    ...withSession(auth, (req, res, next) => {
      next();
    }),
    roleGuard("admin"),
    csrfProtection,
    async (req, res) => {
      try {
        await inventory.deleteProduct(req.params.id);
        res.status(204).send();
      } catch (error) {
        sanitizeServerError(res, error);
      }
    }
  );

  app.post(
    "/movements",
    ...withSession(auth, (req, res, next) => {
      next();
    }),
    roleGuard("admin", "manager"),
    csrfProtection,
    async (req, res) => {
      try {
        const data = movementSchema.parse(req.body);
        const movement = await inventory.recordMovement({
          ...data,
          userId: req.user.name,
        });
        res.status(201).json(movement);
      } catch (error) {
        sanitizeServerError(res, error);
      }
    }
  );

  app.post(
    "/order-requests",
    ...withSession(auth, (req, res, next) => {
      next();
    }),
    roleGuard("admin", "manager"),
    csrfProtection,
    async (req, res) => {
      try {
        const data = orderRequestSchema.parse(req.body);
        const order = await inventory.createOrderRequest(data);
        res.status(201).json(order);
      } catch (error) {
        sanitizeServerError(res, error);
      }
    }
  );

  app.patch(
    "/order-requests/:id",
    ...withSession(auth, (req, res, next) => {
      next();
    }),
    roleGuard("admin", "manager"),
    csrfProtection,
    async (req, res) => {
      try {
        const status = orderStatusSchema.parse(req.body.status);
        const order = await inventory.updateOrderRequest(req.params.id, status);
        res.status(200).json(order);
      } catch (error) {
        sanitizeServerError(res, error);
      }
    }
  );

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  });

  return app;
}
