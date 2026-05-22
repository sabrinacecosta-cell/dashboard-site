const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');

const AGENDA_BACKEND_URL = process.env.AGENDA_BACKEND_URL || 'http://localhost:3002';

router.get('/agenda/events/today', authMiddleware, async (req, res) => {
  try {
    const response = await fetch(`${AGENDA_BACKEND_URL}/api/agenda/events/today`);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar eventos da agenda:', err.message);
    res.status(500).json({ error: 'Erro ao buscar eventos da agenda' });
  }
});

module.exports = router;
