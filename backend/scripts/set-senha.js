require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../src/config/database');

const EMAIL = process.argv[2];
const SENHA = process.argv[3];

async function run() {
  if (!EMAIL || !SENHA) {
    console.log('Uso: node scripts/set-senha.js <email> <senha>');
    process.exit(1);
  }

  const senha_hash = await bcrypt.hash(SENHA, 10);
  const result = await db.query(
    'UPDATE usuarios SET senha_hash = $1 WHERE email = $2 RETURNING id, nome, email',
    [senha_hash, EMAIL]
  );

  if (result.rowCount === 0) {
    console.log(`Nenhum usuário com e-mail ${EMAIL} encontrado.`);
  } else {
    console.log(`Senha definida para: ${result.rows[0].nome} <${result.rows[0].email}>`);
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('Erro:', err);
  process.exit(1);
});
