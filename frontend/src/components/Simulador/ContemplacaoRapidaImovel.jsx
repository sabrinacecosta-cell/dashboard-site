import React, { useState, useMemo } from 'react';
import { GRUPOS_CONTEMPLACAO_IMOVEL, OBSERVACOES_LEGAIS } from '../../data/grupos';
import { formatarMoeda, formatarMoedaInteiro } from '../../business/calculos';

const G1038 = GRUPOS_CONTEMPLACAO_IMOVEL[1038];

// ─── Linha de cota com quantidade local ──────────────────────────────────────
function CotaRow({ cota, tipoParcela, onAdd, bloqueado }) {
  const [qtde, setQtde] = useState(1);
  return (
    <tr>
      <td>{formatarMoeda(cota.carta)}</td>
      <td className="valor-destaque">
        {formatarMoeda(tipoParcela === 'redutor50' ? cota.parcelaReduzida : cota.parcelaNormal)}
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
            className={`cr-btn-add ${bloqueado ? 'cr-btn-add-bloqueado' : ''}`}
            onClick={() => !bloqueado && onAdd(cota, qtde)}
            disabled={bloqueado}
            title={bloqueado ? 'Ajuste os lances para não ultrapassar o limite de 59%' : ''}
          >
            + Add
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Linha editável da tabela de simulação ───────────────────────────────────
function LinhaSimulacao({ linha, onRemove, onUpdate }) {
  const cartaTotal         = linha.carta * linha.qtde;
  const parcelaInicial     = linha.parcela * linha.qtde;
  const lanceEmb           = cartaTotal * (linha.lanceEmbutidoPercent / 100);
  const recProprios        = linha.recProprios || 0;
  const lanceTotal         = lanceEmb + recProprios;
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
      <td>{linha.redutor === 50 ? '50%' : '0%'}</td>
      <td>
        <input
          type="number"
          className="cr-input-celula"
          min={0}
          value={recProprios}
          onChange={e => onUpdate(linha.id, 'recProprios', Math.max(0, Number(e.target.value)))}
        />
      </td>
      <td>{formatarMoeda(lanceEmb)} ({linha.lanceEmbutidoPercent}%)</td>
      <td>{formatarMoeda(lanceTotal)}</td>
      <td className="cr-credito-contemplado">{formatarMoeda(creditoContemplado)}</td>
      <td>
        <button type="button" className="cr-btn-remover" onClick={() => onRemove(linha.id)}>✕</button>
      </td>
    </tr>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export function EtapaContemplacaoRapidaImovel({ onVoltar }) {
  const [tipoParcela,          setTipoParcela]          = useState('redutor50');
  const [lanceEmbutidoPercent, setLanceEmbutidoPercent] = useState(30);
  const [lanceRecursoPercent,  setLanceRecursoPercent]  = useState(0);
  const [linhas,               setLinhas]               = useState([]);
  const [showModalNome,        setShowModalNome]        = useState(false);
  const [nomeClienteInput,     setNomeClienteInput]     = useState('');

  const lanceTotalPercent = lanceEmbutidoPercent + lanceRecursoPercent;
  const excedeLimite      = lanceTotalPercent > G1038.lanceTotalMax;

  const adicionarLinha = (cota, qtde = 1) => {
    if (excedeLimite) return;
    setLinhas(prev => {
      const existente = prev.find(l => l.carta === cota.carta);
      if (existente) {
        return prev.map(l =>
          l.id === existente.id
            ? { ...l, qtde: Math.min(99, l.qtde + qtde) }
            : l
        );
      }
      return [...prev, {
        id:                  Date.now() + Math.random(),
        grupo:               G1038.numero,
        lanceEmbutidoPercent,
        carta:               cota.carta,
        parcela:             tipoParcela === 'redutor50' ? cota.parcelaReduzida : cota.parcelaNormal,
        redutor:             tipoParcela === 'redutor50' ? 50 : 0,
        qtde,
        recProprios:         Math.round(cota.carta * qtde * (lanceRecursoPercent / 100)),
      }];
    });
  };

  const removerLinha   = (id) => setLinhas(prev => prev.filter(l => l.id !== id));
  const atualizarLinha = (id, campo, valor) =>
    setLinhas(prev => prev.map(l => l.id === id ? { ...l, [campo]: valor } : l));

  const linhasCalculadas = useMemo(() => linhas.map(l => {
    const cartaTotal         = l.carta * l.qtde;
    const parcelaInicial     = l.parcela * l.qtde;
    const lanceEmb           = cartaTotal * (l.lanceEmbutidoPercent / 100);
    const recProprios        = l.recProprios || 0;
    const lanceTotal         = lanceEmb + recProprios;
    const creditoContemplado = Math.max(0, cartaTotal - lanceEmb);
    return { ...l, cartaTotal, parcelaInicial, lanceEmb, lanceTotal, creditoContemplado };
  }), [linhas]);

  const totais = useMemo(() => linhasCalculadas.reduce((acc, l) => ({
    cartaTotal:         acc.cartaTotal         + l.cartaTotal,
    parcelaInicial:     acc.parcelaInicial     + l.parcelaInicial,
    lanceEmb:           acc.lanceEmb           + l.lanceEmb,
    lanceTotal:         acc.lanceTotal         + l.lanceTotal,
    recProprios:        acc.recProprios        + (l.recProprios || 0),
    creditoContemplado: acc.creditoContemplado + l.creditoContemplado,
  }), { cartaTotal: 0, parcelaInicial: 0, lanceEmb: 0, lanceTotal: 0, recProprios: 0, creditoContemplado: 0 }),
  [linhasCalculadas]);

  // ─── Geração de PDF ────────────────────────────────────────────────────────
  const gerarPDF = async (nomeCliente) => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    const W = 210, H = 297, M = 12;
    let y = M;

    const gold       = [245, 192, 0];
    const white      = [255, 255, 255];
    const black      = [10, 10, 10];
    const grey       = [153, 153, 153];
    const lightGrey  = [200, 200, 200];
    const darkCard   = [30, 30, 30];
    const darkBorder = [46, 46, 46];

    doc.setFillColor(...black);
    doc.rect(0, 0, W, H, 'F');
    doc.setFillColor(...gold);
    doc.lines([[-65, 0], [65, 65], [0, -65]], W, 0, [1, 1], 'F', true);
    doc.setFillColor(200, 155, 0);
    doc.lines([[-35, 0], [35, 35], [0, -35]], W, 0, [1, 1], 'F', true);

    // Header
    doc.setFontSize(8);
    doc.setTextColor(...grey);
    doc.setFont('helvetica', 'bold');
    doc.text(`GRUPO ${G1038.numero} | IMOBILIÁRIO`, M, y + 5);
    y += nomeCliente ? 10 : 13;

    if (nomeCliente) {
      doc.setFontSize(10);
      doc.setTextColor(...white);
      doc.setFont('helvetica', 'normal');
      doc.text(`Olá, ${nomeCliente}. Segue o planejamento imobiliário feito para você.`, M, y + 5);
      y += 11;
    }

    doc.setFontSize(7.5);
    doc.setTextColor(...grey);
    doc.setFont('helvetica', 'normal');
    doc.text('CONTEMPLAÇÃO RÁPIDA | PLANEJAMENTO PATRIMONIAL IMOBILIÁRIO', M, y);
    y += 10;

    doc.setFontSize(20);
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.text('CONSÓRCIO IMOBILIÁRIO XP', M, y);
    y += 16;

    // Bloco estratégia
    doc.setFillColor(...gold);
    doc.rect(M, y, 3, 8, 'F');
    doc.setFontSize(9.5);
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.text('Consórcio XP como estratégia de aquisição patrimonial', M + 7, y + 5.5);
    y += 12;

    // Box redutor (se parcela reduzida)
    if (tipoParcela === 'redutor50') {
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

    // Cards 2 colunas
    const cardW = (W - 2 * M - 8) / 2;
    const cardH = 44;

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

    const card2X = M + cardW + 8;
    doc.setFillColor(...darkCard);
    doc.setDrawColor(...darkBorder);
    doc.setLineWidth(0.3);
    doc.roundedRect(card2X, y, cardW, cardH, 4, 4, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(...grey);
    doc.setFont('helvetica', 'normal');
    doc.text('LANCE EMBUTIDO', card2X + 7, y + 7);
    doc.setFontSize(9);
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.text(formatarMoeda(totais.lanceEmb), card2X + 7, y + 14);
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
    doc.setFontSize(7);
    doc.setTextColor(...grey);
    doc.setFont('helvetica', 'normal');
    doc.text('PARCELA INICIAL', card2X + 7, y + 26);
    doc.setFontSize(11);
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.text(formatarMoeda(totais.parcelaInicial), card2X + 7, y + 34);
    y += cardH + 8;

    // Informações técnicas
    const techItems = [
      { label: 'TAXA ADM',       value: `${(G1038.taxaAdm * 100).toFixed(0)}%`     },
      { label: 'FUNDO RESERVA',  value: `${(G1038.fundoReserva * 100).toFixed(0)}%` },
      { label: 'LANCE EMBUTIDO', value: `${lanceEmbutidoPercent}%`                  },
      { label: 'LANCE TOTAL',    value: `${lanceTotalPercent.toFixed(1)}%`           },
      { label: 'PRAZO DO GRUPO', value: `${G1038.prazoRestante}/${G1038.prazo}m`    },
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

    // Bloco índice de reajuste
    doc.setFillColor(...gold);
    doc.rect(M, y, 3, 10, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...lightGrey);
    doc.setFont('helvetica', 'normal');
    const prefixo = `Grupo ${G1038.numero} — Prazo original: ${G1038.prazo} meses | Índice de reajuste: `;
    doc.text(prefixo, M + 7, y + 6);
    const prefW = doc.getTextWidth(prefixo);
    doc.setTextColor(...gold);
    doc.setFont('helvetica', 'bold');
    doc.text(G1038.indice, M + 7 + prefW, y + 6);
    y += 15;

    // Nota recálculo de parcela
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

    // Estrutura indicada para
    const indicados = [
      '• Construção gradual de patrimônio imobiliário',
      '• Diversificação em ativos reais',
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

    // CTA
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

    // Obs. legais
    const legalY = H - 28;
    if (y < legalY) {
      doc.setFontSize(6.5);
      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', 'normal');
      doc.text(doc.splitTextToSize(OBSERVACOES_LEGAIS.imovel, W - 2 * M), M, legalY);
    }

    // Footer
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

    doc.save(`proposta-xp-imovel-contemplacao-${Date.now()}.pdf`);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="sim-etapa">
      <button className="sim-btn-voltar" onClick={onVoltar}>← Voltar</button>

      {/* Toggle tipo de parcela */}
      <div className="cr-toggle-parcela">
        <button
          type="button"
          className={`cr-toggle-btn ${tipoParcela === 'redutor50' ? 'active' : ''}`}
          onClick={() => setTipoParcela('redutor50')}
        >
          COM REDUTOR 50%
        </button>
        <button
          type="button"
          className={`cr-toggle-btn ${tipoParcela === 'normal' ? 'active' : ''}`}
          onClick={() => setTipoParcela('normal')}
        >
          SEM REDUTOR
        </button>
      </div>

      {/* Painel de configuração de lance */}
      <div className="sim-painel cr-lance-painel">
        <div className="cr-grupo-header">
          <h3 className="cr-grupo-titulo">GRUPO {G1038.numero} — Configuração de Lance</h3>
          <div className="cr-grupo-meta">
            <span>Taxa ADM: {(G1038.taxaAdm * 100).toFixed(0)}%</span>
            <span>FR: {(G1038.fundoReserva * 100).toFixed(0)}%</span>
            <span>Prazo restante: {G1038.prazoRestante}m / {G1038.prazo}m</span>
            <span>Lance emb. máx.: {G1038.lanceEmbutidoMax}%</span>
            <span>Lance total máx.: {G1038.lanceTotalMax}%</span>
            <span>Índice: {G1038.indice}</span>
          </div>
        </div>

        <div className="cr-lance-inputs">
          <div className="cr-lance-campo">
            <label className="cr-lance-label">
              Lance embutido: <strong>{lanceEmbutidoPercent}%</strong>
            </label>
            <div className="cr-lance-slider-row">
              <input
                type="range"
                min={0}
                max={G1038.lanceEmbutidoMax}
                value={lanceEmbutidoPercent}
                onChange={e => setLanceEmbutidoPercent(Number(e.target.value))}
                className="cr-slider"
              />
              <input
                type="number"
                min={0}
                max={G1038.lanceEmbutidoMax}
                value={lanceEmbutidoPercent}
                onChange={e =>
                  setLanceEmbutidoPercent(
                    Math.min(G1038.lanceEmbutidoMax, Math.max(0, Number(e.target.value)))
                  )
                }
                className="cr-input-percent"
              />
            </div>
          </div>

          <div className="cr-lance-campo">
            <label className="cr-lance-label">
              Lance recurso próprio (%):
            </label>
            <input
              type="number"
              min={0}
              value={lanceRecursoPercent}
              onChange={e => setLanceRecursoPercent(Math.max(0, Number(e.target.value)))}
              className="cr-input-percent"
            />
          </div>
        </div>

        {excedeLimite ? (
          <div className="cr-erro-lance">
            ⚠ Lance embutido ({lanceEmbutidoPercent}%) + Recurso próprio ({lanceRecursoPercent}%) = {lanceTotalPercent.toFixed(1)}% — ultrapassa o limite máximo de {G1038.lanceTotalMax}% da cota.
          </div>
        ) : (
          <div className="cr-info-lance">
            Lance total: {lanceTotalPercent.toFixed(1)}% de {G1038.lanceTotalMax}% permitidos
          </div>
        )}
      </div>

      {/* Card do grupo com tabela de cotas */}
      <div className="cr-grupos-grid">
        <div className="sim-painel cr-card-grupo">
          <div className="cr-grupo-header">
            <h3 className="cr-grupo-titulo">GRUPO {G1038.numero}</h3>
            <div className="cr-grupo-meta">
              <span>Taxa ADM: {(G1038.taxaAdm * 100).toFixed(0)}%</span>
              <span>FR: {(G1038.fundoReserva * 100).toFixed(0)}%</span>
              <span>Prazo restante: {G1038.prazoRestante}m</span>
              <span>Lance emb.: {lanceEmbutidoPercent}%</span>
              <span>Índice: {G1038.indice}</span>
            </div>
          </div>
          <div className="sim-tabela-container">
            <table className="sim-tabela cr-tabela-cotas">
              <thead>
                <tr>
                  <th>Carta de Crédito</th>
                  <th>
                    {tipoParcela === 'redutor50'
                      ? 'Parcela c/ Redutor 50%'
                      : 'Parcela s/ Redutor'}
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {G1038.tabela.map((cota, i) => (
                  <CotaRow
                    key={i}
                    cota={cota}
                    tipoParcela={tipoParcela}
                    bloqueado={excedeLimite}
                    onAdd={(cota, qtde) => adicionarLinha(cota, qtde)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {excedeLimite && (
            <p className="cr-aviso-add">
              ⚠ Ajuste os lances acima antes de adicionar cotas.
            </p>
          )}
        </div>
      </div>

      {/* Tabela de simulação */}
      {linhas.length > 0 && (
        <div className="sim-painel cr-painel-simulacao">
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
                {linhasCalculadas.map(linha => (
                  <LinhaSimulacao
                    key={linha.id}
                    linha={linha}
                    onRemove={removerLinha}
                    onUpdate={atualizarLinha}
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
              <span className="cr-resumo-valor">{tipoParcela === 'redutor50' ? 'Com Redutor 50%' : 'Sem Redutor'}</span>
            </div>
            <div className="cr-resumo-item">
              <span className="cr-resumo-label">Índice de reajuste</span>
              <span className="cr-resumo-valor">{G1038.indice}</span>
            </div>
            <div className="cr-resumo-item">
              <span className="cr-resumo-label">Taxa ADM / Fundo de Reserva</span>
              <span className="cr-resumo-valor">
                {(G1038.taxaAdm * 100).toFixed(0)}% / {(G1038.fundoReserva * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <p className="sim-observacao cr-nota-rodape">
            * Crédito contemplado = carta total − lance embutido.<br />
            * Parcela inicial válida até a contemplação ou metade do prazo do grupo, o que vier primeiro.<br />
            * Após esse evento, a parcela será recalculada sobre o saldo devedor atualizado dividido pelo prazo restante.
          </p>
          <button
            className="sim-btn-pdf"
            style={{ marginTop: '20px' }}
            onClick={() => setShowModalNome(true)}
          >
            Gerar PDF da proposta
          </button>
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
