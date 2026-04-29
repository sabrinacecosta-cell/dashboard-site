const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const db = require('../config/database');

const router = express.Router();

const ADMIN_EMAILS = ['sabrina@jtdkinvest.com', 'joel@wflowinvest.com'];

router.get('/comissoes', authMiddleware, async (req, res) => {
  if (!ADMIN_EMAILS.includes(req.userEmail)) {
    return res.status(403).json({ error: 'Acesso restrito' });
  }
  try {
    const result = await db.query(
      'SELECT * FROM comissoes ORDER BY mes_referencia DESC, data_venda DESC'
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar comissões:', error);
    return res.status(500).json({ error: 'Erro ao buscar dados' });
  }
});

module.exports = router;
