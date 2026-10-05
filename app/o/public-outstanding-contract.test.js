const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const publicPageSource = fs.readFileSync(path.join(process.cwd(), "app", "o", "[token]", "page.tsx"), "utf8");
const shellSource = fs.readFileSync(path.join(process.cwd(), "components", "layout", "shell.tsx"), "utf8");

assert(
  publicPageSource.includes("export const metadata: Metadata ="),
  "Expected public outstanding page to define page metadata"
);

assert(
  publicPageSource.includes("index: false") && publicPageSource.includes("follow: false"),
  "Expected public outstanding page metadata to set noindex and nofollow"
);

assert(
  publicPageSource.includes('usePublicOutstanding(token)'),
  "Expected public outstanding page to fetch the public outstanding endpoint through the public outstanding hook"
);

assert(
  publicPageSource.includes("This link is not valid or has expired.") && publicPageSource.includes("Please ask for a new message."),
  "Expected public outstanding page to show the friendly invalid-link message"
);

assert(
  shellSource.includes('pathname.startsWith("/o/")'),
  "Expected shell to treat /o/ paths as public"
);

assert(
  shellSource.includes('if (isPublic && !currentUser) {') && shellSource.includes('return <>{children}</>;'),
  "Expected shell to render /o/ pages without sidebar, top bar, or login panel"
);

console.log("Verified public outstanding page contract and shell public path handling");
