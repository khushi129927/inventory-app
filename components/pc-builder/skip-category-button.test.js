const fs = require("fs");
const path = require("path");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const categoryStepPath = path.join(process.cwd(), "components", "pc-builder", "category-step.tsx");
const builderWorkspacePath = path.join(process.cwd(), "components", "pc-builder", "builder-workspace.tsx");

const categoryStepSource = fs.readFileSync(categoryStepPath, "utf8");
const builderWorkspaceSource = fs.readFileSync(builderWorkspacePath, "utf8");

assert(
  categoryStepSource.includes("onClick={onSkip}") &&
    categoryStepSource.includes(">\n                    Skip\n                  </button>"),
  "Expected each PC builder category step to render a visible Skip button without the category name"
);

assert(
  !categoryStepSource.includes("Skip {categoryName}"),
  "Expected the Skip button label to remove the category name suffix"
);

assert(
  categoryStepSource.includes("rounded") && categoryStepSource.includes("border border-border-strong"),
  "Expected the Skip action to appear inside a bordered box"
);

assert(
  !categoryStepSource.includes('placeholder="Min ₹"') && !categoryStepSource.includes('placeholder="Max ₹"'),
  "Expected the action area next to Skip to only keep Skip and remove Min/Max controls"
);

assert(
  builderWorkspaceSource.includes("const handleSkipCategory = (categoryName: string) => {") &&
    builderWorkspaceSource.includes("const nextCategory = categories[currentIndex + 1];") &&
    builderWorkspaceSource.includes("setOpenStep(nextCategory);"),
  "Expected skipping a PC builder category to advance the accordion to the next category"
);

console.log("Verified PC builder category steps include a boxed Skip button that advances to the next category");
