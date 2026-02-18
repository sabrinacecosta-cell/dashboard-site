require('dotenv').config();
const XLSX = require('xlsx');
const bcrypt = require('bcrypt');
const path = require('path');
const db = require('../src/config/database');

const EXCEL_PATH = '/Users/sabrinacosta/Documents/Base .xlsx';

async function importar() {
  console.log('Lendo planilha...');
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const dados = XLSX.utils.sheet_to_json(sheet);

  console.log(`${dados.length} registros encontrados`);

  // Limpa tabela de produção
  db.exec('DELETE FROM producao');
  console.log('Tabela producao limpa');

  // Insere produção
  const stmtProd = db.prepare(`
    INSERT INTO producao (mes, cliente, valor_do_bem, assessor, email_assessor, escritorio, ano)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((registros) => {
    for (const r of registros) {
      stmtProd.run(
        r.Mes,
        r.Cliente,
        r.Valor_do_bem,
        r.Assessor,
        r.Email || null,
        r.Escritorio,
        r.Ano
      );
    }
  });

  insertMany(dados);
  console.log('Produção importada!');

  // Coleta assessores únicos com email
  const assessoresComEmail = new Map();
  for (const r of dados) {
    if (r.Email && r.Assessor) {
      assessoresComEmail.set(r.Email.toLowerCase().trim(), r.Assessor);
    }
  }

  console.log(`\n${assessoresComEmail.size} assessores com email encontrados`);

  // Cria usuários para cada assessor
  const senhaHash = await bcrypt.hash('123456', 10);
  const stmtUser = db.prepare(`
    INSERT OR IGNORE INTO usuarios (id, nome, email, senha_hash)
    VALUES (?, ?, ?, ?)
  `);

  for (const [email, nome] of assessoresComEmail) {
    stmtUser.run(crypto.randomUUID(), nome, email, senhaHash);
    console.log(`Usuário: ${email} (${nome})`);
  }

  console.log('\nImportação concluída!');
  console.log('Senha padrão para todos: 123456');
}

importar().catch(console.error);
