const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const authMiddleware = require('../middlewares/authMiddleware');
const db = require('../config/database');

const { COMISSOES } = require('../data/mockData');
const router = express.Router();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ADMIN_EMAILS = ['sabrina@jtdkinvest.com', 'joel@jtdkinvest.com', 'joel@wflowinvest.com'];

const fmtData = (d) => {
  if (!d) return '-';
  const [y, m, day] = String(d).split('T')[0].split('-');
  return `${day}/${m}/${y}`;
};

const fmtGrupoCota = (val) => {
  if (!val) return '-';
  const parts = String(val).trim().split(/\s+/);
  if (parts.length < 2) return val;
  const [grupo, cota] = parts;
  return `${parseInt(grupo)} / ${parseInt(cota)}`;
};

// Emails que acessam a aba de comissões mas não visualizam nenhum dado
const EMAILS_SEM_COMISSOES = ['paula.santana@xpi.com.br'];

router.get('/comissoes', authMiddleware, async (req, res) => {
  if (req.isDemo) return res.json(COMISSOES);
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

// POST /comissoes/chat — chat de IA sobre os dados de comissões (admin-only)
// A chave da Anthropic fica no servidor; o front não a acessa.
router.post('/comissoes/chat', authMiddleware, async (req, res) => {
  if (req.isDemo) return res.status(403).json({ error: 'Indisponível no modo demo' });
  if (!ADMIN_EMAILS.includes(req.userEmail)) {
    return res.status(403).json({ error: 'Acesso restrito' });
  }

  const pergunta = (req.body.pergunta || '').trim();
  if (!pergunta) return res.status(400).json({ error: 'pergunta obrigatória' });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY não configurada no servidor' });
  }

  try {
    const { rows } = await db.query(
      'SELECT * FROM comissoes ORDER BY mes_referencia DESC, data_venda DESC'
    );

    const dadosContexto = rows.map(r => ({
      cliente: r.cliente,
      contrato: r.contrato,
      grupo_cota: fmtGrupoCota(r.grupo_cota_versao),
      data_venda: fmtData(r.data_venda),
      parcela: r.parcela,
      valor_carta: Number(r.valor_carta),
      comissao_bruta: Number(r.valor_comissao),
      comissao_liquida: Number(r.valor_liquido) * 0.80,
      mes_referencia: r.mes_referencia ? String(r.mes_referencia).split('T')[0].substring(0, 7) : null,
    }));

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `Você é um assistente que responde perguntas sobre dados de comissões de consórcio. Responda de forma direta e objetiva em português. Use os valores monetários formatados em reais (R$). Dados disponíveis (${dadosContexto.length} registros): ${JSON.stringify(dadosContexto)}`,
      messages: [{ role: 'user', content: pergunta }],
    });

    const resposta = msg.content?.[0]?.text || 'Sem resposta';
    return res.json({ resposta });
  } catch (error) {
    console.error('Erro no chat de comissões:', error);
    return res.status(500).json({ error: 'Erro ao processar a pergunta' });
  }
});

module.exports = router;
