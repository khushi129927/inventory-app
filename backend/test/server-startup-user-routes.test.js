import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "src", "server.js"), "utf8");

test("server startup does not attempt prisma client generation on every boot", () => {
  assert.doesNotMatch(
    source,
    /prisma\s+generate/i,
    "Expected backend startup to avoid prisma generate so route changes can be restarted without Windows DLL lock failures"
  );
});

console.log("Verified backend startup avoids runtime Prisma client generation");
