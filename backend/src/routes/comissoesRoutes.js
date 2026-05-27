const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const db = require('../config/database');

const router = express.Router();

const ADMIN_EMAILS = ['sabrina@jtdkinvest.com', 'joel@wflowinvest.com'];

// Emails que acessam a aba de comissões mas não visualizam nenhum dado
const EMAILS_SEM_COMISSOES = ['paula.santana@xpi.com.br'];

router.get('/comissoes', authMiddleware, async (req, res) => {
  // Usuários bloqueados de ver dados de comissões recebem array vazio
  if (EMAILS_SEM_COMISSOES.includes(req.userEmail)) {
    return res.json([]);
  }

  const isAdmin = ADMIN_EMAILS.includes(req.userEmail);
  try {
    const result = isAdmin
      ? await db.query('SELECT * FROM comissoes ORDER BY mes_referencia DESC, data_venda DESC')
      : await db.query(
          'SELECT * FROM comissoes WHERE email_assessor = $1 ORDER BY mes_referencia DESC, data_venda DESC',
          [req.userEmail]
        );
    return res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar comissões:', error);
    return res.status(500).json({ error: 'Erro ao buscar dados' });
  }
});

module.exports = router;
