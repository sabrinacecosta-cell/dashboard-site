import React, { useState, useMemo } from 'react';
import { gerarExcelSimulacao } from '../../business/excelExport';
import { GRUPOS_CONTEMPLACAO_AUTO } from '../../data/grupos';
import { formatarMoeda, formatarMoedaInteiro, calcularCustos } from '../../business/calculos';
import { ResumoProposta } from './ResumoProposta';

const G2127 = GRUPOS_CONTEMPLACAO_AUTO[2127];
const G2128 = GRUPOS_CONTEMPLACAO_AUTO[2128];

// ─── Linha de cota com quantidade local ──────────────────────────────────────
function CotaRow({ cota, tipoParcela, onAdd }) {
  const [qtde, setQtde] = useState(1);
  return (
    <tr>
      <td>{formatarMoeda(cota.carta)}</td>
      <td className="valor-destaque">
        {formatarMoeda(tipoParcela === 'reduzida' ? cota.parcelaReduzida : cota.parcelaNormal)}
      </td>
      <td>
        <div className="cr-add-row">
          <div className="cr-qtde-wrapper">
            <label className="cr-qtde-label">Qtde</label>
            <input
              type="number"
              className="cr-input-qtde"
              min={1}
              max={99}
              value={qtde}
              onChange={e => setQtde(Math.min(99, Math.max(1, Number(e.target.value))))}
            />
          </div>
          <button
            type="button"
            className="cr-btn-add"
            onClick={() => onAdd(cota, qtde)}
          >
            + Add
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Card de um grupo com tabela de cotas ────────────────────────────────────
function CardGrupo({ grupo, tipoParcela, onAdd }) {
  return (
    <div className="sim-painel cr-card-grupo">
      <div className="cr-grupo-header">
        <h3 className="cr-grupo-titulo">GRUPO {grupo.numero}</h3>
        <div className="cr-grupo-meta">
          <span>Taxa ADM: {(grupo.taxaAdm * 100).toFixed(0)}%</span>
          <span>FR: {(grupo.fundoReserva * 100).toFixed(0)}%</span>
          <span>Prazo restante: {grupo.prazoRestante}m</span>
          <span>Lance emb.: {grupo.lanceEmbutido}%</span>
          <span>Índice: {grupo.indice}</span>
        </div>
      </div>
      <div className="sim-tabela-container">
        <table className="sim-tabela cr-tabela-cotas">
          <thead>
            <tr>
              <th>Carta total</th>
              <th>{tipoParcela === 'reduzida' ? 'Parcela red. (50%)' : 'Parcela normal'}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {grupo.tabela.map((cota, i) => (
              <CotaRow
                key={i}
                cota={cota}
                tipoParcela={tipoParcela}
                onAdd={(cota, qtde) => onAdd(grupo, cota, qtde)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Linha editável da tabela de simulação ───────────────────────────────────
function LinhaSimulacao({ linha, onRemove, onUpdate, redutorDisplay }) {
  const cartaTotal        = linha.carta * linha.qtde;
  const parcelaInicial    = linha.parcela * linha.qtde;
  const lanceEmb          = cartaTotal * (linha.lanceEmbutidoPercent / 100);
  const recPropriosReais  = cartaTotal * ((linha.recProprios || 0) / 100);
  const lanceTotal        = recPropriosReais + lanceEmb;
  const creditoContemplado = Math.max(0, cartaTotal - lanceEmb);

  return (
    <tr>
      <td>{linha.grupo}</td>
      <td>
        <input
          type="number"
          className="cr-input-celula"
          min={1}
          value={linha.qtde}
          onChange={e => onUpdate(linha.id, 'qtde', Math.max(1, Number(e.target.value)))}
        />
      </td>
      <td>{formatarMoeda(cartaTotal)}</td>
      <td>{formatarMoeda(parcelaInicial)}</td>
      <td>{redutorDisplay === 50 ? '50%' : '0%'}</td>
      <td>
        <div className="cr-lance-emb-cell">
          <input
            type="number"
            className="cr-input-celula cr-input-lance-emb"
            min={0}
            max={100}
            value={linha.recProprios || 0}
            onChange={e => onUpdate(linha.id, 'recProprios', Math.max(0, Number(e.target.value)))}
          />
          <span className="cr-lance-emb-label">% · {formatarMoeda(recPropriosReais)}</span>
        </div>
      </td>
      <td>
        <div className="cr-lance-emb-cell">
          <input
            type="number"
            className="cr-input-celula cr-input-lance-emb"
            min={0}
            max={linha.lanceEmbutidoMax}
            value={linha.lanceEmbutidoPercent}
            onChange={e => onUpdate(linha.id, 'lanceEmbutidoPercent', Math.min(linha.lanceEmbutidoMax, Math.max(0, Number(e.target.value))))}
          />
          <span className="cr-lance-emb-label">% · {formatarMoeda(lanceEmb)}</span>
        </div>
      </td>
      <td>{formatarMoeda(lanceTotal)}</td>
      <td className="cr-credito-contemplado">{formatarMoeda(creditoContemplado)}</td>
      <td>
        <button type="button" className="cr-btn-remover" onClick={() => onRemove(linha.id)}>✕</button>
      </td>
    </tr>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export function EtapaContemplacaoRapidaAuto({ onVoltar }) {
  const [tipoParcela,      setTipoParcela]      = useState('reduzida');
  const [linhas,           setLinhas]           = useState([]);
  const [showModalNome,    setShowModalNome]    = useState(false);
  const [nomeClienteInput, setNomeClienteInput] = useState('');

  const adicionarLinha = (grupo, cota, qtde = 1) => {
    setLinhas(prev => {
      const existente = prev.find(
        l => l.grupo === grupo.numero && l.carta === cota.carta
      );
      if (existente) {
        return prev.map(l =>
          l.id === existente.id
            ? { ...l, qtde: Math.min(99, l.qtde + qtde) }
            : l
        );
      }
      return [...prev, {
        id: Date.now() + Math.random(),
        grupo:               grupo.numero,
        lanceEmbutidoPercent: grupo.lanceEmbutido,
        lanceEmbutidoMax:    grupo.lanceEmbutido,
        carta:               cota.carta,
        parcela:             tipoParcela === 'reduzida' ? cota.parcelaReduzida : cota.parcelaNormal,
        redutor:             tipoParcela === 'reduzida' ? 50 : 0,
        taxaAdm:             grupo.taxaAdm,
        fundoReserva:        grupo.fundoReserva,
        qtde,
        recProprios:         0,
      }];
    });
  };

  const removerLinha  = (id) => setLinhas(prev => prev.filter(l => l.id !== id));
  const atualizarLinha = (id, campo, valor) =>
    setLinhas(prev => prev.map(l => l.id === id ? { ...l, [campo]: valor } : l));

  const linhasCalculadas = useMemo(() => linhas.map(l => {
    const cartaTotal        = l.carta * l.qtde;
    const parcelaInicial    = l.parcela * l.qtde;
    const lanceEmb              = cartaTotal * (l.lanceEmbutidoPercent / 100);
    const creditoContemplado    = Math.max(0, cartaTotal - lanceEmb);
    const recPropriosReais      = cartaTotal * ((l.recProprios || 0) / 100);
    const lanceTotal            = recPropriosReais + lanceEmb;
    const saldoDevedor          = cartaTotal * (1 + (l.taxaAdm || 0) + (l.fundoReserva || 0));
    const parcelaPosContemplacao = Math.max(0, saldoDevedor - parcelaInicial - lanceTotal);
    return { ...l, cartaTotal, parcelaInicial, lanceEmb, lanceTotal, creditoContemplado, recPropriosReais, saldoDevedor, parcelaPosContemplacao };
  }), [linhas]);

  const totais = useMemo(() => linhasCalculadas.reduce((acc, l) => ({
    cartaTotal:        acc.cartaTotal        + l.cartaTotal,
    parcelaInicial:    acc.parcelaInicial    + l.parcelaInicial,
    lanceEmb:          acc.lanceEmb          + l.lanceEmb,
    lanceTotal:        acc.lanceTotal        + l.lanceTotal,
    recProprios:       acc.recProprios       + (l.recPropriosReais || 0),
    creditoContemplado:    acc.creditoContemplado    + l.creditoContemplado,
    parcelaPosContemplacao: acc.parcelaPosContemplacao + l.parcelaPosContemplacao,
  }), { cartaTotal: 0, parcelaInicial: 0, lanceEmb: 0, lanceTotal: 0, recProprios: 0, creditoContemplado: 0, parcelaPosContemplacao: 0 }),
  [linhasCalculadas]);

  const gruposPresentes = useMemo(
    () => [...new Set(linhas.map(l => l.grupo))].sort(),
    [linhas]
  );

  const redutorDisplay = tipoParcela === 'reduzida' ? 50 : 0;

  const simulacaoResumida = useMemo(() => {
    const credito          = totais.cartaTotal;
    const custos           = calcularCustos(credito, G2127.taxaAdm, G2127.fundoReserva);
    return {
      credito,
      parcelaInicial:         totais.parcelaInicial,
      creditoDisponivel:      totais.creditoContemplado,
      lanceProprio:           totais.recProprios,
      lanceEmbutido:          totais.lanceEmb,
      lanceTotal:             totais.lanceTotal,
      parcelaPosContemplacao: totais.parcelaPosContemplacao,
      ...custos,
    };
  }, [totais]);

  const gerarExcel = () => {
    const redutor = redutorDisplay === 50 ? '50%' : '0%';
    gerarExcelSimulacao({
      rows: linhasCalculadas.map(l => ({
        grupo:                  l.grupo,
        qtde:                   l.qtde,
        cartaTotal:             l.cartaTotal,
        parcelaInicial:         l.parcelaInicial,
        parcelaPosContemplacao: l.parcelaPosContemplacao,
        redutor:                redutor,
        recProprios:            l.recPropriosReais || 0,
        lanceEmbPerc:           l.lanceEmbutidoPercent,
        lanceEmb:               l.lanceEmb,
        lanceTotal:             l.lanceTotal,
        creditoContemplado:     l.creditoContemplado,
      })),
      totais: {
        cartaTotal:             totais.cartaTotal,
        parcelaInicial:         totais.parcelaInicial,
        parcelaPosContemplacao: totais.parcelaPosContemplacao,
        recProprios:            totais.recProprios,
        lanceEmb:               totais.lanceEmb,
        lanceTotal:             totais.lanceTotal,
        creditoContemplado:     totais.creditoContemplado,
      },
      nomeArquivo: 'simulacao-xp-auto-contemplacao.xlsx',
    });
  };

  // ─── Geração de PDF ────────────────────────────────────────────────────────
  const gerarPDF = async (nomeCliente) => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    const W = 210, H = 297, M = 12;
    let y = M;

    const gold      = [245, 192, 0];
    const white     = [255, 255, 255];
    const black     = [10, 10, 10];
    const grey      = [153, 153, 153];
    const lightGrey = [200, 200, 200];
    const darkCard  = [30, 30, 30];
    const darkBorder = [46, 46, 46];

    // Fundo preto
    doc.setFillColor(...black);
    doc.rect(0, 0, W, H, 'F');

    // Triângulo dourado
    doc.setFillColor(...gold);
    doc.lines([[-65, 0], [65, 65], [0, -65]], W, 0, [1, 1], 'F', true);
    doc.setFillColor(200, 155, 0);
    doc.lines([[-35, 0], [35, 35], [0, -35]], W, 0, [1, 1], 'F', true);

    // ── Header ──
    doc.setFontSize(8);
    doc.setTextColor(...grey);
    doc.setFont('helvetica', 'bold');
    const gruposLabel = gruposPresentes.length > 0
      ? gruposPresentes.join(' e ')
      : '2127 e 2128';
    doc.text(`GRUPO ${gruposLabel} | AUTOMÓVEL`, M, y + 5);
    y += nomeCliente ? 10 : 13;

    // ── Saudação ──
    if (nomeCliente) {
      doc.setFontSize(10);
      doc.setTextColor(...white);
      doc.setFont('helvetica', 'normal');
      doc.text(`Olá, ${nomeCliente}. Segue o planejamento de automóvel feito para você.`, M, y + 5);
      y += 11;
    }

    // ── Categoria ──
    doc.setFontSize(7.5);
    doc.setTextColor(...grey);
    doc.setFont('helvetica', 'normal');
    doc.text('CURTO PRAZO | PLANEJAMENTO PATRIMONIAL', M, y);
    y += 10;

    // ── Título ──
    doc.setFontSize(20);
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.text('CONSÓRCIO AUTOMÓVEL XP', M, y);
    y += 16;

    // ── Bloco estratégia ──
    doc.setFillColor(...gold);
    doc.rect(M, y, 3, 8, 'F');
    doc.setFontSize(9.5);
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.text('Consórcio XP como estratégia de aquisição patrimonial', M + 7, y + 5.5);
    y += 12;

    // ── Box 50% (somente parcela reduzida) ──
    if (tipoParcela === 'reduzida') {
      doc.setFillColor(25, 20, 0);
      doc.setDrawColor(...gold);
      doc.setLineWidth(0.5);
      doc.roundedRect(M, y, W - 2 * M, 14, 3, 3, 'FD');
      doc.setFontSize(8.5);
      doc.setTextColor(...gold);
      doc.setFont('helvetica', 'bold');
      doc.text('Redução de 50% no valor das parcelas', W / 2, y + 6, { align: 'center' });
      doc.setFontSize(7.5);
      doc.setTextColor(...lightGrey);
      doc.setFont('helvetica', 'normal');
      doc.text('Pague menos durante o período de espera e preserve sua liquidez financeira', W / 2, y + 11.5, { align: 'center' });
      y += 18;
    }

    // ── Cards 2 colunas ──
    const cardW = (W - 2 * M - 8) / 2;
    const cardH = 56;

    // Card esquerdo — carta total + crédito contemplado (borda amarela)
    doc.setFillColor(...darkCard);
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.5);
    doc.roundedRect(M, y, cardW, cardH, 4, 4, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(...grey);
    doc.setFont('helvetica', 'normal');
    doc.text('CARTA DE CRÉDITO TOTAL', M + 7, y + 7);
    doc.setFontSize(10);
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.text(formatarMoeda(totais.cartaTotal), M + 7, y + 13);
    doc.setFontSize(7);
    doc.setTextColor(...grey);
    doc.setFont('helvetica', 'normal');
    doc.text('CRÉDITO CONTEMPLADO', M + 7, y + 24);
    doc.setFontSize(13);
    doc.setTextColor(...gold);
    doc.setFont('helvetica', 'bold');
    doc.text(formatarMoeda(totais.creditoContemplado), M + 7, y + 32);

    // Card direito — lance embutido + rec. próprios + parcela inicial + parcela pós
    const card2X = M + cardW + 8;
    doc.setFillColor(...darkCard);
    doc.setDrawColor(...darkBorder);
    doc.setLineWidth(0.3);
    doc.roundedRect(card2X, y, cardW, cardH, 4, 4, 'FD');
    // Sub-coluna 1: Lance embutido
    doc.setFontSize(7);
    doc.setTextColor(...grey);
    doc.setFont('helvetica', 'normal');
    doc.text('LANCE EMBUTIDO', card2X + 7, y + 7);
    doc.setFontSize(9);
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.text(formatarMoeda(totais.lanceEmb), card2X + 7, y + 14);
    // Sub-coluna 2: Rec. próprios (condicional)
    if (totais.recProprios > 0) {
      doc.setFontSize(7);
      doc.setTextColor(...grey);
      doc.setFont('helvetica', 'normal');
      doc.text('LANCE REC. PRÓPRIOS', card2X + cardW / 2 + 4, y + 7);
      doc.setFontSize(9);
      doc.setTextColor(...white);
      doc.setFont('helvetica', 'bold');
      doc.text(formatarMoeda(totais.recProprios), card2X + cardW / 2 + 4, y + 14);
    }
    // Parcela inicial abaixo
    doc.setFontSize(7);
    doc.setTextColor(...grey);
    doc.setFont('helvetica', 'normal');
    doc.text('PARCELA INICIAL', card2X + 7, y + 26);
    doc.setFontSize(11);
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.text(formatarMoeda(totais.parcelaInicial), card2X + 7, y + 34);
    // Parcela pós contemplação abaixo
    doc.setFontSize(7);
    doc.setTextColor(...grey);
    doc.setFont('helvetica', 'normal');
    doc.text('PARCELA PÓS CONTEMPLAÇÃO', card2X + 7, y + 42);
    doc.setFontSize(10);
    doc.setTextColor(...gold);
    doc.setFont('helvetica', 'bold');
    doc.text(formatarMoeda(totais.parcelaPosContemplacao), card2X + 7, y + 50);
    y += cardH + 8;

    // ── Informações técnicas (linha única horizontal) ──
    const gruposPDFForTech = gruposPresentes.length > 0 ? gruposPresentes : [2127, 2128];
    const prazoRestanteValue = gruposPDFForTech.length === 1
      ? `${({ 2127: G2127, 2128: G2128 })[gruposPDFForTech[0]].prazoRestante} meses`
      : `2127: ${G2127.prazoRestante}m / 2128: ${G2128.prazoRestante}m`;

    const techItems = [
      { label: 'TAXA ADM',       value: '18,0%'                 },
      { label: 'TAXA/MÊS',       value: '0,063%'                },
      { label: 'FUNDO RESERVA',  value: '3,0%'                  },
      { label: 'LANCE EMBUTIDO', value: '2127: 50% / 2128: 30%' },
      { label: 'PRAZO DO GRUPO', value: prazoRestanteValue       },
    ];
    const techH = 18;
    const techColW = (W - 2 * M) / techItems.length;
    doc.setFillColor(...darkCard);
    doc.setDrawColor(...darkBorder);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, y, W - 2 * M, techH, 4, 4, 'FD');
    techItems.forEach((cell, i) => {
      const cx = M + i * techColW + techColW / 2;
      doc.setFontSize(7);
      doc.setTextColor(...grey);
      doc.setFont('helvetica', 'normal');
      doc.text(cell.label, cx, y + 7, { align: 'center' });
      doc.setFontSize(9);
      doc.setTextColor(...white);
      doc.setFont('helvetica', 'bold');
      doc.text(cell.value, cx, y + 14, { align: 'center' });
    });
    y += techH + 5;

    // ── Memória de cálculo: Parcela pós contemplação ──
    const saldoDevedorPDF = totais.parcelaPosContemplacao + totais.parcelaInicial + totais.lanceTotal;
    const memLinhas = [
      `= Saldo devedor inicial (${formatarMoeda(saldoDevedorPDF)})`,
      `  \u2212 Parcela inicial (${formatarMoeda(totais.parcelaInicial)})`,
      `  \u2212 Lance total (${formatarMoeda(totais.lanceTotal)})`,
      `  = ${formatarMoeda(totais.parcelaPosContemplacao)}`,
    ];
    const memH = 8 + memLinhas.length * 4.5;
    doc.setFillColor(...gold); doc.rect(M, y, 3, memH, 'F');
    doc.setFontSize(8); doc.setTextColor(...grey); doc.setFont('helvetica', 'bold');
    doc.text('Parcela pós contemplação', M + 7, y + 6);
    doc.setFontSize(8); doc.setTextColor(...lightGrey); doc.setFont('helvetica', 'normal');
    memLinhas.forEach((linha, i) => doc.text(linha, M + 7, y + 11 + i * 4.5));
    y += memH + 5;

    // ── Bloco prazo + mês de reajuste por grupo ──
    const gruposPDF = gruposPresentes.length > 0
      ? gruposPresentes
      : [2127, 2128];
    const infoGrupos = { 2127: G2127, 2128: G2128 };

    gruposPDF.forEach(gNum => {
      const g = infoGrupos[gNum];
      if (!g) return;
      doc.setFillColor(...gold);
      doc.rect(M, y, 3, 10, 'F');
      doc.setFontSize(8);
      doc.setTextColor(...lightGrey);
      doc.setFont('helvetica', 'normal');
      const prefixo = `Grupo ${gNum} — Prazo original: ${g.prazo} meses | Mês de reajuste: `;
      doc.text(prefixo, M + 7, y + 6);
      const prefW = doc.getTextWidth(prefixo);
      doc.setTextColor(...gold);
      doc.setFont('helvetica', 'bold');
      doc.text(g.mesReajuste, M + 7 + prefW, y + 6);
      y += 13;
    });

    // ── Nota recálculo de parcela ──
    const notaTexto = 'Após a contemplação ou metade do prazo do grupo (o que vier primeiro), o valor da parcela será recalculado com base no saldo devedor atualizado, descontando o lance pago (se houver) e as parcelas já pagas até aquele momento, dividido pelo prazo restante.';
    doc.setFontSize(7);
    const notaLinhas = doc.splitTextToSize(notaTexto, W - 2 * M - 8);
    const notaBarH = Math.max(13, 4 + notaLinhas.length * 3.5);
    doc.setFillColor(...gold);
    doc.rect(M, y, 3, notaBarH, 'F');
    doc.setTextColor(...lightGrey);
    doc.setFont('helvetica', 'normal');
    notaLinhas.forEach((linha, i) => doc.text(linha, M + 7, y + 5 + i * 3.5));
    y += notaBarH + 5;

    // ── Estrutura indicada para ──
    const indicados = [
      '• Planejamento de aquisições futuras',
      '• Estratégias familiares e sucessórias',
      '• Preservação de liquidez e rentabilidade dos investimentos',
    ];
    const barH = 8 + indicados.length * 4.5;
    doc.setFillColor(...gold);
    doc.rect(M, y, 3, barH, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...grey);
    doc.setFont('helvetica', 'bold');
    doc.text('ESTRUTURA INDICADA PARA:', M + 7, y + 6);
    doc.setFontSize(8.5);
    doc.setTextColor(...lightGrey);
    doc.setFont('helvetica', 'normal');
    indicados.forEach((linha, i) => doc.text(linha, M + 7, y + 11 + i * 4.5));
    y += barH + 5;

    // ── CTA ──
    doc.setFillColor(22, 18, 0);
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.4);
    doc.roundedRect(M, y, W - 2 * M, 16, 4, 4, 'FD');
    doc.setFontSize(9);
    doc.setTextColor(...gold);
    doc.setFont('helvetica', 'bold');
    doc.text('Fale comigo para avaliarmos como este consórcio', W / 2, y + 6.5, { align: 'center' });
    doc.text('pode se integrar à sua estratégia patrimonial', W / 2, y + 12.5, { align: 'center' });
    y += 23;

    // ── Obs. legais ancoradas ──
    const legalY = H - 28;
    if (y < legalY) {
      doc.setFontSize(6.5);
      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', 'normal');
      const obs = 'Os valores apresentados são simulações baseadas nas condições atuais do grupo e estão sujeitos a alterações. O consórcio não garante contemplação em prazo determinado. Consulte o contrato de adesão para informações completas.';
      doc.text(doc.splitTextToSize(obs, W - 2 * M), M, legalY);
    }

    // ── Footer ──
    doc.setFillColor(20, 20, 20);
    doc.rect(0, H - 16, W, 16, 'F');
    doc.setFontSize(9);
    doc.setTextColor(...gold);
    doc.setFont('helvetica', 'bold');
    doc.text('Consórcio XP', M, H - 6);
    doc.setFontSize(8);
    doc.setTextColor(...grey);
    doc.setFont('helvetica', 'normal');
    doc.text(`Oferta válida até ${new Date().toLocaleDateString('pt-BR')}`, W - M, H - 6, { align: 'right' });

    doc.save(`proposta-xp-auto-contemplacao-${Date.now()}.pdf`);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="sim-etapa">
      <button className="sim-btn-voltar" onClick={onVoltar}>← Voltar</button>

      {/* Toggle tipo de parcela */}
      <div className="cr-toggle-parcela">
        <button
          type="button"
          className={`cr-toggle-btn ${tipoParcela === 'reduzida' ? 'active' : ''}`}
          onClick={() => setTipoParcela('reduzida')}
        >
          PARCELA REDUZIDA (50%)
        </button>
        <button
          type="button"
          className={`cr-toggle-btn ${tipoParcela === 'normal' ? 'active' : ''}`}
          onClick={() => setTipoParcela('normal')}
        >
          PARCELA NORMAL
        </button>
      </div>

      {/* Cards dos grupos lado a lado */}
      <div className="cr-grupos-grid">
        <CardGrupo grupo={G2127} tipoParcela={tipoParcela} onAdd={adicionarLinha} />
        <CardGrupo grupo={G2128} tipoParcela={tipoParcela} onAdd={adicionarLinha} />
      </div>

      {/* Tabela de simulação */}
      {linhas.length > 0 && (
        <div className="sim-painel cr-painel-simulacao">
          <h3 className="sim-titulo-secao">Simulação</h3>
          <div className="cr-tabela-wrapper">
            <table className="sim-tabela cr-tabela-simulacao">
              <thead>
                <tr>
                  <th>Grupo</th>
                  <th>Qtde Cotas</th>
                  <th>Carta Total</th>
                  <th>Parcela Inicial</th>
                  <th>Redutor</th>
                  <th>Rec. Próprios (%)</th>
                  <th>Lance Emb.</th>
                  <th>Lance Total</th>
                  <th>Crédito Contemplado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {linhasCalculadas.map(linha => (
                  <LinhaSimulacao
                    key={linha.id}
                    linha={linha}
                    onRemove={removerLinha}
                    onUpdate={atualizarLinha}
                    redutorDisplay={redutorDisplay}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr className="cr-totais">
                  <td colSpan={2}><strong>TOTAL</strong></td>
                  <td>{formatarMoeda(totais.cartaTotal)}</td>
                  <td>{formatarMoeda(totais.parcelaInicial)}</td>
                  <td>—</td>
                  <td>{totais.recProprios > 0 ? formatarMoeda(totais.recProprios) : '—'}</td>
                  <td>{formatarMoeda(totais.lanceEmb)}</td>
                  <td>{formatarMoeda(totais.lanceTotal)}</td>
                  <td className="cr-credito-contemplado">{formatarMoeda(totais.creditoContemplado)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Resumo da proposta */}
      {linhas.length > 0 && (
        <div className="sim-painel cr-painel-resumo">
          <h3 className="sim-titulo-secao">Resumo da proposta</h3>
          <div className="cr-resumo-grid">
            <div className="cr-resumo-item">
              <span className="cr-resumo-label">Crédito contemplado total</span>
              <span className="cr-resumo-valor cr-verde">{formatarMoeda(totais.creditoContemplado)}</span>
            </div>
            <div className="cr-resumo-item">
              <span className="cr-resumo-label">Parcela inicial total</span>
              <span className="cr-resumo-valor cr-ouro">{formatarMoeda(totais.parcelaInicial)}</span>
            </div>
            <div className="cr-resumo-item">
              <span className="cr-resumo-label">Parcela pós contemplação</span>
              <span className="cr-resumo-valor">{formatarMoeda(totais.parcelaPosContemplacao)}</span>
            </div>
            <div className="cr-resumo-item">
              <span className="cr-resumo-label">Lance total</span>
              <span className="cr-resumo-valor">{formatarMoeda(totais.lanceTotal)}</span>
            </div>
            <div className="cr-resumo-item">
              <span className="cr-resumo-label">Carta de crédito total</span>
              <span className="cr-resumo-valor">{formatarMoeda(totais.cartaTotal)}</span>
            </div>
            {totais.recProprios > 0 && (
              <div className="cr-resumo-item">
                <span className="cr-resumo-label">Recursos próprios</span>
                <span className="cr-resumo-valor">{formatarMoeda(totais.recProprios)}</span>
              </div>
            )}
            <div className="cr-resumo-item">
              <span className="cr-resumo-label">Tipo de parcela</span>
              <span className="cr-resumo-valor">{tipoParcela === 'reduzida' ? 'Reduzida 50%' : 'Normal'}</span>
            </div>
            <div className="cr-resumo-item">
              <span className="cr-resumo-label">Índice de reajuste</span>
              <span className="cr-resumo-valor">INPC</span>
            </div>
            <div className="cr-resumo-item">
              <span className="cr-resumo-label">Taxa ADM / Fundo de Reserva</span>
              <span className="cr-resumo-valor">18% / 3%</span>
            </div>
          </div>
          <p className="sim-observacao cr-nota-rodape">
            * Crédito contemplado = carta total − lance embutido.<br />
            * Parcela inicial válida até a contemplação ou metade do prazo do grupo, o que vier primeiro.<br />
            * Após esse evento, a parcela será recalculada sobre o saldo devedor atualizado dividido pelo prazo restante.
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
            <button
              className="sim-btn-pdf"
              onClick={() => setShowModalNome(true)}
            >
              Gerar PDF da proposta
            </button>
            <button
              className="sim-btn-pdf sim-btn-excel"
              onClick={gerarExcel}
            >
              Gerar Excel da proposta
            </button>
          </div>
        </div>
      )}

      {linhas.length > 0 && (
        <div className="sim-painel sim-painel-resumo" style={{ marginTop: '24px' }}>
          <h3 className="sim-titulo-secao">Resumo da proposta</h3>
          <ResumoProposta simulacao={simulacaoResumida} />
        </div>
      )}

      {/* Modal nome do cliente */}
      {showModalNome && (
        <div className="sim-modal-overlay" onClick={() => setShowModalNome(false)}>
          <div className="sim-modal" onClick={e => e.stopPropagation()}>
            <p className="sim-modal-pergunta">Deseja adicionar o nome do cliente?</p>
            <input
              className="sim-modal-input"
              type="text"
              placeholder="Nome do cliente (opcional)"
              value={nomeClienteInput}
              onChange={e => setNomeClienteInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  setShowModalNome(false);
                  gerarPDF(nomeClienteInput.trim());
                }
              }}
              autoFocus
            />
            <div className="sim-modal-acoes">
              <button
                className="sim-modal-btn sim-modal-btn-nao"
                onClick={() => { setShowModalNome(false); gerarPDF(''); }}
              >
                Não
              </button>
              <button
                className="sim-modal-btn sim-modal-btn-sim"
                onClick={() => { setShowModalNome(false); gerarPDF(nomeClienteInput.trim()); }}
              >
                Sim — Gerar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
