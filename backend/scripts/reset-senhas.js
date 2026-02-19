require('dotenv').config();
const db = require('../src/config/database');

async function reset() {
  console.log('Resetando todas as senhas...');

  const result = await db.query('UPDATE usuarios SET senha_hash = NULL');

  console.log(`${result.rowCount} usuários resetados!`);
  console.log('Todos deverão criar uma nova senha no próximo login.');
  
  process.exit(0);
}

reset().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
