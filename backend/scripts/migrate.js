require('dotenv').config();
const pool = require('../src/config/database');

async function migrate() {
  try {
    console.log('Iniciando migração...');

    // Cria tabela de usuários
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        senha_hash VARCHAR(255),
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabela "usuarios" criada!');

    // Cria tabela de produção
    await pool.query(`
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
    console.log('Tabela "producao" criada!');

    // Índices
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_producao_assessor ON producao(assessor)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_producao_email ON producao(email_assessor)`);

    console.log('Migração concluída!');
    process.exit(0);
  } catch (error) {
    console.error('Erro na migração:', error);
    process.exit(1);
  }
}

migrate();
