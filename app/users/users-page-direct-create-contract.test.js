const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const sourcePath = path.join(process.cwd(), "app", "users", "page.tsx");
const source = fs.readFileSync(sourcePath, "utf8");

assert.match(
  source,
  /Username/i,
  "Expected the Users page direct creation section to collect a username"
);

assert.match(
  source,
  /Password/i,
  "Expected the Users page direct creation section to collect a password"
);

assert.match(
  source,
  /Role/i,
  "Expected the Users page direct creation section to collect a role"
);

assert.doesNotMatch(
  source,
  /Invite Email/i,
  "Expected email invite inputs to be removed from the Users page direct creation section"
);

assert.doesNotMatch(
  source,
  /Invite Member/i,
  "Expected the Users page action to create a user directly instead of inviting by email"
);

assert.match(
  source,
  /createUser\.mutateAsync\(\{[\s\S]*username:[\s\S]*password:[\s\S]*role,/,
  "Expected the Users page direct creation flow to submit username, password, and role to the create-user mutation"
);

console.log("Verified direct user creation contract for the Users page");
