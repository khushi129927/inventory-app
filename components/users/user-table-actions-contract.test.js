const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "user-table.tsx"), "utf8");

assert.match(
  source,
  /import\s+EditUserDialog\s+from\s+"@\/components\/users\/edit-user-dialog"/,
  "Expected UserTable to render a dedicated edit dialog instead of a toast placeholder"
);

assert.doesNotMatch(
  source,
  /toast\.info\(/,
  "Expected edit action to perform a real update flow instead of showing a placeholder toast"
);

assert.match(
  source,
  /await\s+deleteUser\.mutateAsync\(deletingUser\.id\)/,
  "Expected delete action to remain wired to the delete mutation"
);

assert.match(
  source,
  /disabled=\{deleteUser\.isPending\s*\|\|\s*isAdminUser\}/,
  "Expected admin users to have delete actions disabled in the table"
);

assert.match(
  source,
  /Admin users cannot be deleted\./,
  "Expected the delete dialog to explain that admin users cannot be deleted"
);

assert.match(
  source,
  /AlertDialog|alert-dialog/i,
  "Expected delete action to be protected by a confirmation dialog"
);

console.log("Verified user table action contract for working edit and protected delete flows");
