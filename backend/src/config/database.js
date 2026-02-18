const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../data/auth.db');
const db = new Database(dbPath);

// Habilita foreign keys
db.pragma('journal_mode = WAL');

console.log('Conectado ao SQLite:', dbPath);

module.exports = db;
