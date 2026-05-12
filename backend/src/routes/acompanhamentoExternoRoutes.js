const express = require('express');
const db = require('../config/database');
const router = express.Router();

const apiKeyMiddleware = (req, res, next) => {
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.ACOMPANHAMENTO_API_KEY) {
    return res.status(401).json({ error: 'API Key inválida' });
  }
  next();
};

// GET /api/externo/acompanhamento
router.get('/acompanhamento', apiKeyMiddleware, async (req, res) => {
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
