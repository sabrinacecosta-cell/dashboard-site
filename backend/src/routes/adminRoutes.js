const express = require('express');
const AdminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const db = require('../config/database');

const router = express.Router();

const ADMIN_EMAILS = ['sabrina@jtdkinvest.com', 'joel@jtdkinvest.com'];
const adminOnly = (req, res, next) => {
  if (!ADMIN_EMAILS.includes(req.userEmail)) return res.status(403).json({ error: 'Acesso restrito' });
  next();
};

// Existing routes
router.post('/admin/importar', authMiddleware, AdminController.importarDados);
router.post('/admin/resetar-senhas', authMiddleware, AdminController.resetarSenhas);

// GET — data for admin page
router.get('/admin/comissoes/clientes', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await db.query('SELECT DISTINCT cliente FROM comissoes WHERE cliente IS NOT NULL ORDER BY cliente');
    res.json(result.rows.map(r => r.cliente));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/admin/grupos', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM simulador_grupos ORDER BY modalidade, numero_grupo');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/admin/contemplacao', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { tipo, grupo } = req.query;
    const table = tipo === 'auto' ? 'contemplacao_auto' : 'contemplacao';
    const result = grupo
      ? await db.query(`SELECT * FROM ${table} WHERE grupo = $1 ORDER BY id`, [parseInt(grupo)])
      : await db.query(`SELECT * FROM ${table} ORDER BY grupo, id`);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/admin/cotas', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { grupo, modalidade } = req.query;
    if (!grupo || !modalidade) return res.status(400).json({ error: 'grupo e modalidade obrigatórios' });
    const result = await db.query(
      'SELECT * FROM simulador_cotas WHERE numero_grupo = $1 AND modalidade = $2 ORDER BY bem_referencia, redutor_parcela',
      [parseInt(grupo), modalidade]
    );
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT — update client name in all comissoes rows
router.put('/admin/comissoes/cliente', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { nomeAntigo, nomeNovo } = req.body;
    if (!nomeAntigo || !nomeNovo) return res.status(400).json({ error: 'nomeAntigo e nomeNovo obrigatórios' });
    const result = await db.query('UPDATE comissoes SET cliente = $1 WHERE cliente = $2', [nomeNovo, nomeAntigo]);
    res.json({ updated: result.rowCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT — decrement all prazo_restante
router.put('/admin/grupos/prazo/decrement', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.query('UPDATE simulador_grupos SET prazo_restante = prazo_restante - 1 WHERE prazo_restante > 0');
    await db.query(`
      UPDATE simulador_cotas sc
      SET parcela = ROUND((sc.cota * (1 + sg.taxa_adm + sg.fundo_reserva) / sg.prazo_restante)::numeric, 2)
      FROM simulador_grupos sg
      WHERE sc.numero_grupo = sg.numero_grupo
        AND sc.modalidade = sg.modalidade
        AND sc.redutor_parcela = 0
        AND sg.prazo_restante > 0
    `);
    await db.query(`
      UPDATE simulador_cotas sc
      SET parcela = ROUND((sc.cota * (1 + COALESCE(sg.taxa_adm_redutor, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante / 2)::numeric, 2)
      FROM simulador_grupos sg
      WHERE sc.numero_grupo = sg.numero_grupo
        AND sc.modalidade = sg.modalidade
        AND sc.redutor_parcela = 0.5
        AND sg.prazo_restante > 0
    `);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT — update a single grupo
router.put('/admin/grupos/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { prazo_restante, media_contemplacao, lance_maximo_contemplado, lance_ultimo_mes, sem_media_contemplacao } = req.body;
    await db.query(
      `UPDATE simulador_grupos SET
        prazo_restante = $1, media_contemplacao = $2, lance_maximo_contemplado = $3,
        lance_ultimo_mes = $4, sem_media_contemplacao = $5
       WHERE id = $6`,
      [prazo_restante, media_contemplacao ?? null, lance_maximo_contemplado ?? null, lance_ultimo_mes ?? null, sem_media_contemplacao ?? false, req.params.id]
    );
    if (prazo_restante > 0) {
      await db.query(`
        UPDATE simulador_cotas sc
        SET parcela = ROUND((sc.cota * (1 + sg.taxa_adm + sg.fundo_reserva) / sg.prazo_restante)::numeric, 2)
        FROM simulador_grupos sg
        WHERE sc.numero_grupo = sg.numero_grupo
          AND sc.modalidade = sg.modalidade
          AND sc.redutor_parcela = 0
          AND sg.id = $1
      `, [req.params.id]);
      await db.query(`
        UPDATE simulador_cotas sc
        SET parcela = ROUND((sc.cota * (1 + COALESCE(sg.taxa_adm_redutor, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante / 2)::numeric, 2)
        FROM simulador_grupos sg
        WHERE sc.numero_grupo = sg.numero_grupo
          AND sc.modalidade = sg.modalidade
          AND sc.redutor_parcela = 0.5
          AND sg.id = $1
      `, [req.params.id]);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST — add contemplacao row
router.post('/admin/contemplacao', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { tipo, grupo, mes, lance_percent, qnt_lances, contemplados, contemplacao_mensal } = req.body;
    const table = tipo === 'auto' ? 'contemplacao_auto' : 'contemplacao';
    const result = await db.query(
      `INSERT INTO ${table} (grupo, mes, lance_percent, qnt_lances, contemplados, contemplacao_mensal)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [grupo, mes, lance_percent, qnt_lances, contemplados, contemplacao_mensal]
    );
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE — remove contemplacao row
router.delete('/admin/contemplacao/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { tipo } = req.query;
    const table = tipo === 'auto' ? 'contemplacao_auto' : 'contemplacao';
    await db.query(`DELETE FROM ${table} WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT — update cota
router.put('/admin/cotas/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { bem_referencia, parcela, redutor_parcela } = req.body;
    await db.query(
      'UPDATE simulador_cotas SET bem_referencia = $1, parcela = $2, redutor_parcela = $3 WHERE id = $4',
      [bem_referencia, parcela, redutor_parcela, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST — add cota
router.post('/admin/cotas', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { numero_grupo, modalidade, bem_referencia, parcela, redutor_parcela } = req.body;
    const result = await db.query(
      'INSERT INTO simulador_cotas (numero_grupo, modalidade, bem_referencia, parcela, redutor_parcela) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [numero_grupo, modalidade, bem_referencia, parcela, redutor_parcela ?? 0]
    );
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE — remove cota
router.delete('/admin/cotas/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM simulador_cotas WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
