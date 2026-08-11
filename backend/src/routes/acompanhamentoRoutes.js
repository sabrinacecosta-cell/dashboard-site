const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middlewares/authMiddleware');
const { ACOMPANHAMENTO } = require('../data/mockData');

const router = express.Router();

router.get('/acompanhamento', authMiddleware, async (req, res) => {
  if (req.isDemo) return res.json(ACOMPANHAMENTO);
  try {
    const result = await db.query(
      'SELECT * FROM acompanhamento ORDER BY cliente_nome, grupo, cota'
    );
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar dados' });
  }
});

module.exports = router;
