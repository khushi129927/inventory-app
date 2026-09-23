import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const serverSource = readFileSync(path.join(process.cwd(), "src", "server.js"), "utf8");

test("backend startup regenerates Prisma client before running migrations", () => {
  const generateIndex = serverSource.indexOf('execSync("npx prisma generate", { stdio: "inherit" });');
  const migrateIndex = serverSource.indexOf('execSync("npx prisma migrate deploy", { stdio: "inherit" });');
  const prismaClientIndex = serverSource.indexOf("const prisma = new PrismaClient();");

  assert.notEqual(generateIndex, -1, "expected server startup to generate Prisma client");
  assert.notEqual(migrateIndex, -1, "expected server startup to apply migrations");
  assert.notEqual(prismaClientIndex, -1, "expected server startup to construct PrismaClient");
  assert.ok(generateIndex < migrateIndex, "expected prisma generate to run before prisma migrate deploy");
  assert.ok(migrateIndex < prismaClientIndex, "expected migrations to run before PrismaClient is constructed");
});
