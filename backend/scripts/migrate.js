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
      (2129,'Abril/2026',72.00,  5, 5,'100%', NULL, NULL, 'Este grupo não está em lance máximo')
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
    UPDATE contemplacao_auto SET contemplacao_mensal = '1.0000' WHERE grupo = 2129 AND mes = 'Abril/2026';
  `);

  // ── Corrige contemplacao_mensal grupos 2125–2128, 2132, 2133, 3002 ───────────
  await db.query(`
    UPDATE contemplacao_auto SET contemplacao_mensal = '0.1808' WHERE grupo = 2125 AND mes = 'Abril/2026';
    UPDATE contemplacao_auto SET contemplacao_mensal = '0.0957' WHERE grupo = 2126 AND mes = 'Abril/2026';
    UPDATE contemplacao_auto SET contemplacao_mensal = '0.1061' WHERE grupo = 2127 AND mes = 'Abril/2026';
    UPDATE contemplacao_auto SET contemplacao_mensal = '0.5909' WHERE grupo = 2128 AND mes = 'Abril/2026';
    UPDATE contemplacao_auto SET contemplacao_mensal = '0.2143' WHERE grupo = 2132 AND mes = 'Abril/2026';
    UPDATE contemplacao_auto SET contemplacao_mensal = '1.0000' WHERE grupo = 2133 AND mes = 'Abril/2026';
    UPDATE contemplacao_auto SET contemplacao_mensal = '1.0000' WHERE grupo = 3002 AND mes = 'Abril/2026';
  `);
  console.log('contemplacao_mensal corrigida (formato decimal)!');

  // ── Nov/Dez 2025: reinsere producao com dados completos ──────────────────────
  console.log('Removendo producao Nov/Dez 2025 incompleta...');
  await db.query(`DELETE FROM producao WHERE mes IN (11, 12) AND ano = 2025`);

  console.log('Reinserindo producao Nov/Dez 2025 completa (153 registros)...');
  await db.query(`
INSERT INTO producao (mes, modalidade, grupo, cota, parcela, cliente, valor_do_bem, assessor, email_assessor, escritorio, ano, natureza_sujeito, uf, tipo_produto, taxa_adm) VALUES
(11,'imovel','001041',4310,706.05,'EDUARDO SUNE CHRISTIANO',146788.99,'Fernando Alarcon','fernando.alarcon@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.22),
(11,'imovel','001041',7365,706.05,'EDUARDO SUNE CHRISTIANO',146788.99,'Fernando Alarcon','fernando.alarcon@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.22),
(11,'imovel','001047',524,1831.2,'LUCIANO GOULART PAZ',294358.4,'Hamilton Oda','hamilton@wflowinvest.com','WFLOW',2025,'PF','RJ','Cheia',0.12),
(11,'imovel','001048',378,1827.0,'LUCIANO GOULART PAZ',300000.0,'Hamilton Oda','hamilton@wflowinvest.com','WFLOW',2025,'PF','RJ','Cheia',0.12),
(11,'imovel','001049',1649,1272.18,'LUCIANO GOULART PAZ',210000.0,'Hamilton Oda','hamilton@wflowinvest.com','WFLOW',2025,'PF','RJ','Cheia',0.12),
(11,'imovel','001049',368,1272.18,'LUCIANO GOULART PAZ',210000.0,'Hamilton Oda','hamilton@wflowinvest.com','WFLOW',2025,'PF','RJ','Cheia',0.12),
(11,'imovel','001038',415,9816.79,'EDUARDO DE FRANCO BORGES',981679.94,'Machado Junior','machado@belmont.com.br','AX HOLDER',2025,'PF','PR','Cheia',0.18),
(11,'imovel','001036',8734,2010.99,'EDUARDO DE FRANCO BORGES',194864.3,'Machado Junior','machado@belmont.com.br','AX HOLDER',2025,'PF','PR','Cheia',0.2),
(11,'imovel','001040',9653,1792.59,'EDUARDO DE FRANCO BORGES',188633.93,'Machado Junior','machado@belmont.com.br','AX HOLDER',2025,'PF','PR','Cheia',0.2),
(11,'imovel','001040',6903,1792.59,'EDUARDO DE FRANCO BORGES',188633.93,'Machado Junior','machado@belmont.com.br','AX HOLDER',2025,'PF','PR','Cheia',0.2),
(11,'imovel','001040',6192,1792.59,'EDUARDO DE FRANCO BORGES',188633.93,'Machado Junior','machado@belmont.com.br','AX HOLDER',2025,'PF','PR','Cheia',0.2),
(11,'imovel','001040',4021,1792.59,'EDUARDO DE FRANCO BORGES',188633.93,'Machado Junior','machado@belmont.com.br','AX HOLDER',2025,'PF','PR','Cheia',0.2),
(11,'imovel','001040',7001,896.28,'EDUARDO DE FRANCO BORGES',94316.97,'Machado Junior','machado@belmont.com.br','AX HOLDER',2025,'PF','PR','Cheia',0.2),
(11,'imovel','001038',1756,2895.68,'VINICIUS GRACZCKI LUPATINI',560959.98,'Machado Junior','machado@belmont.com.br','AX HOLDER',2025,'PF','MT','Reduzida 50%',0.22),
(11,'imovel','001038',5545,2895.68,'VINICIUS GRACZCKI LUPATINI',560959.98,'Machado Junior','machado@belmont.com.br','AX HOLDER',2025,'PF','MT','Reduzida 50%',0.22),
(11,'imovel','001038',6329,2895.68,'VINICIUS GRACZCKI LUPATINI',560959.98,'Machado Junior','machado@belmont.com.br','AX HOLDER',2025,'PF','MT','Reduzida 50%',0.22),
(11,'imovel','001038',6437,2895.68,'VINICIUS GRACZCKI LUPATINI',560959.98,'Machado Junior','machado@belmont.com.br','AX HOLDER',2025,'PF','MT','Reduzida 50%',0.22),
(11,'imovel','001053',192,380.25,'EDUARDO SUNE CHRISTIANO',150000.0,'Fernando Alarcon','fernando.alarcon@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'imovel','001053',3766,380.25,'EDUARDO SUNE CHRISTIANO',150000.0,'Fernando Alarcon','fernando.alarcon@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'imovel','001053',731,380.25,'EDUARDO SUNE CHRISTIANO',150000.0,'Fernando Alarcon','fernando.alarcon@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'imovel','001053',3199,380.25,'EDUARDO SUNE CHRISTIANO',150000.0,'Fernando Alarcon','fernando.alarcon@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'imovel','001053',608,760.5,'RAFAEL MATUSCHKA MACEDO MELLO',300000.0,'Lucas Barbosa/ Rafael','lucas@wflowinvest.com/rafael.mello@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'imovel','001053',3243,760.5,'RAFAEL MATUSCHKA MACEDO MELLO',300000.0,'Lucas Barbosa/ Rafael','lucas@wflowinvest.com/rafael.mello@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'imovel','001053',2943,507.0,'RAFAEL MATUSCHKA MACEDO MELLO',200000.0,'Lucas Barbosa/ Rafael','lucas@wflowinvest.com/rafael.mello@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'imovel','001053',476,760.5,'ANDRE JESZENSKY FILHO',300000.0,'Lucas Barbosa','lucas@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'imovel','001053',3983,760.5,'ANDRE JESZENSKY FILHO',300000.0,'Lucas Barbosa','lucas@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'imovel','001053',3311,507.0,'RAFAEL MATUSCHKA MACEDO MELLO',200000.0,'Lucas Barbosa/ Rafael','lucas@wflowinvest.com/rafael.mello@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'imovel','001053',4035,760.5,'ANDRE JESZENSKY FILHO',300000.0,'Lucas Barbosa','lucas@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'imovel','001053',1555,760.5,'ANDRE JESZENSKY FILHO',300000.0,'Lucas Barbosa','lucas@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'auto','002132',1273,1730.88,'KARINA BARQUETTA DE ARAUJO OLIVIO',120000.0,'Ricardo Barquetta','ricardo.barquetta@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.095),
(11,'imovel','001051',4977,522.0,'ENZO ONADY ABI RACHED',200000.0,'Nycolas Palma','nycolas.palma@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.2),
(11,'imovel','001053',3315,507.0,'ENZO ONADY ABI RACHED',200000.0,'Nycolas Palma','nycolas.palma@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'imovel','001053',2304,760.5,'MARCOS DE SOUZA AZEVEDO',300000.0,'Fabio Zogaib','zg@wflowadv.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'imovel','001053',4589,760.5,'MARCOS DE SOUZA AZEVEDO',300000.0,'Fabio Zogaib','zg@wflowadv.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'imovel','001053',978,760.5,'MARCOS DE SOUZA AZEVEDO',300000.0,'Fabio Zogaib','zg@wflowadv.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'imovel','001053',207,760.5,'MARCOS DE SOUZA AZEVEDO',300000.0,'Fabio Zogaib','zg@wflowadv.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'imovel','001047',344,1972.41,'LUCAS HENRIQUE BARBOSA',315384.0,'Lucas Barbosa','lucas@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.12),
(11,'imovel','001053',443,760.5,'MARCOS DE SOUZA AZEVEDO',300000.0,'Fabio Zogaib','zg@wflowadv.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'imovel','001053',3610,760.5,'MARCOS DE SOUZA AZEVEDO',300000.0,'Fabio Zogaib','zg@wflowadv.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'imovel','001053',4342,760.5,'MARCOS DE SOUZA AZEVEDO',300000.0,'Fabio Zogaib','zg@wflowadv.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'auto','002132',1576,2191.65,'RENATO DE ARRUDA HELLMEISTER',150000.0,'Renato Hellmeister','renato.hellmeister@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.095),
(11,'imovel','001047',362,1972.41,'WILSON CARLOS FREIRE',315384.0,'Lucas Barbosa/Wilson','lucas@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.12),
(11,'imovel','001053',2189,507.0,'DANIEL FRANKLIN PEREIRA FREITAS',200000.0,'Nycolas Palma','nycolas.palma@wflowinvest.com','WFLOW',2025,'PF','RJ','Reduzida 50%',0.18),
(11,'imovel','001038',107,7012.01,'LZ CARVALHO ADMINISTRACAO E PARTICIPACOES LTDA',701199.96,'Guilherme Cunha','guilherme.cunha@wflowinvest.com','WFLOW',2025,'PJ','SP','Cheia',0.18),
(11,'auto','002127',3605,1913.84,'ZORAIDE CUNHA DE CARVALHO',87517.8,'Guilherme Cunha','guilherme.cunha@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.129),
(11,'auto','002127',4127,1913.84,'ZORAIDE CUNHA DE CARVALHO',87517.8,'Guilherme Cunha','guilherme.cunha@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.129),
(11,'auto','002127',2202,1913.84,'ZORAIDE CUNHA DE CARVALHO',87517.8,'Guilherme Cunha','guilherme.cunha@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.129),
(11,'auto','002127',9649,1913.84,'ZORAIDE CUNHA DE CARVALHO',87517.8,'Guilherme Cunha','guilherme.cunha@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.129),
(11,'imovel','001047',693,1577.92,'BRUNO ALCANTARA DA COSTA PENNA',252307.2,'Guilherme Cunha','guilherme.cunha@wflowinvest.com','WFLOW',2025,'PF','BA','Cheia',0.12),
(11,'imovel','001047',532,1577.92,'BRUNO ALCANTARA DA COSTA PENNA',252307.2,'Guilherme Cunha','guilherme.cunha@wflowinvest.com','WFLOW',2025,'PF','BA','Cheia',0.12),
(11,'imovel','001047',729,1577.92,'BRUNO ALCANTARA DA COSTA PENNA',252307.2,'Guilherme Cunha','guilherme.cunha@wflowinvest.com','WFLOW',2025,'PF','BA','Cheia',0.12),
(11,'imovel','001047',135,1577.92,'BRUNO ALCANTARA DA COSTA PENNA',252307.2,'Guilherme Cunha','guilherme.cunha@wflowinvest.com','WFLOW',2025,'PF','BA','Cheia',0.12),
(11,'imovel','001048',1708,1530.5,'RODRIGO SALMAN ROCHA PINTO',250000.0,'Marcus Matos','marcusmatos@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.12),
(11,'imovel','001048',1316,1530.5,'RODRIGO SALMAN ROCHA PINTO',250000.0,'Marcus Matos','marcusmatos@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.12),
(11,'imovel','001048',238,1530.5,'RODRIGO SALMAN ROCHA PINTO',250000.0,'Marcus Matos','marcusmatos@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.12),
(11,'imovel','001048',1764,1530.5,'RODRIGO SALMAN ROCHA PINTO',250000.0,'Marcus Matos','marcusmatos@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.12),
(11,'imovel','001053',4850,633.75,'ERICK GOUVEA SOARES',250000.0,'Sabrina Costa','sabrina@jtdkinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'imovel','001053',3437,633.75,'ERICK GOUVEA SOARES',250000.0,'Sabrina Costa','sabrina@jtdkinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'imovel','001053',4475,633.75,'ERICK GOUVEA SOARES',250000.0,'Sabrina Costa','sabrina@jtdkinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'imovel','001053',4633,633.75,'ERICK GOUVEA SOARES',250000.0,'Sabrina Costa','sabrina@jtdkinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'imovel','001038',8251,4288.9,'MARLEI RAQUEL DANIELLI',911559.95,'Marlei Danielli','marleidanielli@wflowinvest.com','WFLOW',2025,'PF','MT','Reduzida 50%',0.12),
(11,'imovel','001053',288,950.75,'ALEXANDRA PEREIRA SPINA',250000.0,'Wagner Palma','wagner.palma@wflowadv.com','WFLOW',2025,'PF','SP','Reduzida 25%',0.18),
(11,'imovel','001053',1806,950.75,'ALEXANDRA PEREIRA SPINA',250000.0,'Wagner Palma','wagner.palma@wflowadv.com','WFLOW',2025,'PF','SP','Reduzida 25%',0.18),
(11,'imovel','001038',1005,6898.4,'RONALDO VIEIRA MARTINS',701199.96,'Fernando Salomon','fernando.salomon@wflowinvest.com','WFLOW',2025,'PF','MG','Cheia',0.16),
(11,'imovel','001038',4782,6898.4,'RONALDO VIEIRA MARTINS',701199.96,'Fernando Salomon','fernando.salomon@wflowinvest.com','WFLOW',2025,'PF','MG','Cheia',0.16),
(11,'imovel','001053',2804,1236.25,'RONALDO VIEIRA MARTINS',250000.0,'Fernando Salomon','fernando.salomon@wflowinvest.com','WFLOW',2025,'PF','MG','Cheia',0.15),
(11,'imovel','001053',4098,1236.25,'RONALDO VIEIRA MARTINS',250000.0,'Fernando Salomon','fernando.salomon@wflowinvest.com','WFLOW',2025,'PF','MG','Cheia',0.15),
(11,'imovel','001047',1709,1972.41,'RONALDO VIEIRA MARTINS',315384.0,'Fernando Salomon','fernando.salomon@wflowinvest.com','WFLOW',2025,'PF','MG','Cheia',0.12),
(11,'imovel','001047',1068,1972.41,'RONALDO VIEIRA MARTINS',315384.0,'Fernando Salomon','fernando.salomon@wflowinvest.com','WFLOW',2025,'PF','MG','Cheia',0.12),
(11,'imovel','001047',1216,1972.41,'RONALDO VIEIRA MARTINS',315384.0,'Fernando Salomon','fernando.salomon@wflowinvest.com','WFLOW',2025,'PF','MG','Cheia',0.12),
(11,'imovel','001047',236,1972.41,'RONALDO VIEIRA MARTINS',315384.0,'Fernando Salomon','fernando.salomon@wflowinvest.com','WFLOW',2025,'PF','MG','Cheia',0.12),
(11,'imovel','001047',1545,1972.41,'RONALDO VIEIRA MARTINS',315384.0,'Fernando Salomon','fernando.salomon@wflowinvest.com','WFLOW',2025,'PF','MG','Cheia',0.12),
(11,'imovel','001049',482,1827.0,'RONALDO VIEIRA MARTINS',300000.0,'Fernando Salomon','fernando.salomon@wflowinvest.com','WFLOW',2025,'PF','MG','Cheia',0.12),
(11,'imovel','001049',186,1827.0,'RONALDO VIEIRA MARTINS',300000.0,'Fernando Salomon','fernando.salomon@wflowinvest.com','WFLOW',2025,'PF','MG','Cheia',0.12),
(11,'imovel','001053',2622,380.25,'ANDREIA MARQUES BORGES',150000.0,'Oswaldo Borges','oswaldo@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'imovel','001053',857,380.25,'ANDREIA MARQUES BORGES',150000.0,'Oswaldo Borges','oswaldo@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'imovel','001053',4558,380.25,'ANDREIA MARQUES BORGES',150000.0,'Oswaldo Borges','oswaldo@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'imovel','001053',3889,380.25,'ANDREIA MARQUES BORGES',150000.0,'Oswaldo Borges','oswaldo@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'imovel','001053',3166,380.25,'ANDREIA MARQUES BORGES',150000.0,'Oswaldo Borges','oswaldo@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'imovel','001053',4223,380.25,'ANDREIA MARQUES BORGES',150000.0,'Oswaldo Borges','oswaldo@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'imovel','001053',4254,380.25,'ANDREIA MARQUES BORGES',150000.0,'Oswaldo Borges','oswaldo@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'imovel','001053',4951,380.25,'ANDREIA MARQUES BORGES',150000.0,'Oswaldo Borges','oswaldo@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(11,'imovel','001053',4463,507.0,'RUANN BARBOSA TEIXEIRA',200000.0,'Nycolas Palma','nycolas.palma@wflowinvest.com','WFLOW',2025,'PF','RJ','Reduzida 50%',0.18),
(11,'imovel','001053',214,507.0,'RUANN BARBOSA TEIXEIRA',200000.0,'Nycolas Palma','nycolas.palma@wflowinvest.com','WFLOW',2025,'PF','RJ','Reduzida 50%',0.18),
(11,'imovel','001049',6,1522.5,'DENISE AGUILAR COSTA',250000.0,'Paulo Saad','paulo@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.12),
(11,'imovel','001049',881,1522.5,'DENISE AGUILAR COSTA',250000.0,'Paulo Saad','paulo@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.12),
(11,'imovel','001049',841,1522.5,'DENISE AGUILAR COSTA',250000.0,'Paulo Saad','paulo@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.12),
(11,'imovel','001049',231,1522.5,'DENISE AGUILAR COSTA',250000.0,'Paulo Saad','paulo@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.12),
(11,'auto','002132',1530,1461.1,'LAURO KATSUO WATANABE',100000.0,'Henrique/Nacle','henrique@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.095),
(11,'auto','002132',526,1461.1,'LAURO KATSUO WATANABE',100000.0,'Henrique/Nacle','henrique@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.095),
(11,'imovel','001038',7986,4343.52,'MAURICIO ROSSI GUIMARAES',841439.96,'Savio Melo/ Paulo Saad','saviomelo@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.22),
(11,'imovel','001038',7469,4343.52,'MAURICIO ROSSI GUIMARAES',841439.96,'Savio Melo/ Paulo Saad','saviomelo@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.22),
(11,'imovel','001038',9849,4343.52,'MAURICIO ROSSI GUIMARAES',841439.96,'Savio Melo/ Paulo Saad','saviomelo@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.22),
(11,'imovel','001038',9524,4343.52,'MAURICIO ROSSI GUIMARAES',841439.96,'Savio Melo/ Paulo Saad','saviomelo@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.22),
(11,'auto','002132',1349,1177.95,'JANUARIO BATISTA DO AMARAL NETO',150000.0,'Roberto Stolze','roberto.stolze@wflowinvest.com','WFLOW',2025,'PF','PE','Reduzida 50%',0.18),
(11,'imovel','001048',1622,1836.6,'RONALDO VIEIRA MARTINS',300000.0,'Fernando Salomon','fernando.salomon@wflowinvest.com','WFLOW',2025,'PF','MG','Cheia',0.12),
(11,'imovel','001048',1034,1836.6,'RONALDO VIEIRA MARTINS',300000.0,'Fernando Salomon','fernando.salomon@wflowinvest.com','WFLOW',2025,'PF','MG','Cheia',0.12),
(11,'imovel','001048',637,1836.6,'RONALDO VIEIRA MARTINS',300000.0,'Fernando Salomon','fernando.salomon@wflowinvest.com','WFLOW',2025,'PF','MG','Cheia',0.12),
(11,'imovel','001048',1689,1836.6,'RONALDO VIEIRA MARTINS',300000.0,'Fernando Salomon','fernando.salomon@wflowinvest.com','WFLOW',2025,'PF','MG','Cheia',0.12),
(11,'imovel','001049',519,1827.0,'RONALDO VIEIRA MARTINS',300000.0,'Fernando Salomon','fernando.salomon@wflowinvest.com','WFLOW',2025,'PF','MG','Cheia',0.12),
(11,'imovel','001049',1162,1827.0,'RONALDO VIEIRA MARTINS',300000.0,'Fernando Salomon','fernando.salomon@wflowinvest.com','WFLOW',2025,'PF','MG','Cheia',0.12),
(11,'imovel','001049',282,1827.0,'RONALDO VIEIRA MARTINS',300000.0,'Fernando Salomon','fernando.salomon@wflowinvest.com','WFLOW',2025,'PF','MG','Cheia',0.12),
(11,'imovel','001038',7669,4335.38,'MARLEI RAQUEL DANIELLI',911559.95,'Marlei Danielli','marleidanielli@wflowinvest.com','WFLOW',2025,'PF','MT','Reduzida 50%',0.12),
(11,'imovel','001047',205,1972.41,'MARCO ANTONIO VON HELDE DOS SANTOS',315384.0,'Alexandre Von Helde','alexandre.vonhelde@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.12),
(11,'imovel','001047',367,1972.41,'ALEXANDRE VON HELDE DOS SANTOS',315384.0,'Alexandre Von Helde','alexandre.vonhelde@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.12),
(11,'imovel','001038',6788,4001.89,'GUILHERME FRANQUIM SACCANI',841439.96,'Joel Figueredo','joel@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.12),
(11,'auto','002127',6786,1913.84,'ELISIANE GADELHA DIAS OLIVEIRA',87517.8,'Roberto Stolze','roberto.stolze@wflowinvest.com','WFLOW',2025,'PF','BA','Cheia',0.129),
(11,'imovel','001053',4485,633.75,'GUSTAVO STOLZE OLIVEIRA',250000.0,'Roberto Stolze','roberto.stolze@wflowinvest.com','WFLOW',2025,'PF','BA','Reduzida 50%',0.18),
(11,'imovel','001038',288,2667.92,'PAULO SERGIO SAAD',560959.98,'Paulo Saad','paulo@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.12),
(11,'imovel','001038',7354,4668.87,'JOEL CARVALHO DE FIGUEREDO',981679.94,'Joel Figueredo','joel@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.12),
(11,'imovel','001038',444,2667.92,'JOEL CARVALHO DE FIGUEREDO',560959.98,'Joel Figueredo','joel@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.12),
(11,'auto','002133',1078,374.95,'SABRINA CAROLINE ELIAS DA COSTA',50000.0,'Sabrina Costa','sabrina@jtdkinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.17),
(12,'imovel','001049',570,1530.5,'VITOR RAMOS SILVA',250000.0,'Marcus Matos','marcusmatos@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.12),
(12,'imovel','001049',328,1530.5,'VITOR RAMOS SILVA',250000.0,'Marcus Matos','marcusmatos@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.12),
(12,'imovel','001048',1407,1602.78,'VITOR RAMOS SILVA',260444.5,'Marcus Matos','marcusmatos@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.12),
(12,'imovel','001047',1468,1652.63,'VITOR RAMOS SILVA',262820.0,'Marcus Matos','marcusmatos@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.12),
(12,'imovel','001053',4447,380.25,'FERNANDO DIAS RODRIGUES',150000.0,'Oswaldo Borges','oswaldo@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(12,'imovel','001053',3619,380.25,'FERNANDO DIAS RODRIGUES',150000.0,'Oswaldo Borges','oswaldo@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(12,'imovel','001053',3006,380.25,'FERNANDO DIAS RODRIGUES',150000.0,'Oswaldo Borges','oswaldo@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(12,'imovel','001053',4022,380.25,'FERNANDO DIAS RODRIGUES',150000.0,'Oswaldo Borges','oswaldo@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(12,'imovel','001053',3754,380.25,'FERNANDO DIAS RODRIGUES',150000.0,'Oswaldo Borges','oswaldo@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(12,'imovel','001053',3180,380.25,'FERNANDO DIAS RODRIGUES',150000.0,'Oswaldo Borges','oswaldo@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(12,'imovel','001053',3385,380.25,'FERNANDO DIAS RODRIGUES',150000.0,'Oswaldo Borges','oswaldo@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(12,'imovel','001053',4330,380.25,'FERNANDO DIAS RODRIGUES',150000.0,'Oswaldo Borges','oswaldo@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(12,'imovel','001053',4161,380.25,'FERNANDO DIAS RODRIGUES',150000.0,'Oswaldo Borges','oswaldo@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(12,'imovel','001053',4923,380.25,'FERNANDO DIAS RODRIGUES',150000.0,'Oswaldo Borges','oswaldo@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(12,'imovel','001053',2670,380.25,'FERNANDO DIAS RODRIGUES',150000.0,'Oswaldo Borges','oswaldo@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(12,'imovel','001053',3105,380.25,'FERNANDO DIAS RODRIGUES',150000.0,'Oswaldo Borges','oswaldo@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(12,'imovel','001053',3555,507.0,'FERNANDO DIAS RODRIGUES',200000.0,'Oswaldo Borges','oswaldo@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(12,'imovel','001048',810,1153.99,'MARCELO DELGADO',187520.04,'Hamilton Oda','hamilton@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.12),
(12,'imovel','001048',566,1153.99,'MARCELO DELGADO',187520.04,'Hamilton Oda','hamilton@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.12),
(12,'auto','002127',1369,811.7,'FABIO SCHIAVONE ZANINI',71108.21,'Fabio Zanini',NULL,'WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(12,'imovel','001048',1576,1153.99,'LUIZ HENRIQUE YUJI DELGADO ODA',187520.04,'Hamilton Oda','hamilton@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.12),
(12,'imovel','001048',204,1153.99,'LUIZ HENRIQUE YUJI DELGADO ODA',187520.04,'Hamilton Oda','hamilton@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.12),
(12,'auto','002127',813,1794.22,'JORGE AMÉRICO MARFIM STAKOWIAK',82047.94,'Claudio Ikeda','claudio.ikeda@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.129),
(12,'auto','002132',299,2118.6,'CESAR AUGUSTO DUENAS MORAN',145000.0,'Glaucia Millani','glaucia@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.095),
(12,'auto','002132',890,1314.99,'CAROLINA CORTESE COELHO',90000.0,'Diogo Kramer','diogo.kramer@wflowinvest.com','WFLOW',2025,'PF','MA','Cheia',0.095),
(12,'imovel','001047',707,1249.19,'MAYARA LUIZE VICENTAINER',199743.2,'Diogo Kramer','diogo.kramer@wflowinvest.com','WFLOW',2025,'PF','SC','Cheia',0.12),
(12,'imovel','001047',1819,1249.19,'MAYARA LUIZE VICENTAINER',199743.2,'Diogo Kramer','diogo.kramer@wflowinvest.com','WFLOW',2025,'PF','SC','Cheia',0.12),
(12,'imovel','001047',497,1249.19,'RICARDO DAGLIO COLOMBANI UCHOA CAVALCANTI ALMEIDA',199743.2,'Guilherme Cunha','guilherme.cunha@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.12),
(12,'imovel','001047',1254,1249.19,'RICARDO DAGLIO COLOMBANI UCHOA CAVALCANTI ALMEIDA',199743.2,'Guilherme Cunha','guilherme.cunha@wflowinvest.com','WFLOW',2025,'PF','SP','Cheia',0.12),
(12,'imovel','001053',2130,633.75,'GILBERTO LYRIO NETO',250000.0,'Roberto Stolze','roberto.stolze@wflowinvest.com','WFLOW',2025,'PF','BA','Reduzida 50%',0.18),
(12,'imovel','001053',1017,633.75,'GILBERTO LYRIO NETO',250000.0,'Roberto Stolze','roberto.stolze@wflowinvest.com','WFLOW',2025,'PF','BA','Reduzida 50%',0.18),
(12,'imovel','001053',3732,633.75,'GILBERTO LYRIO NETO',250000.0,'Roberto Stolze','roberto.stolze@wflowinvest.com','WFLOW',2025,'PF','BA','Reduzida 50%',0.18),
(12,'imovel','001053',925,633.75,'GILBERTO LYRIO NETO',250000.0,'Roberto Stolze','roberto.stolze@wflowinvest.com','WFLOW',2025,'PF','BA','Reduzida 50%',0.18),
(12,'imovel','001053',489,633.75,'GILBERTO LYRIO NETO',250000.0,'Roberto Stolze','roberto.stolze@wflowinvest.com','WFLOW',2025,'PF','BA','Reduzida 50%',0.18),
(12,'imovel','001053',224,380.25,'ROGERIO VEROLEZ DE CASTILHO',150000.0,'Rogerio Castilho','rogeriocastilho@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(12,'imovel','001053',1837,380.25,'ROGERIO VEROLEZ DE CASTILHO',150000.0,'Rogerio Castilho','rogeriocastilho@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.18),
(12,'auto','002132',974,1826.38,'MAISA ISABEL D ELIA',125000.0,'Wagner Palma','wagner.palma@wflowadv.com','WFLOW',2025,'PF','SP','Cheia',0.095),
(12,'auto','002133',250,524.93,'DIEGO MEDINA OSORIO',70000.0,'Tati Leite','tatiana.leite@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.17),
(12,'auto','002133',1985,449.94,'DIEGO MEDINA OSORIO',60000.0,'Tati Leite','tatiana.leite@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.17),
(12,'imovel','001038',797,2667.92,'GUILHERME FRANQUIM SACCANI',560959.98,'Joel Figueredo','joel@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.12),
(12,'auto','002133',1433,524.93,'DIEGO MEDINA OSORIO',70000.0,'Tati Leite','tatiana.leite@wflowinvest.com','WFLOW',2025,'PF','SP','Reduzida 50%',0.17),
(11,NULL,NULL,NULL,NULL,'MARCIO NEGRÃO',29000000,'Fernanda Sykora','fer_sy@hotmail.com','SELFE BTG',2025,NULL,NULL,NULL,NULL)
  `);
  console.log('Producao Nov/Dez 2025 reinserida com sucesso!');

  // ── Reuniões ─────────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS reunioes (
      id                    SERIAL PRIMARY KEY,
      google_event_id       VARCHAR(255) UNIQUE,
      titulo                VARCHAR(500),
      data_reuniao          TIMESTAMP,
      participantes         JSONB,
      gmail_message_id      VARCHAR(255),
      ata_original          TEXT,
      resumo_ia             TEXT,
      proximos_passos       TEXT,
      status                VARCHAR(50) DEFAULT 'em_andamento',
      motivo_nao_fechamento TEXT,
      data_retorno          DATE,
      motivo_retorno        TEXT,
      assessor_email        VARCHAR(255),
      criado_em             TIMESTAMP DEFAULT NOW(),
      atualizado_em         TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('Tabela "reunioes" OK!');

  await db.query(`
    CREATE TABLE IF NOT EXISTS tarefas_reuniao (
      id          SERIAL PRIMARY KEY,
      reuniao_id  INTEGER REFERENCES reunioes(id) ON DELETE CASCADE,
      descricao   TEXT NOT NULL,
      concluida   BOOLEAN DEFAULT FALSE,
      concluida_em TIMESTAMP,
      criado_em   TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('Tabela "tarefas_reuniao" OK!');

  await db.query(`
    CREATE TABLE IF NOT EXISTS retornos_pendentes (
      id             SERIAL PRIMARY KEY,
      reuniao_id     INTEGER REFERENCES reunioes(id) ON DELETE CASCADE,
      cliente        VARCHAR(500),
      data_retorno   DATE NOT NULL,
      motivo_retorno TEXT,
      notificado_em  TIMESTAMP,
      concluido      BOOLEAN DEFAULT FALSE,
      concluido_em   TIMESTAMP,
      criado_em      TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('Tabela "retornos_pendentes" OK!');

  await db.query(`
    CREATE TABLE IF NOT EXISTS google_tokens (
      id SERIAL PRIMARY KEY,
      tokens JSONB NOT NULL,
      atualizado_em TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('Tabela "google_tokens" OK!');

  await db.query(`ALTER TABLE reunioes ADD COLUMN IF NOT EXISTS data_fim TIMESTAMP`);
  console.log('Coluna data_fim em reunioes OK!');

  // Remove duplicatas em simulador_grupos (mantém o id menor por numero_grupo+modalidade)
  await db.query(`
    DELETE FROM simulador_grupos
    WHERE id NOT IN (
      SELECT MIN(id) FROM simulador_grupos GROUP BY numero_grupo, modalidade
    )
  `);
  // Adiciona constraint única para evitar novas duplicatas
  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_simulador_grupos_grupo_modalidade'
      ) THEN
        ALTER TABLE simulador_grupos ADD CONSTRAINT uq_simulador_grupos_grupo_modalidade UNIQUE (numero_grupo, modalidade);
      END IF;
    END $$;
  `);
  console.log('Duplicatas simulador_grupos removidas e constraint única adicionada!');

  console.log('Migração concluída!');
}

module.exports = migrate;

if (require.main === module) {
  migrate().then(() => process.exit(0)).catch(err => {
    console.error('Erro na migração:', err);
    process.exit(1);
  });
}
