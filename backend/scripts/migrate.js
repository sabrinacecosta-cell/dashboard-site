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

  console.log('Migração concluída!');
}

module.exports = migrate;

if (require.main === module) {
  migrate().then(() => process.exit(0)).catch(err => {
    console.error('Erro na migração:', err);
    process.exit(1);
  });
}
