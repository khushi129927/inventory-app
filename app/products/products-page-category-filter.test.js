const fs = require("fs");
const path = require("path");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const filePath = path.join(process.cwd(), "app", "products", "page.tsx");
const source = fs.readFileSync(filePath, "utf8");

assert(source.includes('const searchParams = useSearchParams();'), 'Expected Products page to read URL search params');
assert(source.includes('const initialCategoryId = searchParams.get("categoryId");'), 'Expected Products page to seed category filter from query string');
assert(source.includes('categoryId: initialCategoryId,'), 'Expected initial category filter state to use the query string');
assert(source.includes('const categoryId = searchParams.get("categoryId");'), 'Expected Products page effect to watch categoryId changes');
assert(source.includes('setPage(1);'), 'Expected Products page to reset pagination when query category changes');
assert(
  source.includes('Upload Excel') &&
    source.includes('Add Product') &&
    !source.includes('Share Catalog') &&
    source.includes('Stock view') &&
    source.includes('Current day stock') &&
    source.includes('Previous day stock'),
  'Expected Products page controls to keep stock-management actions and stock-view selector without a Share Catalog button'
);

console.log('Verified category query-string hydration in app/products/page.tsx');
