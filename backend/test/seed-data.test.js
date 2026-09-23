import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";

import { seedData } from "../src/data/seed.js";

test("seed data includes a manager account with password manager123", async () => {
  const manager = seedData.users.find((user) => user.username === "manager");

  assert.ok(manager, "expected a manager user in seed data");
  assert.equal(manager.role, "manager");
  assert.equal(await bcrypt.compare("manager123", manager.password), true);
});
