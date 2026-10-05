const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const authGuardSource = fs.readFileSync(path.join(process.cwd(), "app", "AuthGuard.tsx"), "utf8");

assert(
  authGuardSource.includes('pathname.startsWith("/o/")'),
  "Expected AuthGuard to treat /o/ pages as public"
);

assert(
  authGuardSource.includes('if (isPublicPage) return <>{children}</>;'),
  "Expected AuthGuard to bypass auth redirects for public outstanding links"
);

console.log("Verified AuthGuard public outstanding path contract");
