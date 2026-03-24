import React, { useState, useMemo } from 'react';
import { gerarExcelSimulacao } from '../../business/excelExport';
import { GRUPOS_MEDIO_PRAZO, OBSERVACOES_LEGAIS } from '../../data/grupos';
import { formatarMoeda, formatarMoedaInteiro, formatarPercentual, calcularCustos } from '../../business/calculos';
import { ResumoProposta } from './ResumoProposta';

// ─── Pills Toggle ─────────────────────────────────────────────────────────────
function PillsToggle({ options, value, onChange }) {
  return (
    <div className="sim-pills">
      {options.map((opt, idx) => (
        <button
          key={opt.value}
          type="button"
          className={`sim-pill ${value === opt.value ? 'active' : ''} ${
            idx === 0 ? 'pill-left' : idx === options.length - 1 ? 'pill-right' : ''
          }`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Célula de adição ─────────────────────────────────────────────────────────
function AddCell({ onAdd }) {
  const [qtde, setQtde] = useState(1);
  return (
    <td onClick={e => e.stopPropagation()}>
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
        <button type="button" className="cr-btn-add" onClick={() => onAdd(qtde)}>
          + Add
        </button>
      </div>
    </td>
  );
}

// ─── Tabela de parcelas ───────────────────────────────────────────────────────
function TabelaMedioPrazo({ grupo, plano, onAdd }) {
  const isReduzida = plano === 'reduzida';
  return (
    <div className="sim-tabela-container">
      <table className="sim-tabela">
        <thead>
          <tr>
            <th>Bem referência</th>
            <th>Cota</th>
            <th>{isReduzida ? 'Parcela c/ Redutor 50%' : 'Parcela'}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {grupo.tabela.map(row => (
            <tr key={row.cota}>
              <td>{formatarMoedaInteiro(row.bemReferencia)}</td>
              <td>{formatarMoeda(row.cota)}</td>
              <td className="valor-destaque">
                {formatarMoeda(isReduzida ? row.parcelaReduzida : row.parcelaCheia)}
              </td>
              <AddCell onAdd={(qtde) => onAdd(grupo.numero, row, qtde)} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Linha da tabela "Monte sua simulação" ────────────────────────────────────
function LinhaSimulacaoMP({ linha, onRemove, onUpdate, redutorDisplay }) {
  const cartaTotal         = linha.cota * linha.qtde;
  const parcelaInicial     = linha.parcela * linha.qtde;
  const lanceEmb           = cartaTotal * (linha.lanceEmbutidoPercent / 100);
  const lanceTotal         = (linha.recProprios || 0) + lanceEmb;
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
        <input
          type="number"
          className="cr-input-celula"
          min={0}
          value={linha.recProprios || 0}
          onChange={e => onUpdate(linha.id, 'recProprios', Math.max(0, Number(e.target.value)))}
        />
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

// ─── Componente principal ─────────────────────────────────────────────────────
export function EtapaMedioPrazo({ onVoltar }) {
  const [grupoAtivo,       setGrupoAtivo]       = useState(1047);
  const [plano,            setPlano]            = useState('reduzida');
  const [linhasSim,        setLinhasSim]        = useState([]);
  const [showModalNome,    setShowModalNome]    = useState(false);
  const [nomeClienteInput, setNomeClienteInput] = useState('');

  const grupo = GRUPOS_MEDIO_PRAZO[grupoAtivo];

  const adicionarLinhaSim = (grupoNum, row, qtde = 1) => {
    setLinhasSim(prev => {
      const key = `${grupoNum}_${row.cota}`;
      const existente = prev.find(l => l.simKey === key);
      if (existente) {
        return prev.map(l =>
          l.id === existente.id ? { ...l, qtde: Math.min(99, l.qtde + qtde) } : l
        );
      }
      return [...prev, {
        id:                   Date.now() + Math.random(),
        simKey:               key,
        grupo:                grupoNum,
        cota:                 row.cota,
        parcela:              plano === 'reduzida' ? row.parcelaReduzida : row.parcelaCheia,
        redutor:              plano === 'reduzida' ? 50 : 0,
        lanceEmbutidoPercent: 30,
        lanceEmbutidoMax:     30,
        recProprios:          0,
        qtde,
      }];
    });
  };

  const removerLinhaSim  = (id) => setLinhasSim(prev => prev.filter(l => l.id !== id));
  const atualizarLinhaSim = (id, campo, valor) =>
    setLinhasSim(prev => prev.map(l => l.id === id ? { ...l, [campo]: valor } : l));

  const linhasSimCalc = useMemo(() => linhasSim.map(l => {
    const cartaTotal         = l.cota * l.qtde;
    const parcelaInicial     = l.parcela * l.qtde;
    const lanceEmb           = cartaTotal * (l.lanceEmbutidoPercent / 100);
    const lanceTotal         = (l.recProprios || 0) + lanceEmb;
    const creditoContemplado = Math.max(0, cartaTotal - lanceEmb);
    return { ...l, cartaTotal, parcelaInicial, lanceEmb, lanceTotal, creditoContemplado };
  }), [linhasSim]);

  const totaisSim = useMemo(() => linhasSimCalc.reduce((acc, l) => ({
    cartaTotal:         acc.cartaTotal         + l.cartaTotal,
    parcelaInicial:     acc.parcelaInicial     + l.parcelaInicial,
    lanceEmb:           acc.lanceEmb           + l.lanceEmb,
    lanceTotal:         acc.lanceTotal         + l.lanceTotal,
    recProprios:        acc.recProprios        + (l.recProprios || 0),
    creditoContemplado: acc.creditoContemplado + l.creditoContemplado,
  }), { cartaTotal: 0, parcelaInicial: 0, lanceEmb: 0, lanceTotal: 0, recProprios: 0, creditoContemplado: 0 }), [linhasSimCalc]);

  const redutorDisplay = plano === 'reduzida' ? 50 : 0;

  const simulacaoResumida = useMemo(() => {
    const credito = totaisSim.cartaTotal;
    const custos  = calcularCustos(credito, grupo.taxaAdm, grupo.fundoReserva);
    return {
      credito,
      parcelaInicial:    totaisSim.parcelaInicial,
      creditoDisponivel: totaisSim.creditoContemplado,
      lanceProprio:      totaisSim.recProprios,
      lanceEmbutido:     totaisSim.lanceEmb,
      lanceTotal:        totaisSim.lanceTotal,
      ...custos,
    };
  }, [totaisSim, grupo]);

  const gerarExcel = () => {
    const redutor = redutorDisplay === 50 ? '50%' : '0%';
    gerarExcelSimulacao({
      rows: linhasSimCalc.map(l => ({
        grupo:             l.grupo,
        qtde:              l.qtde,
        cartaTotal:        l.cartaTotal,
        parcelaInicial:    l.parcelaInicial,
        redutor:           redutor,
        recProprios:       l.recProprios || 0,
        lanceEmbPerc:      l.lanceEmbutidoPercent,
        lanceEmb:          l.lanceEmb,
        lanceTotal:        l.lanceTotal,
        creditoContemplado: l.creditoContemplado,
      })),
      totais: {
        cartaTotal:        totaisSim.cartaTotal,
        parcelaInicial:    totaisSim.parcelaInicial,
        recProprios:       totaisSim.recProprios,
        lanceEmb:          totaisSim.lanceEmb,
        lanceTotal:        totaisSim.lanceTotal,
        creditoContemplado: totaisSim.creditoContemplado,
      },
      nomeArquivo: 'simulacao-xp-imovel-medio-prazo.xlsx',
    });
  };

  const gerarPDF = async (nomeCliente) => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const W = 210, H = 297, M = 12;
    let y = M;
    const gold = [245, 192, 0], white = [255, 255, 255], black = [10, 10, 10];
    const grey = [153, 153, 153], lightGrey = [200, 200, 200];
    const darkCard = [30, 30, 30], darkBorder = [46, 46, 46];

    doc.setFillColor(...black); doc.rect(0, 0, W, H, 'F');
    doc.setFillColor(...gold);
    doc.lines([[-65, 0], [65, 65], [0, -65]], W, 0, [1, 1], 'F', true);
    doc.setFillColor(200, 155, 0);
    doc.lines([[-35, 0], [35, 35], [0, -35]], W, 0, [1, 1], 'F', true);

    doc.setFontSize(8); doc.setTextColor(...grey); doc.setFont('helvetica', 'bold');
    doc.text(`GRUPO ${grupo.numero} | IMOBILIÁRIO`, M, y + 5);
    y += nomeCliente ? 10 : 13;

    if (nomeCliente) {
      doc.setFontSize(10); doc.setTextColor(...white); doc.setFont('helvetica', 'normal');
      doc.text(`Olá, ${nomeCliente}. Segue o planejamento imobiliário feito para você.`, M, y + 5);
      y += 11;
    }

    const planoLabel = plano === 'reduzida' ? 'COM REDUTOR 50%' : 'SEM REDUTOR';
    doc.setFontSize(7.5); doc.setTextColor(...grey); doc.setFont('helvetica', 'normal');
    doc.text(`${planoLabel} | PLANEJAMENTO PATRIMONIAL DE MÉDIO PRAZO`, M, y);
    y += 12;

    doc.setFontSize(20); doc.setTextColor(...white); doc.setFont('helvetica', 'bold');
    doc.text('CONSÓRCIO IMOBILIÁRIO XP', M, y);
    y += 16;

    doc.setFillColor(...gold); doc.rect(M, y, 3, 8, 'F');
    doc.setFontSize(9.5); doc.setTextColor(...white); doc.setFont('helvetica', 'bold');
    doc.text('Consórcio XP como estratégia de aquisição patrimonial', M + 7, y + 5.5);
    y += 12;

    if (plano === 'reduzida') {
      doc.setFillColor(25, 20, 0); doc.setDrawColor(...gold); doc.setLineWidth(0.5);
      doc.roundedRect(M, y, W - 2 * M, 14, 3, 3, 'FD');
      doc.setFontSize(8.5); doc.setTextColor(...gold); doc.setFont('helvetica', 'bold');
      doc.text('Redução de 50% no valor das parcelas', W / 2, y + 6, { align: 'center' });
      doc.setFontSize(7.5); doc.setTextColor(...lightGrey); doc.setFont('helvetica', 'normal');
      doc.text('Pague menos durante o período de espera e preserve sua liquidez financeira', W / 2, y + 11.5, { align: 'center' });
      y += 18;
    }

    const cardW = (W - 2 * M - 8) / 2, cardH = 44;
    doc.setFillColor(...darkCard); doc.setDrawColor(...gold); doc.setLineWidth(0.5);
    doc.roundedRect(M, y, cardW, cardH, 4, 4, 'FD');
    doc.setFontSize(7); doc.setTextColor(...grey); doc.setFont('helvetica', 'normal');
    doc.text('CARTA DE CRÉDITO TOTAL', M + 7, y + 7);
    doc.setFontSize(10); doc.setTextColor(...white); doc.setFont('helvetica', 'bold');
    doc.text(formatarMoeda(totaisSim.cartaTotal), M + 7, y + 13);
    doc.setFontSize(7); doc.setTextColor(...grey); doc.setFont('helvetica', 'normal');
    doc.text('CRÉDITO CONTEMPLADO', M + 7, y + 24);
    doc.setFontSize(13); doc.setTextColor(...gold); doc.setFont('helvetica', 'bold');
    doc.text(formatarMoeda(totaisSim.creditoContemplado), M + 7, y + 32);

    const card2X = M + cardW + 8;
    doc.setFillColor(...darkCard); doc.setDrawColor(...darkBorder); doc.setLineWidth(0.3);
    doc.roundedRect(card2X, y, cardW, cardH, 4, 4, 'FD');
    doc.setFontSize(7); doc.setTextColor(...grey); doc.setFont('helvetica', 'normal');
    doc.text('LANCE EMBUTIDO', card2X + 7, y + 7);
    doc.setFontSize(9); doc.setTextColor(...white); doc.setFont('helvetica', 'bold');
    doc.text(formatarMoeda(totaisSim.lanceEmb), card2X + 7, y + 14);
    if (totaisSim.recProprios > 0) {
      doc.setFontSize(7); doc.setTextColor(...grey); doc.setFont('helvetica', 'normal');
      doc.text('LANCE REC. PRÓPRIOS', card2X + cardW / 2 + 4, y + 7);
      doc.setFontSize(9); doc.setTextColor(...white); doc.setFont('helvetica', 'bold');
      doc.text(formatarMoeda(totaisSim.recProprios), card2X + cardW / 2 + 4, y + 14);
    }
    doc.setFontSize(7); doc.setTextColor(...grey); doc.setFont('helvetica', 'normal');
    doc.text('PARCELA INICIAL', card2X + 7, y + 26);
    doc.setFontSize(11); doc.setTextColor(...white); doc.setFont('helvetica', 'bold');
    doc.text(formatarMoeda(totaisSim.parcelaInicial), card2X + 7, y + 34);
    y += cardH + 8;

    const techItems = [
      { label: 'TAXA ADM',       value: formatarPercentual(grupo.taxaAdm)      },
      { label: 'FUNDO RESERVA',  value: formatarPercentual(grupo.fundoReserva) },
      { label: 'LANCE EMBUTIDO', value: `30%`                                  },
      { label: 'PRAZO',          value: `${grupo.prazoRestante}/${grupo.prazoTotal}m` },
    ];
    const techH = 18, techColW = (W - 2 * M) / techItems.length;
    doc.setFillColor(...darkCard); doc.setDrawColor(...darkBorder); doc.setLineWidth(0.3);
    doc.roundedRect(M, y, W - 2 * M, techH, 4, 4, 'FD');
    techItems.forEach((cell, i) => {
      const cx = M + i * techColW + 7;
      doc.setFontSize(7); doc.setTextColor(...grey); doc.setFont('helvetica', 'normal');
      doc.text(cell.label, cx, y + 7);
      doc.setFontSize(9); doc.setTextColor(...white); doc.setFont('helvetica', 'bold');
      doc.text(cell.value, cx, y + 14);
    });
    y += techH + 5;

    const notaTexto = 'Após a contemplação ou metade do prazo do grupo (o que vier primeiro), o valor da parcela será recalculado com base no saldo devedor atualizado, descontando o lance pago (se houver) e as parcelas já pagas até aquele momento, dividido pelo prazo restante.';
    doc.setFontSize(7);
    const notaLinhas = doc.splitTextToSize(notaTexto, W - 2 * M - 8);
    const notaBarH = Math.max(13, 4 + notaLinhas.length * 3.5);
    doc.setFillColor(...gold); doc.rect(M, y, 3, notaBarH, 'F');
    doc.setTextColor(...lightGrey); doc.setFont('helvetica', 'normal');
    notaLinhas.forEach((linha, i) => doc.text(linha, M + 7, y + 5 + i * 3.5));
    y += notaBarH + 5;

    const indicados = [
      '• Construção gradual de patrimônio imobiliário',
      '• Diversificação em ativos reais',
      '• Planejamento de aquisições futuras',
      '• Estratégias familiares e sucessórias',
      '• Preservação de liquidez e rentabilidade dos investimentos',
    ];
    const barH = 8 + indicados.length * 4.5;
    doc.setFillColor(...gold); doc.rect(M, y, 3, barH, 'F');
    doc.setFontSize(8); doc.setTextColor(...grey); doc.setFont('helvetica', 'bold');
    doc.text('ESTRUTURA INDICADA PARA:', M + 7, y + 6);
    doc.setFontSize(8.5); doc.setTextColor(...lightGrey); doc.setFont('helvetica', 'normal');
    indicados.forEach((item, i) => doc.text(item, M + 7, y + 11 + i * 4.5));
    y += barH + 5;

    doc.setFillColor(22, 18, 0); doc.setDrawColor(...gold); doc.setLineWidth(0.4);
    doc.roundedRect(M, y, W - 2 * M, 16, 4, 4, 'FD');
    doc.setFontSize(9); doc.setTextColor(...gold); doc.setFont('helvetica', 'bold');
    doc.text('Fale comigo para avaliarmos como este consórcio', W / 2, y + 6.5, { align: 'center' });
    doc.text('pode se integrar à sua estratégia patrimonial', W / 2, y + 12.5, { align: 'center' });
    y += 23;

    const legalY = H - 28;
    if (y < legalY) {
      doc.setFontSize(6.5); doc.setTextColor(80, 80, 80); doc.setFont('helvetica', 'normal');
      doc.text(doc.splitTextToSize(OBSERVACOES_LEGAIS.imovel, W - 2 * M), M, legalY);
    }
    doc.setFillColor(20, 20, 20); doc.rect(0, H - 16, W, 16, 'F');
    doc.setFontSize(9); doc.setTextColor(...gold); doc.setFont('helvetica', 'bold');
    doc.text('Consórcio XP', M, H - 6);
    const dataValidade = new Date(); dataValidade.setDate(dataValidade.getDate() + 30);
    doc.setFontSize(8); doc.setTextColor(...grey); doc.setFont('helvetica', 'normal');
    doc.text(`Oferta válida até ${dataValidade.toLocaleDateString('pt-BR')}`, W - M, H - 6, { align: 'right' });
    doc.save(`proposta-xp-imovel-medio-prazo-grupo${grupo.numero}-${Date.now()}.pdf`);
  };

  return (
    <div className="sim-etapa sim-etapa-simulacao">
      <button className="sim-btn-voltar" onClick={onVoltar}>← Voltar</button>

      {/* Filtros */}
      <div className="sim-filtros">
        <div className="sim-filtro-grupo">
          <span className="sim-filtro-label">Grupo</span>
          <PillsToggle
            options={[
              { value: 1047, label: '1047' },
              { value: 1048, label: '1048' },
              { value: 1049, label: '1049' },
            ]}
            value={grupoAtivo}
            onChange={setGrupoAtivo}
          />
        </div>
        <PillsToggle
          options={[
            { value: 'reduzida', label: 'Parcela Reduzida' },
            { value: 'cheia',    label: 'Parcela Cheia'    },
          ]}
          value={plano}
          onChange={setPlano}
        />
      </div>

      {/* Layout duas colunas */}
      <div className="sim-colunas">

        {/* Coluna Esquerda — painel estático */}
        <div className="sim-col-esquerda">
          <div className="sim-painel">
            <div className="sim-info-bar">
              <div className="sim-info-item">
                <span className="sim-info-label">Tipo</span>
                <span className="sim-info-valor">Linear</span>
              </div>
              <div className="sim-info-item">
                <span className="sim-info-label">Taxa adm</span>
                <span className="sim-info-valor">22,0%</span>
              </div>
              <div className="sim-info-item">
                <span className="sim-info-label">Fundo reserva</span>
                <span className="sim-info-valor">3,7%</span>
              </div>
              <div className="sim-info-item">
                <span className="sim-info-label">Lance emb. máx.</span>
                <span className="sim-info-valor">30%</span>
              </div>
              <div className="sim-info-item">
                <span className="sim-info-label">Prazo total</span>
                <span className="sim-info-valor">200 meses</span>
              </div>
              <div className="sim-info-item">
                <span className="sim-info-label">Prazo restante</span>
                <span className="sim-info-valor">{grupo.prazoRestante}m</span>
              </div>
            </div>

            <div className="sim-reajuste">
              Reajuste anual → <strong>INPC</strong>
            </div>

            <p className="sim-observacao">
              {OBSERVACOES_LEGAIS.imovel}
            </p>
          </div>
        </div>

        {/* Coluna Direita — tabela */}
        <div className="sim-col-direita">
          <div className="sim-painel">
            <TabelaMedioPrazo
              grupo={grupo}
              plano={plano}
              onAdd={adicionarLinhaSim}
            />
            <p className="sim-nota-parcela">
              ✦ O valor reduzido é válido até a contemplação ou metade do prazo do grupo, o que vier primeiro. Após esse evento, a parcela é recalculada com base no saldo devedor atualizado.
            </p>
          </div>
        </div>
      </div>

      {/* Monte sua simulação */}
      {linhasSim.length > 0 && (
        <div className="sim-painel cr-painel-simulacao" style={{ marginTop: '24px' }}>
          <h3 className="sim-titulo-secao">Monte sua simulação</h3>
          <div className="cr-tabela-wrapper">
            <table className="sim-tabela cr-tabela-simulacao">
              <thead>
                <tr>
                  <th>Grupo</th>
                  <th>Qtde Cotas</th>
                  <th>Carta Total</th>
                  <th>Parcela Inicial</th>
                  <th>Redutor</th>
                  <th>Rec. Próprios (R$)</th>
                  <th>Lance Emb.</th>
                  <th>Lance Total</th>
                  <th>Crédito Contemplado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {linhasSimCalc.map(linha => (
                  <LinhaSimulacaoMP
                    key={linha.id}
                    linha={linha}
                    onRemove={removerLinhaSim}
                    onUpdate={atualizarLinhaSim}
                    redutorDisplay={redutorDisplay}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr className="cr-totais">
                  <td colSpan={2}><strong>TOTAL</strong></td>
                  <td>{formatarMoeda(totaisSim.cartaTotal)}</td>
                  <td>{formatarMoeda(totaisSim.parcelaInicial)}</td>
                  <td>—</td>
                  <td>{totaisSim.recProprios > 0 ? formatarMoeda(totaisSim.recProprios) : '—'}</td>
                  <td>{formatarMoeda(totaisSim.lanceEmb)}</td>
                  <td>{formatarMoeda(totaisSim.lanceTotal)}</td>
                  <td className="cr-credito-contemplado">{formatarMoeda(totaisSim.creditoContemplado)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {linhasSim.length > 0 && (
        <div className="sim-painel cr-painel-resumo" style={{ marginTop: '24px' }}>
          <h3 className="sim-titulo-secao">Resumo da simulação</h3>
          <div className="cr-resumo-grid">
            <div className="cr-resumo-item">
              <span className="cr-resumo-label">Crédito contemplado total</span>
              <span className="cr-resumo-valor cr-verde">{formatarMoeda(totaisSim.creditoContemplado)}</span>
            </div>
            <div className="cr-resumo-item">
              <span className="cr-resumo-label">Parcela inicial total</span>
              <span className="cr-resumo-valor cr-ouro">{formatarMoeda(totaisSim.parcelaInicial)}</span>
            </div>
            <div className="cr-resumo-item">
              <span className="cr-resumo-label">Lance total</span>
              <span className="cr-resumo-valor">{formatarMoeda(totaisSim.lanceTotal)}</span>
            </div>
            <div className="cr-resumo-item">
              <span className="cr-resumo-label">Carta de crédito total</span>
              <span className="cr-resumo-valor">{formatarMoeda(totaisSim.cartaTotal)}</span>
            </div>
          </div>
          <p className="sim-observacao cr-nota-rodape" style={{ marginTop: '12px' }}>
            * Crédito contemplado = carta total − lance embutido.<br />
            * Parcela inicial válida até a contemplação ou metade do prazo do grupo, o que vier primeiro.
          </p>
          <button
            className="sim-btn-pdf"
            style={{ marginTop: '20px' }}
            onClick={() => setShowModalNome(true)}
          >
            Gerar PDF da proposta
          </button>
          <button
            className="sim-btn-pdf"
            style={{ marginTop: '12px' }}
            onClick={gerarExcel}
          >
            Gerar Excel da proposta
          </button>
        </div>
      )}

      {linhasSim.length > 0 && (
        <div className="sim-painel sim-painel-resumo" style={{ marginTop: '24px' }}>
          <h3 className="sim-titulo-secao">Resumo da proposta</h3>
          <ResumoProposta simulacao={simulacaoResumida} />
        </div>
      )}

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
                if (e.key === 'Enter') { setShowModalNome(false); gerarPDF(nomeClienteInput.trim()); }
              }}
              autoFocus
            />
            <div className="sim-modal-acoes">
              <button className="sim-modal-btn sim-modal-btn-nao"
                onClick={() => { setShowModalNome(false); gerarPDF(''); }}>
                Não
              </button>
              <button className="sim-modal-btn sim-modal-btn-sim"
                onClick={() => { setShowModalNome(false); gerarPDF(nomeClienteInput.trim()); }}>
                Sim — Gerar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
