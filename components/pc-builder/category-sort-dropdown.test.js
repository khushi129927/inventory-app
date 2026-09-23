const fs = require("fs");
const path = require("path");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const categoryStepPath = path.join(process.cwd(), "components", "pc-builder", "category-step.tsx");
const source = fs.readFileSync(categoryStepPath, "utf8");

assert(
  source.includes("Sort"),
  "Expected the PC builder category controls to expose a Sort label"
);

assert(
  source.includes("<Select") || source.includes("<NativeSelect") || source.includes("select"),
  "Expected the PC builder category controls to use a dropdown for sort options"
);

assert(
  source.includes("Default") && source.includes("Low to High") && source.includes("High to Low"),
  "Expected the Sort dropdown to contain Default, Low to High, and High to Low options"
);

assert(
  !source.includes("filterOptions.map((option) =>"),
  "Expected the previous button group sort chips to be removed in favor of a dropdown"
);

assert(
  !source.includes('placeholder="Min ₹"') && !source.includes('placeholder="Max ₹"'),
  "Expected inline Min/Max price inputs to be removed so only the Sort dropdown remains"
);

console.log("Verified PC builder category step exposes only a Sort dropdown without inline Min/Max inputs");
