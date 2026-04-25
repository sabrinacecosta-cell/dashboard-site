const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/grupos', authMiddleware, async (req, res) => {
  const { modalidade } = req.query;
  if (!modalidade || !['imovel', 'auto'].includes(modalidade))
    return res.status(400).json({ error: 'modalidade inválida. Use imovel ou auto.' });

  try {
    const result = await db.query(
      `SELECT * FROM simulador_grupos WHERE modalidade = $1 ORDER BY numero_grupo ASC`,
      [modalidade]
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/cotas', authMiddleware, async (req, res) => {
  const { grupo, modalidade } = req.query;
  if (!grupo || !modalidade)
    return res.status(400).json({ error: 'grupo e modalidade são obrigatórios' });
  if (!['imovel', 'auto'].includes(modalidade))
    return res.status(400).json({ error: 'modalidade inválida. Use imovel ou auto.' });

  try {
    const result = await db.query(
      `SELECT * FROM simulador_cotas
       WHERE numero_grupo = $1 AND modalidade = $2
       ORDER BY bem_referencia ASC, redutor_parcela ASC`,
      [parseInt(grupo), modalidade]
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
