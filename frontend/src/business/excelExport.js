// Gera e baixa um arquivo .xlsx com formatação visual padronizada
export async function gerarExcelSimulacao({ rows, simularParcelas = 18, nomeArquivo }) {
  const { default: ExcelJS } = await import('exceljs');

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Simulação');

  const n         = rows.length;
  const firstData = 2;
  const lastData  = firstData + n - 1;
  const totRow    = lastData + 1;
  const resumoStart = totRow + 2; // 1 linha em branco após o TOTAL

  const moeda = '"R$ "#,##0.00;"R$ "#,##0.00;"R$ -"';
  const pct   = '0.00%';

  const COL = { A:1, B:2, C:3, D:4, E:5, F:6, G:7, H:8, I:9, J:10, K:11, L:12, M:13, N:14 };

  const rr = (offset) => resumoStart + offset;

  const thinBorder = {
    top:    { style: 'thin' },
    left:   { style: 'thin' },
    bottom: { style: 'thin' },
    right:  { style: 'thin' },
  };
  const begeFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC9C5A8' } };

  const applyBlack = (cell) => {
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
    cell.font      = { name: 'Calibri', size: 11, color: { argb: 'FFFFFFFF' }, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  };
  const applyBegeABC = (rowObj) => {
    [COL.A, COL.B, COL.C].forEach(c => { rowObj.getCell(c).fill = begeFill; });
  };

  // ── Largura das colunas ──────────────────────────────────────────────────
  ws.getColumn(COL.A).width = 36;
  ws.getColumn(COL.B).width = 10;
  ws.getColumn(COL.C).width = 16;
  ws.getColumn(COL.D).width = 30;
  ws.getColumn(COL.E).width = 12.5;
  ws.getColumn(COL.F).width = 14;
  ws.getColumn(COL.G).width = 18;
  ws.getColumn(COL.H).width = 20;
  ws.getColumn(COL.I).width = 28;
  ws.getColumn(COL.J).width = 18;
  ws.getColumn(COL.K).width = 14;
  ws.getColumn(COL.N).width = 24;

  // ── Linha 1: Cabeçalho ───────────────────────────────────────────────────
  const headers = [
    'Grupo', 'Taxa adm', 'Fundo de reserva', 'Prazo', 'Qtde Cotas', 'Cota',
    'Carta Total (R$)', 'Parcela Inicial (R$)', 'Parcela pós contemplação (R$)',
    'Rec. Próprios (R$)', 'Lance Emb. (%)', 'Lance Emb. (R$)', 'Lance Total (R$)', 'Crédito Contemplado (R$)',
  ];
  const headerRow = ws.getRow(1);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    applyBlack(cell);
  });
  headerRow.commit();

  // ── Linhas de dados ──────────────────────────────────────────────────────
  rows.forEach((rowData, idx) => {
    const rowNum = firstData + idx;
    const cotaVal = rowData.qtde > 0 ? rowData.cartaTotal / rowData.qtde : 0;
    const recPct  = rowData.cartaTotal > 0 ? rowData.recProprios / rowData.cartaTotal : 0;

    const row = ws.getRow(rowNum);

    row.getCell(COL.A).value = rowData.grupo;
    row.getCell(COL.B).value = rowData.taxaAdm;
    row.getCell(COL.C).value = rowData.fundoReserva;
    row.getCell(COL.D).value = rowData.prazo;
    row.getCell(COL.E).value = rowData.qtde;
    row.getCell(COL.F).value = cotaVal;
    row.getCell(COL.G).value = { formula: `E${rowNum}*F${rowNum}` };
    row.getCell(COL.H).value = { formula: `(F${rowNum}*(1+B${rowNum}+C${rowNum}))/D${rowNum}` };
    row.getCell(COL.I).value = { formula: `C${rr(4)}` };
    row.getCell(COL.J).value = { formula: `G${rowNum}*${recPct}` };
    row.getCell(COL.K).value = rowData.lanceEmbPerc / 100;
    row.getCell(COL.L).value = { formula: `G${rowNum}*K${rowNum}` };
    row.getCell(COL.M).value = { formula: `J${rowNum}+L${rowNum}` };
    row.getCell(COL.N).value = { formula: `G${rowNum}-L${rowNum}` };

    for (let c = 1; c <= 14; c++) {
      const cell = row.getCell(c);
      cell.font      = { name: 'Calibri', size: 11 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
    [COL.G, COL.H, COL.I, COL.J, COL.L, COL.M, COL.N].forEach(c => { row.getCell(c).numFmt = moeda; });
    [COL.B, COL.C, COL.K].forEach(c => { row.getCell(c).numFmt = pct; });

    row.commit();
  });

  // ── Linha TOTAL ──────────────────────────────────────────────────────────
  const totRowObj = ws.getRow(totRow);

  totRowObj.getCell(COL.A).value = 'TOTAL';
  totRowObj.getCell(COL.B).value = { formula: `MEDIAN(B${firstData}:B${lastData})` };
  totRowObj.getCell(COL.C).value = { formula: `MEDIAN(C${firstData}:C${lastData})` };
  totRowObj.getCell(COL.D).value = { formula: `MEDIAN(D${firstData}:D${lastData})` };
  totRowObj.getCell(COL.E).value = { formula: `SUM(E${firstData}:E${lastData})` };
  totRowObj.getCell(COL.G).value = { formula: `SUM(G${firstData}:G${lastData})` };
  totRowObj.getCell(COL.H).value = { formula: `SUM(H${firstData}:H${lastData})` };
  totRowObj.getCell(COL.I).value = { formula: `SUM(I${firstData}:I${lastData})` };
  totRowObj.getCell(COL.J).value = { formula: `SUM(J${firstData}:J${lastData})` };
  totRowObj.getCell(COL.L).value = { formula: `SUM(L${firstData}:L${lastData})` };
  totRowObj.getCell(COL.M).value = { formula: `SUM(M${firstData}:M${lastData})` };
  totRowObj.getCell(COL.N).value = { formula: `SUM(N${firstData}:N${lastData})` };

  for (let c = 1; c <= 14; c++) applyBlack(totRowObj.getCell(c));
  [COL.G, COL.H, COL.I, COL.J, COL.L, COL.M, COL.N].forEach(c => { totRowObj.getCell(c).numFmt = moeda; });
  [COL.B, COL.C].forEach(c => { totRowObj.getCell(c).numFmt = pct; });

  totRowObj.commit();

  // ── RESUMO DA PROPOSTA ───────────────────────────────────────────────────
  // Coluna A = rótulo, coluna C = fórmula. Fundo bege em A, B e C.
  const setResumoRow = (offset, label, formula, numFmt = moeda) => {
    const row = ws.getRow(rr(offset));
    if (label) {
      const a = row.getCell(COL.A);
      a.value = label;
      a.font  = { name: 'Cambria', size: 11 };
    }
    if (formula != null) {
      const c = row.getCell(COL.C);
      c.value     = { formula };
      c.numFmt    = numFmt;
      c.font      = { name: 'Cambria', size: 11 };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    }
    applyBegeABC(row);
    row.commit();
  };

  // r+0: Título
  {
    const row  = ws.getRow(rr(0));
    row.height = 16;
    const a    = row.getCell(COL.A);
    a.value    = 'RESUMO DA PROPOSTA - CONSÓRCIO XP';
    a.font     = { name: 'Calibri', size: 12, bold: true };
    applyBegeABC(row);
    row.commit();
  }

  // r+1: linha em branco com bege
  { const row = ws.getRow(rr(1)); applyBegeABC(row); row.commit(); }

  setResumoRow(2,  'Carta de Crédito Total',          `G${totRow}`);
  setResumoRow(3,  'Parcela Inicial',                  `H${totRow}`);
  setResumoRow(4,  'Parcela pós contemplação',         `C${rr(16)}/(MEDIAN(D${firstData}:D${lastData})-C${rr(6)})`);
  setResumoRow(5,  'Parcelas iniciais pagas',          `C${rr(3)}*C${rr(6)}`);

  // r+6: Simulando com x parcelas pagas (valor fixo negrito)
  {
    const row = ws.getRow(rr(6));
    const a   = row.getCell(COL.A);
    a.value   = 'Simulando com x parcelas pagas';
    a.font    = { name: 'Cambria', size: 11 };
    const c   = row.getCell(COL.C);
    c.value     = simularParcelas;
    c.font      = { name: 'Cambria', size: 11, bold: true };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    applyBegeABC(row);
    row.commit();
  }

  setResumoRow(7,  'Lance Total',                      `M${totRow}`);
  setResumoRow(8,  'Recursos próprios',                `J${totRow}`);
  setResumoRow(9,  'Embutido',                         `N${totRow}`);

  // r+10: vazio
  { const row = ws.getRow(rr(10)); applyBegeABC(row); row.commit(); }

  setResumoRow(11, 'Crédito Disponível',               `N${totRow}`);

  // r+12: vazio (linha de separação antes do bloco lateral)
  { const row = ws.getRow(rr(12)); applyBegeABC(row); row.commit(); }

  setResumoRow(13, 'Taxa administrativa',              `G${totRow}*B${firstData}`);
  setResumoRow(14, 'Fundo de reserva',                 `G${totRow}*C${firstData}`);
  setResumoRow(15, 'Saldo Devedor Inicial',            `C${rr(2)}+C${rr(13)}+C${rr(14)}`);
  setResumoRow(16, 'Saldo Devedor Após Contemplação',  `C${rr(15)}-C${rr(7)}-C${rr(5)}`);

  // ── Bloco lateral (colunas D e E, linhas rr(12)–rr(16)) ─────────────────
  // Sem fundo, bordas thin, Cambria 11. Última linha (rr(16)) altura 14.
  const L = 12; // lateralOffset
  const lateralItems = [
    { d: 'Diferença líquida do lance e o crédito',    eFormula: `C${rr(11)}-C${rr(8)}`,              eFmt: moeda },
    { d: 'Total de taxa adm',                          eFormula: `C${rr(2)}*B${firstData}`,            eFmt: moeda },
    { d: 'Total taxa dividido pelo crédito líquido',   eFormula: `E${rr(L+1)}/E${rr(L)}`,             eFmt: pct   },
    { d: 'Taxa dividida pelo prazo (a.m.)',             eFormula: `E${rr(L+2)}/D${firstData}`,          eFmt: pct   },
    { d: 'Custo ao ano',                               eFormula: `E${rr(L+3)}*12`,                     eFmt: pct   },
  ];

  lateralItems.forEach((item, i) => {
    const row  = ws.getRow(rr(L + i));
    const dCell = row.getCell(COL.D);
    dCell.value  = item.d;
    dCell.font   = { name: 'Cambria', size: 11 };
    dCell.border = thinBorder;

    const eCell = row.getCell(COL.E);
    eCell.value     = { formula: item.eFormula };
    eCell.numFmt    = item.eFmt;
    eCell.font      = { name: 'Cambria', size: 11 };
    eCell.border    = thinBorder;
    eCell.alignment = { horizontal: 'center', vertical: 'middle' };

    if (i === lateralItems.length - 1) row.height = 14;
    row.commit();
  });

  // ── Download ─────────────────────────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();
  const blob   = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}
