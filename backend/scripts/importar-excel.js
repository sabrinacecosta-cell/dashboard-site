require('dotenv').config();
const XLSX = require('xlsx');
const crypto = require('crypto');
const path = require('path');
const db = require('../src/config/database');

// Ajuste o caminho do Excel conforme necessário
const EXCEL_PATH = process.env.EXCEL_PATH || '/Users/sabrinacosta/Documents/Base .xlsx';

async function importar() {
  console.log('Lendo planilha:', EXCEL_PATH);
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const dados = XLSX.utils.sheet_to_json(sheet);

  console.log(`${dados.length} registros encontrados`);

  // Limpa tabela de produção
  await db.query('DELETE FROM producao');
  console.log('Tabela producao limpa');

  // Insere produção em lotes
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    for (const r of dados) {
      await client.query(
        `INSERT INTO producao (mes, cliente, valor_do_bem, assessor, email_assessor, escritorio, ano)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [r.Mes, r.Cliente, r.Valor_do_bem, r.Assessor, r.Email || null, r.Escritorio, r.Ano]
      );
    }
    
    await client.query('COMMIT');
    console.log('Produção importada!');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  // Coleta assessores únicos com email
  const assessoresComEmail = new Map();
  for (const r of dados) {
    if (r.Email && r.Assessor) {
      assessoresComEmail.set(r.Email.toLowerCase().trim(), r.Assessor);
    }
  }

  console.log(`\n${assessoresComEmail.size} assessores com email encontrados`);

  // Cria usuários APENAS se não existirem (preserva senhas existentes!)
  for (const [email, nome] of assessoresComEmail) {
    const result = await db.query(
      `INSERT INTO usuarios (id, nome, email, senha_hash)
       VALUES ($1, $2, $3, NULL)
       ON CONFLICT (email) DO NOTHING`,
      [crypto.randomUUID(), nome, email]
    );
    
    if (result.rowCount > 0) {
      console.log(`Novo usuário: ${email} (${nome})`);
    }
  }

  console.log('\nImportação concluída!');
  console.log('Usuários novos precisam definir senha no primeiro acesso.');
  console.log('Senhas existentes foram PRESERVADAS!');
  
  process.exit(0);
}

importar().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
