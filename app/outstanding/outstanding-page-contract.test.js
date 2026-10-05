const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const pageSource = fs.readFileSync(path.join(process.cwd(), "app", "outstanding", "page.tsx"), "utf8");
const shellSource = fs.readFileSync(path.join(process.cwd(), "components", "layout", "shell.tsx"), "utf8");

assert(
  pageSource.includes('className="page-header"'),
  "Expected Outstanding page to use the shared page-header wrapper"
);

assert(
  pageSource.includes("<h1>Outstanding</h1>"),
  "Expected Outstanding page to use a plain h1 title"
);

assert(
  !pageSource.includes("<h1 className="),
  "Expected Outstanding page title to rely on shared page-header styling without an h1 className"
);

assert(
  pageSource.includes('role="tablist"'),
  "Expected Outstanding page to expose tab buttons for Clients and Notifications"
);

assert(
  pageSource.includes('Send test message'),
  "Expected Outstanding page to include a Send test message action"
);

assert(
  pageSource.includes('const isAdmin = currentUser?.role === "admin";'),
  "Expected Outstanding page to gate admin-only notification actions by role"
);

assert(
  pageSource.includes('isAdmin ? ('),
  "Expected Outstanding page to render notification actions only for admins"
);

assert(
  shellSource.includes('{ label: "Outstanding", href: "/outstanding", icon: "Wallet", section: "Workspace" }'),
  "Expected sidebar navigation to include an Outstanding entry"
);

assert(
  shellSource.includes('admin: ["/", "/products", "/movements", "/categories", "/users", "/orders", "/outstanding"]'),
  "Expected admin role access to include /outstanding"
);

assert(
  shellSource.includes('manager: ["/", "/products", "/movements", "/orders", "/outstanding"]'),
  "Expected manager role access to include /outstanding"
);

assert(
  shellSource.includes('executive: ["/", "/products"]'),
  "Expected executive role access to exclude /outstanding"
);

console.log("Verified Outstanding page header contract and sidebar role access");
