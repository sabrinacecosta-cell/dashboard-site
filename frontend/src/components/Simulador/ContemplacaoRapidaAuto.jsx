import React, { useState, useMemo } from 'react';
import { GRUPOS_CONTEMPLACAO_AUTO } from '../../data/grupos';
import { formatarMoeda, formatarMoedaInteiro } from '../../business/calculos';

const G2127 = GRUPOS_CONTEMPLACAO_AUTO[2127];
const G2128 = GRUPOS_CONTEMPLACAO_AUTO[2128];

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
              <tr key={i}>
                <td>{formatarMoeda(cota.carta)}</td>
                <td className="valor-destaque">
                  {formatarMoeda(tipoParcela === 'reduzida' ? cota.parcelaReduzida : cota.parcelaNormal)}
                </td>
                <td>
                  <button
                    type="button"
                    className="cr-btn-add"
                    onClick={() => onAdd(grupo, cota)}
                  >
                    + Add
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Linha editável da tabela de simulação ───────────────────────────────────
function LinhaSimulacao({ linha, onRemove, onUpdate }) {
  const cartaTotal        = linha.carta * linha.qtde;
  const parcelaInicial    = linha.parcela * linha.qtde;
  const lanceEmb          = cartaTotal * (linha.lanceEmbutidoPercent / 100);
  const lanceTotal        = lanceEmb;
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
          value={linha.recProprios || 0}
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
export function EtapaContemplacaoRapidaAuto({ onVoltar }) {
  const [tipoParcela,      setTipoParcela]      = useState('reduzida');
  const [linhas,           setLinhas]           = useState([]);
  const [showModalNome,    setShowModalNome]    = useState(false);
  const [nomeClienteInput, setNomeClienteInput] = useState('');

  const adicionarLinha = (grupo, cota) => {
    setLinhas(prev => [...prev, {
      id: Date.now() + Math.random(),
      grupo:               grupo.numero,
      lanceEmbutidoPercent: grupo.lanceEmbutido,
      carta:               cota.carta,
      parcela:             tipoParcela === 'reduzida' ? cota.parcelaReduzida : cota.parcelaNormal,
      redutor:             tipoParcela === 'reduzida' ? 50 : 0,
      qtde:                1,
      recProprios:         0,
    }]);
  };

  const removerLinha  = (id) => setLinhas(prev => prev.filter(l => l.id !== id));
  const atualizarLinha = (id, campo, valor) =>
    setLinhas(prev => prev.map(l => l.id === id ? { ...l, [campo]: valor } : l));

  const linhasCalculadas = useMemo(() => linhas.map(l => {
    const cartaTotal        = l.carta * l.qtde;
    const parcelaInicial    = l.parcela * l.qtde;
    const lanceEmb          = cartaTotal * (l.lanceEmbutidoPercent / 100);
    const creditoContemplado = Math.max(0, cartaTotal - lanceEmb);
    return { ...l, cartaTotal, parcelaInicial, lanceEmb, lanceTotal: lanceEmb, creditoContemplado };
  }), [linhas]);

  const totais = useMemo(() => linhasCalculadas.reduce((acc, l) => ({
    cartaTotal:        acc.cartaTotal        + l.cartaTotal,
    parcelaInicial:    acc.parcelaInicial    + l.parcelaInicial,
    lanceEmb:          acc.lanceEmb          + l.lanceEmb,
    lanceTotal:        acc.lanceTotal        + l.lanceTotal,
    recProprios:       acc.recProprios       + (l.recProprios || 0),
    creditoContemplado: acc.creditoContemplado + l.creditoContemplado,
  }), { cartaTotal: 0, parcelaInicial: 0, lanceEmb: 0, lanceTotal: 0, recProprios: 0, creditoContemplado: 0 }),
  [linhasCalculadas]);

  const gruposPresentes = useMemo(
    () => [...new Set(linhas.map(l => l.grupo))].sort(),
    [linhas]
  );

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
    doc.text('CONTEMPLAÇÃO RÁPIDA | PLANEJAMENTO PATRIMONIAL', M, y);
    y += 10;

    // ── Título ──
    doc.setFontSize(20);
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.text('CONSÓRCIO AUTOMÓVEL XP', M, y);
    y += 16;

    // ── Bloco estratégia ──
    doc.setFillColor(...gold);
    doc.rect(M, y, 3, 11, 'F');
    doc.setFontSize(9.5);
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.text('Consórcio XP como estratégia de diversificação patrimonial', M + 7, y + 5.5);
    doc.setFontSize(8);
    doc.setTextColor(...lightGrey);
    doc.setFont('helvetica', 'normal');
    doc.text('Alternativa para aquisição de veículo com custo controlado e parcelas acessíveis.', M + 7, y + 10);
    y += 15;

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
    const cardH = 34;

    // Card esquerdo — crédito contemplado
    doc.setFillColor(...darkCard);
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.5);
    doc.roundedRect(M, y, cardW, cardH, 4, 4, 'FD');
    doc.setFontSize(7.5);
    doc.setTextColor(...gold);
    doc.setFont('helvetica', 'bold');
    doc.text('CRÉDITO CONTEMPLADO', M + 7, y + 7);
    doc.setFontSize(13);
    doc.setTextColor(...gold);
    doc.text(formatarMoedaInteiro(totais.creditoContemplado), M + 7, y + 16);
    doc.setFontSize(7.5);
    doc.setTextColor(...grey);
    doc.setFont('helvetica', 'normal');
    doc.text('Parcela inicial', M + 7, y + 25);
    doc.setFontSize(9);
    doc.setTextColor(...lightGrey);
    doc.setFont('helvetica', 'bold');
    doc.text(formatarMoeda(totais.parcelaInicial), M + 7, y + 31);

    // Card direito — lance / recursos
    const card2X = M + cardW + 8;
    doc.setFillColor(...darkCard);
    doc.setDrawColor(...darkBorder);
    doc.setLineWidth(0.3);
    doc.roundedRect(card2X, y, cardW, cardH, 4, 4, 'FD');
    doc.setFontSize(7.5);
    doc.setTextColor(...grey);
    doc.setFont('helvetica', 'bold');
    doc.text('LANCE EMBUTIDO', card2X + 7, y + 7);
    doc.setFontSize(10);
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.text(formatarMoeda(totais.lanceEmb), card2X + 7, y + 15);
    doc.setFontSize(7.5);
    doc.setTextColor(...grey);
    doc.setFont('helvetica', 'normal');
    if (totais.recProprios > 0) {
      doc.text('Recursos próprios', card2X + 7, y + 24);
      doc.setFontSize(9);
      doc.setTextColor(...lightGrey);
      doc.setFont('helvetica', 'bold');
      doc.text(formatarMoeda(totais.recProprios), card2X + 7, y + 30);
    } else {
      doc.text('Carta de crédito total', card2X + 7, y + 24);
      doc.setFontSize(9);
      doc.setTextColor(...lightGrey);
      doc.setFont('helvetica', 'bold');
      doc.text(formatarMoeda(totais.cartaTotal), card2X + 7, y + 30);
    }
    y += cardH + 8;

    // ── Informações técnicas (grid 3 colunas) ──
    const techRow1 = [
      { label: 'TAXA ADM',      value: '18,0%'   },
      { label: 'TAXA/MÊS',      value: '0,063%'  },
      { label: 'FUNDO RESERVA', value: '3,0%'    },
    ];
    const techH = 27;
    const techColW = (W - 2 * M) / 3;
    doc.setFillColor(...darkCard);
    doc.setDrawColor(...darkBorder);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, y, W - 2 * M, techH, 4, 4, 'FD');

    // Linha 1
    techRow1.forEach((cell, i) => {
      const cx = M + i * techColW + 7;
      doc.setFontSize(7);
      doc.setTextColor(...grey);
      doc.setFont('helvetica', 'normal');
      doc.text(cell.label, cx, y + 8);
      doc.setFontSize(9.5);
      doc.setTextColor(...white);
      doc.setFont('helvetica', 'bold');
      doc.text(cell.value, cx, y + 15);
    });

    // Linha 2 — 2 células (lance emb. e prazo)
    const techRow2 = [
      { label: 'LANCE EMBUTIDO', value: '2127: 50% / 2128: 30%' },
      { label: 'PRAZO DO GRUPO', value: '80 meses'              },
    ];
    const halfW = (W - 2 * M) / 2;
    techRow2.forEach((cell, i) => {
      const cx = M + i * halfW + 7;
      doc.setFontSize(7);
      doc.setTextColor(...grey);
      doc.setFont('helvetica', 'normal');
      doc.text(cell.label, cx, y + 21);
      doc.setFontSize(9);
      doc.setTextColor(...white);
      doc.setFont('helvetica', 'bold');
      doc.text(cell.value, cx, y + 26);
    });
    y += techH + 5;

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
