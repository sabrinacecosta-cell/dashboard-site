'use strict';
/**
 * Inserção manual de produção — junho/2026 — WFLOW
 *
 * Executar a partir do diretório backend/:
 *   railway run node scripts/insert_producao_junho2026.js
 */
const db = require('../src/config/database');

const REGISTROS = [
  { mes:6, ano:2026, assessor:'Hamilton Oda', email_assessor:'hamilton@wflowinvest.com', escritorio:'WFLOW', valor_do_bem:500000.00, cliente:'RICARDO MARIANO DE BARROS JOHANSEN', modalidade:'IMÓVEIS', grupo:'001055', cota:4835, parcela:2472.50, natureza_sujeito:'PF', uf:'SP', tipo_produto:'Cheia', taxa_adm:0.15 },
  { mes:6, ano:2026, assessor:'Hamilton Oda', email_assessor:'hamilton@wflowinvest.com', escritorio:'WFLOW', valor_do_bem:500000.00, cliente:'RICARDO MARIANO DE BARROS JOHANSEN', modalidade:'IMÓVEIS', grupo:'001055', cota:4645, parcela:2472.50, natureza_sujeito:'PF', uf:'SP', tipo_produto:'Cheia', taxa_adm:0.15 },
  { mes:6, ano:2026, assessor:'Lucas Barbosa', email_assessor:'lucas@wflowinvest.com', escritorio:'WFLOW', valor_do_bem:328939.68, cliente:'STEPHANY DE LAS MERCEDES APARECIDA ROJAS SOUZA', modalidade:'auto', grupo:'003002', cota:5040, parcela:2498.63, natureza_sujeito:'PF', uf:'SP', tipo_produto:'Reduzida 50%', taxa_adm:0.17 },
  { mes:6, ano:2026, assessor:'Lucas Barbosa', email_assessor:'lucas@wflowinvest.com', escritorio:'WFLOW', valor_do_bem:400000.00, cliente:'MATHEUS EMANUEL SIMAO E SOUSA', modalidade:'IMÓVEIS', grupo:'001055', cota:null, parcela:null, natureza_sujeito:'PF', uf:null, tipo_produto:'Reduzida 50%', taxa_adm:null },
  { mes:6, ano:2026, assessor:'Lucas Barbosa', email_assessor:'lucas@wflowinvest.com', escritorio:'WFLOW', valor_do_bem:400000.00, cliente:'MATHEUS EMANUEL SIMAO E SOUSA', modalidade:'IMÓVEIS', grupo:'001055', cota:null, parcela:null, natureza_sujeito:'PF', uf:null, tipo_produto:'Reduzida 50%', taxa_adm:null },
  { mes:6, ano:2026, assessor:'Lucas Barbosa', email_assessor:'lucas@wflowinvest.com', escritorio:'WFLOW', valor_do_bem:400000.00, cliente:'MATHEUS EMANUEL SIMAO E SOUSA', modalidade:'IMÓVEIS', grupo:'001055', cota:null, parcela:null, natureza_sujeito:'PF', uf:null, tipo_produto:'Reduzida 50%', taxa_adm:null },
  { mes:6, ano:2026, assessor:'Lucas Barbosa', email_assessor:'lucas@wflowinvest.com', escritorio:'WFLOW', valor_do_bem:400000.00, cliente:'MATHEUS EMANUEL SIMAO E SOUSA', modalidade:'IMÓVEIS', grupo:'001055', cota:null, parcela:null, natureza_sujeito:'PF', uf:null, tipo_produto:'Reduzida 50%', taxa_adm:null },
];

async function run() {
  for (const r of REGISTROS) {
    const result = await db.query(
      `INSERT INTO producao
         (mes, ano, assessor, email_assessor, escritorio, valor_do_bem,
          cliente, modalidade, grupo, cota, parcela, natureza_sujeito, uf, tipo_produto, taxa_adm)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id`,
      [
        r.mes, r.ano, r.assessor, r.email_assessor, r.escritorio, r.valor_do_bem,
        r.cliente, r.modalidade, r.grupo, r.cota, r.parcela, r.natureza_sujeito,
        r.uf, r.tipo_produto, r.taxa_adm,
      ]
    );
    console.log(`✅ [${r.assessor} — ${r.cliente} — ${r.mes}/${r.ano}] inserido  ID: ${result.rows[0].id}`);
  }

  await db.end();
  console.log('✅ Concluído.');
}

run().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
