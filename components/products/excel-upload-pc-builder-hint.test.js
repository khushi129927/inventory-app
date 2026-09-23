const fs = require("fs");
const path = require("path");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const dialogPath = path.join(process.cwd(), "components", "products", "excel-upload-dialog.tsx");
const source = fs.readFileSync(dialogPath, "utf8");

assert(
  source.includes("CPU") &&
    source.includes("Motherboard") &&
    source.includes("RAM") &&
    source.includes("SSD") &&
    source.includes("GPU") &&
    source.includes("Cooler") &&
    source.includes("Cabinet") &&
    source.includes("SMPS") &&
    source.includes("UPS") &&
    source.includes("Monitor") &&
    source.includes("Other"),
  "Expected the Excel upload dialog to describe the supported PC builder categories"
);

console.log("Verified Excel upload dialog mentions the supported PC builder categories");
