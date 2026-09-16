const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

async function createSampleExcel() {
  const data = [
    { 'Product Name': 'Laptop Dell XPS', 'SKU': 'DELL-XPS-01', 'Quantity': 10, 'Purchase Cost': 1200.50 },
    { 'Product Name': 'Monitor LG 27"', 'SKU': 'LG-MON-27', 'Quantity': 25, 'Purchase Cost': 300.00 },
    { 'Product Name': 'Keyboard Mechanical', 'SKU': 'KBD-MECH-01', 'Quantity': 50, 'Purchase Cost': 80.00 },
    { 'Product Name': 'Mouse Wireless', 'SKU': 'MOU-WRL-01', 'Quantity': 100, 'Purchase Cost': 25.00 },
    { 'Product Name': 'Malformed Item', 'SKU': '', 'Quantity': 'NaN', 'Purchase Cost': 'Free' }, // Should fail
  ];

  const worksheet = xlsx.utils.json_to_sheet(data);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Inventory');

  const dir = path.resolve(__dirname, '../test-data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, 'sample-inventory.xlsx');
  xlsx.writeFile(workbook, filePath);

  console.log(`Sample Excel created at: ${filePath}`);
}

createSampleExcel();
