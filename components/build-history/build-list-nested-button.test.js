const fs = require("fs");
const path = require("path");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const buildListPath = path.join(process.cwd(), "components", "build-history", "build-list.tsx");
const source = fs.readFileSync(buildListPath, "utf8");

assert(
  source.includes("<div\n            key={build.id}") &&
    source.includes("<button\n              type=\"button\"") &&
    source.includes("<Button\n                  type=\"button\"\n                  variant=\"ghost\"") &&
    source.includes("<Button\n                type=\"button\"\n                variant=\"outline\""),
  "Expected BuildList to separate the selectable card button from the action buttons"
);

assert(
  !source.includes("<button\n            key={build.id}") &&
    !source.includes("e.stopPropagation();"),
  "Expected BuildList to remove nested button markup and stop relying on event propagation workarounds"
);

console.log("Verified BuildList avoids nested button markup that causes hydration errors");
