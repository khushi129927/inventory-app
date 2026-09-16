const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateInventory = [
  body('product_name').trim().notEmpty().withMessage('Product name is required'),
  body('sku').trim().notEmpty().withMessage('SKU is required'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  body('purchase_cost').isNumeric().withMessage('Purchase cost must be a number'),
];

// Helper to log activity
async function logActivity(userId, action, table, recordId) {
  try {
    await db.query(
      'INSERT INTO activity_log (user_id, action, table_affected, record_id) VALUES ($1, $2, $3, $4)',
      [userId, action, table, recordId]
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

// GET /api/inventory - List all items
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM inventory ORDER BY product_name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/inventory/:id - Get single item
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM inventory WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/inventory - Create item (Creator only)
router.post('/', verifyToken, requireRole(['creator']), validateInventory, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { product_name, sku, quantity, purchase_cost } = req.body;

  try {
    const result = await db.query(
      'INSERT INTO inventory (product_name, sku, quantity, purchase_cost, last_updated_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [product_name, sku, quantity, purchase_cost, req.user.id]
    );

    const newItem = result.rows[0];
    await logActivity(req.user.id, `Created item: ${product_name} (SKU: ${sku})`, 'inventory', newItem.id);

    res.status(201).json(newItem);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'SKU already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/inventory/:id - Update item (Creator only)
router.put('/:id', verifyToken, requireRole(['creator']), validateInventory, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { product_name, sku, quantity, purchase_cost } = req.body;
  const id = req.params.id;

  try {
    const result = await db.query(
      'UPDATE inventory SET product_name = $1, sku = $2, quantity = $3, purchase_cost = $4, last_updated_at = CURRENT_TIMESTAMP, last_updated_by = $5 WHERE id = $6 RETURNING *',
      [product_name, sku, quantity, purchase_cost, req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const updatedItem = result.rows[0];
    await logActivity(req.user.id, `Updated item: ${product_name} (ID: ${id})`, 'inventory', id);

    res.json(updatedItem);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'SKU already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/inventory/:id - Delete item (Creator only)
router.delete('/:id', verifyToken, requireRole(['creator']), async (req, res) => {
  const id = req.params.id;

  try {
    const result = await db.query('DELETE FROM inventory WHERE id = $1 RETURNING product_name', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await logActivity(req.user.id, `Deleted item: ${result.rows[0].product_name} (ID: ${id})`, 'inventory', id);
    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
