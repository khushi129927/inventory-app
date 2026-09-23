import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createAuthService } from "../src/services/auth.js";

function createInventoryStub(overrides = {}) {
  return {
    listProducts: async () => [],
    listCategories: async () => [],
    listBranches: async () => [],
    listOrderRequests: async () => [],
    createOrderRequest: async (payload) => payload,
    createProduct: async (payload) => ({ id: "product-1", ...payload }),
    updateProduct: async (id, payload) => ({ id, ...payload }),
    deleteProduct: async () => undefined,
    recordMovement: async (payload) => ({ id: "movement-1", ...payload }),
    updateOrderRequest: async (id, status) => ({ id, status }),
    importProducts: async (rows) => ({ imported: rows.length, rows }),
    ...overrides,
  };
}

function createAuthenticatedUser(role = "admin") {
  return {
    id: `${role}-1`,
    name: role === "admin" ? "Administrator" : "Manager",
    username: role,
    role,
  };
}

function createAuthenticatedAuth(role = "admin") {
  const user = createAuthenticatedUser(role);
  return {
    login: async () => null,
    getSession: async () => ({ user, token: "test-token" }),
  };
}

test("GET /health returns a ready payload", async () => {
  const app = createApp({
    health: async () => ({
      status: "ok",
      database: "connected",
    }),
    auth: { login: async () => null, getSession: async () => null },
    inventory: createInventoryStub(),
  });

  const response = await request(app).get("/health");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "ok",
    database: "connected",
  });
});

test("POST /auth/login returns a session for valid credentials with hardened cookie flags", async () => {
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: {
      login: async ({ username, password }) => {
        if (username === "executive" && password === "executive123") {
          return {
            token: "test-token",
            csrfToken: "csrf-token",
            user: {
              id: "user-1",
              name: "Executive",
              username,
              role: "executive",
            },
          };
        }

        return null;
      },
      getSession: async () => null,
    },
    inventory: createInventoryStub(),
  });

  const response = await request(app)
    .post("/auth/login")
    .send({ username: "executive", password: "executive123" });

  assert.equal(response.status, 200);
  assert.equal(response.body.token, "test-token");
  assert.equal(response.body.user.role, "executive");
  assert.equal(response.body.csrfToken, "csrf-token");
  const cookies = response.headers["set-cookie"] ?? [];
  assert.match(cookies.join(";"), /token=test-token/);
  assert.match(cookies.join(";"), /HttpOnly/i);
  assert.match(cookies.join(";"), /SameSite=Strict/i);
  assert.match(cookies.join(";"), /csrf-token=csrf-token/);
});

test("POST /auth/login surfaces invalid credentials without setting a cookie", async () => {
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: {
      login: async () => null,
      getSession: async () => null,
    },
    inventory: createInventoryStub(),
  });

  const response = await request(app)
    .post("/auth/login")
    .send({ username: "executive", password: "wrong-password" });

  assert.equal(response.status, 401);
  assert.deepEqual(response.body, { message: "Invalid username or password" });
  assert.equal(response.headers["set-cookie"], undefined);
});

test("POST /auth/login returns 401 instead of 500 when auth storage is unavailable", async () => {
  const auth = createAuthService({
    user: {
      findUnique: async () => {
        const error = new Error("The table `public.User` does not exist in the current database.");
        error.code = "P2021";
        error.meta = { table: "public.User" };
        throw error;
      },
    },
  });

  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth,
    inventory: createInventoryStub(),
  });

  const response = await request(app)
    .post("/auth/login")
    .send({ username: "executive", password: "executive123" });

  assert.equal(response.status, 401);
  assert.deepEqual(response.body, { message: "Invalid username or password" });
  assert.equal(response.headers["set-cookie"], undefined);
});

test("POST /auth/login returns 401 instead of 500 when the Prisma user model points at a missing table", async () => {
  const auth = createAuthService({
    user: {
      findUnique: async () => {
        const error = new Error("The table `public.users` does not exist in the current database.");
        error.code = "P2021";
        error.meta = { modelName: "User", table: "public.users" };
        throw error;
      },
    },
  });

  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth,
    inventory: createInventoryStub(),
  });

  const response = await request(app)
    .post("/auth/login")
    .send({ username: "admin", password: "admin123" });

  assert.equal(response.status, 401);
  assert.deepEqual(response.body, { message: "Invalid username or password" });
  assert.equal(response.headers["set-cookie"], undefined);
});

test("GET /auth/session returns a session for a valid bearer token", async () => {
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: {
      login: async () => null,
      getSession: async (token) => {
        if (token === "test-token") {
          return {
            token,
            user: {
              id: "user-1",
              name: "Executive",
              username: "executive",
              role: "executive",
            },
          };
        }

        return null;
      },
    },
    inventory: createInventoryStub(),
  });

  const response = await request(app)
    .get("/auth/session")
    .set("Authorization", "Bearer test-token");

  assert.equal(response.status, 200);
  assert.equal(response.body.token, "test-token");
  assert.equal(response.body.user.username, "executive");
});

test("GET /auth/session refreshes the csrf cookie even when the session is missing", async () => {
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: {
      login: async () => null,
      getSession: async () => null,
    },
    inventory: createInventoryStub(),
  });

  const response = await request(app).get("/auth/session");

  assert.equal(response.status, 401);
  assert.deepEqual(response.body, { message: "Session not found" });
  const cookies = response.headers["set-cookie"] ?? [];
  assert.match(cookies.join(";"), /csrf-token=/);
});

test("GET /products returns products with branch names", async () => {
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: { login: async () => null, getSession: async () => null },
    inventory: createInventoryStub({
      listProducts: async () => [
        {
          id: "prod-1",
          name: "Wireless Mouse MX",
          sku: "WMX-2024",
          serialNumber: "WMX-2024",
          modelNumber: "MX-2024",
          categoryId: "cat-1",
          categoryName: "Electronics",
          quantity: 120,
          price: 49.99,
          status: "in-stock",
          image: null,
          description: "Ergonomic wireless mouse",
          minStock: 20,
          monthlyInterest: 5,
          previousQuantity: 120,
          shipping: null,
          installation: null,
          createdAt: "2026-09-17T00:00:00.000Z",
          updatedAt: "2026-09-17T00:00:00.000Z",
          branches: [{ name: "Downtown" }, { name: "Airport" }],
        },
      ],
    }),
  });

  const response = await request(app).get("/products");

  assert.equal(response.status, 200);
  assert.equal(response.body.products[0].availableBranches[0], "Downtown");
  assert.equal(response.body.products[0].availableBranches[1], "Airport");
});

test("POST /users creates a user for authenticated admins", async () => {
  let receivedPayload = null;

  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: createAuthenticatedAuth("admin"),
    inventory: createInventoryStub({
      createUser: async (payload) => {
        receivedPayload = payload;
        return {
          id: "user-2",
          ...payload,
        };
      },
    }),
  });

  const response = await request(app)
    .post("/users")
    .set("Cookie", ["token=test-token", "csrf-token=test-csrf"])
    .set("x-csrf-token", "test-csrf")
    .send({
      name: "New Manager",
      username: "new-manager",
      password: "manager123",
      role: "manager",
    });

  assert.equal(response.status, 201);
  assert.equal(receivedPayload?.username, "new-manager");
  assert.equal(response.body.user.username, "new-manager");
  assert.equal(response.body.user.role, "manager");
});

test("POST /users rejects duplicate usernames for authenticated admins", async () => {
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: createAuthenticatedAuth("admin"),
    inventory: createInventoryStub({
      createUser: async () => {
        throw new Error("Username already exists");
      },
    }),
  });

  const response = await request(app)
    .post("/users")
    .set("Cookie", ["token=test-token", "csrf-token=test-csrf"])
    .set("x-csrf-token", "test-csrf")
    .send({
      name: "Existing Manager",
      username: "existing-manager",
      password: "manager123",
      role: "manager",
    });

  assert.equal(response.status, 409);
  assert.deepEqual(response.body, { message: "Username already exists" });
});

test("GET /order-requests returns pending and historical requests for authenticated managers", async () => {
  const user = createAuthenticatedUser("manager");
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: {
      login: async () => null,
      getSession: async () => ({ token: "test-token", csrfToken: "known-csrf", user }),
    },
    inventory: createInventoryStub({
      listOrderRequests: async () => [
        {
          id: "order-1",
          customerName: "PC Builder",
          customerEmail: "builder@inventory-app.local",
          status: "pending",
          createdAt: "2026-09-21T12:00:00.000Z",
          updatedAt: "2026-09-21T12:00:00.000Z",
          items: [{ productId: "prod-1", productName: "RTX 4070", quantity: 1 }],
        },
      ],
    }),
  });

  const response = await request(app)
    .get("/order-requests")
    .set("Authorization", "Bearer test-token");

  assert.equal(response.status, 200);
  assert.equal(response.body.orders.length, 1);
  assert.equal(response.body.orders[0].status, "pending");
  assert.equal(response.body.orders[0].items[0].productName, "RTX 4070");
});

test("GET /products logs unexpected inventory failures before returning 500", async () => {
  const inventoryFailure = new Error("products query exploded");
  const originalConsoleError = console.error;
  const loggedErrors = [];
  console.error = (...args) => {
    loggedErrors.push(args);
  };

  try {
    const app = createApp({
      health: async () => ({ status: "ok", database: "connected" }),
      auth: { login: async () => null, getSession: async () => null },
      inventory: createInventoryStub({
        listProducts: async () => {
          throw inventoryFailure;
        },
      }),
    });

    const response = await request(app).get("/products");

    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { message: "Internal server error" });
    assert.equal(loggedErrors.length, 1);
    assert.equal(loggedErrors[0][0], "GET /products failed");
    assert.equal(loggedErrors[0][1], inventoryFailure);
  } finally {
    console.error = originalConsoleError;
  }
});

test("state-changing admin routes reject requests without CSRF token", async () => {
  const user = createAuthenticatedUser("admin");
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: {
      login: async () => null,
      getSession: async () => ({ token: "test-token", csrfToken: "known-csrf", user }),
    },
    inventory: createInventoryStub(),
  });

  const response = await request(app)
    .post("/products")
    .set("Authorization", "Bearer test-token")
    .send({
      name: "Keyboard",
      sku: "KBD-1",
      categoryId: "cat-1",
      quantity: 1,
      price: 10,
      minStock: 1,
      monthlyInterest: 0,
      previousQuantity: 1,
      paidAmount: 0,
      status: "in-stock",
    });

  assert.equal(response.status, 403);
  assert.deepEqual(response.body, { message: "Invalid CSRF token" });
});

test("state-changing admin routes allow requests with valid CSRF token", async () => {
  const user = createAuthenticatedUser("admin");
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: {
      login: async () => null,
      getSession: async () => ({ token: "test-token", csrfToken: "known-csrf", user }),
    },
    inventory: createInventoryStub(),
  });

  const response = await request(app)
    .post("/products")
    .set("Authorization", "Bearer test-token")
    .set("x-csrf-token", "known-csrf")
    .send({
      name: "Keyboard",
      sku: "KBD-1",
      categoryId: "cat-1",
      quantity: 1,
      price: 10,
      minStock: 1,
      monthlyInterest: 0,
      previousQuantity: 1,
      paidAmount: 0,
      status: "in-stock",
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.name, "Keyboard");
});

test("admin-only delete route blocks manager role", async () => {
  const user = createAuthenticatedUser("manager");
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: {
      login: async () => null,
      getSession: async () => ({ token: "test-token", csrfToken: "known-csrf", user }),
    },
    inventory: createInventoryStub(),
  });

  const response = await request(app)
    .delete("/products/prod-1")
    .set("Authorization", "Bearer test-token")
    .set("x-csrf-token", "known-csrf");

  assert.equal(response.status, 403);
  assert.deepEqual(response.body, { message: "Insufficient permissions" });
});

test("POST /products/import accepts rows generated by the Excel upload dialog", async () => {
  const user = createAuthenticatedUser("admin");
  const inventory = createInventoryStub({
    importProducts: async (rows) => ({ imported: rows.length, rows }),
  });
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: {
      login: async () => null,
      getSession: async () => ({ token: "test-token", csrfToken: "known-csrf", user }),
    },
    inventory,
  });

  const response = await request(app)
    .post("/products/import")
    .set("Authorization", "Bearer test-token")
    .set("x-csrf-token", "known-csrf")
    .send({
      rows: [
        {
          name: "Lenovo ThinkPad T14 Gen 5",
          sku: "LAP-LEN-T14G5",
          category: "Laptops",
          quantity: 10,
          price: 89999,
          minStock: 2,
          monthlyInterest: 0,
          description: "Business laptop",
          image: "",
          availableBranches: ["Head Office", "Branch 4"],
        },
      ],
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.imported, 1);
  assert.equal(response.body.rows[0].category, "Laptops");
});

test("POST /order-requests creates a pending order for authenticated admins", async () => {
  const user = createAuthenticatedUser("admin");
  const inventory = createInventoryStub({
    createOrderRequest: async (payload) => ({
      id: "order-1",
      status: "pending",
      ...payload,
      items: payload.items,
    }),
  });
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: {
      login: async () => null,
      getSession: async () => ({ token: "test-token", csrfToken: "known-csrf", user }),
    },
    inventory,
  });

  const response = await request(app)
    .post("/order-requests")
    .set("Authorization", "Bearer test-token")
    .set("x-csrf-token", "known-csrf")
    .send({
      customerName: "PC Builder",
      customerEmail: "builder@inventory-app.local",
      items: [
        {
          productId: "prod-1",
          productName: "RTX 4070",
          quantity: 1,
        },
      ],
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.status, "pending");
  assert.equal(response.body.items.length, 1);
  assert.equal(response.body.items[0].productId, "prod-1");
});

test("GET /health returns security headers", async () => {
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: { login: async () => null, getSession: async () => null },
    inventory: createInventoryStub(),
  });

  const response = await request(app).get("/health");

  assert.equal(response.status, 200);
  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.equal(response.headers["x-frame-options"], "SAMEORIGIN");
  assert.match(response.headers["content-security-policy"] ?? "", /default-src 'self'/);
});

test("CORS only reflects explicitly allowed origins", async () => {
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: { login: async () => null, getSession: async () => null },
    inventory: createInventoryStub(),
    security: {
      allowedOrigins: ["https://stockforge.example"],
    },
  });

  const allowedResponse = await request(app)
    .get("/health")
    .set("Origin", "https://stockforge.example");
  const blockedResponse = await request(app)
    .get("/health")
    .set("Origin", "https://evil.example");

  assert.equal(allowedResponse.headers["access-control-allow-origin"], "https://stockforge.example");
  assert.equal(blockedResponse.headers["access-control-allow-origin"], undefined);
});

test("login rate limiting returns 429 after repeated failures", async () => {
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: {
      login: async () => null,
      getSession: async () => null,
    },
    inventory: createInventoryStub(),
    security: {
      loginRateLimitMax: 2,
      loginRateLimitWindowMs: 60_000,
    },
  });

  const first = await request(app).post("/auth/login").send({ username: "admin", password: "wrong" });
  const second = await request(app).post("/auth/login").send({ username: "admin", password: "wrong" });
  const third = await request(app).post("/auth/login").send({ username: "admin", password: "wrong" });

  assert.equal(first.status, 401);
  assert.equal(second.status, 401);
  assert.equal(third.status, 429);
  assert.deepEqual(third.body, { message: "Too many login attempts, please try again later" });
});
