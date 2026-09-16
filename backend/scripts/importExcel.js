const chokidar = require('chokidar');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const db = require('../db');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// --- CONFIGURATION ---
// Map Excel Column Names -> Database Column Names
const COLUMN_MAPPING = {
  'Product Name': 'product_name',
  'SKU': 'sku',
  'Quantity': 'quantity',
  'Purchase Cost': 'purchase_cost',
};

const WATCH_FOLDER = process.env.WATCH_FOLDER || path.resolve(__dirname, '../watch');
const SYSTEM_USER_ID = 1; // Assuming ID 1 is the creator/system user for logging imports
// ---------------------

async function logImportActivity(action, fileName, detail) {
  try {
    await db.query(
      'INSERT INTO activity_log (user_id, action, table_affected, record_id) VALUES ($1, $2, $3, $4)',
      [SYSTEM_USER_ID, `Excel Import: ${action} in ${fileName} - ${detail}`, 'inventory', null]
    );
  } catch (err) {
    console.error('Failed to log import activity:', err);
  }
}

async function processExcelFile(filePath) {
  console.log(`\n📖 Processing file: ${filePath}`);

  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    console.log(`Found ${data.length} rows. Importing...`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // 1-based + header

      try {
        // Map excel columns to db columns
        const mappedData = {};
        for (const [excelCol, dbCol] of Object.entries(COLUMN_MAPPING)) {
          mappedData[dbCol] = row[excelCol];
        }

        // Validation
        if (!mappedData.product_name || !mappedData.sku || mappedData.quantity === undefined || mappedData.purchase_cost === undefined) {
          throw new Error(`Missing required columns. Found: ${JSON.stringify(row)}`);
        }

        if (isNaN(mappedData.quantity) || isNaN(mappedData.purchase_cost)) {
          throw new Error(`Invalid numeric values for quantity or cost.`);
        }

        // Upsert based on SKU
        const result = await db.query(
          `INSERT INTO inventory (product_name, sku, quantity, purchase_cost, last_updated_by)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (sku) DO UPDATE
           SET product_name = EXCLUDED.product_name,
               quantity = EXCLUDED.quantity,
               purchase_cost = EXCLUDED.purchase_cost,
               last_updated_at = CURRENT_TIMESTAMP,
               last_updated_by = EXCLUDED.last_updated_by
           RETURNING id`,
          [mappedData.product_name, mappedData.sku, mappedData.quantity, mappedData.purchase_cost, SYSTEM_USER_ID]
        );

        const recordId = result.rows[0].id;
        await logImportActivity('Upsert', path.basename(filePath), `SKU: ${mappedData.sku} (ID: ${recordId})`);
        successCount++;

      } catch (rowErr) {
        console.error(`❌ Row ${rowNum} failed: ${rowErr.message}`);
        await logImportActivity('Error', path.basename(filePath), `Row ${rowNum}: ${rowErr.message}`);
        failCount++;
      }
    }

    console.log(`\nImport Finished: ${successCount} succeeded, ${failCount} failed.`);

    // Optionally move file to an 'archive' folder to avoid re-processing
    // const archiveFolder = path.join(WATCH_FOLDER, 'archive');
    // if (!fs.existsSync(archiveFolder)) fs.mkdirSync(archiveFolder);
    // fs.renameSync(filePath, path.join(archiveFolder, path.basename(filePath)));

  } catch (fileErr) {
    console.error(`Critical error reading file ${filePath}:`, fileErr);
  }
}

// Ensure watch folder exists
if (!fs.existsSync(WATCH_FOLDER)) {
  fs.mkdirSync(WATCH_FOLDER, { recursive: true });
  console.log(`Created watch folder: ${WATCH_FOLDER}`);
}

console.log(`👀 Watching for .xlsx files in: ${WATCH_FOLDER}`);

const watcher = chokidar.watch(WATCH_FOLDER, {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true,
  awaitWriteFinish: {
    stabilityThreshold: 2000,
    pollInterval: 100,
  },
});

watcher.on('add', filePath => {
  if (filePath.endsWith('.xlsx')) {
    processExcelFile(filePath);
  }
});

watcher.on('change', filePath => {
  if (filePath.endsWith('.xlsx')) {
    processExcelFile(filePath);
  }
});
