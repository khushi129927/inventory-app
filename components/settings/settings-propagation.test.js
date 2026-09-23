const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const settingsPath = path.join(process.cwd(), "components", "settings", "organization-settings-page.tsx");
const usersPagePath = path.join(process.cwd(), "app", "users", "page.tsx");
const metricCardsPath = path.join(process.cwd(), "components", "dashboard", "metric-cards.tsx");
const typesPath = path.join(process.cwd(), "app", "types", "inventory.ts");
const utilsPath = path.join(process.cwd(), "lib", "utils.ts");

const settings = fs.readFileSync(settingsPath, "utf8");
const usersPage = fs.readFileSync(usersPagePath, "utf8");
const metricCards = fs.readFileSync(metricCardsPath, "utf8");
const types = fs.readFileSync(typesPath, "utf8");
const utils = fs.readFileSync(utilsPath, "utf8");

assert(
  types.includes("name: string;") &&
    types.includes("currency:") &&
    types.includes("warehouseLocation: string;") &&
    types.includes("ownershipTransferTargetUserId") &&
    types.includes("inviteEmail") &&
    types.includes("inviteRole"),
  "Expected OrganizationProfile to define the settings fields needed for app-wide propagation and ownership transfer state"
);

assert(
  settings.includes("value={organizationName}") && settings.includes("setOrganizationName"),
  "Expected Organization Name to be editable so settings changes can propagate across the app"
);

assert(
  settings.includes("<select") || settings.includes("<Select") || settings.includes("currencyOptions"),
  "Expected Default Currency to use a constrained dropdown rather than a freeform text field"
);

assert(
  settings.includes("ownershipTransferTargetUserId") || settings.includes("selectedOwnershipTarget") || settings.includes("transferTargetUserId"),
  "Expected settings page to track the selected ownership transfer target instead of showing a placeholder-only action"
);

const workspaceProfileIndex = settings.indexOf("Workspace Profile");
const inviteEmailIndex = settings.indexOf("Invite Email");
const inviteRoleIndex = settings.indexOf("Invite Role");
const usersPageUsernameIndex = usersPage.indexOf("Username");
const usersPagePasswordIndex = usersPage.indexOf("Password");
const usersPageRoleIndex = usersPage.indexOf("Role");

assert(
  inviteEmailIndex === -1 && inviteRoleIndex === -1,
  "Expected invite controls to be removed from the Settings page entirely"
);

assert(
  usersPageUsernameIndex !== -1 && usersPagePasswordIndex !== -1 && usersPageRoleIndex !== -1,
  "Expected direct user creation controls to be rendered on the Users page"
);

assert(
  workspaceProfileIndex !== -1,
  "Expected Workspace Profile section to remain available on the Settings page"
);

assert(
  metricCards.includes("useInventoryStore") &&
    !metricCards.includes('currency: "USD"') &&
    (metricCards.includes("formatCurrency(") || metricCards.includes("getCurrencyCode(") || metricCards.includes("organization.currency")),
  "Expected dashboard metric cards to derive currency formatting from organization settings instead of hardcoding USD"
);

assert(
  utils.includes("formatCurrency") && utils.includes("getCurrencyCode"),
  "Expected shared currency helpers so settings changes propagate consistently across the app"
);

console.log("Verified settings propagation contract across settings state, shared utilities, and dashboard currency formatting");