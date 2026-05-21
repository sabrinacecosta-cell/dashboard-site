const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/grupos', authMiddleware, async (req, res) => {
  const { modalidade } = req.query;
  if (!modalidade || !['imovel', 'auto'].includes(modalidade))
    return res.status(400).json({ error: 'modalidade inválida. Use imovel ou auto.' });

  const ctable = modalidade === 'auto' ? 'contemplacao_auto' : 'contemplacao';

  const orderExpr = `
    CASE
      WHEN mes NOT LIKE '%/%' THEN
        CASE LOWER(mes)
          WHEN 'abril' THEN 1 WHEN 'maio' THEN 2 WHEN 'junho' THEN 3
          WHEN 'julho' THEN 4 WHEN 'agosto' THEN 5 WHEN 'setembro' THEN 6
          WHEN 'outubro' THEN 7 WHEN 'novembro' THEN 8 WHEN 'dezembro' THEN 9
          WHEN 'janeiro' THEN 10 WHEN 'fevereiro' THEN 11 WHEN 'março' THEN 12
          ELSE 99
        END
      ELSE
        (CAST(SPLIT_PART(mes,'/',2) AS INTEGER) - 2024) * 12 +
        CASE LOWER(SPLIT_PART(mes,'/',1))
          WHEN 'janeiro' THEN 1 WHEN 'fevereiro' THEN 2 WHEN 'março' THEN 3
          WHEN 'abril' THEN 4 WHEN 'maio' THEN 5 WHEN 'junho' THEN 6
          WHEN 'julho' THEN 7 WHEN 'agosto' THEN 8 WHEN 'setembro' THEN 9
          WHEN 'outubro' THEN 10 WHEN 'novembro' THEN 11 WHEN 'dezembro' THEN 12
          ELSE 0
        END + 100
    END DESC`;

  try {
    const result = await db.query(
      `SELECT
        sg.*,
        ROUND(
          SUM(c.contemplados)::numeric / NULLIF(SUM(c.qnt_lances), 0), 6
        ) AS media_contemplacao,
        (
          SELECT lance_percent
          FROM ${ctable}
          WHERE grupo = sg.numero_grupo
          ORDER BY ${orderExpr}
          LIMIT 1
        ) AS lance_ultimo_mes
      FROM simulador_grupos sg
      LEFT JOIN ${ctable} c ON c.grupo = sg.numero_grupo
      WHERE sg.modalidade = $1
      GROUP BY sg.id
      ORDER BY sg.numero_grupo ASC`,
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
