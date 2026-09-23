const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const sourcePath = path.join(process.cwd(), "hooks", "use-users.ts");
const source = fs.readFileSync(sourcePath, "utf8");

assert(
  source.includes('apiRequest<{ user: User }>("/users", { method: "POST", body: data })') ||
    source.includes('apiRequest<User | { user: User }>("/users", { method: "POST", body: data })'),
  "Expected create-user requests to model the backend response shape returned by POST /users"
);

assert(
  source.includes("extractCreatedUser") || source.includes("response.user"),
  "Expected create-user responses wrapped in a user object to be normalized before direct user-creation flows consume them"
);

console.log("Verified create-user response contract for direct user-creation flow");
