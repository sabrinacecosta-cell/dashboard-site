const router = require('express').Router();
const { google } = require('googleapis');
const db = require('../config/database');
const authMiddleware = require('../middlewares/authMiddleware');
const { oauth2Client, isConnected } = require('../config/google');
const { searchMeetingEmails, extractActionItems } = require('../services/gmailService');
const Anthropic = require('@anthropic-ai/sdk');
const { REUNIOES: MOCK_REUNIOES } = require('../data/mockData');

const ADMIN_EMAILS = ['sabrina@jtdkinvest.com', 'joel@jtdkinvest.com', 'joel@wflowinvest.com'];

// Eventos pessoais/não-comerciais que não devem aparecer em Reuniões
const TITLE_EXCLUSIONS = [
  /\bcasa\b/i,
  /\brotary\b/i,
  /call\s+semanal/i,
  /t[eê]nis/i,
  /tenis/i,
];
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function adminOnly(req, res, next) {
  // Demo user passa pelo adminOnly; os handlers retornam mock quando necessário
  if (req.isDemo) return next();
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
  if (req.isDemo) return res.json({ total: '4', fechamentos: '2', nao_fechou: '1', retornos: '1', taxa_conversao: '66.7' });
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
  if (req.isDemo) return res.json([
    { motivo: 'Quer pensar sobre os valores', contagem: '1' },
  ]);
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

// ── Reuniões por semana do mês ───────────────────────────────
router.get('/reunioes/metricas/semanas', authMiddleware, adminOnly, async (req, res) => {
  if (req.isDemo) return res.json([
    { semana: 'Sem. 1', total: 1, fechamentos: 1 },
    { semana: 'Sem. 2', total: 2, fechamentos: 1 },
    { semana: 'Sem. 3', total: 1, fechamentos: 0 },
    { semana: 'Sem. 4', total: 0, fechamentos: 0 },
  ]);
  try {
    const { ano = new Date().getFullYear(), mes = new Date().getMonth() + 1 } = req.query;

    const r = await db.query(`
      SELECT
        CEIL(EXTRACT(DAY FROM data_reuniao) / 7.0)::int AS semana,
        COUNT(*)::int                                    AS total,
        COUNT(*) FILTER (WHERE status = 'fechou')::int   AS fechamentos
      FROM reunioes
      WHERE EXTRACT(YEAR  FROM data_reuniao) = $1
        AND EXTRACT(MONTH FROM data_reuniao) = $2
      GROUP BY semana
      ORDER BY semana
    `, [ano, mes]);

    const semanas = [1, 2, 3, 4].map(w => {
      const row = r.rows.find(x => parseInt(x.semana) === w);
      return { semana: `Sem. ${w}`, total: parseInt(row?.total || 0), fechamentos: parseInt(row?.fechamentos || 0) };
    });

    res.json(semanas);
  } catch (err) {
    console.error('metricas/semanas:', err.message);
    res.status(500).json({ error: 'Erro ao buscar métricas por semana' });
  }
});

// ── Evolução dos últimos 6 meses ─────────────────────────────
router.get('/reunioes/metricas/evolucao', authMiddleware, adminOnly, async (req, res) => {
  if (req.isDemo) {
    const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const hoje = new Date();
    const evo = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje);
      d.setMonth(d.getMonth() - i);
      evo.push({
        label: `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
        total: [3, 4, 2, 5, 3, 4][5 - i],
        fechamentos: [2, 2, 1, 3, 2, 2][5 - i],
        taxa_conversao: [66.7, 50.0, 50.0, 60.0, 66.7, 66.7][5 - i],
      });
    }
    return res.json(evo);
  }
  try {
    const r = await db.query(`
      SELECT
        EXTRACT(YEAR  FROM data_reuniao)::int AS ano,
        EXTRACT(MONTH FROM data_reuniao)::int AS mes,
        COUNT(*)::int                          AS total,
        COUNT(*) FILTER (WHERE status = 'fechou')::int      AS fechamentos,
        ROUND(
          COUNT(*) FILTER (WHERE status = 'fechou') * 100.0
          / NULLIF(COUNT(*) FILTER (WHERE status IN ('fechou','nao_fechou')), 0),
        1) AS taxa_conversao
      FROM reunioes
      WHERE data_reuniao >= NOW() - INTERVAL '6 months'
      GROUP BY ano, mes
      ORDER BY ano, mes
    `);

    const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const rows = r.rows.map(row => ({
      label:          `${MESES[row.mes - 1]}/${String(row.ano).slice(2)}`,
      taxa_conversao: parseFloat(row.taxa_conversao || 0),
      total:          row.total,
      fechamentos:    row.fechamentos,
    }));

    res.json(rows);
  } catch (err) {
    console.error('metricas/evolucao:', err.message);
    res.status(500).json({ error: 'Erro ao buscar evolução' });
  }
});

// ── Importar do Calendar + Gmail ─────────────────────────────
router.post('/reunioes/importar', authMiddleware, adminOnly, requireGoogle, async (req, res) => {
  try {
    console.log('[importar] === INÍCIO ===');

    // ── 1. Garante coluna de controle e lê último sync ──────
    await db.query(`ALTER TABLE google_tokens ADD COLUMN IF NOT EXISTS ultima_sincronizacao_reunioes TIMESTAMP`);
    const syncRow = await db.query('SELECT ultima_sincronizacao_reunioes FROM google_tokens ORDER BY id DESC LIMIT 1');
    const ultimaSync = syncRow.rows[0]?.ultima_sincronizacao_reunioes || null;
    console.log('[importar] ultima_sincronizacao_reunioes:', ultimaSync || '(primeira vez)');

    // ── 2. Calendar ─────────────────────────────────────────
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - 90);
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 60);

    const calParams = {
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
    };
    console.log('[importar] modo completo — buscando todos os eventos da janela (com paginação)');

    // Pagina por TODAS as páginas (nextPageToken). Sem isso, a janela de 150 dias
    // passa de 250 eventos e os mais recentes ficam de fora.
    const allItems = [];
    let pageToken = null;
    let pagina = 0;
    do {
      let calRes;
      try {
        calRes = await calendar.events.list({ ...calParams, pageToken: pageToken || undefined });
      } catch (calErr) {
        console.error('[importar] ERRO Calendar.events.list:', calErr.message);
        throw calErr;
      }
      const items = calRes.data.items || [];
      allItems.push(...items);
      pageToken = calRes.data.nextPageToken || null;
      pagina++;
      console.log(`[importar] Calendar página ${pagina}: ${items.length} eventos (acumulado ${allItems.length})`);
    } while (pageToken);

    console.log('[importar] Calendar retornou', allItems.length, 'eventos no total (todas as páginas)');

    // Filtro de exclusão com log por evento pulado
    const events = [];
    for (const e of allItems) {
      const quando = e.start?.dateTime || e.start?.date || '(sem data)';
      if (!e.summary) {
        console.log('[importar] SKIP (sem título) |', quando);
        continue;
      }
      const regra = TITLE_EXCLUSIONS.find(re => re.test(e.summary));
      if (regra) {
        console.log(`[importar] SKIP (exclusão de título) | "${e.summary}" | ${quando} | regra: ${regra}`);
        continue;
      }
      events.push(e);
    }
    console.log('[importar] Eventos após filtro de exclusão:', events.length);

    // Remove registros já importados que correspondem às exclusões.
    // Usa limites de palavra (~*) para casar com o filtro acima e NÃO apagar
    // reuniões legítimas cujo título apenas contém o trecho (ex.: "Casagrande").
    await db.query(`
      DELETE FROM reunioes
      WHERE titulo ~* '\\ycasa\\y'
         OR titulo ~* '\\yrotary\\y'
         OR titulo ~* 'call\\s+semanal'
         OR titulo ~* 't[eê]nis'
    `);

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

    // Reuniões excluídas manualmente pelo usuário — não reimportar.
    await db.query(`CREATE TABLE IF NOT EXISTS reunioes_excluidas (
      google_event_id TEXT PRIMARY KEY,
      excluida_em      TIMESTAMP DEFAULT NOW()
    )`);
    const excluidasRes = await db.query('SELECT google_event_id FROM reunioes_excluidas');
    const excluidas = new Set(excluidasRes.rows.map(r => r.google_event_id));

    // ── 4. Inserção ─────────────────────────────────────────
    let imported = 0;
    let skipped = 0;

    for (const event of events) {
      // Pula eventos que o usuário excluiu manualmente.
      if (excluidas.has(event.id)) {
        skipped++;
        console.log(`[importar] SKIP (excluído pelo usuário) | "${event.summary}"`);
        continue;
      }

      // Dedup por google_event_id (mantido — garante zero duplicatas).
      // Traz também a ata para permitir backfill de reuniões já importadas
      // que ainda não tinham a ata vinculada no momento da 1ª importação.
      const existing = await db.query(
        'SELECT id, ata_original FROM reunioes WHERE google_event_id = $1',
        [event.id]
      );

      // Evento de dia inteiro usa start.date (sem hora). Monta a meia-noite LOCAL
      // (sem 'Z') para preservar o dia do calendário; eventos com hora usam dateTime.
      const isAllDay = !event.start?.dateTime;
      const eventStart = isAllDay
        ? new Date((event.start?.date || '') + 'T00:00:00')
        : new Date(event.start.dateTime);

      if (isNaN(eventStart.getTime())) {
        skipped++;
        console.log(`[importar] SKIP (sem data válida) | "${event.summary}"`);
        continue;
      }

      const participantes = (event.attendees || []).map(a => a.email);
      const assessorEmail = participantes.find(e => ADMIN_EMAILS.includes(e)) || null;

      const eventEnd = event.end?.dateTime
        ? new Date(event.end.dateTime)
        : (event.end?.date ? new Date(event.end.date + 'T00:00:00') : null);

      // A ata chega após o fim da reunião — compara com eventEnd e aceita janela
      // de até 12 horas. Exige correspondência de título também.
      const refTime = eventEnd || eventStart;
      const matchEmail = emails.find(em => {
        const titleMatch =
          em.eventTitle.toLowerCase().includes(event.summary.toLowerCase().slice(0, 20)) ||
          event.summary.toLowerCase().includes(em.eventTitle.toLowerCase().slice(0, 20));
        const dateDiff = em.date - refTime; // email deve chegar APÓS o fim
        return titleMatch && dateDiff >= -15 * 60_000 && dateDiff < 12 * 3_600_000;
      });

      // Já existe no banco: faz backfill da ata se ainda não tiver, senão pula.
      if (existing.rows.length > 0) {
        const ex = existing.rows[0];
        if (ex.ata_original || !matchEmail) {
          skipped++;
          console.log(`[importar] SKIP (já importado${ex.ata_original ? ', com ata' : ', sem ata p/ casar'}) | "${event.summary}"`);
          continue;
        }
        await db.query(
          'UPDATE reunioes SET gmail_message_id = $1, ata_original = $2, atualizado_em = NOW() WHERE id = $3',
          [matchEmail.messageId, matchEmail.body, ex.id]
        );
        // Cria tarefas extraídas só se a reunião ainda não tiver nenhuma.
        const temTarefas = await db.query(
          'SELECT 1 FROM tarefas_reuniao WHERE reuniao_id = $1 LIMIT 1', [ex.id]
        );
        if (!temTarefas.rows.length) {
          for (const desc of extractActionItems(matchEmail.body)) {
            await db.query(
              'INSERT INTO tarefas_reuniao (reuniao_id, descricao) VALUES ($1,$2)',
              [ex.id, desc]
            );
          }
        }
        imported++;
        console.log(`[importar] BACKFILL ATA | "${event.summary}"`);
        continue;
      }

      const ins = await db.query(`
        INSERT INTO reunioes
          (google_event_id, titulo, data_reuniao, data_fim, participantes,
           gmail_message_id, ata_original, assessor_email)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING id
      `, [
        event.id,
        event.summary,
        eventStart.toISOString(),
        eventEnd ? eventEnd.toISOString() : null,
        JSON.stringify(participantes),
        matchEmail?.messageId || null,
        matchEmail?.body || null,
        assessorEmail,
      ]);

      const reuniaoId = ins.rows[0].id;
      console.log(`[importar] INSERIDO | "${event.summary}" | ${eventStart.toISOString()} | dia inteiro: ${isAllDay} | com ata Gmail: ${!!matchEmail}`);

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

    // Salva timestamp apenas para auditoria (não há mais sync incremental)
    await db.query('UPDATE google_tokens SET ultima_sincronizacao_reunioes = NOW()');

    console.log('[importar] === FIM === imported:', imported, 'skipped:', skipped, 'total events:', events.length);
    res.json({ imported, skipped, total: events.length });
  } catch (err) {
    console.error('[importar] ERRO FATAL:', err.message);
    console.error('[importar] stack:', err.stack);
    res.status(500).json({ error: err.message });
  }
});

// ── Limpar todas as atas e reimportar do zero ────────────────
router.post('/reunioes/limpar-e-reimportar', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.query('UPDATE reunioes SET gmail_message_id = NULL, ata_original = NULL, resumo_ia = NULL');
    console.log('[limpar-e-reimportar] Todas as atas limpas');

    let emails = [];
    try {
      emails = await searchMeetingEmails();
      console.log('[limpar-e-reimportar] Gmail retornou', emails.length, 'e-mails');
    } catch (gmailErr) {
      return res.status(502).json({ error: 'Falha ao buscar e-mails: ' + gmailErr.message });
    }

    const todas = await db.query('SELECT id, titulo, data_reuniao, data_fim FROM reunioes');
    let atualizadas = 0;
    let sem_match = 0;

    for (const r of todas.rows) {
      const refTime = r.data_fim ? new Date(r.data_fim) : new Date(r.data_reuniao);
      const titulo = r.titulo || '';

      const matchEmail = emails.find(em => {
        const titleMatch =
          em.eventTitle.toLowerCase().includes(titulo.toLowerCase().slice(0, 20)) ||
          titulo.toLowerCase().includes(em.eventTitle.toLowerCase().slice(0, 20));
        const dateDiff = em.date - refTime;
        return titleMatch && dateDiff >= -15 * 60_000 && dateDiff < 6 * 3_600_000;
      });

      if (!matchEmail) { sem_match++; continue; }

      await db.query(
        'UPDATE reunioes SET gmail_message_id = $1, ata_original = $2 WHERE id = $3',
        [matchEmail.messageId, matchEmail.body || null, r.id]
      );
      atualizadas++;
      console.log(`[limpar-e-reimportar] vinculada | "${r.titulo}"`);
    }

    console.log('[limpar-e-reimportar] atualizadas:', atualizadas, 'sem_match:', sem_match);
    res.json({ atualizadas, sem_match, total: todas.rows.length });
  } catch (err) {
    console.error('[limpar-e-reimportar] ERRO:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Reimportar atas para reuniões já existentes (backfill) ───
router.post('/reunioes/reimportar-atas', authMiddleware, adminOnly, async (req, res) => {
  try {
    console.log('[reimportar-atas] === INÍCIO ===');

    let emails = [];
    try {
      emails = await searchMeetingEmails();
      console.log('[reimportar-atas] Gmail retornou', emails.length, 'e-mails com atas');
    } catch (gmailErr) {
      console.error('[reimportar-atas] ERRO Gmail:', gmailErr.message);
      return res.status(502).json({ error: 'Falha ao buscar e-mails do Gmail: ' + gmailErr.message });
    }

    // Reuniões sem ata vinculada (busca data_fim também)
    const semAta = await db.query(
      'SELECT id, titulo, data_reuniao, data_fim FROM reunioes WHERE gmail_message_id IS NULL'
    );
    console.log('[reimportar-atas] reuniões sem ata:', semAta.rows.length);

    let atualizadas = 0;
    let sem_match = 0;

    for (const r of semAta.rows) {
      const refTime = r.data_fim ? new Date(r.data_fim) : new Date(r.data_reuniao);
      const titulo = r.titulo || '';

      // A ata chega imediatamente após o fim da reunião — compara com data_fim
      // e aceita janela de até 6 horas. Exige correspondência de título.
      const matchEmail = emails.find(em => {
        const titleMatch =
          em.eventTitle.toLowerCase().includes(titulo.toLowerCase().slice(0, 20)) ||
          titulo.toLowerCase().includes(em.eventTitle.toLowerCase().slice(0, 20));
        const dateDiff = em.date - refTime; // email deve chegar APÓS o fim
        return titleMatch && dateDiff >= -15 * 60_000 && dateDiff < 6 * 3_600_000;
      });

      if (!matchEmail) { sem_match++; continue; }

      await db.query(
        'UPDATE reunioes SET gmail_message_id = $1, ata_original = $2 WHERE id = $3',
        [matchEmail.messageId, matchEmail.body || null, r.id]
      );

      // Tarefas: insere só se a reunião ainda não tiver nenhuma
      if (matchEmail.body) {
        const jaTem = await db.query('SELECT 1 FROM tarefas_reuniao WHERE reuniao_id = $1 LIMIT 1', [r.id]);
        if (jaTem.rows.length === 0) {
          const tarefas = extractActionItems(matchEmail.body);
          for (const desc of tarefas) {
            await db.query('INSERT INTO tarefas_reuniao (reuniao_id, descricao) VALUES ($1,$2)', [r.id, desc]);
          }
        }
      }

      atualizadas++;
      console.log(`[reimportar-atas] ata vinculada | "${r.titulo}"`);
    }

    console.log('[reimportar-atas] === FIM === atualizadas:', atualizadas, 'sem_match:', sem_match);
    res.json({ atualizadas, sem_match });
  } catch (err) {
    console.error('[reimportar-atas] ERRO FATAL:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Listar reuniões ──────────────────────────────────────────
router.get('/reunioes', authMiddleware, adminOnly, async (req, res) => {
  if (req.isDemo) return res.json(MOCK_REUNIOES);
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

// ── Remover reunião ──────────────────────────────────────────
router.delete('/reunioes/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS reunioes_excluidas (
      google_event_id TEXT PRIMARY KEY,
      excluida_em      TIMESTAMP DEFAULT NOW()
    )`);
    // Registra o evento na blocklist (se vier do Calendar) para que o import
    // automático não recrie a reunião excluída.
    const r = await db.query('SELECT google_event_id FROM reunioes WHERE id = $1', [req.params.id]);
    const gid = r.rows[0]?.google_event_id;
    if (gid) {
      await db.query(
        `INSERT INTO reunioes_excluidas (google_event_id) VALUES ($1)
         ON CONFLICT (google_event_id) DO NOTHING`,
        [gid]
      );
    }
    await db.query('DELETE FROM reunioes WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover reunião' });
  }
});

// ── Detalhe de reunião ───────────────────────────────────────
router.get('/reunioes/:id', authMiddleware, adminOnly, async (req, res) => {
  if (req.isDemo) {
    const r = MOCK_REUNIOES.find(x => x.id === req.params.id);
    if (!r) return res.status(404).json({ error: 'Reunião não encontrada' });
    return res.json(r);
  }
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
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Analise a ata da reunião comercial abaixo e retorne SOMENTE um JSON válido (sem markdown, sem texto extra).

{
  "resumo": "3 linhas objetivas: o que foi discutido, o que foi prometido e qual a próxima ação",
  "status_sugerido": "fechou" | "nao_fechou" | "retorno" | "em_andamento",
  "motivo": "Breve motivo (apenas se status_sugerido for nao_fechou, senão null)",
  "o_que_tratar": "O que abordar no próximo contato (apenas se status_sugerido for retorno, senão null)"
}

Critérios:
- "fechou": cliente assinou contrato ou fechou negócio explicitamente
- "nao_fechou": cliente recusou ou demonstrou desinteresse claro
- "retorno": cliente pediu prazo, quer pensar, ou próxima reunião foi agendada
- "em_andamento": sem conclusão clara

Ata:
${reuniao.ata_original}`,
      }],
    });

    let resultado = { resumo: '', status_sugerido: null, motivo: null, o_que_tratar: null };
    try {
      const raw = msg.content[0].text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      resultado = JSON.parse(raw);
    } catch {
      resultado.resumo = msg.content[0].text;
    }

    await db.query(
      'UPDATE reunioes SET resumo_ia = $1, atualizado_em = NOW() WHERE id = $2',
      [resultado.resumo, req.params.id]
    );

    res.json({
      resumo_ia: resultado.resumo,
      status_sugerido: resultado.status_sugerido || null,
      motivo: resultado.motivo || null,
      o_que_tratar: resultado.o_que_tratar || null,
      cached: false,
    });
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
  if (req.isDemo) {
    const hoje = new Date();
    const em3dias = new Date(hoje); em3dias.setDate(hoje.getDate() + 3);
    return res.json([
      { id: 'ret-demo-1', reuniao_id: 'rdemo-1', reuniao_titulo: 'Apresentação portfólio — Roberto Silva', participantes: JSON.stringify(['demo@jtdkinvest.com', 'roberto.silva@email.com']), data_retorno: em3dias.toISOString(), concluido: false, motivo: 'Quer pensar sobre os valores' },
    ]);
  }
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
