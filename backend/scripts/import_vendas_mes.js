/**
 * Importador padronizado de vendas (aba Vendas / tabela producao).
 *
 * Fonte: exports Wflow/Consórcio XP em ~/Documents/Importantes/Produção (1 arquivo por mês).
 * Regras (confirmadas com a Sabrina):
 *  - Todas as linhas do Excel = administradora "Consórcio XP", escritório "Wflow".
 *  - Só vendas efetivadas: Alocado? = SIM; nos arquivos sem essa coluna, exige Dt_Alocacao.
 *  - Ignora linha de total (sem cliente/produto) e abas extras (usa sempre a 1ª aba).
 *  - Vendas Embracon NÃO vêm no export (são manuais) → este script NÃO as toca:
 *    o DELETE por mês é filtrado por administradora='Consórcio XP'.
 *  - Preserva tudo <= out/2025 (só mexe nos meses configurados abaixo).
 *
 * Uso:
 *   node scripts/import_vendas_mes.js            # dry-run de todos os meses
 *   node scripts/import_vendas_mes.js --apply    # grava no banco (por mês: DELETE XP + INSERT)
 *   node scripts/import_vendas_mes.js --file="produção maio.xlsx"  # limita a um arquivo
 *
 * Contra produção: DATABASE_URL=$DATABASE_PUBLIC_URL NODE_ENV=production node ...
 */
const path = require('path');
const XLSX = require('xlsx');

const DIR = process.env.VENDAS_DIR || '/Users/sabrinacosta/Documents/Importantes/Produção';
const APPLY = process.argv.includes('--apply');
const fileArg = (process.argv.find(a => a.startsWith('--file=')) || '').split('=')[1];

// arquivo -> mês/ano. A aba principal é sempre a 1ª do arquivo.
const FILES = [
  { file: 'Produção novembro-25 - Wflow-2.xlsx', mes: 11, ano: 2025 },
  { file: 'Dezembro - Consórcio XP.xlsx',         mes: 12, ano: 2025 },
  { file: 'Janeiro - Consórcio xp.xlsx',          mes: 1,  ano: 2026 },
  { file: 'Produção fevereiro.xlsx',              mes: 2,  ano: 2026 },
  { file: 'Produção março.xlsx',                  mes: 3,  ano: 2026 },
  { file: 'produção abril.xlsx',                  mes: 4,  ano: 2026 },
  { file: 'produção maio.xlsx',                   mes: 5,  ano: 2026 },
  { file: 'produção  junho.xlsx',                 mes: 6,  ano: 2026 },
  { file: 'produção julho wflow.xlsx',            mes: 7,  ano: 2026 },
  { file: 'Produção agosto.xlsx',                 mes: 8,  ano: 2026 },
];

const ADMINISTRADORA = 'Consórcio XP';
const ESCRITORIO = 'Wflow';

function num(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}
function taxa(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v).replace('%', '').replace(',', '.'));
  return isNaN(n) ? null : (n > 1 ? n / 100 : n);
}
function modalidade(produto) {
  const p = String(produto || '').toUpperCase();
  if (p.includes('IMÓ') || p.includes('IMO')) return 'imovel';
  if (p.includes('VEÍC') || p.includes('VEIC') || p.includes('AUTO') ||
      p.includes('PESAD') || p.includes('CAMINH')) return 'auto';
  return null;
}
function valorBem(r) {
  return num(r['Valor crédito'] ?? r['Valor cota'] ?? r['Valor']);
}

function parseFile(cfg) {
  const full = path.join(DIR, cfg.file);
  const wb = XLSX.readFile(full);
  const aba = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[aba], { defval: null });

  // Sabrina confirmou: nas planilhas está tudo alocado. Então não filtramos por
  // Alocado?/Dt_Alocacao — incluímos toda venda real (tem cliente + produto + valor).
  // Descartes: linha de total (sem cliente) e linhas sem produto (ex.: Rivânia/Embracon,
  // que é lançada à parte). Esses descartes são listados para conferência.
  const registros = [];
  const descartadas = [];
  for (const r of rows) {
    const cliente = (r['NM_Pessoa'] || '').toString().trim();
    const produto = r['Produto'];
    const valor = valorBem(r);
    if (!cliente || !produto) {
      if (cliente || valor) descartadas.push({ cliente: cliente || '(sem nome)', produto, valor, motivo: 'total/sem produto' });
      continue;
    }
    // Descarta cancelada / não alocada (o total da planilha também as exclui).
    const aloc = String(r['Alocado?'] ?? '').trim().toUpperCase();
    const sit = String(r['Situacao_Proposta'] ?? '').trim().toUpperCase();
    if (aloc === 'NÃO' || aloc === 'NAO' || sit.includes('CANCEL') || r['DT_Cancelamento'] != null) {
      descartadas.push({ cliente, produto, valor, motivo: `cancelada/não alocada (${sit || aloc})` });
      continue;
    }

    registros.push({
      mes: cfg.mes,
      ano: cfg.ano,
      cliente,
      valor_do_bem: valorBem(r),
      parcela: num(r['VL_PC_Atual'] ?? r['Parcela']),
      assessor: (r['Assessor'] || null) && String(r['Assessor']).trim(),
      email_assessor: null,
      escritorio: ESCRITORIO,
      modalidade: modalidade(produto),
      grupo: r['Grupo'] != null ? String(r['Grupo']).trim() : null,
      cota: r['CD_Cota'] != null ? parseInt(String(r['CD_Cota']).replace(/\D/g, ''), 10) || null : null,
      natureza_sujeito: r['Tipo de Pessoa'] || null,
      uf: r['UF'] || null,
      tipo_produto: r['Tipo de Produto'] || null,
      taxa_adm: taxa(r['TA']),
      administradora: ADMINISTRADORA,
    });
  }
  return { aba, total: rows.length, descartadas, registros };
}

async function main() {
  const alvo = FILES.filter(f => !fileArg || f.file === fileArg);
  let db = null;
  if (APPLY) db = require('../src/config/database');

  for (const cfg of alvo) {
    let parsed;
    try { parsed = parseFile(cfg); }
    catch (e) { console.log(`\n✗ ${cfg.file}: ${e.message}`); continue; }

    const { registros, total, descartadas, aba } = parsed;
    const somaValor = registros.reduce((s, r) => s + (r.valor_do_bem || 0), 0);
    console.log(`\n=== ${cfg.file}  →  ${String(cfg.mes).padStart(2,'0')}/${cfg.ano} ===`);
    console.log(`   aba: "${aba}" | linhas: ${total} | vendas XP: ${registros.length} | descartadas: ${descartadas.length}`);
    console.log(`   soma valor_do_bem (XP): R$ ${somaValor.toLocaleString('pt-BR', {minimumFractionDigits:2})}`);
    for (const d of descartadas) {
      console.log(`     descartada: ${d.cliente} | valor=${d.valor} | ${d.motivo}`);
    }
    const semMod = registros.filter(r => !r.modalidade).length;
    const semValor = registros.filter(r => r.valor_do_bem == null).length;
    if (semMod) console.log(`   ⚠ ${semMod} sem modalidade reconhecida`);
    if (semValor) console.log(`   ⚠ ${semValor} sem valor_do_bem`);

    if (APPLY) {
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        const del = await client.query(
          `DELETE FROM producao WHERE ano=$1 AND mes=$2 AND administradora=$3`,
          [cfg.ano, cfg.mes, ADMINISTRADORA]
        );
        for (const r of registros) {
          await client.query(
            `INSERT INTO producao
              (mes, ano, cliente, valor_do_bem, parcela, assessor, email_assessor, escritorio,
               modalidade, grupo, cota, natureza_sujeito, uf, tipo_produto, taxa_adm, administradora)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
            [r.mes, r.ano, r.cliente, r.valor_do_bem, r.parcela, r.assessor, r.email_assessor,
             r.escritorio, r.modalidade, r.grupo, r.cota, r.natureza_sujeito, r.uf,
             r.tipo_produto, r.taxa_adm, r.administradora]
          );
        }
        await client.query('COMMIT');
        console.log(`   ✓ aplicado: -${del.rowCount} XP antigos, +${registros.length} novos (Embracon preservado)`);
      } catch (e) {
        await client.query('ROLLBACK');
        console.log(`   ✗ ROLLBACK: ${e.message}`);
      } finally {
        client.release();
      }
    }
  }
  if (APPLY) await db.end?.();
  console.log(`\n${APPLY ? 'APLICADO' : 'DRY-RUN (nada gravado). Rode com --apply para gravar.'}`);
}

main().catch(e => { console.error(e); process.exit(1); });
