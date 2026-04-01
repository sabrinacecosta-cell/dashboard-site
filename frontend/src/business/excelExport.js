// Gera e baixa um arquivo .xlsx com formatação visual padronizada
export async function gerarExcelSimulacao({ rows, totais, nomeArquivo }) {
  const { default: ExcelJS } = await import('exceljs');

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Simulação');

  // Formato contábil BR: "R$ 304.871,20" | zero → "R$ -"
  const moedaFmt = '"R$ "#,##0.00;"R$ "#,##0.00;"R$ -"';
  // Colunas monetárias: C(3), D(4), E(5), G(7), I(9), J(10), K(11)
  const moedaCols = new Set([3, 4, 5, 7, 9, 10, 11]);

  const estiloCabTot = (cell, colNum) => {
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
    cell.font  = { color: { argb: 'FFFFFFFF' }, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
    if (moedaCols.has(colNum)) cell.numFmt = moedaFmt;
  };

  const estiloDado = (cell, colNum) => {
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
    if (moedaCols.has(colNum)) cell.numFmt = moedaFmt;
  };

  // ── Cabeçalho ────────────────────────────────────────────────────────────────
  const headers = [
    'Grupo',
    'Qtde Cotas',
    'Carta Total (R$)',
    'Parcela Inicial (R$)',
    'Parcela pós contemplação (R$)',
    'Redutor',
    'Rec. Próprios (R$)',
    'Lance Emb. (%)',
    'Lance Emb. (R$)',
    'Lance Total (R$)',
    'Crédito Contemplado (R$)',
  ];
  ws.addRow(headers).eachCell((cell, col) => estiloCabTot(cell, col));

  // ── Linhas de dados ───────────────────────────────────────────────────────────
  for (const r of rows) {
    ws.addRow([
      r.grupo,
      r.qtde,
      r.cartaTotal,
      r.parcelaInicial,
      r.parcelaPosContemplacao ?? 0,
      r.redutor,          // string "50%" ou "0%"
      r.recProprios,
      r.lanceEmbPerc,     // número inteiro (ex: 30)
      r.lanceEmb,
      r.lanceTotal,
      r.creditoContemplado,
    ]).eachCell((cell, col) => estiloDado(cell, col));
  }

  // ── Linha TOTAL ───────────────────────────────────────────────────────────────
  ws.addRow([
    'TOTAL',
    '',
    totais.cartaTotal,
    totais.parcelaInicial,
    totais.parcelaPosContemplacao ?? 0,
    '',
    totais.recProprios,
    '',
    totais.lanceEmb,
    totais.lanceTotal,
    totais.creditoContemplado,
  ]).eachCell((cell, col) => estiloCabTot(cell, col));

  // ── Largura automática (autofit) ──────────────────────────────────────────────
  ws.columns.forEach((col, idx) => {
    const headerLen = headers[idx].length;
    let maxLen = headerLen;
    col.eachCell({ includeEmpty: false }, cell => {
      const v = cell.value != null ? String(cell.value) : '';
      if (v.length > maxLen) maxLen = v.length;
    });
    col.width = maxLen + 4;
  });

  // ── Download ──────────────────────────────────────────────────────────────────
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
