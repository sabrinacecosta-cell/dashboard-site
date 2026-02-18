require('dotenv').config();
const db = require('../src/config/database');

console.log('Resetando todas as senhas...');

const result = db.prepare('UPDATE usuarios SET senha_hash = NULL').run();

console.log(`${result.changes} usuários resetados!`);
console.log('Todos deverão criar uma nova senha no próximo login.');
