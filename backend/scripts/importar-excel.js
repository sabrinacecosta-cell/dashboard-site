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
  
  // ========== IMPORTAR PRODUÇÃO (Planilha1) ==========
  console.log('\n--- PRODUÇÃO ---');
  const sheetProducao = workbook.Sheets['Planilha1'];
  const dadosProducao = XLSX.utils.sheet_to_json(sheetProducao);
  console.log(`${dadosProducao.length} registros de produção`);

  await db.query('DELETE FROM producao');
  console.log('Tabela producao limpa');

  // Insere produção em batch
  if (dadosProducao.length > 0) {
    const valuesProducao = [];
    const paramsProducao = [];
    let i = 1;
    
    for (const r of dadosProducao) {
      valuesProducao.push(`($${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++})`);
      paramsProducao.push(r.Mes, r.Cliente, r.Valor_do_bem, r.Assessor, r.Email || null, r.Escritorio, r.Ano);
    }
    
    await db.query(
      'INSERT INTO producao (mes, cliente, valor_do_bem, assessor, email_assessor, escritorio, ano) VALUES ' + valuesProducao.join(','),
      paramsProducao
    );
    console.log('Produção importada!');
  }

  // Coleta assessores únicos com email
  const assessoresComEmail = new Map();
  for (const r of dadosProducao) {
    if (r.Email && r.Assessor) {
      assessoresComEmail.set(r.Email.toLowerCase().trim(), r.Assessor);
    }
  }
  console.log(`${assessoresComEmail.size} assessores com email`);

  // Cria usuários APENAS se não existirem (preserva senhas!)
  for (const [email, nome] of assessoresComEmail) {
    const result = await db.query(
      `INSERT INTO usuarios (id, nome, email, senha_hash)
       VALUES ($1, $2, $3, NULL)
       ON CONFLICT (email) DO NOTHING`,
      [crypto.randomUUID(), nome, email]
    );
    
    if (result.rowCount > 0) {
      console.log(`Novo usuário: ${email}`);
    }
  }

  // ========== IMPORTAR CONTEMPLAÇÃO IMÓVEL (Planilha2) ==========
  if (workbook.SheetNames.includes('Planilha2')) {
    console.log('\n--- CONTEMPLAÇÃO IMÓVEL ---');
    const sheetContemp = workbook.Sheets['Planilha2'];
    const dadosContemp = XLSX.utils.sheet_to_json(sheetContemp);
    console.log(`${dadosContemp.length} registros de contemplação (imóvel)`);

    await db.query('DELETE FROM contemplacao');
    console.log('Tabela contemplacao limpa');

    if (dadosContemp.length > 0) {
      const valuesContemp = [];
      const paramsContemp = [];
      let j = 1;
      
      for (const r of dadosContemp) {
        valuesContemp.push(`($${j++}, $${j++}, $${j++}, $${j++}, $${j++}, $${j++}, $${j++}, $${j++})`);
        
        const contempMensal = r['Contemplação mensal'] ? Math.round(r['Contemplação mensal'] * 100) + '%' : null;
        const mediaContemp = r['Média contemplação'] ? Math.round(r['Média contemplação'] * 100) + '%' : null;
        const mes = (r['Mês '] || r['Mês'] || '').toString().toLowerCase().trim();
        
        paramsContemp.push(
          r['Grupo'],
          mes,
          r['Lance %'] ? Math.round(r['Lance %'] * 10) / 10 : null,
          r['Qnt lances'] ? Math.round(r['Qnt lances']) : null,
          r['Contemplados'] ? Math.round(r['Contemplados']) : null,
          contempMensal,
          mediaContemp,
          r['Média % lance'] || null
        );
      }
      
      await db.query(
        'INSERT INTO contemplacao (grupo, mes, lance_percent, qnt_lances, contemplados, contemplacao_mensal, media_contemplacao, media_lance_percent) VALUES ' + valuesContemp.join(','),
        paramsContemp
      );
      console.log('Contemplação Imóvel importada!');
    }
  } else {
    console.log('\nPlanilha2 não encontrada, pulando contemplação imóvel');
  }

  // ========== IMPORTAR CONTEMPLAÇÃO AUTO (Planilha3) ==========
  if (workbook.SheetNames.includes('Planilha3')) {
    console.log('\n--- CONTEMPLAÇÃO AUTO ---');
    const sheetAuto = workbook.Sheets['Planilha3'];
    const dadosAuto = XLSX.utils.sheet_to_json(sheetAuto);
    console.log(`${dadosAuto.length} registros de contemplação (auto)`);

    await db.query('DELETE FROM contemplacao_auto');
    console.log('Tabela contemplacao_auto limpa');

    if (dadosAuto.length > 0) {
      const valuesAuto = [];
      const paramsAuto = [];
      let k = 1;
      
      for (const r of dadosAuto) {
        valuesAuto.push(`($${k++}, $${k++}, $${k++}, $${k++}, $${k++}, $${k++}, $${k++}, $${k++})`);
        
        const contempMensal = r['Contemplação mensal'] ? Math.round(r['Contemplação mensal'] * 100) + '%' : null;
        const mediaContemp = r['Média contemplação'] ? Math.round(r['Média contemplação'] * 100) + '%' : null;
        const mes = (r['Mês '] || r['Mês'] || '').toString().toLowerCase().trim();
        
        paramsAuto.push(
          r['Grupo'],
          mes,
          r['Lance %'] ? Math.round(r['Lance %'] * 10) / 10 : null,
          r['Qnt lances'] ? Math.round(r['Qnt lances']) : null,
          r['Contemplados'] ? Math.round(r['Contemplados']) : null,
          contempMensal,
          mediaContemp,
          r['Média % lance'] || null
        );
      }
      
      await db.query(
        'INSERT INTO contemplacao_auto (grupo, mes, lance_percent, qnt_lances, contemplados, contemplacao_mensal, media_contemplacao, media_lance_percent) VALUES ' + valuesAuto.join(','),
        paramsAuto
      );
      console.log('Contemplação Auto importada!');
    }
  } else {
    console.log('\nPlanilha3 não encontrada, pulando contemplação auto');
  }

  console.log('\n✅ Importação concluída!');
  console.log('Senhas existentes foram PRESERVADAS!');
  
  process.exit(0);
}

importar().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
