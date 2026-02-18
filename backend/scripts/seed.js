require('dotenv').config();
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

// Cria pasta data se não existir
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = require('../src/config/database');

async function seed() {
  try {
    console.log('Iniciando seed...');

    // Usuário de teste COM senha
    const senhaHash = await bcrypt.hash('123456', 10);
    
    const stmt1 = db.prepare(`
      INSERT OR IGNORE INTO usuarios (id, nome, email, senha_hash)
      VALUES (?, ?, ?, ?)
    `);
    stmt1.run(crypto.randomUUID(), 'Admin Teste', 'admin@teste.com', senhaHash);
    console.log('Usuário criado: admin@teste.com / senha: 123456');

    // Usuário para testar primeiro acesso (sem senha)
    const stmt2 = db.prepare(`
      INSERT OR IGNORE INTO usuarios (id, nome, email, senha_hash)
      VALUES (?, ?, ?, ?)
    `);
    stmt2.run(crypto.randomUUID(), 'Novo Usuário', 'novo@teste.com', null);
    console.log('Usuário criado: novo@teste.com (sem senha - primeiro acesso)');

    console.log('Seed concluído!');
  } catch (error) {
    console.error('Erro no seed:', error);
    process.exit(1);
  }
}

seed();
