const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validatePayment = [
  body('customer_name').trim().notEmpty().withMessage('Customer name is required'),
  body('amount_received').isNumeric().withMessage('Amount received must be a number'),
  body('payment_date').isISO8601().withMessage('A valid payment date is required'),
  body('payment_medium').isIn(['bank', 'UPI', 'cheque', 'cash']).withMessage('Invalid payment medium'),
  body('amount_pending').isNumeric().withMessage('Amount pending must be a number'),
  body('expected_pending_date').optional({ checkFalsy: true }).isISO8601().withMessage('Expected pending date must be a valid date'),
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

// GET /api/payments - List all payments
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM payments ORDER BY payment_date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/payments/:id - Get single payment
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM payments WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/payments - Create payment (Creator and Sales)
router.post('/', verifyToken, requireRole(['creator', 'sales']), validatePayment, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { customer_name, amount_received, payment_date, payment_medium, amount_pending, expected_pending_date } = req.body;

  try {
    const result = await db.query(
      'INSERT INTO payments (customer_name, amount_received, payment_date, payment_medium, amount_pending, expected_pending_date, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [customer_name, amount_received, payment_date, payment_medium, amount_pending, expected_pending_date, req.user.id]
    );

    const newPayment = result.rows[0];
    await logActivity(req.user.id, `Logged payment for ${customer_name}: ${amount_received}`, 'payments', newPayment.id);

    res.status(201).json(newPayment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/payments/:id - Update payment (Creator only)
router.put('/:id', verifyToken, requireRole(['creator']), validatePayment, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { customer_name, amount_received, payment_date, payment_medium, amount_pending, expected_pending_date } = req.body;
  const id = req.params.id;

  try {
    const result = await db.query(
      'UPDATE payments SET customer_name = $1, amount_received = $2, payment_date = $3, payment_medium = $4, amount_pending = $5, expected_pending_date = $6 WHERE id = $7 RETURNING *',
      [customer_name, amount_received, payment_date, payment_medium, amount_pending, expected_pending_date, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    const updatedPayment = result.rows[0];
    await logActivity(req.user.id, `Updated payment ID ${id} for ${customer_name}`, 'payments', id);

    res.json(updatedPayment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/payments/:id - Delete payment (Creator only)
router.delete('/:id', verifyToken, requireRole(['creator']), async (req, res) => {
  const id = req.params.id;

  try {
    const result = await db.query('DELETE FROM payments WHERE id = $1 RETURNING customer_name', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    await logActivity(req.user.id, `Deleted payment for ${result.rows[0].customer_name} (ID: ${id})`, 'payments', id);
    res.json({ message: 'Payment record deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
