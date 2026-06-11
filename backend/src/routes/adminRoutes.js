const express = require('express');
const AdminController = require('../controllers/adminController');
const UsuarioModel = require('../models/usuarioModel');
const AuthService = require('../services/authService');
const authMiddleware = require('../middlewares/authMiddleware');
const db = require('../config/database');

const router = express.Router();

const ADMIN_EMAILS = ['sabrina@jtdkinvest.com', 'joel@jtdkinvest.com', 'joel@wflowinvest.com'];
const adminOnly = (req, res, next) => {
  // Demo user passa pelo adminOnly mas os handlers individuais retornam mock
  if (req.isDemo) return next();
  if (!ADMIN_EMAILS.includes(req.userEmail)) return res.status(403).json({ error: 'Acesso restrito' });
  next();
};

// Bloqueia qualquer escrita do usuário demo
const demoReadOnly = (req, res, next) => {
  if (req.isDemo) return res.status(403).json({ error: 'Indisponível no modo demo' });
  next();
};

// Existing routes
router.post('/admin/importar', authMiddleware, demoReadOnly, AdminController.importarDados);
router.post('/admin/resetar-senhas', authMiddleware, demoReadOnly, AdminController.resetarSenhas);

router.post('/admin/resetar-senha-usuario', authMiddleware, adminOnly, demoReadOnly, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email obrigatório' });
    const result = await db.query(
      'UPDATE usuarios SET senha_hash = NULL WHERE email = $1 RETURNING id, nome, email',
      [email.toLowerCase().trim()]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Usuário não encontrado' });

    let emailEnviado = true;
    try {
      await AuthService.enviarLinkRedefinicao(result.rows[0], { contexto: 'reset', horasValidade: 168 });
    } catch (e) {
      emailEnviado = false;
      console.error('Falha ao enviar e-mail de reset:', e);
    }
    const message = emailEnviado
      ? `Senha de ${email} resetada — e-mail com link para criar nova senha enviado`
      : `Senha de ${email} resetada, mas falhou o envio do e-mail. Peça para usar "Esqueci minha senha".`;
    res.json({ success: true, emailEnviado, message });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET — data for admin page
router.get('/admin/comissoes/clientes', authMiddleware, adminOnly, async (req, res) => {
  if (req.isDemo) return res.json([
    'Beatriz Lopes Carvalho', 'Fernando Machado Jr.', 'Juliana Neves Brandão',
    'Mariana Costa Pereira', 'Patrícia Duarte Melo', 'Ricardo Oliveira Pinto',
    'Roberto Alves Silva', 'Thiago Ramos Fontes',
  ]);
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
router.put('/admin/comissoes/cliente', authMiddleware, adminOnly, demoReadOnly, async (req, res) => {
  try {
    const { nomeAntigo, nomeNovo } = req.body;
    if (!nomeAntigo || !nomeNovo) return res.status(400).json({ error: 'nomeAntigo e nomeNovo obrigatórios' });
    const result = await db.query('UPDATE comissoes SET cliente = $1 WHERE cliente = $2', [nomeNovo, nomeAntigo]);
    res.json({ updated: result.rowCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT — decrement all prazo_restante
router.put('/admin/grupos/prazo/decrement', authMiddleware, adminOnly, demoReadOnly, async (req, res) => {
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
router.put('/admin/grupos/:id', authMiddleware, adminOnly, demoReadOnly, async (req, res) => {
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
router.post('/admin/contemplacao', authMiddleware, adminOnly, demoReadOnly, async (req, res) => {
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
router.delete('/admin/contemplacao/:id', authMiddleware, adminOnly, demoReadOnly, async (req, res) => {
  try {
    const { tipo } = req.query;
    const table = tipo === 'auto' ? 'contemplacao_auto' : 'contemplacao';
    await db.query(`DELETE FROM ${table} WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT — update cota
router.put('/admin/cotas/:id', authMiddleware, adminOnly, demoReadOnly, async (req, res) => {
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
router.post('/admin/cotas', authMiddleware, adminOnly, demoReadOnly, async (req, res) => {
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
router.delete('/admin/cotas/:id', authMiddleware, adminOnly, demoReadOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM simulador_cotas WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET — lista assessores com/sem email na producao
router.get('/admin/assessores', authMiddleware, adminOnly, async (req, res) => {
  if (req.isDemo) return res.json([
    { assessor: 'Ana Lima',       email_assessor: 'demo@jtdkinvest.com' },
    { assessor: 'Carlos Mendes',  email_assessor: 'carlos.mendes@demo.com' },
    { assessor: 'Fernanda Souza', email_assessor: 'fernanda.souza@demo.com' },
  ]);
  try {
    const result = await db.query(`
      SELECT DISTINCT assessor, email_assessor
      FROM producao
      WHERE assessor IS NOT NULL AND TRIM(assessor) != ''
      ORDER BY assessor
    `);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT — atualiza email de assessor em toda a producao
router.put('/admin/assessores/email', authMiddleware, adminOnly, demoReadOnly, async (req, res) => {
  try {
    const { assessor, email } = req.body;
    if (!assessor) return res.status(400).json({ error: 'assessor obrigatório' });
    const result = await db.query(
      `UPDATE producao SET email_assessor = $1 WHERE assessor = $2`,
      [email || null, assessor]
    );
    res.json({ updated: result.rowCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET — lista usuários (contas de login)
router.get('/admin/usuarios', authMiddleware, adminOnly, async (req, res) => {
  if (req.isDemo) return res.json([
    { id: 'u-demo-1', nome: 'Ana Lima',       email: 'ana.lima@demo.com',      tem_senha: true, criado_em: new Date('2024-01-10') },
    { id: 'u-demo-2', nome: 'Carlos Mendes',  email: 'carlos.mendes@demo.com', tem_senha: true, criado_em: new Date('2024-02-05') },
    { id: 'u-demo-3', nome: 'Fernanda Souza', email: 'fernanda.souza@demo.com',tem_senha: true, criado_em: new Date('2024-03-20') },
    { id: 'u-demo-4', nome: 'Usuário Demo',   email: 'demo@jtdkinvest.com',    tem_senha: true, criado_em: new Date('2024-01-01') },
  ]);
  try {
    const result = await db.query(
      'SELECT id, nome, email, senha_hash IS NOT NULL AS tem_senha, criado_em FROM usuarios ORDER BY nome'
    );
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST — cadastra novo usuário (sem senha; recebe e-mail com link para definir a senha)
router.post('/admin/usuarios', authMiddleware, adminOnly, demoReadOnly, async (req, res) => {
  try {
    const nome = (req.body.nome || '').trim();
    const email = (req.body.email || '').toLowerCase().trim();
    if (!nome || !email) return res.status(400).json({ error: 'nome e email obrigatórios' });

    const existente = await UsuarioModel.findByEmail(email);
    if (existente) return res.status(409).json({ error: 'Já existe um usuário com este e-mail' });

    const usuario = await UsuarioModel.create({ nome, email, senha_hash: null });

    let emailEnviado = true;
    try {
      await AuthService.enviarLinkRedefinicao(usuario, { contexto: 'novo', horasValidade: 168 });
    } catch (e) {
      emailEnviado = false;
      console.error('Falha ao enviar e-mail de boas-vindas:', e);
    }
    res.status(201).json({ success: true, usuario, emailEnviado });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE — remove usuário
router.delete('/admin/usuarios/:id', authMiddleware, adminOnly, demoReadOnly, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
