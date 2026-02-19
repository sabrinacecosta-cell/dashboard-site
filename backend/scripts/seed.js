require('dotenv').config();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../src/config/database');

async function seed() {
  try {
    console.log('Iniciando seed...');

    // Usuário de teste COM senha
    const senhaHash = await bcrypt.hash('123456', 10);
    
    await db.query(
      `INSERT INTO usuarios (id, nome, email, senha_hash)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [crypto.randomUUID(), 'Admin Teste', 'admin@teste.com', senhaHash]
    );
    console.log('Usuário admin@teste.com OK (senha: 123456)');

    // Usuário para testar primeiro acesso (sem senha)
    await db.query(
      `INSERT INTO usuarios (id, nome, email, senha_hash)
       VALUES ($1, $2, $3, NULL)
       ON CONFLICT (email) DO NOTHING`,
      [crypto.randomUUID(), 'Novo Usuário', 'novo@teste.com']
    );
    console.log('Usuário novo@teste.com OK (sem senha - primeiro acesso)');

    console.log('Seed concluído!');
    process.exit(0);
  } catch (error) {
    console.error('Erro no seed:', error);
    process.exit(1);
  }
}

seed();
