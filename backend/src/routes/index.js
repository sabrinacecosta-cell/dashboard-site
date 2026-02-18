const express = require('express');
const authRoutes = require('./authRoutes');
const producaoRoutes = require('./producaoRoutes');
const adminRoutes = require('./adminRoutes');

const router = express.Router();

router.use('/', authRoutes);
router.use('/', producaoRoutes);
router.use('/', adminRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
