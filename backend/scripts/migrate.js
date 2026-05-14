require('dotenv').config();
const db = require('../src/config/database');

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

  console.log('Migração concluída!');
}

module.exports = migrate;

if (require.main === module) {
  migrate().then(() => process.exit(0)).catch(err => {
    console.error('Erro na migração:', err);
    process.exit(1);
  });
}
