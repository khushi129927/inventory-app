const fs = require("fs");
const path = require("path");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const shellPath = path.join(process.cwd(), "components", "layout", "shell.tsx");
const globalsPath = path.join(process.cwd(), "app", "globals.css");

const shell = fs.readFileSync(shellPath, "utf8");
const globals = fs.readFileSync(globalsPath, "utf8");

assert(
  globals.includes(':root[data-theme="light"]'),
  "Expected app globals to define a light theme"
);

assert(
  shell.includes('isActive ? "text-[var(--sidebar-foreground)]" : "text-muted-foreground"'),
  "Expected active sidebar icons to use the StockForge sidebar inverse text color in light theme"
);

assert(
  shell.includes('bg-[var(--sidebar-accent)] text-[var(--sidebar-foreground)]'),
  "Expected active sidebar links to use the StockForge translucent sidebar accent surface in light theme"
);

assert(
  shell.includes('border-l-[var(--sidebar-primary)] bg-[var(--sidebar-accent)] text-[var(--sidebar-foreground)]'),
  "Expected active sidebar links to use the StockForge bright accent border with inverse text in light theme"
);

console.log("Verified readable active sidebar labels in light theme");
