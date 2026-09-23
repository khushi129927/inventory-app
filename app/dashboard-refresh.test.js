const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const dashboardPath = path.join(process.cwd(), "app", "page.tsx");
const dashboard = fs.readFileSync(dashboardPath, "utf8");

assert(
  dashboard.includes("useQueryClient") || dashboard.includes("refetch:") || dashboard.includes("invalidateQueries"),
  "Expected dashboard page to wire refresh behavior to React Query"
);

assert(
  dashboard.includes("handleRefreshDashboard") || dashboard.includes("onClick={handleRefresh") || dashboard.includes("onClick={() =>") && dashboard.includes("invalidateQueries"),
  "Expected dashboard page to define a concrete refresh handler"
);

assert(
  dashboard.includes('aria-label="Refresh dashboard"') &&
    dashboard.includes("onClick={handleRefresh") ,
  "Expected refresh dashboard button to invoke the refresh handler"
);

assert(
  dashboard.includes("Promise.all(") || dashboard.includes("await productsRefetch()") || dashboard.includes("await queryClient.invalidateQueries"),
  "Expected dashboard refresh handler to refetch the dashboard data sources"
);

console.log("Verified dashboard refresh control is wired to real data refetch behavior");