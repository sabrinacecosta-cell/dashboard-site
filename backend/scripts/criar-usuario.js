require('dotenv').config();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../src/config/database');

const NOME  = process.argv[2];
const EMAIL = process.argv[3];
const SENHA = process.argv[4];

async function run() {
  if (!NOME || !EMAIL || !SENHA) {
    console.log('Uso: node scripts/criar-usuario.js "<nome>" <email> <senha>');
    process.exit(1);
  }

  const senha_hash = await bcrypt.hash(SENHA, 10);
  const result = await db.query(
    `INSERT INTO usuarios (id, nome, email, senha_hash)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING
     RETURNING id, nome, email`,
    [crypto.randomUUID(), NOME, EMAIL, senha_hash]
  );

  if (result.rowCount === 0) {
    console.log(`Já existe usuário com e-mail ${EMAIL} — nada criado.`);
  } else {
    console.log(`Usuário criado: ${result.rows[0].nome} <${result.rows[0].email}>`);
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('Erro:', err);
  process.exit(1);
});
