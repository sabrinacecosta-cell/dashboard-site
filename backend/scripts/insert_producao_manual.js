'use strict';
/**
 * Inserção manual de produção
 *   - Lucas Barbosa  — maio/2026  — R$ 700.000  — WFLOW
 *   - Fernanda Sykora — nov/2025  — R$ 29.000.000 — SELFE BTG
 *
 * Executar a partir do diretório backend/:
 *   railway run node scripts/insert_producao_manual.js
 */
const db = require('../src/config/database');

const REGISTROS = [
  {
    mes:            5,
    ano:            2026,
    assessor:       'Lucas Barbosa',
    email_assessor: 'lucas@wflowinvest.com',
    escritorio:     'WFLOW',
    valor_do_bem:   700000,
    cliente:        'GUILHERME KAPPAZ',
  },
  {
    mes:            11,
    ano:            2025,
    assessor:       'Fernanda Sykora',
    email_assessor: 'fer_sy@hotmail.com',
    escritorio:     'SELFE BTG',
    valor_do_bem:   29000000,
    cliente:        'MARCIO NEGRÃO',
  },
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
        r.cliente,
        null, null, null, null, null, null, null, null,
      ]
    );
    console.log(`✅ [${r.assessor} — ${r.mes}/${r.ano}] inserido  ID: ${result.rows[0].id}`);
  }

  await db.end();
  console.log('✅ Concluído.');
}

run().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
