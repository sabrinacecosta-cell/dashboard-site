const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const authMiddleware = require('../middlewares/authMiddleware');
const db = require('../config/database');

const router = express.Router();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Mesma lista de admins da aba Administração
const ADMIN_EMAILS = ['sabrina@jtdkinvest.com', 'joel@jtdkinvest.com', 'joel@wflowinvest.com'];

const isAdmin = (req) => ADMIN_EMAILS.includes(req.userEmail);

function adminOnly(req, res, next) {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Acesso restrito' });
  next();
}

// Mensagem padrão quando não há base nos trechos cadastrados
const SEM_BASE = 'Não encontrei essa informação nas regras cadastradas para esta administradora.';

const SYSTEM_PROMPT =
  'Você responde dúvidas de assessores de consórcio durante reuniões com clientes, ' +
  'com base SOMENTE nos trechos de regras fornecidos. Responda em 1 a 3 frases, em tom ' +
  'natural e direto, como uma pessoa explicando a regra. Se os trechos não contiverem a ' +
  'resposta, diga que a informação não consta nas regras cadastradas. Nunca invente regra ' +
  'nem use conhecimento externo. Não cite números de página.';

// ── GET /faq/administradoras — distinct administradora ──────────────────────
router.get('/administradoras', authMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT DISTINCT administradora FROM faq_entradas ORDER BY administradora'
    );
    return res.json(rows.map((r) => r.administradora));
  } catch (error) {
    console.error('Erro ao buscar administradoras do FAQ:', error);
    return res.status(500).json({ error: 'Erro ao buscar administradoras' });
  }
});

// ── GET /faq/entradas?administradora=X — modo navegação ─────────────────────
router.get('/entradas', authMiddleware, async (req, res) => {
  const administradora = (req.query.administradora || '').trim();
  if (!administradora) return res.status(400).json({ error: 'administradora obrigatória' });

  try {
    const { rows } = await db.query(
      `SELECT id, administradora, categoria, subcategoria, topico, texto, ordem
         FROM faq_entradas
        WHERE administradora = $1
        ORDER BY categoria, subcategoria NULLS FIRST, ordem, topico`,
      [administradora]
    );
    return res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar entradas do FAQ:', error);
    return res.status(500).json({ error: 'Erro ao buscar entradas' });
  }
});

// FTS escopado pela administradora, tolerante a acento e caixa (f_unaccent nos dois
// lados; to_tsvector já normaliza caixa; stemmer 'portuguese' cobre variações).
// O ts_headline usa o texto ORIGINAL (com acento) para preservar a leitura do trecho.
//
// Estratégias em ordem de precisão → recall; retorna a 1ª que achar algo:
//   1) websearch_to_tsquery — AND, respeita aspas/operadores
//   2) plainto_tsquery — AND simples
//   3) OR de todos os termos — mesma tsquery do (2) com & trocado por |, para que
//      uma frase natural (ex.: verbo de ligação sem acento virando termo obrigatório)
//      não zere a busca. Como só roda quando o AND não achou nada e o rank ordena os
//      melhores no topo (LIMIT 5), a precisão continua priorizada.
async function buscarTrechos(administradora, pergunta) {
  // qExpr entra numa subconsulta de 1 linha (qq.q) para aceitar tanto funções
  // quanto expressões com cast (o OR abaixo) na mesma forma.
  const select = (qExpr) => `
    SELECT id, categoria, subcategoria, topico, texto,
           ts_rank_cd(tsv, qq.q) AS rank,
           ts_headline('portuguese', texto, qq.q,
             'StartSel=**,StopSel=**,MaxFragments=2,MaxWords=50,MinWords=15') AS destaque
      FROM faq_entradas, (SELECT ${qExpr} AS q) qq
     WHERE administradora = $2 AND tsv @@ qq.q
     ORDER BY rank DESC LIMIT 5`;

  const estrategias = [
    `websearch_to_tsquery('portuguese', f_unaccent($1))`,
    `plainto_tsquery('portuguese', f_unaccent($1))`,
    `replace(plainto_tsquery('portuguese', f_unaccent($1))::text, '&', '|')::tsquery`,
  ];

  for (const qExpr of estrategias) {
    const { rows } = await db.query(select(qExpr), [pergunta, administradora]);
    if (rows.length > 0) return rows;
  }
  return [];
}

// ── POST /faq/perguntar (todos) ─────────────────────────────────────────────
router.post('/perguntar', authMiddleware, async (req, res) => {
  const administradora = (req.body.administradora || '').trim();
  const pergunta = (req.body.pergunta || '').trim();
  const emailUsuario = req.userEmail;

  if (!administradora) return res.status(400).json({ error: 'administradora obrigatória' });
  if (!pergunta) return res.status(400).json({ error: 'pergunta obrigatória' });

  try {
    const trechos = await buscarTrechos(administradora, pergunta);

    // Nenhum trecho: grava log e responde "não consta", sem chamar o Anthropic.
    if (trechos.length === 0) {
      await db.query(
        `INSERT INTO faq_perguntas_log
           (pergunta, resposta, administradora, email_usuario,
            encontrou_resposta, entradas_recuperadas, trechos_fonte)
         VALUES ($1, $2, $3, $4, false, 0, $5)`,
        [pergunta, SEM_BASE, administradora, emailUsuario, JSON.stringify([])]
      );
      return res.json({ resposta: SEM_BASE, trechos: [] });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY não configurada no servidor' });
    }

    // Trechos numerados para o modelo (topico + texto).
    const trechosNumerados = trechos
      .map((t, i) => `[${i + 1}] ${t.topico}\n${t.texto}`)
      .join('\n\n');

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Pergunta: ${pergunta}\n\nTrechos das regras cadastradas:\n\n${trechosNumerados}`,
        },
      ],
    });

    const resposta = msg.content?.[0]?.text?.trim() || SEM_BASE;

    // top 3 trechos-fonte para retorno e log
    const trechosFonte = trechos.slice(0, 3).map((t) => ({
      categoria: t.categoria,
      subcategoria: t.subcategoria,
      topico: t.topico,
      texto: t.texto,
      destaque: t.destaque,
    }));

    await db.query(
      `INSERT INTO faq_perguntas_log
         (pergunta, resposta, administradora, email_usuario,
          encontrou_resposta, entradas_recuperadas, trechos_fonte)
       VALUES ($1, $2, $3, $4, true, $5, $6)`,
      [pergunta, resposta, administradora, emailUsuario, trechos.length, JSON.stringify(trechosFonte)]
    );

    return res.json({ resposta, trechos: trechosFonte });
  } catch (error) {
    console.error('Erro ao processar pergunta do FAQ:', error);
    return res.status(500).json({ error: 'Erro ao processar a pergunta' });
  }
});

// ── POST /faq/entradas (admin) — cria entrada ───────────────────────────────
router.post('/entradas', authMiddleware, adminOnly, async (req, res) => {
  const { administradora, categoria, subcategoria, topico, texto, ordem } = req.body || {};
  if (!administradora?.trim() || !categoria?.trim() || !topico?.trim() || !texto?.trim()) {
    return res.status(400).json({ error: 'administradora, categoria, topico e texto são obrigatórios' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO faq_entradas
         (administradora, categoria, subcategoria, topico, texto, ordem, criado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, administradora, categoria, subcategoria, topico, texto, ordem`,
      [
        administradora.trim(),
        categoria.trim(),
        subcategoria?.trim() || null,
        topico.trim(),
        texto.trim(),
        Number.isFinite(Number(ordem)) ? Number(ordem) : 0,
        req.userEmail,
      ]
    );
    return res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Erro ao criar entrada do FAQ:', error);
    return res.status(500).json({ error: 'Erro ao criar entrada' });
  }
});

// ── PUT /faq/entradas/:id (admin) — edita ───────────────────────────────────
router.put('/entradas/:id', authMiddleware, adminOnly, async (req, res) => {
  const { administradora, categoria, subcategoria, topico, texto, ordem } = req.body || {};
  if (!administradora?.trim() || !categoria?.trim() || !topico?.trim() || !texto?.trim()) {
    return res.status(400).json({ error: 'administradora, categoria, topico e texto são obrigatórios' });
  }
  try {
    const { rows } = await db.query(
      `UPDATE faq_entradas
          SET administradora = $1, categoria = $2, subcategoria = $3,
              topico = $4, texto = $5, ordem = $6
        WHERE id = $7
        RETURNING id, administradora, categoria, subcategoria, topico, texto, ordem`,
      [
        administradora.trim(),
        categoria.trim(),
        subcategoria?.trim() || null,
        topico.trim(),
        texto.trim(),
        Number.isFinite(Number(ordem)) ? Number(ordem) : 0,
        req.params.id,
      ]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Entrada não encontrada' });
    return res.json(rows[0]);
  } catch (error) {
    console.error('Erro ao editar entrada do FAQ:', error);
    return res.status(500).json({ error: 'Erro ao editar entrada' });
  }
});

// ── DELETE /faq/entradas/:id (admin) ────────────────────────────────────────
router.delete('/entradas/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM faq_entradas WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Entrada não encontrada' });
    return res.json({ ok: true });
  } catch (error) {
    console.error('Erro ao excluir entrada do FAQ:', error);
    return res.status(500).json({ error: 'Erro ao excluir entrada' });
  }
});

// ── GET /faq/log?limit=&offset= (admin) — auditoria ─────────────────────────
router.get('/log', authMiddleware, adminOnly, async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  try {
    const { rows } = await db.query(
      `SELECT id, pergunta, resposta, administradora, email_usuario,
              encontrou_resposta, entradas_recuperadas, trechos_fonte, criado_em
         FROM faq_perguntas_log
        ORDER BY criado_em DESC
        LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar log do FAQ:', error);
    return res.status(500).json({ error: 'Erro ao buscar log' });
  }
});

module.exports = router;
