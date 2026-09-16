const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();
const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const paymentsRoutes = require('./routes/payments');
const { verifyToken, requireRole } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Default Vite port
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.use(express.json());

// Routes
app.use('/api', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/payments', paymentsRoutes);

// Test route for role verification
app.get('/api/test-admin', verifyToken, requireRole(['creator']), (req, res) => {
  res.json({ message: 'Welcome, Admin! You have creator access.' });
});

app.get('/api/test-user', verifyToken, requireRole(['creator', 'sales']), (req, res) => {
  res.json({ message: 'Welcome! You have basic access.' });
});

app.get('/', (req, res) => {
  res.send('Inventory and Payment Tracking API is running');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
