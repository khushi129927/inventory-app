const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const dashboardPath = path.join(process.cwd(), "app", "page.tsx");
const providersPath = path.join(process.cwd(), "app", "providers.tsx");
const globalsPath = path.join(process.cwd(), "app", "globals.css");

const dashboard = fs.readFileSync(dashboardPath, "utf8");
const providers = fs.readFileSync(providersPath, "utf8");
const globals = fs.readFileSync(globalsPath, "utf8");

assert(
  dashboard.includes("theme-toggle"),
  "Expected Dashboard page to expose a theme toggle control"
);

assert(
  dashboard.includes("setTheme(") || dashboard.includes("toggleTheme(") || dashboard.includes("useTheme("),
  "Expected Dashboard page to wire the theme toggle control to theme state"
);

assert(
  dashboard.includes("aria-label={`Toggle theme to ${isDarkTheme ? \"light\" : \"dark\"} mode`}"),
  "Expected the theme toggle button to preserve an accessible aria-label for light and dark mode switching"
);

assert(
  !dashboard.includes("<span>Toggle theme</span>"),
  "Expected the visible 'Toggle theme' label to be removed from the dashboard theme button"
);

assert(
  !dashboard.includes('{isDarkTheme ? "Light mode" : "Dark mode"}'),
  "Expected the visible dark/light mode status text to be removed from the dashboard theme button"
);

assert(
  providers.includes("ThemeContext") || providers.includes("useTheme") || providers.includes("data-theme"),
  "Expected Providers to expose application theme state"
);

assert(
  globals.includes('[data-theme="light"]') || globals.includes(':root[data-theme="light"]'),
  "Expected globals.css to define light theme tokens"
);

assert(
  globals.includes('[data-theme="dark"]') || globals.includes(':root[data-theme="dark"]') || globals.includes('color-scheme: dark;'),
  "Expected globals.css to define or preserve dark theme tokens"
);

const shellPath = path.join(process.cwd(), "components", "layout", "shell.tsx");
const settingsPath = path.join(process.cwd(), "components", "settings", "organization-settings-page.tsx");
const shell = fs.readFileSync(shellPath, "utf8");
const settings = fs.readFileSync(settingsPath, "utf8");

assert(
  shell.includes("bg-background") && shell.includes("bg-card") && !shell.includes("bg-[#141414]"),
  "Expected shell surfaces to rely on theme tokens so the whole website switches theme"
);

assert(
  !settings.includes("bg-[#141414]") && !settings.includes("bg-[#0c0c0c]") && !settings.includes("text-white"),
  "Expected settings page surfaces to avoid dark-only hardcoded colors so theme toggle affects the full website"
);

console.log("Verified dashboard theme-toggle contract and full-site dual-theme token support");
