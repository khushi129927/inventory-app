import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const serverSource = readFileSync(path.join(process.cwd(), "src", "server.js"), "utf8");

test("backend startup clears stale Prisma engine temp files", () => {
  assert.match(
    serverSource,
    /query_engine-windows\\\.dll\\\.node\\\.tmp/i,
    "expected startup to handle stale Prisma engine temp files left behind by failed Prisma client generation"
  );
});

test("backend startup does not delete the active Prisma engine DLL", () => {
  assert.doesNotMatch(
    serverSource,
    /fileName === "query_engine-windows\.dll\.node"/,
    "expected backend startup to avoid deleting the active Prisma engine DLL because Windows locks it while the app is running"
  );
});

test("backend startup does not regenerate Prisma client on every boot", () => {
  assert.doesNotMatch(
    serverSource,
    /execSync\("npx prisma generate", \{ stdio: "inherit" \}\);/,
    "expected backend startup to avoid unconditional prisma generate because the Prisma engine DLL is locked while the app is running on Windows"
  );
});

test("backend startup still applies database migrations", () => {
  assert.match(
    serverSource,
    /execSync\("npx prisma migrate deploy", \{ stdio: "inherit" \}\);/,
    "expected backend startup to keep applying database migrations on boot"
  );
});
