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
    listMovements: async () => [],
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

function createOutstandingStub(overrides = {}) {
  return {
    summary: async () => ({
      totalOutstanding: 0,
      overdueAmount: 0,
      dueIn7Days: 0,
      clientsWithDues: 0,
    }),
    listClients: async () => [],
    getClient: async () => null,
    importRows: async (rows) => ({ created: rows.length, updated: 0, errors: [] }),
    updateClient: async (id, payload) => ({ id, ...payload }),
    listSalesPeople: async () => [],
    updateSalesPerson: async (id, payload) => ({ id, ...payload }),
    ...overrides,
  };
}

function createOutstandingLinksStub(overrides = {}) {
  return {
    getPublicView: async () => null,
    revokeLinks: async () => ({ revoked: 0 }),
    ...overrides,
  };
}

function createOutstandingNotifierStub(overrides = {}) {
  return {
    sendTest: async () => ({ sent: 1 }),
    listNotifications: async () => ({ notifications: [], pagination: { page: 1, pageSize: 20, total: 0 } }),
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
    outstanding: createOutstandingStub(),
    outstandingLinks: createOutstandingLinksStub(),
    outstandingNotifier: createOutstandingNotifierStub(),
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
    outstanding: createOutstandingStub(),
    outstandingLinks: createOutstandingLinksStub(),
    outstandingNotifier: createOutstandingNotifierStub(),
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
    outstanding: createOutstandingStub(),
    outstandingLinks: createOutstandingLinksStub(),
    outstandingNotifier: createOutstandingNotifierStub(),
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
    outstandingLinks: createOutstandingLinksStub(),
    outstandingNotifier: createOutstandingNotifierStub(),
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
    outstandingLinks: createOutstandingLinksStub(),
    outstandingNotifier: createOutstandingNotifierStub(),
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
    outstanding: createOutstandingStub(),
    outstandingLinks: createOutstandingLinksStub(),
    outstandingNotifier: createOutstandingNotifierStub(),
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
    outstanding: createOutstandingStub(),
    outstandingLinks: createOutstandingLinksStub(),
    outstandingNotifier: createOutstandingNotifierStub(),
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

test("GET /movements returns movement log for authenticated managers", async () => {
  const user = createAuthenticatedUser("manager");
  let receivedFilters = null;
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: {
      login: async () => null,
      getSession: async () => ({ token: "test-token", csrfToken: "known-csrf", user }),
    },
    inventory: createInventoryStub({
      listMovements: async (filters) => {
        receivedFilters = filters;
        return [
          {
            id: "movement-1",
            type: "in",
            quantity: 10,
            createdAt: "2026-09-21T12:00:00.000Z",
          },
        ];
      },
    }),
  });

  const response = await request(app)
    .get("/movements?type=in&limit=25")
    .set("Authorization", "Bearer test-token");

  assert.equal(response.status, 200);
  assert.deepEqual(receivedFilters, { type: "in", limit: "25" });
  assert.equal(response.body.movements.length, 1);
  assert.equal(response.body.movements[0].type, "in");
});

test("GET /movements passes through type=null so the service can ignore it", async () => {
  const user = createAuthenticatedUser("manager");
  let receivedFilters = null;
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: {
      login: async () => null,
      getSession: async () => ({ token: "test-token", csrfToken: "known-csrf", user }),
    },
    inventory: createInventoryStub({
      listMovements: async (filters) => {
        receivedFilters = filters;
        return [];
      },
    }),
  });

  const response = await request(app)
    .get("/movements?type=null")
    .set("Authorization", "Bearer test-token");

  assert.equal(response.status, 200);
  assert.deepEqual(receivedFilters, { type: "null", limit: undefined });
});

test("GET /movements is forbidden for executives", async () => {
  const user = createAuthenticatedUser("executive");
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: {
      login: async () => null,
      getSession: async () => ({ token: "test-token", csrfToken: "known-csrf", user }),
    },
    inventory: createInventoryStub(),
    outstanding: createOutstandingStub(),
    outstandingLinks: createOutstandingLinksStub(),
    outstandingNotifier: createOutstandingNotifierStub(),
  });

  const response = await request(app)
    .get("/movements")
    .set("Authorization", "Bearer test-token");

  assert.equal(response.status, 403);
  assert.deepEqual(response.body, { message: "Insufficient permissions" });
});

test("POST /movements uses the session user name and forwards a valid date", async () => {
  const user = createAuthenticatedUser("manager");
  let receivedPayload = null;
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: {
      login: async () => null,
      getSession: async () => ({ token: "test-token", csrfToken: "known-csrf", user }),
    },
    inventory: createInventoryStub({
      recordMovement: async (payload) => {
        receivedPayload = payload;
        return { id: "movement-1", ...payload };
      },
    }),
  });

  const response = await request(app)
    .post("/movements")
    .set("Authorization", "Bearer test-token")
    .set("x-csrf-token", "known-csrf")
    .send({
      productId: "product-1",
      type: "adjustment",
      quantity: 0,
      reason: "Cycle count",
      location: "A1",
      reference: "REF-1",
      date: "2026-09-21T12:00:00.000Z",
      userId: "spoofed-user",
    });

  assert.equal(response.status, 201);
  assert.equal(receivedPayload.userId, user.name);
  assert.equal(receivedPayload.createdAt.toISOString(), "2026-09-21T12:00:00.000Z");
  assert.equal(receivedPayload.type, "adjustment");
  assert.equal(receivedPayload.quantity, 0);
});

test("POST /movements requires location for transfers", async () => {
  const user = createAuthenticatedUser("manager");
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: {
      login: async () => null,
      getSession: async () => ({ token: "test-token", csrfToken: "known-csrf", user }),
    },
    inventory: createInventoryStub(),
    outstanding: createOutstandingStub(),
    outstandingLinks: createOutstandingLinksStub(),
    outstandingNotifier: createOutstandingNotifierStub(),
  });

  const response = await request(app)
    .post("/movements")
    .set("Authorization", "Bearer test-token")
    .set("x-csrf-token", "known-csrf")
    .send({
      productId: "product-1",
      type: "transfer",
      quantity: 2,
      reason: "Branch move",
      location: "",
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "Invalid request");
});

test("POST then GET /movements supports the dialog payload shape end to end", async () => {
  const user = createAuthenticatedUser("manager");
  const movements = [];
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: {
      login: async () => null,
      getSession: async () => ({ token: "test-token", csrfToken: "known-csrf", user }),
    },
    inventory: createInventoryStub({
      recordMovement: async (payload) => {
        const movement = {
          id: `movement-${movements.length + 1}`,
          productId: payload.productId,
          productName: "RTX 4070",
          productSku: "GPU-4070",
          type: payload.type,
          quantity: payload.type === "adjustment" ? 8 : payload.quantity,
          previousQuantity: 12,
          newQuantity: payload.type === "adjustment" ? 20 : 12 + payload.quantity,
          reason: payload.reason,
          location: payload.location,
          reference: payload.reference,
          user: payload.userId,
          createdAt: payload.createdAt.toISOString(),
        };
        movements.unshift(movement);
        return movement;
      },
      listMovements: async () => movements,
    }),
  });

  const postResponse = await request(app)
    .post("/movements")
    .set("Authorization", "Bearer test-token")
    .set("x-csrf-token", "known-csrf")
    .send({
      productId: "product-1",
      type: "adjustment",
      quantity: 20,
      reason: "Cycle count",
      location: "",
      reference: "COUNT-1",
      date: "2026-10-05T09:30:00.000Z",
    });

  assert.equal(postResponse.status, 201);
  assert.equal(postResponse.body.type, "adjustment");
  assert.equal(postResponse.body.quantity, 8);
  assert.equal(postResponse.body.previousQuantity, 12);
  assert.equal(postResponse.body.newQuantity, 20);
  assert.equal(postResponse.body.reason, "Cycle count");
  assert.equal(postResponse.body.reference, "COUNT-1");
  assert.equal(postResponse.body.user, user.name);
  assert.equal(postResponse.body.createdAt, "2026-10-05T09:30:00.000Z");

  const getResponse = await request(app)
    .get("/movements")
    .set("Authorization", "Bearer test-token");

  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.body.movements.length, 1);
  assert.deepEqual(getResponse.body.movements[0], postResponse.body);
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
    outstanding: createOutstandingStub(),
    outstandingLinks: createOutstandingLinksStub(),
    outstandingNotifier: createOutstandingNotifierStub(),
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
    outstanding: createOutstandingStub(),
    outstandingLinks: createOutstandingLinksStub(),
    outstandingNotifier: createOutstandingNotifierStub(),
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
      mrp: 10,
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
    outstanding: createOutstandingStub(),
    outstandingLinks: createOutstandingLinksStub(),
    outstandingNotifier: createOutstandingNotifierStub(),
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

test("GET /outstanding/summary returns the outstanding summary for managers", async () => {
  const user = createAuthenticatedUser("manager");
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: {
      login: async () => null,
      getSession: async () => ({ token: "test-token", csrfToken: "known-csrf", user }),
    },
    inventory: createInventoryStub(),
    outstanding: createOutstandingStub({
      summary: async () => ({
        totalOutstanding: 1000,
        overdueAmount: 400,
        dueIn7Days: 300,
        clientsWithDues: 2,
      }),
    }),
  });

  const response = await request(app)
    .get("/outstanding/summary")
    .set("Authorization", "Bearer test-token");

  assert.equal(response.status, 200);
  assert.equal(response.body.totalOutstanding, 1000);
  assert.equal(response.body.clientsWithDues, 2);
});

test("POST /outstanding/import accepts valid rows for authenticated admins", async () => {
  const user = createAuthenticatedUser("admin");
  let receivedRows = null;
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: {
      login: async () => null,
      getSession: async () => ({ token: "test-token", csrfToken: "known-csrf", user }),
    },
    inventory: createInventoryStub(),
    outstanding: createOutstandingStub({
      importRows: async (rows) => {
        receivedRows = rows;
        return { created: 1, updated: 0, errors: [] };
      },
    }),
  });

  const response = await request(app)
    .post("/outstanding/import")
    .set("Authorization", "Bearer test-token")
    .set("x-csrf-token", "known-csrf")
    .send({
      rows: [
        {
          "Client Name": "Acme Stores",
          Salesperson: "Ravi",
          "Salesperson Phone": "9876543210",
          "Invoice No": "INV-001",
          "Invoice Date": "2026-10-01T00:00:00.000Z",
          Amount: 1000,
          "Paid Amount": 100,
          "Credit Days": 10,
        },
      ],
    });

  assert.equal(response.status, 200);
  assert.equal(receivedRows.length, 1);
  assert.equal(receivedRows[0]["Client Name"], "Acme Stores");
});

test("PATCH /clients/:id forwards updates for authenticated managers", async () => {
  const user = createAuthenticatedUser("manager");
  let receivedUpdate = null;
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: {
      login: async () => null,
      getSession: async () => ({ token: "test-token", csrfToken: "known-csrf", user }),
    },
    inventory: createInventoryStub(),
    outstanding: createOutstandingStub({
      updateClient: async (id, payload) => {
        receivedUpdate = { id, payload };
        return { id, ...payload };
      },
    }),
  });

  const response = await request(app)
    .patch("/clients/client-1")
    .set("Authorization", "Bearer test-token")
    .set("x-csrf-token", "known-csrf")
    .send({ creditDays: 30, applyToOpenInvoices: true });

  assert.equal(response.status, 200);
  assert.equal(receivedUpdate.id, "client-1");
  assert.equal(receivedUpdate.payload.creditDays, 30);
  assert.equal(receivedUpdate.payload.applyToOpenInvoices, true);
});

test("GET /salespeople returns salespeople for authenticated managers", async () => {
  const user = createAuthenticatedUser("manager");
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: {
      login: async () => null,
      getSession: async () => ({ token: "test-token", csrfToken: "known-csrf", user }),
    },
    inventory: createInventoryStub(),
    outstanding: createOutstandingStub({
      listSalesPeople: async () => [{ id: "sp-1", name: "Ravi" }],
    }),
  });

  const response = await request(app)
    .get("/salespeople")
    .set("Authorization", "Bearer test-token");

  assert.equal(response.status, 200);
  assert.equal(response.body.salesPeople.length, 1);
  assert.equal(response.body.salesPeople[0].name, "Ravi");
});

test("PATCH /salespeople/:id forwards updates for authenticated admins", async () => {
  const user = createAuthenticatedUser("admin");
  let receivedUpdate = null;
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: {
      login: async () => null,
      getSession: async () => ({ token: "test-token", csrfToken: "known-csrf", user }),
    },
    inventory: createInventoryStub(),
    outstanding: createOutstandingStub({
      updateSalesPerson: async (id, payload) => {
        receivedUpdate = { id, payload };
        return { id, ...payload };
      },
    }),
  });

  const response = await request(app)
    .patch("/salespeople/sp-1")
    .set("Authorization", "Bearer test-token")
    .set("x-csrf-token", "known-csrf")
    .send({ phone: "+919876543210", notifyChannel: "both", active: false });

  assert.equal(response.status, 200);
  assert.equal(receivedUpdate.id, "sp-1");
  assert.equal(receivedUpdate.payload.notifyChannel, "both");
  assert.equal(receivedUpdate.payload.active, false);
});

test("executives are forbidden on every outstanding route", async () => {
  const user = createAuthenticatedUser("executive");
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: {
      login: async () => null,
      getSession: async () => ({ token: "test-token", csrfToken: "known-csrf", user }),
    },
    inventory: createInventoryStub(),
    outstanding: createOutstandingStub(),
    outstandingLinks: createOutstandingLinksStub(),
    outstandingNotifier: createOutstandingNotifierStub(),
  });

  const requests = await Promise.all([
    request(app).get("/outstanding/summary").set("Authorization", "Bearer test-token"),
    request(app).get("/outstanding/clients").set("Authorization", "Bearer test-token"),
    request(app).get("/outstanding/clients/client-1").set("Authorization", "Bearer test-token"),
    request(app).post("/outstanding/import").set("Authorization", "Bearer test-token").set("x-csrf-token", "known-csrf").send({ rows: [] }),
    request(app).patch("/clients/client-1").set("Authorization", "Bearer test-token").set("x-csrf-token", "known-csrf").send({ creditDays: 10 }),
    request(app).get("/salespeople").set("Authorization", "Bearer test-token"),
    request(app).patch("/salespeople/sp-1").set("Authorization", "Bearer test-token").set("x-csrf-token", "known-csrf").send({ active: false }),
  ]);

  for (const response of requests) {
    assert.equal(response.status, 403);
    assert.deepEqual(response.body, { message: "Insufficient permissions" });
  }
});

test("GET /public/outstanding/:token returns public data without a session and sets no-store headers", async () => {
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: { login: async () => null, getSession: async () => null },
    inventory: createInventoryStub(),
    outstanding: createOutstandingStub(),
    outstandingLinks: createOutstandingLinksStub({
      getPublicView: async (token) => ({
        token,
        salespersonFirstName: "Ravi",
        asOf: "2026-10-05",
        grandTotalOutstanding: 1400,
        clients: [],
      }),
    }),
  });

  const response = await request(app).get("/public/outstanding/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");

  assert.equal(response.status, 200);
  assert.equal(response.body.salespersonFirstName, "Ravi");
  assert.equal(response.headers["cache-control"], "no-store");
  assert.equal(response.headers["x-robots-tag"], "noindex");
});

test("GET /public/outstanding/:token returns the same 404 body for unknown, revoked, expired, and invalid tokens", async () => {
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: { login: async () => null, getSession: async () => null },
    inventory: createInventoryStub(),
    outstanding: createOutstandingStub(),
    outstandingLinks: createOutstandingLinksStub({
      getPublicView: async () => null,
    }),
  });

  const responses = await Promise.all([
    request(app).get("/public/outstanding/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"),
    request(app).get("/public/outstanding/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"),
    request(app).get("/public/outstanding/CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC"),
    request(app).get("/public/outstanding/not-a-valid-token"),
  ]);

  for (const response of responses) {
    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { error: "This link is not valid or has expired" });
  }
});

test("POST /outstanding/salespeople/:id/revoke-links is admin-only", async () => {
  const user = createAuthenticatedUser("manager");
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: {
      login: async () => null,
      getSession: async () => ({ token: "test-token", csrfToken: "known-csrf", user }),
    },
    inventory: createInventoryStub(),
    outstanding: createOutstandingStub(),
    outstandingLinks: createOutstandingLinksStub(),
    outstandingNotifier: createOutstandingNotifierStub(),
  });

  const response = await request(app)
    .post("/outstanding/salespeople/sp-1/revoke-links")
    .set("Authorization", "Bearer test-token")
    .set("x-csrf-token", "known-csrf");

  assert.equal(response.status, 403);
  assert.deepEqual(response.body, { message: "Insufficient permissions" });
});

test("POST /outstanding/salespeople/:id/revoke-links revokes links for admins", async () => {
  const user = createAuthenticatedUser("admin");
  let receivedId = null;
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: {
      login: async () => null,
      getSession: async () => ({ token: "test-token", csrfToken: "known-csrf", user }),
    },
    inventory: createInventoryStub(),
    outstanding: createOutstandingStub(),
    outstandingLinks: createOutstandingLinksStub({
      revokeLinks: async (id) => {
        receivedId = id;
        return { revoked: 3 };
      },
    }),
  });

  const response = await request(app)
    .post("/outstanding/salespeople/sp-1/revoke-links")
    .set("Authorization", "Bearer test-token")
    .set("x-csrf-token", "known-csrf");

  assert.equal(response.status, 200);
  assert.equal(receivedId, "sp-1");
  assert.deepEqual(response.body, { revoked: 3 });
});

test("GET /public/outstanding/:token is rate limited to 60 requests per minute per IP", async () => {
  let callCount = 0;
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: { login: async () => null, getSession: async () => null },
    inventory: createInventoryStub(),
    outstanding: createOutstandingStub(),
    outstandingLinks: createOutstandingLinksStub({
      getPublicView: async () => {
        callCount += 1;
        return { salespersonFirstName: "Ravi", asOf: "2026-10-05", grandTotalOutstanding: 0, clients: [] };
      },
    }),
    security: {
      trustProxy: false,
    },
  });

  const agent = request.agent(app);
  let lastResponse = null;
  for (let index = 0; index < 61; index += 1) {
    lastResponse = await agent.get("/public/outstanding/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
  }

  assert.equal(callCount, 60);
  assert.equal(lastResponse.status, 404);
  assert.deepEqual(lastResponse.body, { error: "This link is not valid or has expired" });
});

test("POST /outstanding/notify/test is admin-only and forwards salesPersonId", async () => {
  const admin = createAuthenticatedUser("admin");
  let receivedSalesPersonId = null;
  const adminApp = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: {
      login: async () => null,
      getSession: async () => ({ token: "test-token", csrfToken: "known-csrf", user: admin }),
    },
    inventory: createInventoryStub(),
    outstanding: createOutstandingStub(),
    outstandingLinks: createOutstandingLinksStub(),
    outstandingNotifier: createOutstandingNotifierStub({
      sendTest: async (salesPersonId) => {
        receivedSalesPersonId = salesPersonId;
        return { sent: 1 };
      },
    }),
  });

  const adminResponse = await request(adminApp)
    .post("/outstanding/notify/test")
    .set("Authorization", "Bearer test-token")
    .set("x-csrf-token", "known-csrf")
    .send({ salesPersonId: "sp-1" });

  assert.equal(adminResponse.status, 200);
  assert.equal(receivedSalesPersonId, "sp-1");
  assert.deepEqual(adminResponse.body, { sent: 1 });

  const manager = createAuthenticatedUser("manager");
  const managerApp = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: {
      login: async () => null,
      getSession: async () => ({ token: "test-token", csrfToken: "known-csrf", user: manager }),
    },
    inventory: createInventoryStub(),
    outstanding: createOutstandingStub(),
    outstandingLinks: createOutstandingLinksStub(),
    outstandingNotifier: createOutstandingNotifierStub(),
  });

  const managerResponse = await request(managerApp)
    .post("/outstanding/notify/test")
    .set("Authorization", "Bearer test-token")
    .set("x-csrf-token", "known-csrf")
    .send({ salesPersonId: "sp-1" });

  assert.equal(managerResponse.status, 403);
  assert.deepEqual(managerResponse.body, { message: "Insufficient permissions" });
});

test("GET /outstanding/notifications is available to managers and masks phones outside admin", async () => {
  const manager = createAuthenticatedUser("manager");
  let includePhoneForManager = null;
  const managerApp = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: {
      login: async () => null,
      getSession: async () => ({ token: "test-token", csrfToken: "known-csrf", user: manager }),
    },
    inventory: createInventoryStub(),
    outstanding: createOutstandingStub(),
    outstandingLinks: createOutstandingLinksStub(),
    outstandingNotifier: createOutstandingNotifierStub({
      listNotifications: async (filters) => {
        includePhoneForManager = filters.includePhone;
        return { notifications: [], pagination: { page: 1, pageSize: 20, total: 0 } };
      },
    }),
  });

  const managerResponse = await request(managerApp)
    .get("/outstanding/notifications?salesPersonId=sp-1&status=dry_run&page=2&pageSize=10")
    .set("Authorization", "Bearer test-token");

  assert.equal(managerResponse.status, 200);
  assert.equal(includePhoneForManager, false);

  const admin = createAuthenticatedUser("admin");
  let includePhoneForAdmin = null;
  const adminApp = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: {
      login: async () => null,
      getSession: async () => ({ token: "test-token", csrfToken: "known-csrf", user: admin }),
    },
    inventory: createInventoryStub(),
    outstanding: createOutstandingStub(),
    outstandingLinks: createOutstandingLinksStub(),
    outstandingNotifier: createOutstandingNotifierStub({
      listNotifications: async (filters) => {
        includePhoneForAdmin = filters.includePhone;
        return { notifications: [], pagination: { page: 1, pageSize: 20, total: 0 } };
      },
    }),
  });

  const adminResponse = await request(adminApp)
    .get("/outstanding/notifications")
    .set("Authorization", "Bearer test-token");

  assert.equal(adminResponse.status, 200);
  assert.equal(includePhoneForAdmin, true);

  const executive = createAuthenticatedUser("executive");
  const executiveApp = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: {
      login: async () => null,
      getSession: async () => ({ token: "test-token", csrfToken: "known-csrf", user: executive }),
    },
    inventory: createInventoryStub(),
    outstanding: createOutstandingStub(),
    outstandingLinks: createOutstandingLinksStub(),
    outstandingNotifier: createOutstandingNotifierStub(),
  });

  const executiveResponse = await request(executiveApp)
    .get("/outstanding/notifications")
    .set("Authorization", "Bearer test-token");

  assert.equal(executiveResponse.status, 403);
  assert.deepEqual(executiveResponse.body, { message: "Insufficient permissions" });
});

test("GET /health returns security headers", async () => {
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: { login: async () => null, getSession: async () => null },
    inventory: createInventoryStub(),
    outstanding: createOutstandingStub(),
    outstandingLinks: createOutstandingLinksStub(),
    outstandingNotifier: createOutstandingNotifierStub(),
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
