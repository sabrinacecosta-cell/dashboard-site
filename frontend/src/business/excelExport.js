// Gera e baixa um arquivo .xlsx com formatação visual padronizada
export async function gerarExcelSimulacao({ rows, nomeArquivo }) {
  const { default: ExcelJS } = await import('exceljs');

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Simulação');

  const n         = rows.length;
  const firstData = 2;
  const lastData  = firstData + n - 1;
  const totRow    = lastData + 1;
  const resumoStart = totRow + 3; // 2 linhas em branco após o TOTAL

  const moeda = '"R$ "#,##0.00;"R$ "#,##0.00;"R$ -"';
  const pct   = '0.00%';

  // Índices de coluna (1-based)
  const COL = { A:1, B:2, C:3, D:4, E:5, F:6, G:7, H:8, I:9, J:10, K:11, L:12, M:13, N:14 };

  const styleBlack = (cell) => {
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
    cell.font      = { color: { argb: 'FFFFFFFF' }, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  };
  const styleCenter = (cell) => {
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  };

  // ── Row 1: Cabeçalho ────────────────────────────────────────────────────────
  const headers = [
    'Grupo', 'Taxa adm', 'Fundo de reserva', 'Prazo', 'Qtde Cotas', 'Cota',
    'Carta Total (R$)', 'Parcela Inicial (R$)', 'Parcela pós contemplação (R$)',
    'Rec. Próprios (R$)', 'Lance Emb. (%)', 'Lance Emb. (R$)', 'Lance Total (R$)', 'Crédito Contemplado (R$)',
  ];
  const headerRow = ws.getRow(1);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    styleBlack(cell);
  });
  headerRow.commit();

  // ── Linhas de dados ─────────────────────────────────────────────────────────
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
    row.getCell(COL.I).value = rowData.parcelaPosContemplacao ?? 0;
    row.getCell(COL.J).value = { formula: `G${rowNum}*${recPct}` };
    row.getCell(COL.K).value = rowData.lanceEmbPerc / 100;
    row.getCell(COL.L).value = { formula: `G${rowNum}*K${rowNum}` };
    row.getCell(COL.M).value = { formula: `J${rowNum}+L${rowNum}` };
    row.getCell(COL.N).value = { formula: `G${rowNum}-L${rowNum}` };

    for (let c = 1; c <= 14; c++) styleCenter(row.getCell(c));
    [COL.G, COL.H, COL.I, COL.J, COL.L, COL.M, COL.N].forEach(c => { row.getCell(c).numFmt = moeda; });
    [COL.B, COL.C, COL.K].forEach(c => { row.getCell(c).numFmt = pct; });

    row.commit();
  });

  // ── Linha TOTAL ─────────────────────────────────────────────────────────────
  const totRowObj = ws.getRow(totRow);

  totRowObj.getCell(COL.A).value = 'TOTAL';
  totRowObj.getCell(COL.B).value = { formula: `MEDIAN(B${firstData}:B${lastData})` };
  totRowObj.getCell(COL.C).value = { formula: `MEDIAN(C${firstData}:C${lastData})` };
  totRowObj.getCell(COL.D).value = { formula: `MEDIAN(D${firstData}:D${lastData})` };
  totRowObj.getCell(COL.E).value = { formula: `SUM(E${firstData}:E${lastData})` };
  // F (Cota): sem fórmula no total
  totRowObj.getCell(COL.G).value = { formula: `SUM(G${firstData}:G${lastData})` };
  totRowObj.getCell(COL.H).value = { formula: `SUM(H${firstData}:H${lastData})` };
  totRowObj.getCell(COL.I).value = { formula: `SUM(I${firstData}:I${lastData})` };
  totRowObj.getCell(COL.J).value = { formula: `SUM(J${firstData}:J${lastData})` };
  // K (Lance Emb %): sem fórmula no total
  totRowObj.getCell(COL.L).value = { formula: `SUM(L${firstData}:L${lastData})` };
  totRowObj.getCell(COL.M).value = { formula: `SUM(M${firstData}:M${lastData})` };
  totRowObj.getCell(COL.N).value = { formula: `SUM(N${firstData}:N${lastData})` };

  for (let c = 1; c <= 14; c++) styleBlack(totRowObj.getCell(c));
  [COL.G, COL.H, COL.I, COL.J, COL.L, COL.M, COL.N].forEach(c => { totRowObj.getCell(c).numFmt = moeda; });
  [COL.B, COL.C].forEach(c => { totRowObj.getCell(c).numFmt = pct; });

  totRowObj.commit();

  // ── RESUMO DA PROPOSTA ───────────────────────────────────────────────────────
  // Offsets a partir de resumoStart:
  //  +0  → título
  //  +1  → em branco
  //  +2  → Carta de Crédito Total         (r8 no exemplo de 1 grupo)
  //  +3  → Parcela Inicial                (r9)
  //  +4  → Parcela pós contemplação       (r10)
  //  +5  → Parcelas iniciais pagas        (r11)
  //  +6  → Simulando com x parcelas pagas (r12)
  //  +7  → Lance Total                    (r13)
  //  +8  → Recursos próprios              (r14)
  //  +9  → Embutido                       (r15)
  //  +10 → (sem A/F)                      (r16)
  //  +11 → Crédito Disponível             (r17)
  //  +12 → linha 18 REMOVIDA
  //  +13 → Taxa administrativa            (r19)
  //  +14 → Fundo de reserva               (r20)
  //  +15 → Saldo Devedor Inicial          (r21)
  //  +16 → Saldo Devedor Após Contemplação(r22)

  const rr = (offset) => resumoStart + offset;

  // Título
  {
    const row = ws.getRow(rr(0));
    const c = row.getCell(COL.A);
    c.value = 'RESUMO DA PROPOSTA - CONSÓRCIO XP';
    c.font  = { bold: true, size: 12 };
    row.commit();
  }

  // r8: Carta de Crédito Total
  {
    const row = ws.getRow(rr(2));
    row.getCell(COL.A).value = 'Carta de Crédito Total';
    const f = row.getCell(COL.F);
    f.value  = { formula: `G${totRow}` };
    f.numFmt = moeda;
    row.commit();
  }

  // r9: Parcela Inicial = SUM das parcelas iniciais (H do TOTAL)
  {
    const row = ws.getRow(rr(3));
    row.getCell(COL.A).value = 'Parcela Inicial';
    const f = row.getCell(COL.F);
    f.value  = { formula: `H${totRow}` };
    f.numFmt = moeda;
    row.commit();
  }

  // r10: Parcela pós contemplação
  {
    const row = ws.getRow(rr(4));
    row.getCell(COL.A).value = 'Parcela pós contemplação';
    const f = row.getCell(COL.F);
    f.value  = { formula: `(F${rr(16)}-F${rr(5)})/100` };
    f.numFmt = moeda;
    row.commit();
  }

  // r11: Parcelas iniciais pagas = Parcela Inicial * Qtde parcelas simuladas
  {
    const row = ws.getRow(rr(5));
    row.getCell(COL.A).value = 'Parcelas iniciais pagas';
    const f = row.getCell(COL.F);
    f.value  = { formula: `F${rr(3)}*F${rr(6)}` };
    f.numFmt = moeda;
    row.commit();
  }

  // r12: Simulando com x parcelas pagas (valor fixo editável)
  {
    const row = ws.getRow(rr(6));
    row.getCell(COL.A).value = 'Simulando com x parcelas pagas';
    row.getCell(COL.F).value = 18;
    row.commit();
  }

  // r13: Lance Total | G: Diferença líquida | H: =F17-F14
  {
    const row = ws.getRow(rr(7));
    row.getCell(COL.A).value = 'Lance Total';
    const fF = row.getCell(COL.F);
    fF.value  = { formula: `M${totRow}` };
    fF.numFmt = moeda;
    row.getCell(COL.G).value = 'Diferença líquida do lance e o crédito';
    const fH = row.getCell(COL.H);
    fH.value  = { formula: `F${rr(11)}-F${rr(8)}` };
    fH.numFmt = moeda;
    row.commit();
  }

  // r14: Recursos próprios | G: Total de taxa adm | H: =F8*B2
  {
    const row = ws.getRow(rr(8));
    row.getCell(COL.A).value = 'Recursos próprios';
    const fF = row.getCell(COL.F);
    fF.value  = { formula: `J${totRow}` };
    fF.numFmt = moeda;
    row.getCell(COL.G).value = 'Total de taxa adm';
    const fH = row.getCell(COL.H);
    fH.value  = { formula: `F${rr(2)}*B${firstData}` };
    fH.numFmt = moeda;
    row.commit();
  }

  // r15: Embutido | G: Total taxa / crédito líquido | H: =H14/H13
  {
    const row = ws.getRow(rr(9));
    row.getCell(COL.A).value = 'Embutido';
    const fF = row.getCell(COL.F);
    fF.value  = { formula: `N${totRow}` };
    fF.numFmt = moeda;
    row.getCell(COL.G).value = 'Total taxa dividido pelo crédito líquido';
    const fH = row.getCell(COL.H);
    fH.value  = { formula: `H${rr(8)}/H${rr(7)}` };
    fH.numFmt = pct;
    row.commit();
  }

  // r16: G: Taxa / prazo (a.m.) | H: =H15/D2
  {
    const row = ws.getRow(rr(10));
    row.getCell(COL.G).value = 'Taxa dividida pelo prazo (a.m.)';
    const fH = row.getCell(COL.H);
    fH.value  = { formula: `H${rr(9)}/D${firstData}` };
    fH.numFmt = pct;
    row.commit();
  }

  // r17: Crédito Disponível | G: Custo ao ano | H: =H16*12
  {
    const row = ws.getRow(rr(11));
    row.getCell(COL.A).value = 'Crédito Disponível';
    const fF = row.getCell(COL.F);
    fF.value  = { formula: `N${totRow}` };
    fF.numFmt = moeda;
    row.getCell(COL.G).value = 'Custo ao ano';
    const fH = row.getCell(COL.H);
    fH.value  = { formula: `H${rr(10)}*12` };
    fH.numFmt = pct;
    row.commit();
  }

  // rr(12) = linha 18 → REMOVIDA, não escrever nada

  // r19: Taxa administrativa
  {
    const row = ws.getRow(rr(13));
    row.getCell(COL.A).value = 'Taxa administrativa';
    const f = row.getCell(COL.F);
    f.value  = { formula: `G${totRow}*B${firstData}` };
    f.numFmt = moeda;
    row.commit();
  }

  // r20: Fundo de reserva
  {
    const row = ws.getRow(rr(14));
    row.getCell(COL.A).value = 'Fundo de reserva';
    const f = row.getCell(COL.F);
    f.value  = { formula: `G${totRow}*C${firstData}` };
    f.numFmt = moeda;
    row.commit();
  }

  // r21: Saldo Devedor Inicial = F8 + F19 + F20
  {
    const row = ws.getRow(rr(15));
    row.getCell(COL.A).value = 'Saldo Devedor Inicial';
    const f = row.getCell(COL.F);
    f.value  = { formula: `F${rr(2)}+F${rr(13)}+F${rr(14)}` };
    f.numFmt = moeda;
    row.commit();
  }

  // r22: Saldo Devedor Após Contemplação = F21 - M[total]
  {
    const row = ws.getRow(rr(16));
    row.getCell(COL.A).value = 'Saldo Devedor Após Contemplação';
    const f = row.getCell(COL.F);
    f.value  = { formula: `F${rr(15)}-M${totRow}` };
    f.numFmt = moeda;
    row.commit();
  }

  // ── Largura das colunas ──────────────────────────────────────────────────────
  const minWidths = [10, 10, 16, 8, 12, 14, 18, 20, 28, 18, 14, 14, 14, 24];
  minWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  // ── Download ─────────────────────────────────────────────────────────────────
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
