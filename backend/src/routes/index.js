const express = require('express');
const authRoutes = require('./authRoutes');
const producaoRoutes = require('./producaoRoutes');
const adminRoutes = require('./adminRoutes');
const contemplacaoRoutes = require('./contemplacaoRoutes');
const simuladorRoutes = require('./simuladorRoutes');
const comissoesRoutes = require('./comissoesRoutes');

const router = express.Router();

router.use('/', authRoutes);
router.use('/', producaoRoutes);
router.use('/', adminRoutes);
router.use('/contemplacao', contemplacaoRoutes);
router.use('/simulador', simuladorRoutes);
router.use('/', comissoesRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
