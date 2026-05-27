'use strict';
/**
 * Insere produção de Lucas Barbosa — maio/2026
 * Executar: railway run node scripts/insert_lucas_maio2026.js
 */
const db = require('../src/config/database');

async function run() {
  const result = await db.query(
    `INSERT INTO producao
       (mes, ano, assessor, email_assessor, escritorio, valor_do_bem,
        cliente, modalidade, grupo, cota, parcela, natureza_sujeito, uf, tipo_produto, taxa_adm)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING id`,
    [
      5,                          // mes (maio)
      2026,                       // ano
      'Lucas Barbosa',            // assessor
      'lucas@wflowinvest.com',    // email_assessor
      'WFLOW',                    // escritorio
      700000,                     // valor_do_bem (700 mil)
      'N/A',                      // cliente — ajuste se necessário
      null,                       // modalidade
      null,                       // grupo
      null,                       // cota
      null,                       // parcela
      null,                       // natureza_sujeito
      null,                       // uf
      null,                       // tipo_produto
      null,                       // taxa_adm
    ]
  );

  console.log('✅ Registro inserido com ID:', result.rows[0].id);
  await db.end();
}

run().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
