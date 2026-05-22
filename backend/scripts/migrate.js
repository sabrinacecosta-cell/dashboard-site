require('dotenv').config();
const db = require('../src/config/database');
const seedProducao = require('./seed_producao');

async function migrate() {
  console.log('Iniciando migração PostgreSQL...');

  await db.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha_hash TEXT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('Tabela "usuarios" OK!');

  await db.query(`
    CREATE TABLE IF NOT EXISTS producao (
      id SERIAL PRIMARY KEY,
      mes INTEGER,
      cliente TEXT,
      valor_do_bem DECIMAL(15,2),
      assessor TEXT,
      email_assessor TEXT,
      escritorio TEXT,
      ano INTEGER
    )
  `);
  console.log('Tabela "producao" OK!');

  // Tabela contemplacao (Imóvel - Planilha2)
  await db.query(`
    CREATE TABLE IF NOT EXISTS contemplacao (
      id SERIAL PRIMARY KEY,
      grupo INTEGER,
      mes TEXT,
      lance_percent DECIMAL(5,1),
      qnt_lances INTEGER,
      contemplados INTEGER,
      contemplacao_mensal TEXT,
      media_contemplacao TEXT,
      media_lance_percent DECIMAL(5,1)
    )
  `);
  console.log('Tabela "contemplacao" OK!');

  // Tabela contemplacao_auto (Auto - Planilha3)
  await db.query(`
    CREATE TABLE IF NOT EXISTS contemplacao_auto (
      id SERIAL PRIMARY KEY,
      grupo INTEGER,
      mes TEXT,
      lance_percent DECIMAL(5,1),
      qnt_lances INTEGER,
      contemplados INTEGER,
      contemplacao_mensal TEXT,
      media_contemplacao TEXT,
      media_lance_percent DECIMAL(5,1)
    )
  `);
  console.log('Tabela "contemplacao_auto" OK!');

  // Novas colunas para producao (janeiro/2026+)
  const novasColunas = [
    { nome: 'modalidade', tipo: 'TEXT' },
    { nome: 'grupo', tipo: 'TEXT' },
    { nome: 'cota', tipo: 'INTEGER' },
    { nome: 'parcela', tipo: 'DECIMAL(15,2)' },
    { nome: 'natureza_sujeito', tipo: 'TEXT' },
    { nome: 'uf', tipo: 'TEXT' },
    { nome: 'tipo_produto', tipo: 'TEXT' },
    { nome: 'taxa_adm', tipo: 'DECIMAL(5,2)' }
  ];

  for (const col of novasColunas) {
    await db.query(`
      DO $$ 
      BEGIN 
        ALTER TABLE producao ADD COLUMN ${col.nome} ${col.tipo};
      EXCEPTION 
        WHEN duplicate_column THEN NULL;
      END $$;
    `);
  }
  console.log('Novas colunas em "producao" OK!');

  // Tabelas do Simulador
  await db.query(`
    CREATE TABLE IF NOT EXISTS simulador_grupos (
      id SERIAL PRIMARY KEY,
      numero_grupo INTEGER NOT NULL,
      modalidade TEXT NOT NULL,
      taxa_adm DECIMAL(5,4) NOT NULL,
      fundo_reserva DECIMAL(5,4) NOT NULL,
      reajuste TEXT NOT NULL,
      mes_reajuste TEXT NOT NULL,
      lance_embutido_max DECIMAL(5,2) NOT NULL,
      prazo_restante INTEGER NOT NULL,
      prazo_total INTEGER NOT NULL,
      media_contemplacao DECIMAL(10,6),
      sem_media_contemplacao BOOLEAN DEFAULT FALSE
    )
  `);
  console.log('Tabela "simulador_grupos" OK!');

  await db.query(`
    CREATE TABLE IF NOT EXISTS simulador_cotas (
      id SERIAL PRIMARY KEY,
      numero_grupo INTEGER NOT NULL,
      modalidade TEXT NOT NULL,
      bem_referencia DECIMAL(15,2) NOT NULL,
      cota INTEGER NOT NULL,
      parcela DECIMAL(15,2) NOT NULL,
      redutor_parcela DECIMAL(5,2) NOT NULL DEFAULT 0
    )
  `);
  console.log('Tabela "simulador_cotas" OK!');

  await db.query(`ALTER TABLE simulador_grupos ADD COLUMN IF NOT EXISTS lance_maximo_contemplado DECIMAL(5,2)`);
  console.log('Coluna "lance_maximo_contemplado" OK!');

  // Corrigir media_contemplacao e popular lance_maximo_contemplado para grupos imóvel
  const patchesImovel = [
    [1035, 0.048814, 56],
    [1036, 0.129100, 57],
    [1037, 0.083019, 58],
    [1038, 0.067657, 59],
    [1039, 0.066552, 61.5],
    [1040, 0.141658, 62],
    [1041, 0.057915, 63],
    [1042, 0.091165, 64],
    [1043, 0.167906, 72],
    [1044, 0.114973, 77.5],
    [1045, 0.447368, 84],
    [1047, 0.272727, null],
    [1053, 0.323529, null],
  ];
  for (const [grupo, media, lanceMax] of patchesImovel) {
    await db.query(
      `UPDATE simulador_grupos
         SET media_contemplacao = $1, lance_maximo_contemplado = $2, sem_media_contemplacao = FALSE
       WHERE numero_grupo = $3 AND modalidade = 'imovel'`,
      [media, lanceMax, grupo]
    );
  }
  console.log('Patches de media_contemplacao e lance_maximo_contemplado aplicados!');

  // Popular lance_maximo_contemplado para grupos auto
  const patchesAuto = [
    [2125, 31.25],
    [2126, 43.75],
    [2127, 61.25],
    [2128, 61],
    [2132, null],
    [2133, null],
  ];
  for (const [grupo, lanceMax] of patchesAuto) {
    await db.query(
      `UPDATE simulador_grupos SET lance_maximo_contemplado = $1 WHERE numero_grupo = $2 AND modalidade = 'auto'`,
      [lanceMax, grupo]
    );
  }
  console.log('Patches lance_maximo_contemplado auto aplicados!');

  // taxa_adm_redutor: taxa administrativa específica quando "com redutor 50%" está selecionado.
  // NULL = usar taxa_adm para ambas as opções de parcela.
  await db.query(`ALTER TABLE simulador_grupos ADD COLUMN IF NOT EXISTS taxa_adm_redutor DECIMAL(5,4)`);

  // Imóvel: 1043/1044/1045 → 23% com redutor
  await db.query(`
    UPDATE simulador_grupos SET taxa_adm_redutor = 0.23
    WHERE modalidade = 'imovel' AND numero_grupo IN (1043, 1044, 1045)
  `);
  // Imóvel: 1047/1048/1049/1050 → 19% com redutor
  await db.query(`
    UPDATE simulador_grupos SET taxa_adm_redutor = 0.19
    WHERE modalidade = 'imovel' AND numero_grupo IN (1047, 1048, 1049, 1050)
  `);
  // Imóvel: 1054 → 18% com redutor
  await db.query(`
    UPDATE simulador_grupos SET taxa_adm_redutor = 0.18
    WHERE modalidade = 'imovel' AND numero_grupo = 1054
  `);
  // Auto: 2130 → 19% com redutor
  await db.query(`
    UPDATE simulador_grupos SET taxa_adm_redutor = 0.19
    WHERE modalidade = 'auto' AND numero_grupo = 2130
  `);
  // Auto: 3002 → 19% com redutor
  await db.query(`
    UPDATE simulador_grupos SET taxa_adm_redutor = 0.19
    WHERE modalidade = 'auto' AND numero_grupo = 3002
  `);
  console.log('Coluna taxa_adm_redutor e valores OK!');

  await db.query(`CREATE INDEX IF NOT EXISTS idx_sim_grupos_modalidade ON simulador_grupos(modalidade)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_sim_cotas_grupo ON simulador_cotas(numero_grupo, modalidade)`);
  console.log('Índices simulador OK!');

  // Índices para busca por assessor
  await db.query(`CREATE INDEX IF NOT EXISTS idx_producao_assessor ON producao(assessor)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_producao_email ON producao(email_assessor)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_contemplacao_grupo ON contemplacao(grupo)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_contemplacao_auto_grupo ON contemplacao_auto(grupo)`);
  console.log('Índices OK!');

  await db.query(`
    CREATE TABLE IF NOT EXISTS acompanhamento (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      cliente_nome VARCHAR(200) NOT NULL,
      cliente_cpf VARCHAR(20),
      grupo VARCHAR(20),
      cota VARCHAR(20),
      contrato VARCHAR(20),
      data_venda VARCHAR(20),
      prazo_grupo INTEGER,
      taxa_adm VARCHAR(20),
      proximo_reajuste VARCHAR(20),
      parcelas_pagas INTEGER,
      soma_parcelas_pagas DECIMAL(12,2),
      prazo_restante INTEGER,
      saldo_devedor DECIMAL(12,2),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('Tabela "acompanhamento" OK!');

  // Seed inicial — só insere se a tabela estiver vazia
  const { rows: countRows } = await db.query('SELECT COUNT(*) FROM acompanhamento');
  if (parseInt(countRows[0].count) === 0) {
    const seedData = [
      // Marcelo Rodrigo Weckerlin
      ['Marcelo Rodrigo Weckerlin','027.140.749-28','001002','0069-00','103818','14/07/2025',150,'18,50%','01/02/2027',10,6202.23,140,178312.64],
      ['Marcelo Rodrigo Weckerlin','027.140.749-28','001002','0414-00','103816','14/07/2025',150,'18,50%','01/02/2027',10,6202.23,140,178312.64],
      ['Marcelo Rodrigo Weckerlin','027.140.749-28','001002','0468-00','103817','14/07/2025',150,'18,50%','01/02/2027',10,6202.23,140,178312.64],
      ['Marcelo Rodrigo Weckerlin','027.140.749-28','001003','0016-00','103525','10/06/2025',150,'12,50%','09/06/2026',11,11550.00,139,145950.05],
      ['Marcelo Rodrigo Weckerlin','027.140.749-28','001003','0027-00','103524','10/06/2025',150,'12,50%','09/06/2026',11,9900.00,139,125100.05],
      ['Marcelo Rodrigo Weckerlin','027.140.749-28','001003','0087-00','103820','14/07/2025',150,'18,50%','11/07/2026',10,5170.10,140,148879.95],
      ['Marcelo Rodrigo Weckerlin','027.140.749-28','001003','0126-00','103523','10/06/2025',150,'12,50%','09/06/2026',11,9900.00,139,125100.05],
      ['Marcelo Rodrigo Weckerlin','027.140.749-28','001003','0218-00','103815','14/07/2025',150,'18,50%','11/07/2026',10,5965.50,140,171784.56],
      ['Marcelo Rodrigo Weckerlin','027.140.749-28','001003','0235-00','103819','14/07/2025',150,'18,50%','11/07/2026',10,4772.40,140,137427.65],
      ['Marcelo Rodrigo Weckerlin','027.140.749-28','001003','0264-00','103814','14/07/2025',150,'18,50%','11/07/2026',10,5965.50,140,171784.56],
      ['Marcelo Rodrigo Weckerlin','027.140.749-28','001003','0330-00','103522','10/06/2025',150,'12,50%','09/06/2026',11,9900.00,139,125100.05],
      // Alex Martins Calcina
      ['Alex Martins Calcina','100.349.078-66','001001','0029','102130','25/11/2024',150,'18,50%','01/11/2026',18,10846.32,132,175606.40],
      ['Alex Martins Calcina','100.349.078-66','001001','0253','102133','25/11/2024',150,'18,50%','01/11/2026',16,9619.48,132,176833.20],
      ['Alex Martins Calcina','100.349.078-66','001001','0280','102135','25/11/2024',150,'18,50%','01/11/2026',16,8336.88,132,153255.44],
      ['Alex Martins Calcina','100.349.078-66','001001','0303','102136','25/11/2024',150,'18,50%','01/11/2026',18,15192.15,132,133384.54],
      ['Alex Martins Calcina','100.349.078-66','001001','0430','102134','25/11/2024',150,'18,50%','01/11/2026',18,10846.32,132,175606.40],
      ['Alex Martins Calcina','100.349.078-66','001001','0487','102132','25/11/2024',150,'18,50%','01/11/2026',18,10846.32,132,175606.40],
      // Stefan Wolansky Negrao
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0026','102076','22/11/2024',150,'18,50%','01/11/2026',18,10882.90,132,175606.40],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0081','102084','22/11/2024',150,'18,50%','01/11/2026',18,10882.90,132,175606.40],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0090','102079','22/11/2024',150,'18,50%','01/11/2026',18,22985.21,132,163504.01],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0124','102087','22/11/2024',150,'18,50%','01/11/2026',18,10882.90,132,175606.40],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0138','102077','22/11/2024',150,'18,50%','01/11/2026',18,10882.90,132,175606.40],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0193','102074','22/11/2024',150,'18,50%','01/11/2026',18,10882.90,132,175606.40],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0201','102078','22/11/2024',150,'18,50%','01/11/2026',18,10882.90,132,175606.40],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0218','102085','22/11/2024',150,'18,50%','01/11/2026',18,10882.90,132,175606.40],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0234','102080','22/11/2024',150,'18,50%','01/11/2026',18,10882.90,132,175606.40],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0242','102088','22/11/2024',150,'18,50%','01/11/2026',18,10882.90,132,175606.40],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0244','102086','22/11/2024',150,'18,50%','01/11/2026',18,10882.90,132,175606.40],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0269','102082','22/11/2024',150,'18,50%','01/11/2026',18,10882.90,132,175606.40],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0310','102090','22/11/2024',150,'18,50%','01/11/2026',18,8706.34,132,140485.11],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0321','102075','22/11/2024',150,'18,50%','01/11/2026',18,10882.90,132,175606.40],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0344','102081','22/11/2024',150,'18,50%','01/11/2026',18,10882.90,132,175606.40],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0435','102089','22/11/2024',150,'18,50%','01/11/2026',18,9431.83,132,152192.22],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0479','102083','22/11/2024',150,'18,50%','01/11/2026',18,10882.90,132,175606.40],
      ['Stefan Wolansky Negrao','164.607.068-24','001002','0018','102279','06/12/2024',150,'18,50%','01/02/2027',15,8981.34,135,175448.12],
      ['Stefan Wolansky Negrao','164.607.068-24','001002','0068','102272','06/12/2024',150,'18,50%','01/02/2027',15,8981.34,135,175448.12],
      ['Stefan Wolansky Negrao','164.607.068-24','001002','0141','102281','06/12/2024',150,'18,50%','01/02/2027',15,7783.69,135,152055.05],
    ];
    for (const row of seedData) {
      await db.query(
        `INSERT INTO acompanhamento
          (cliente_nome,cliente_cpf,grupo,cota,contrato,data_venda,prazo_grupo,taxa_adm,
           proximo_reajuste,parcelas_pagas,soma_parcelas_pagas,prazo_restante,saldo_devedor)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        row
      );
    }
    console.log(`Seed "acompanhamento": ${seedData.length} registros inseridos!`);
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      token VARCHAR(64) NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('Tabela "password_reset_tokens" OK!');

  // Coluna lance_ultimo_mes em simulador_grupos
  await db.query(`
    DO $$
    BEGIN
      ALTER TABLE simulador_grupos ADD COLUMN lance_ultimo_mes DECIMAL(5,1);
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;
  `);
  console.log('Coluna "lance_ultimo_mes" em simulador_grupos OK!');

  // Histórico mensal grupo 2130 (auto)
  const { rows: rows2130 } = await db.query(
    'SELECT COUNT(*) FROM contemplacao_auto WHERE grupo = 2130'
  );
  if (parseInt(rows2130[0].count) === 0) {
    await db.query(`
      INSERT INTO contemplacao_auto
        (grupo, mes, lance_percent, qnt_lances, contemplados, contemplacao_mensal, media_contemplacao, media_lance_percent)
      VALUES
        (2130,'Outubro/2025',92.5,5,4,'0.800','0.6538',NULL),
        (2130,'Novembro/2025',91.25,4,4,'1.000',NULL,NULL),
        (2130,'Dezembro/2025',90.0,3,2,'0.667',NULL,NULL),
        (2130,'Janeiro/2026',88.75,11,9,'0.818',NULL,NULL),
        (2130,'Fevereiro/2026',87.5,6,6,'1.000',NULL,NULL),
        (2130,'Março/2026',86.25,17,7,'0.412',NULL,NULL),
        (2130,'Abril/2026',85.0,6,2,'0.333',NULL,NULL)
    `);
    console.log('Histórico grupo 2130 (auto) inserido!');
  } else {
    console.log('Histórico grupo 2130 (auto) já existe, pulando.');
  }

  // Atualiza simulador_grupos para grupo 2130 (auto)
  await db.query(`
    UPDATE simulador_grupos
    SET media_contemplacao = 0.6538,
        lance_ultimo_mes   = 85.0,
        sem_media_contemplacao = FALSE
    WHERE numero_grupo = 2130 AND modalidade = 'auto'
  `);
  console.log('simulador_grupos grupo 2130 (auto) atualizado!');

  // Corrige parcelas grupo 2130 (sem redutor) — taxa 15% no lugar de 18%
  const cotas2130 = [
    [90000,  1539.13], [95000,  1624.64], [100000, 1710.14],
    [105000, 1795.65], [110000, 1881.16], [115000, 1966.67],
    [120000, 2052.17], [125000, 2137.68], [130000, 2223.19],
    [135000, 2308.70], [140000, 2394.20], [145000, 2479.71],
    [150000, 2565.22],
  ];
  for (const [bem, parcela] of cotas2130) {
    await db.query(
      `UPDATE simulador_cotas SET parcela = $1
       WHERE numero_grupo = 2130 AND bem_referencia = $2 AND redutor_parcela = 0`,
      [parcela, bem]
    );
  }
  console.log('Parcelas grupo 2130 (sem redutor) corrigidas!');

  // Recalcula todas as parcelas com base no prazo_restante atual
  await db.query(`
    UPDATE simulador_cotas sc
    SET parcela = ROUND((sc.bem_referencia * (1 + sg.taxa_adm + sg.fundo_reserva) / sg.prazo_restante)::numeric, 2)
    FROM simulador_grupos sg
    WHERE sc.numero_grupo = sg.numero_grupo
      AND sc.modalidade = sg.modalidade
      AND sc.redutor_parcela = 0
      AND sg.prazo_restante > 0
  `);
  await db.query(`
    UPDATE simulador_cotas sc
    SET parcela = ROUND((sc.bem_referencia * (1 + COALESCE(sg.taxa_adm_redutor, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante / 2)::numeric, 2)
    FROM simulador_grupos sg
    WHERE sc.numero_grupo = sg.numero_grupo
      AND sc.modalidade = sg.modalidade
      AND sc.redutor_parcela = 0.5
      AND sg.prazo_restante > 0
  `);
  console.log('Recálculo de parcelas concluído!');

  // Seed producao (idempotent — só insere se tabela vazia)
  await seedProducao();

  // Colunas assessor/email_assessor em comissoes
  await db.query(`
    DO $$
    BEGIN
      ALTER TABLE comissoes ADD COLUMN assessor VARCHAR(200);
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;
  `);
  await db.query(`
    DO $$
    BEGIN
      ALTER TABLE comissoes ADD COLUMN email_assessor VARCHAR(200);
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;
  `);
  console.log('Colunas assessor/email_assessor em comissoes OK!');

  // Popula assessor/email_assessor via JOIN com producao (por cliente, última ocorrência)
  await db.query(`
    UPDATE comissoes c
    SET
      assessor = p.assessor,
      email_assessor = p.email_assessor
    FROM (
      SELECT DISTINCT ON (cliente) cliente, assessor, email_assessor
      FROM producao
      WHERE assessor IS NOT NULL
      ORDER BY cliente, id DESC
    ) p
    WHERE UPPER(TRIM(c.cliente)) = UPPER(TRIM(p.cliente))
      AND c.email_assessor IS NULL
  `);
  console.log('comissoes assessor/email_assessor populados!');

  // Colunas de médias 12m e 6m em simulador_grupos
  await db.query(`ALTER TABLE simulador_grupos ADD COLUMN IF NOT EXISTS media_contemplacao_12m NUMERIC(10,6)`);
  await db.query(`ALTER TABLE simulador_grupos ADD COLUMN IF NOT EXISTS media_contemplacao_6m NUMERIC(10,6)`);
  console.log('Colunas media_contemplacao_12m e media_contemplacao_6m em simulador_grupos OK!');

  // ── Coluna observacao em contemplacao_auto ──────────────────────────────────
  await db.query(`
    DO $$
    BEGIN
      ALTER TABLE contemplacao_auto ADD COLUMN observacao TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;
  `);
  console.log('Coluna observacao em contemplacao_auto OK!');

  // ── Grupo 2129 (auto): simulador_grupos ─────────────────────────────────────
  await db.query(`
    INSERT INTO simulador_grupos
      (numero_grupo, modalidade, taxa_adm, taxa_adm_redutor, fundo_reserva,
       reajuste, mes_reajuste, lance_embutido_max, prazo_restante, prazo_total,
       sem_media_contemplacao)
    VALUES
      (2129, 'auto', 0.17, NULL, 0.03, 'INPC', 'JANEIRO', 0.30, 64, 80, FALSE)
    ON CONFLICT DO NOTHING
  `);
  console.log('simulador_grupos 2129 inserido!');

  // ── Grupo 2129: cotas ────────────────────────────────────────────────────────
  await db.query(`
    INSERT INTO simulador_cotas (numero_grupo, modalidade, bem_referencia, cota, parcela, redutor_parcela)
    VALUES
      (2129,'auto',  93760.02,  93760.02, 1758.00, 0),
      (2129,'auto',  98968.91,  98968.91, 1855.67, 0),
      (2129,'auto', 104177.80, 104177.80, 1953.33, 0),
      (2129,'auto', 109386.69, 109386.69, 2051.00, 0),
      (2129,'auto', 114595.58, 114595.58, 2148.67, 0),
      (2129,'auto', 119804.47, 119804.47, 2246.33, 0),
      (2129,'auto', 125013.36, 125013.36, 2344.00, 0),
      (2129,'auto', 130222.25, 130222.25, 2441.67, 0),
      (2129,'auto', 135431.14, 135431.14, 2539.33, 0),
      (2129,'auto', 140640.03, 140640.03, 2637.00, 0),
      (2129,'auto', 145848.92, 145848.92, 2734.67, 0),
      (2129,'auto', 151057.81, 151057.81, 2832.33, 0),
      (2129,'auto', 156266.70, 156266.70, 2930.00, 0)
    ON CONFLICT DO NOTHING
  `);
  console.log('simulador_cotas 2129 inseridas!');

  // ── Grupo 2129: histórico contemplacao_auto Out/2025–Abr/2026 ───────────────
  await db.query(`
    INSERT INTO contemplacao_auto
      (grupo, mes, lance_percent, qnt_lances, contemplados, contemplacao_mensal,
       media_contemplacao, media_lance_percent, observacao)
    VALUES
      (2129,'outubro',  88.75, 11, 8, '73%', NULL, NULL, 'Este grupo não está em lance máximo'),
      (2129,'novembro', 87.50, 14,11, '79%', NULL, NULL, 'Este grupo não está em lance máximo'),
      (2129,'dezembro', 86.25,  8, 4, '50%', NULL, NULL, 'Este grupo não está em lance máximo'),
      (2129,'janeiro',  85.00,  7, 6, '86%', NULL, NULL, 'Este grupo não está em lance máximo'),
      (2129,'fevereiro',83.75,  6, 5, '83%', NULL, NULL, 'Este grupo não está em lance máximo'),
      (2129,'março',    82.50,  7, 5, '71%', NULL, NULL, 'Este grupo não está em lance máximo'),
      (2129,'abril',    72.00,  5, 5,'100%', NULL, NULL, 'Este grupo não está em lance máximo')
    ON CONFLICT DO NOTHING
  `);
  console.log('contemplacao_auto 2129 inserida!');

  // ── Atualiza lance_ultimo_mes e media_contemplacao do grupo 2129 ─────────────
  await db.query(`
    UPDATE simulador_grupos
    SET lance_ultimo_mes   = 72.0,
        media_contemplacao = ROUND((8+11+4+6+5+5+5)::numeric / NULLIF((11+14+8+7+6+7+5),0), 6)
    WHERE numero_grupo = 2129 AND modalidade = 'auto'
  `);
  console.log('simulador_grupos 2129 atualizado!');

  // ── Corrige contemplacao_mensal grupo 2129 (formato decimal) ─────────────────
  await db.query(`
    UPDATE contemplacao_auto SET contemplacao_mensal = '0.7273' WHERE grupo = 2129 AND mes = 'outubro';
    UPDATE contemplacao_auto SET contemplacao_mensal = '0.7857' WHERE grupo = 2129 AND mes = 'novembro';
    UPDATE contemplacao_auto SET contemplacao_mensal = '0.5000' WHERE grupo = 2129 AND mes = 'dezembro';
    UPDATE contemplacao_auto SET contemplacao_mensal = '0.8571' WHERE grupo = 2129 AND mes = 'janeiro';
    UPDATE contemplacao_auto SET contemplacao_mensal = '0.8333' WHERE grupo = 2129 AND mes = 'fevereiro';
    UPDATE contemplacao_auto SET contemplacao_mensal = '0.7143' WHERE grupo = 2129 AND mes = 'março';
    UPDATE contemplacao_auto SET contemplacao_mensal = '1.0000' WHERE grupo = 2129 AND mes = 'abril';
  `);

  // ── Corrige contemplacao_mensal grupos 2125–2128, 2132, 2133, 3002 ───────────
  await db.query(`
    UPDATE contemplacao_auto SET contemplacao_mensal = '0.1808' WHERE grupo = 2125 AND mes = 'abril';
    UPDATE contemplacao_auto SET contemplacao_mensal = '0.0957' WHERE grupo = 2126 AND mes = 'abril';
    UPDATE contemplacao_auto SET contemplacao_mensal = '0.1061' WHERE grupo = 2127 AND mes = 'abril';
    UPDATE contemplacao_auto SET contemplacao_mensal = '0.5909' WHERE grupo = 2128 AND mes = 'abril';
    UPDATE contemplacao_auto SET contemplacao_mensal = '0.2143' WHERE grupo = 2132 AND mes = 'abril';
    UPDATE contemplacao_auto SET contemplacao_mensal = '1.0000' WHERE grupo = 2133 AND mes = 'abril';
    UPDATE contemplacao_auto SET contemplacao_mensal = '1.0000' WHERE grupo = 3002 AND mes = 'abril';
  `);
  console.log('contemplacao_mensal corrigida (formato decimal)!');

  // ── Remove abril duplicado do grupo 2129 ─────────────────────────────────────
  await db.query(`
    DELETE FROM contemplacao_auto
    WHERE grupo = 2129 AND mes = 'abril'
      AND id NOT IN (
        SELECT MIN(id) FROM contemplacao_auto WHERE grupo = 2129 AND mes = 'abril'
      )
  `);
  console.log('Duplicata abril 2129 removida!');

  console.log('Migração concluída!');
}

module.exports = migrate;

if (require.main === module) {
  migrate().then(() => process.exit(0)).catch(err => {
    console.error('Erro na migração:', err);
    process.exit(1);
  });
}
