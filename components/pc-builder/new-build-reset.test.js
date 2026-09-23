const fs = require("fs");
const path = require("path");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const workspacePath = path.join(process.cwd(), "components", "pc-builder", "builder-workspace.tsx");
const source = fs.readFileSync(workspacePath, "utf8");

assert(
  source.includes("const handleNewBuild = () => {") &&
    source.includes("setSelectedSlots({});") &&
    source.includes('type: "flat"') &&
    source.includes("value: 0") &&
    source.includes("setOpenStep(categories[0]);"),
  "Expected New Build to clear selected products, reset margin, and return to the first category"
);

console.log("Verified New Build already resets the current build summary selections");
