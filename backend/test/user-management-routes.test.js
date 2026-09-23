import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";

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
    importProducts: async (rows) => ({ imported: rows.length, rows }),
    listUsers: async () => [],
    updateUser: async (id, payload) => ({ id, ...payload }),
    deleteUser: async () => undefined,
    ...overrides,
  };
}

test("PATCH /users/:id updates a user for admins", async () => {
  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: createAuthenticatedAuth("admin"),
    inventory: createInventoryStub({
      updateUser: async (id, payload) => ({
        id,
        name: payload.name ?? "Updated User",
        username: payload.username ?? "updated-user",
        role: payload.role ?? "manager",
      }),
    }),
  });

  const response = await request(app)
    .patch("/users/user-1")
    .set("Authorization", "Bearer test-token")
    .set("x-csrf-token", "csrf-token")
    .set("Cookie", ["csrf-token=csrf-token"])
    .send({ name: "Updated User", role: "manager" });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    id: "user-1",
    name: "Updated User",
    username: "updated-user",
    role: "manager",
  });
});

test("DELETE /users/:id deletes a user for admins", async () => {
  const deletedIds = [];

  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: createAuthenticatedAuth("admin"),
    inventory: createInventoryStub({
      deleteUser: async (id) => {
        deletedIds.push(id);
      },
    }),
  });

  const response = await request(app)
    .delete("/users/user-1")
    .set("Authorization", "Bearer test-token")
    .set("x-csrf-token", "csrf-token")
    .set("Cookie", ["csrf-token=csrf-token"]);

  assert.equal(response.status, 204);
  assert.deepEqual(deletedIds, ["user-1"]);
});

test("DELETE /users/:id rejects deletion of admin users", async () => {
  const deletedIds = [];

  const app = createApp({
    health: async () => ({ status: "ok", database: "connected" }),
    auth: createAuthenticatedAuth("admin"),
    inventory: createInventoryStub({
      deleteUser: async (id) => {
        deletedIds.push(id);
        throw new Error("Admin users cannot be deleted");
      },
    }),
  });

  const response = await request(app)
    .delete("/users/admin-1")
    .set("Authorization", "Bearer test-token")
    .set("x-csrf-token", "csrf-token")
    .set("Cookie", ["csrf-token=csrf-token"]);

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, { message: "Admin users cannot be deleted" });
  assert.deepEqual(deletedIds, ["admin-1"]);
});
