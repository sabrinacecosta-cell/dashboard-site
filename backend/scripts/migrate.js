require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Cria pasta data se não existir
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = require('../src/config/database');

console.log('Iniciando migração...');

db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha_hash TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('Tabela "usuarios" criada!');

db.exec(`
  CREATE TABLE IF NOT EXISTS producao (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mes INTEGER,
    cliente TEXT,
    valor_do_bem REAL,
    assessor TEXT,
    email_assessor TEXT,
    escritorio TEXT,
    ano INTEGER
  )
`);
console.log('Tabela "producao" criada!');

// Índice para busca por assessor
db.exec(`CREATE INDEX IF NOT EXISTS idx_producao_assessor ON producao(assessor)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_producao_email ON producao(email_assessor)`);

console.log('Migração concluída!');
