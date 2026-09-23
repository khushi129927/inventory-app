const fs = require("fs");
const path = require("path");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const buildSummaryPath = path.join(process.cwd(), "components", "pc-builder", "build-summary-panel.tsx");
const source = fs.readFileSync(buildSummaryPath, "utf8");

assert(
  source.includes("Save to Cart") &&
    source.includes("Order Now") &&
    source.includes("New Build"),
  "Expected build summary action buttons to exist"
);

assert(
  source.includes('className="w-full h-8 text-[12px] font-semibold bg-white text-foreground border-border hover:bg-white/90"') ||
    source.includes('className="w-full h-8 text-[12px] font-semibold border-border bg-white text-foreground hover:bg-white/90"'),
  "Expected build summary action boxes for Save to Cart, Order Now, and New Build to use a white background with readable foreground text"
);

console.log("Verified build summary action boxes use a white background");
