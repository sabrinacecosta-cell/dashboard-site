const router = require('express').Router();
const { google } = require('googleapis');
const db = require('../config/database');
const authMiddleware = require('../middlewares/authMiddleware');
const { oauth2Client, isConnected } = require('../config/google');
const { searchMeetingEmails, extractActionItems } = require('../services/gmailService');
const Anthropic = require('@anthropic-ai/sdk');

const ADMIN_EMAILS = ['sabrina@jtdkinvest.com', 'joel@wflowinvest.com'];
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function adminOnly(req, res, next) {
  if (!ADMIN_EMAILS.includes(req.userEmail)) {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }
  next();
}

function requireGoogle(req, res, next) {
  if (!isConnected()) {
    return res.status(503).json({ error: 'Google Calendar não conectado. Acesse /auth/google para autorizar.' });
  }
  next();
}

// ── Métricas (antes de /:id para não ser capturado) ──────────
router.get('/reunioes/metricas/mes', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { ano = new Date().getFullYear(), mes = new Date().getMonth() + 1 } = req.query;

    const r = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE TRUE)                              AS total,
        COUNT(*) FILTER (WHERE status = 'fechou')                AS fechamentos,
        COUNT(*) FILTER (WHERE status = 'nao_fechou')            AS nao_fechou,
        COUNT(*) FILTER (WHERE status = 'retorno')               AS retornos,
        ROUND(
          COUNT(*) FILTER (WHERE status = 'fechou') * 100.0
          / NULLIF(COUNT(*) FILTER (WHERE status IN ('fechou','nao_fechou')), 0),
        1) AS taxa_conversao
      FROM reunioes
      WHERE EXTRACT(YEAR FROM data_reuniao) = $1
        AND EXTRACT(MONTH FROM data_reuniao) = $2
    `, [ano, mes]);

    res.json(r.rows[0]);
  } catch (err) {
    console.error('metricas/mes:', err.message);
    res.status(500).json({ error: 'Erro ao buscar métricas' });
  }
});

router.get('/reunioes/metricas/motivos', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { ano = new Date().getFullYear(), mes = new Date().getMonth() + 1 } = req.query;

    const r = await db.query(`
      SELECT motivo_nao_fechamento AS motivo, COUNT(*) AS contagem
      FROM reunioes
      WHERE status = 'nao_fechou'
        AND motivo_nao_fechamento IS NOT NULL
        AND motivo_nao_fechamento <> ''
        AND EXTRACT(YEAR FROM data_reuniao) = $1
        AND EXTRACT(MONTH FROM data_reuniao) = $2
      GROUP BY motivo_nao_fechamento
      ORDER BY contagem DESC
    `, [ano, mes]);

    res.json(r.rows);
  } catch (err) {
    console.error('metricas/motivos:', err.message);
    res.status(500).json({ error: 'Erro ao buscar motivos' });
  }
});

// ── Importar do Calendar + Gmail ─────────────────────────────
router.post('/reunioes/importar', authMiddleware, adminOnly, requireGoogle, async (req, res) => {
  try {
    console.log('[importar] === INÍCIO ===');

    // ── 1. Diagnóstico do token ─────────────────────────────
    const fs = require('fs');
    const path = require('path');
    const TOKEN_PATH = path.join(__dirname, '../../data/google-tokens.json');
    const tokenFileExists = fs.existsSync(TOKEN_PATH);
    console.log('[importar] TOKEN_PATH:', TOKEN_PATH);
    console.log('[importar] token file exists:', tokenFileExists);
    if (tokenFileExists) {
      try {
        const raw = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
        console.log('[importar] token keys:', Object.keys(raw));
        console.log('[importar] has access_token:', !!raw.access_token);
        console.log('[importar] has refresh_token:', !!raw.refresh_token);
        console.log('[importar] scope:', raw.scope || '(sem scope salvo)');
        console.log('[importar] expiry_date:', raw.expiry_date ? new Date(raw.expiry_date).toISOString() : '(sem expiry)');
      } catch (e) {
        console.error('[importar] erro ao ler token file:', e.message);
      }
    }
    const creds = require('../config/google').oauth2Client.credentials;
    console.log('[importar] oauth2Client.credentials keys:', Object.keys(creds || {}));
    console.log('[importar] oauth2Client has access_token:', !!creds?.access_token);
    console.log('[importar] oauth2Client has refresh_token:', !!creds?.refresh_token);

    // ── 2. Calendar ─────────────────────────────────────────
    const calendar = google.calendar({ version: 'v3', auth: require('../config/google').oauth2Client });

    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - 90); // ampliado de 30 → 90 dias
    const timeMax = new Date();

    console.log('[importar] Calendar timeMin:', timeMin.toISOString());
    console.log('[importar] Calendar timeMax:', timeMax.toISOString());
    console.log('[importar] calendarId: primary');

    let calRes;
    try {
      calRes = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 250,
      });
    } catch (calErr) {
      console.error('[importar] ERRO Calendar.events.list:', calErr.message);
      console.error('[importar] Calendar error code:', calErr.code);
      console.error('[importar] Calendar error status:', calErr.status);
      throw calErr;
    }

    const allItems = calRes.data.items || [];
    console.log('[importar] Calendar retornou', allItems.length, 'eventos (total, com e sem título)');
    const events = allItems.filter(e => e.summary);
    console.log('[importar] Eventos com título (summary):', events.length);
    if (events.length > 0) {
      console.log('[importar] Primeiros 5 títulos:', events.slice(0, 5).map(e => `"${e.summary}" (${e.start?.dateTime || e.start?.date})`));
    }

    // ── 3. Gmail ────────────────────────────────────────────
    let emails = [];
    try {
      console.log('[importar] Buscando e-mails do Gmail...');
      emails = await searchMeetingEmails();
      console.log('[importar] Gmail retornou', emails.length, 'e-mails com atas');
      if (emails.length > 0) {
        console.log('[importar] Primeiros 3 assuntos Gmail:', emails.slice(0, 3).map(e => `"${e.subject}"`));
      }
    } catch (gmailErr) {
      console.error('[importar] ERRO Gmail:', gmailErr.message);
      console.error('[importar] Gmail error code:', gmailErr.code);
      console.error('[importar] Gmail error status:', gmailErr.status);
    }

    // ── 4. Inserção ─────────────────────────────────────────
    let imported = 0;
    let skipped = 0;

    for (const event of events) {
      const existing = await db.query(
        'SELECT id FROM reunioes WHERE google_event_id = $1',
        [event.id]
      );
      if (existing.rows.length > 0) { skipped++; continue; }

      const eventStart = new Date(event.start?.dateTime || event.start?.date);
      const matchEmail = emails.find(em => {
        const titleMatch =
          em.eventTitle.toLowerCase().includes(event.summary.toLowerCase().slice(0, 20)) ||
          event.summary.toLowerCase().includes(em.eventTitle.toLowerCase().slice(0, 20));
        const dateDiff = Math.abs(em.date - eventStart);
        return titleMatch || dateDiff < 86_400_000;
      });

      const participantes = (event.attendees || []).map(a => a.email);
      const assessorEmail = participantes.find(e => ADMIN_EMAILS.includes(e)) || null;

      const ins = await db.query(`
        INSERT INTO reunioes
          (google_event_id, titulo, data_reuniao, participantes,
           gmail_message_id, ata_original, assessor_email)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING id
      `, [
        event.id,
        event.summary,
        eventStart.toISOString(),
        JSON.stringify(participantes),
        matchEmail?.messageId || null,
        matchEmail?.body || null,
        assessorEmail,
      ]);

      const reuniaoId = ins.rows[0].id;
      console.log('[importar] inserido:', event.summary, '| com ata Gmail:', !!matchEmail);

      if (matchEmail?.body) {
        const tarefas = extractActionItems(matchEmail.body);
        for (const desc of tarefas) {
          await db.query(
            'INSERT INTO tarefas_reuniao (reuniao_id, descricao) VALUES ($1,$2)',
            [reuniaoId, desc]
          );
        }
      }

      imported++;
    }

    console.log('[importar] === FIM === imported:', imported, 'skipped:', skipped, 'total events:', events.length);
    res.json({ imported, skipped, total: events.length });
  } catch (err) {
    console.error('[importar] ERRO FATAL:', err.message);
    console.error('[importar] stack:', err.stack);
    res.status(500).json({ error: err.message });
  }
});

// ── Listar reuniões ──────────────────────────────────────────
router.get('/reunioes', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { periodo, ano, mes } = req.query;

    let where = '';
    const params = [];

    if (periodo === 'semana') {
      where = `WHERE r.data_reuniao >= date_trunc('week', NOW())
                  AND r.data_reuniao <  date_trunc('week', NOW()) + INTERVAL '7 days'`;
    } else if (periodo === 'mes' && ano && mes) {
      where = `WHERE EXTRACT(YEAR FROM r.data_reuniao) = $1
                 AND EXTRACT(MONTH FROM r.data_reuniao) = $2`;
      params.push(ano, mes);
    }

    const r = await db.query(`
      SELECT
        r.*,
        COALESCE(
          json_agg(t ORDER BY t.criado_em) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) AS tarefas
      FROM reunioes r
      LEFT JOIN tarefas_reuniao t ON t.reuniao_id = r.id
      ${where}
      GROUP BY r.id
      ORDER BY r.data_reuniao DESC
    `, params);

    res.json(r.rows);
  } catch (err) {
    console.error('GET /reunioes:', err.message);
    res.status(500).json({ error: 'Erro ao listar reuniões' });
  }
});

// ── Detalhe de reunião ───────────────────────────────────────
router.get('/reunioes/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT r.*,
        COALESCE(
          json_agg(t ORDER BY t.criado_em) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) AS tarefas
      FROM reunioes r
      LEFT JOIN tarefas_reuniao t ON t.reuniao_id = r.id
      WHERE r.id = $1
      GROUP BY r.id
    `, [req.params.id]);

    if (!r.rows.length) return res.status(404).json({ error: 'Reunião não encontrada' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar reunião' });
  }
});

// ── Processar com IA (sob demanda, não reprocessa) ──────────
router.post('/reunioes/:id/processar', authMiddleware, adminOnly, async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM reunioes WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Reunião não encontrada' });

    const reuniao = r.rows[0];

    // Retorna sem chamar API se já processado
    if (reuniao.resumo_ia) {
      return res.json({ resumo_ia: reuniao.resumo_ia, cached: true });
    }

    if (!reuniao.ata_original) {
      return res.status(400).json({ error: 'Sem ata disponível para processar' });
    }

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Abaixo está a ata de uma reunião comercial transcrita pelo Gemini.
Extraia em no máximo 3 linhas objetivas: qual é a próxima ação a ser
tomada com este cliente, o que foi prometido e qual o prazo.
Seja direto e objetivo. Não repita informações óbvias.
Ata: ${reuniao.ata_original}`,
      }],
    });

    const resumo = msg.content[0].text;

    await db.query(
      'UPDATE reunioes SET resumo_ia = $1, atualizado_em = NOW() WHERE id = $2',
      [resumo, req.params.id]
    );

    res.json({ resumo_ia: resumo, cached: false });
  } catch (err) {
    console.error('processar:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Atualizar status ─────────────────────────────────────────
router.put('/reunioes/:id/status', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { status, motivo_nao_fechamento, data_retorno, motivo_retorno } = req.body;

    await db.query(`
      UPDATE reunioes
      SET status = $1,
          motivo_nao_fechamento = $2,
          data_retorno = $3,
          motivo_retorno = $4,
          atualizado_em = NOW()
      WHERE id = $5
    `, [status, motivo_nao_fechamento || null, data_retorno || null, motivo_retorno || null, req.params.id]);

    // Sincroniza retornos_pendentes
    if (status === 'retorno' && data_retorno) {
      const cliente = req.body.cliente || '';
      const existing = await db.query(
        'SELECT id FROM retornos_pendentes WHERE reuniao_id = $1 AND concluido = false',
        [req.params.id]
      );
      if (existing.rows.length) {
        await db.query(
          'UPDATE retornos_pendentes SET data_retorno=$1, motivo_retorno=$2 WHERE reuniao_id=$3 AND concluido=false',
          [data_retorno, motivo_retorno || null, req.params.id]
        );
      } else {
        await db.query(
          'INSERT INTO retornos_pendentes (reuniao_id, cliente, data_retorno, motivo_retorno) VALUES ($1,$2,$3,$4)',
          [req.params.id, cliente, data_retorno, motivo_retorno || null]
        );
      }
    } else if (status !== 'retorno') {
      await db.query(
        'UPDATE retornos_pendentes SET concluido=true, concluido_em=NOW() WHERE reuniao_id=$1 AND concluido=false',
        [req.params.id]
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('status:', err.message);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

// ── Tarefas ──────────────────────────────────────────────────
router.post('/reunioes/:id/tarefas', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { descricao } = req.body;
    if (!descricao?.trim()) return res.status(400).json({ error: 'Descrição obrigatória' });

    const r = await db.query(
      'INSERT INTO tarefas_reuniao (reuniao_id, descricao) VALUES ($1,$2) RETURNING *',
      [req.params.id, descricao.trim()]
    );
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar tarefa' });
  }
});

router.put('/tarefas/:id/concluir', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { concluida } = req.body;
    await db.query(
      `UPDATE tarefas_reuniao
       SET concluida=$1, concluida_em=${concluida ? 'NOW()' : 'NULL'}
       WHERE id=$2`,
      [!!concluida, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar tarefa' });
  }
});

// ── Retornos ─────────────────────────────────────────────────
router.get('/retornos/pendentes', authMiddleware, adminOnly, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT rp.*, r.titulo AS reuniao_titulo, r.participantes
      FROM retornos_pendentes rp
      JOIN reunioes r ON r.id = rp.reuniao_id
      WHERE rp.concluido = false
      ORDER BY rp.data_retorno ASC
    `);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar retornos' });
  }
});

router.put('/retornos/:id/concluir', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.query(
      'UPDATE retornos_pendentes SET concluido=true, concluido_em=NOW() WHERE id=$1',
      [req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao concluir retorno' });
  }
});

router.put('/retornos/:id/adiar', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { dias = 1 } = req.body;
    await db.query(
      `UPDATE retornos_pendentes
       SET data_retorno = data_retorno + ($1 || ' days')::INTERVAL
       WHERE id = $2`,
      [parseInt(dias, 10), req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao adiar retorno' });
  }
});

module.exports = router;
