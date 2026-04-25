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

  await db.query(`CREATE INDEX IF NOT EXISTS idx_sim_grupos_modalidade ON simulador_grupos(modalidade)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_sim_cotas_grupo ON simulador_cotas(numero_grupo, modalidade)`);
  console.log('Índices simulador OK!');

  // Índices para busca por assessor
  await db.query(`CREATE INDEX IF NOT EXISTS idx_producao_assessor ON producao(assessor)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_producao_email ON producao(email_assessor)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_contemplacao_grupo ON contemplacao(grupo)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_contemplacao_auto_grupo ON contemplacao_auto(grupo)`);
  console.log('Índices OK!');

  console.log('Migração concluída!');
}

module.exports = migrate;

if (require.main === module) {
  migrate().then(() => process.exit(0)).catch(err => {
    console.error('Erro na migração:', err);
    process.exit(1);
  });
}
