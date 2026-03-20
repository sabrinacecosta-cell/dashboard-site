import React, { useState, useMemo, useRef, useEffect } from 'react';
import { GRUPOS, ESTRATEGIAS, OBSERVACOES_LEGAIS } from '../../data/grupos';
import { calcularSimulacao, formatarMoeda, formatarMoedaInteiro, formatarPercentual } from '../../business/calculos';
import { EtapaContemplacaoRapidaAuto } from './ContemplacaoRapidaAuto';
import './Simulador.css';

// Etapa 1 - Seleção de Modalidade
function EtapaModalidade({ onSelect }) {
  return (
    <div className="sim-etapa sim-etapa-modalidade">
      <h2 className="sim-titulo-secao">Escolha a modalidade que deseja simular</h2>
      <div className="sim-cards-grid">
        <button className="sim-card-modalidade" onClick={() => onSelect('imovel')}>
          <span className="sim-card-icon">🏠</span>
          <span className="sim-card-nome">Imóvel</span>
        </button>
        <button className="sim-card-modalidade" onClick={() => onSelect('automovel')}>
          <span className="sim-card-icon">🚗</span>
          <span className="sim-card-nome">Automóvel</span>
        </button>
      </div>
    </div>
  );
}

// Etapa 2 - Seleção de Estratégia
function EtapaEstrategia({ modalidade, onSelect, onVoltar }) {
  // Contemplação rápida disponível apenas para automóvel
  const estrategiasVisiveis = ESTRATEGIAS.map(est => ({
    ...est,
    disponivel: est.id === 'contemplacao' ? modalidade === 'automovel' : est.disponivel,
  }));

  return (
    <div className="sim-etapa sim-etapa-estrategia">
      <button className="sim-btn-voltar" onClick={onVoltar}>← Voltar</button>
      <h2 className="sim-titulo-secao">Escolha a estratégia</h2>
      <div className="sim-cards-grid sim-cards-estrategia">
        {estrategiasVisiveis.map((est) => (
          <button
            key={est.id}
            className={`sim-card-estrategia ${!est.disponivel ? 'sim-card-disabled' : ''}`}
            onClick={() => est.disponivel && onSelect(est.id)}
            disabled={!est.disponivel}
          >
            <span className="sim-card-nome">{est.nome}</span>
            {!est.disponivel && <span className="sim-card-badge">Em breve</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// Dropdown customizado
function CustomDropdown({ options, value, onChange, formatLabel }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const rowKey = (opt) => opt.id ?? opt.credito;
  const selectedOption = options.find(opt => rowKey(opt) === value);

  return (
    <div className="sim-dropdown" ref={dropdownRef}>
      <button
        className="sim-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span>{formatLabel ? formatLabel(selectedOption) : formatarMoedaInteiro(selectedOption?.credito ?? value)}</span>
        <span className="sim-dropdown-arrow">▼</span>
      </button>
      {isOpen && (
        <div className="sim-dropdown-menu">
          {options.map((opt) => (
            <button
              key={rowKey(opt)}
              className={`sim-dropdown-item ${rowKey(opt) === value ? 'active' : ''}`}
              onClick={() => {
                onChange(rowKey(opt));
                setIsOpen(false);
              }}
              type="button"
            >
              {formatLabel ? formatLabel(opt) : formatarMoedaInteiro(opt.credito)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Pills Toggle
function PillsToggle({ options, value, onChange }) {
  return (
    <div className="sim-pills">
      {options.map((opt, idx) => (
        <button
          key={opt.value}
          className={`sim-pill ${value === opt.value ? 'active' : ''} ${idx === 0 ? 'pill-left' : 'pill-right'}`}
          onClick={() => onChange(opt.value)}
          type="button"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// Tabela de Parcelas
function TabelaParcelas({ tabela, plano, creditoSelecionado, onSelectCredito, defaultTaxaAdm }) {
  const isTaxaReduzida = plano === 'taxaReduzida';
  const isImovelTaxaReduzida = isTaxaReduzida && tabela[0]?.parcelaDesconto !== undefined;
  const rowKey = (row) => row.id ?? row.credito;

  return (
    <div className="sim-tabela-container">
      <table className="sim-tabela">
        <thead>
          <tr>
            <th>Crédito</th>
            {isImovelTaxaReduzida ? (
              <>
                <th>Parcela c/ desconto</th>
                <th>Parcela integral</th>
              </>
            ) : (
              <>
                <th>Redutor 50%</th>
                <th>Parcela integral</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {tabela.map((row, index) => {
            const isSelected = rowKey(row) === creditoSelecionado;
            const prevRow = index > 0 ? tabela[index - 1] : null;
            const curTaxa = row.taxaAdm ?? defaultTaxaAdm;
            const prevTaxa = prevRow ? (prevRow.taxaAdm ?? defaultTaxaAdm) : null;
            const showPill = index === 0 || curTaxa !== prevTaxa;

            return (
              <React.Fragment key={rowKey(row)}>
                {showPill && (
                  <tr className="sim-tabela-grupo-header">
                    <td colSpan={3}>
                      <span className="sim-taxa-pill">
                        <span className="sim-taxa-pill-label">Taxa ADM</span>
                        <span className="sim-taxa-pill-valor">{formatarPercentual(curTaxa)}</span>
                      </span>
                    </td>
                  </tr>
                )}
                <tr
                  className={isSelected ? 'selected' : ''}
                  onClick={() => onSelectCredito(rowKey(row))}
                >
                  <td>{formatarMoedaInteiro(row.credito)}</td>
                  {isImovelTaxaReduzida ? (
                    <>
                      <td className="valor-destaque">{formatarMoeda(row.parcelaDesconto)}</td>
                      <td className="valor-riscado">{formatarMoeda(row.parcelaIntegral)}</td>
                    </>
                  ) : (
                    <>
                      <td className="valor-destaque">{formatarMoeda(row.redutor50)}</td>
                      <td className="valor-riscado">{formatarMoeda(row.parcelaIntegral)}</td>
                    </>
                  )}
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Resumo da Proposta
function ResumoProposta({ simulacao }) {
  return (
    <div className="sim-resumo">
      <div className="sim-resumo-secao">
        <h3 className="sim-resumo-titulo">Crédito e parcelas</h3>
        <div className="sim-resumo-linha">
          <span className="sim-resumo-label">Carta de crédito</span>
          <span className="sim-resumo-valor">{formatarMoedaInteiro(simulacao.credito)}</span>
        </div>
        <div className="sim-resumo-linha">
          <span className="sim-resumo-label">Parcela inicial</span>
          <span className="sim-resumo-valor">{formatarMoeda(simulacao.parcelaInicial)}</span>
        </div>
        <div className="sim-resumo-linha">
          <span className="sim-resumo-label">Crédito disponível pós contemplação</span>
          <span className="sim-resumo-valor">{formatarMoedaInteiro(simulacao.creditoDisponivel)}</span>
        </div>
      </div>

      <div className="sim-resumo-secao">
        <h3 className="sim-resumo-titulo">Lance</h3>
        <div className="sim-resumo-linha">
          <span className="sim-resumo-label">Lance recursos próprios</span>
          <span className="sim-resumo-valor">{formatarMoedaInteiro(simulacao.lanceProprio)}</span>
        </div>
        <div className="sim-resumo-linha">
          <span className="sim-resumo-label">Lance embutido</span>
          <span className="sim-resumo-valor">{formatarMoedaInteiro(simulacao.lanceEmbutido)}</span>
        </div>
        <div className="sim-resumo-linha">
          <span className="sim-resumo-label">Lance total</span>
          <span className="sim-resumo-valor valor-cobre">{formatarMoedaInteiro(simulacao.lanceTotal)}</span>
        </div>
      </div>

      <div className="sim-resumo-secao">
        <h3 className="sim-resumo-titulo">Custos</h3>
        <div className="sim-resumo-linha">
          <span className="sim-resumo-label">Total fundo de reserva (FR)</span>
          <span className="sim-resumo-valor">{formatarMoedaInteiro(simulacao.totalFundoReserva)}</span>
        </div>
        <div className="sim-resumo-linha">
          <span className="sim-resumo-label">Total taxas (TA + FR)</span>
          <span className="sim-resumo-valor">{formatarMoedaInteiro(simulacao.totalTaxas)}</span>
        </div>
        <div className="sim-resumo-linha">
          <span className="sim-resumo-label">Saldo devedor inicial</span>
          <span className="sim-resumo-valor">{formatarMoedaInteiro(simulacao.saldoDevedor)}</span>
        </div>
      </div>
    </div>
  );
}

// Etapa 3 - Simulação
function EtapaSimulacao({ modalidade, onVoltar }) {
  const grupo = GRUPOS[modalidade];
  const [plano, setPlano] = useState('taxaReduzida');
  const [lanceProprioPercent, setLanceProprioPercent] = useState(30);
  const [lanceEmbutidoPercent, setLanceEmbutidoPercent] = useState(30);
  const [showModalNome, setShowModalNome] = useState(false);
  const [nomeClienteInput, setNomeClienteInput] = useState('');

  const dadosPlano = grupo[plano];
  const tabela = dadosPlano.tabela;
  const rowKey = (r) => r.id ?? r.credito;
  const [creditoSelecionado, setCreditoSelecionado] = useState(rowKey(tabela[0]));

  // Atualiza crédito quando muda o plano
  useEffect(() => {
    const novaTabela = grupo[plano].tabela;
    if (!novaTabela.find(r => rowKey(r) === creditoSelecionado)) {
      setCreditoSelecionado(rowKey(novaTabela[0]));
    }
  }, [plano, grupo, creditoSelecionado]);

  const linhaSelecionada = tabela.find(r => rowKey(r) === creditoSelecionado);
  const efetivaTaxaAdm = linhaSelecionada?.taxaAdm ?? dadosPlano.taxaAdm;

  // Determina a parcela inicial baseada no plano
  const parcelaInicial = useMemo(() => {
    if (!linhaSelecionada) return 0;
    if (plano === 'taxaReduzida' && linhaSelecionada.parcelaDesconto) {
      return linhaSelecionada.parcelaDesconto;
    }
    return linhaSelecionada.redutor50 || linhaSelecionada.parcelaDesconto || 0;
  }, [linhaSelecionada, plano]);

  const simulacao = useMemo(() => {
    return calcularSimulacao({
      credito: linhaSelecionada?.credito ?? 0,
      lanceProprioPercent,
      lanceEmbutidoPercent,
      taxaAdm: efetivaTaxaAdm,
      fundoReserva: dadosPlano.fundoReserva,
      parcelaInicial,
      parcelaIntegral: linhaSelecionada?.parcelaIntegral || 0
    });
  }, [linhaSelecionada, lanceProprioPercent, lanceEmbutidoPercent, dadosPlano, parcelaInicial, efetivaTaxaAdm]);

  const gerarPDF = async (nomeCliente) => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    const W = 210;
    const H = 297;
    const M = 12;
    let y = M;

    const gold = [245, 192, 0];
    const white = [255, 255, 255];
    const black = [10, 10, 10];
    const grey = [153, 153, 153];
    const lightGrey = [200, 200, 200];
    const darkCard = [30, 30, 30];
    const darkBorder = [46, 46, 46];

    // Fundo preto total
    doc.setFillColor(...black);
    doc.rect(0, 0, W, H, 'F');

    // Elemento geométrico diagonal dourado — canto superior direito
    doc.setFillColor(...gold);
    doc.lines([[-65, 0], [65, 65], [0, -65]], W, 0, [1, 1], 'F', true);
    doc.setFillColor(200, 155, 0);
    doc.lines([[-35, 0], [35, 35], [0, -35]], W, 0, [1, 1], 'F', true);

    // ─── HEADER ───
    doc.setFontSize(8);
    doc.setTextColor(...grey);
    doc.setFont('helvetica', 'bold');
    const modalLabel = modalidade === 'imovel' ? 'IMOBILIÁRIO' : 'AUTOMÓVEL';
    doc.text(`GRUPO ${grupo.grupo} | ${modalLabel}`, M, y + 5);
    // Reduz gap se há saudação para compensar espaço
    y += nomeCliente ? 10 : 13;

    // ─── SAUDAÇÃO PERSONALIZADA (opcional) ───
    if (nomeCliente) {
      doc.setFontSize(10);
      doc.setTextColor(...white);
      doc.setFont('helvetica', 'normal');
      const tipoPlano = modalidade === 'imovel' ? 'imobiliário' : 'de automóvel';
      doc.text(
        `Olá, ${nomeCliente}. Segue o planejamento ${tipoPlano} feito para você.`,
        M, y + 5
      );
      y += 11;
    }

    // ─── LINHA DE CATEGORIA ───
    doc.setFontSize(7.5);
    doc.setTextColor(...grey);
    doc.setFont('helvetica', 'normal');
    const planoLabel = plano === 'taxaReduzida' ? 'TAXA REDUZIDA' : 'PARCELA REDUZIDA';
    doc.text(`${planoLabel} | PLANEJAMENTO PATRIMONIAL DE LONGO PRAZO`, M, y);
    y += 12;

    // ─── TÍTULO GRANDE ───
    doc.setFontSize(20);
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.text(`CONSÓRCIO ${modalLabel} XP`, M, y);
    y += 9;
    doc.setFontSize(13);
    doc.setTextColor(...gold);
    doc.text(`CRÉDITO DE ${formatarMoedaInteiro(linhaSelecionada?.credito ?? 0)}`, M, y);
    y += 16;

    // ─── BLOCO COM BARRA VERTICAL AMARELA — estratégia ───
    doc.setFillColor(...gold);
    doc.rect(M, y, 3, 8, 'F');
    doc.setFontSize(10);
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.text('Consórcio XP como estratégia de aquisição patrimonial', M + 7, y + 5.5);
    y += 11;

    // ─── BOX COM BORDA AMARELA — redução 50% ───
    doc.setFillColor(25, 20, 0);
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.5);
    doc.roundedRect(M, y, W - 2 * M, 16, 3, 3, 'FD');
    doc.setFontSize(9);
    doc.setTextColor(...gold);
    doc.setFont('helvetica', 'bold');
    doc.text('Redução de 50% no valor das parcelas', W / 2, y + 7, { align: 'center' });
    doc.setFontSize(7.5);
    doc.setTextColor(...lightGrey);
    doc.setFont('helvetica', 'normal');
    doc.text('Pague menos durante o período de espera e preserve sua liquidez financeira', W / 2, y + 13, { align: 'center' });
    y += 22;

    // ─── CARDS LADO A LADO — 2 colunas ───
    const cardW = (W - 2 * M - 8) / 2;
    const cardH = 44;
    const parcelaReduzida = linhaSelecionada?.redutor50 || linhaSelecionada?.parcelaDesconto || parcelaInicial;

    // Card esquerdo — carta de crédito + crédito disponível (borda amarela)
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
    doc.text(formatarMoeda(linhaSelecionada?.credito ?? 0), M + 7, y + 13);
    doc.setFontSize(7);
    doc.setTextColor(...grey);
    doc.setFont('helvetica', 'normal');
    doc.text('CRÉDITO CONTEMPLADO', M + 7, y + 24);
    doc.setFontSize(13);
    doc.setTextColor(...gold);
    doc.setFont('helvetica', 'bold');
    doc.text(formatarMoeda(simulacao.creditoDisponivel), M + 7, y + 32);

    // Card direito — lance embutido + lance próprio + parcela
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
    doc.text(formatarMoeda(simulacao.lanceEmbutido), card2X + 7, y + 14);
    // Sub-coluna 2: Lance próprio (condicional)
    if (simulacao.lanceProprio > 0) {
      doc.setFontSize(7);
      doc.setTextColor(...grey);
      doc.setFont('helvetica', 'normal');
      doc.text('LANCE REC. PRÓPRIOS', card2X + cardW / 2 + 4, y + 7);
      doc.setFontSize(9);
      doc.setTextColor(...white);
      doc.setFont('helvetica', 'bold');
      doc.text(formatarMoeda(simulacao.lanceProprio), card2X + cardW / 2 + 4, y + 14);
    }
    // Parcela inicial abaixo
    doc.setFontSize(7);
    doc.setTextColor(...grey);
    doc.setFont('helvetica', 'normal');
    doc.text('PARCELA INICIAL', card2X + 7, y + 26);
    doc.setFontSize(11);
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.text(formatarMoeda(parcelaReduzida), card2X + 7, y + 34);

    y += cardH + 7;

    // ─── NOTA EXPLICATIVA — recálculo da parcela ───
    const notaTexto = 'Após a contemplação ou metade do prazo do grupo (o que vier primeiro), o valor da parcela será recalculado com base no saldo devedor atualizado, descontando o lance pago (se houver) e as parcelas já pagas até aquele momento, dividido pelo prazo restante.';
    doc.setFontSize(7);
    const notaLinhas = doc.splitTextToSize(notaTexto, W - 2 * M - 8);
    const notaBarH = Math.max(14, 4 + notaLinhas.length * 3.6);
    doc.setFillColor(...gold);
    doc.rect(M, y, 3, notaBarH, 'F');
    doc.setTextColor(...lightGrey);
    doc.setFont('helvetica', 'normal');
    notaLinhas.forEach((linha, i) => {
      doc.text(linha, M + 7, y + 5 + i * 3.6);
    });
    y += notaBarH + 6;

    // ─── INFORMAÇÕES TÉCNICAS DO GRUPO (linha única horizontal) ───
    const techCells = [
      { label: 'TAXA ADM',       value: formatarPercentual(efetivaTaxaAdm)           },
      { label: 'TAXA/MÊS',       value: formatarPercentual(dadosPlano.taxaMes)      },
      { label: 'FUNDO RESERVA',  value: formatarPercentual(dadosPlano.fundoReserva) },
      { label: 'LANCE EMBUTIDO', value: `${lanceEmbutidoPercent}%`                 },
      { label: 'LANCE FIXO',     value: `${lanceProprioPercent}%`                  },
      { label: 'PRAZO',          value: `${grupo.prazo} meses`                     },
    ];
    const techH = 18;
    const techColW = (W - 2 * M) / techCells.length;
    doc.setFillColor(...darkCard);
    doc.setDrawColor(...darkBorder);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, y, W - 2 * M, techH, 4, 4, 'FD');
    techCells.forEach((cell, i) => {
      const cx = M + i * techColW + 7;
      const cy = y + 7;
      doc.setFontSize(7);
      doc.setTextColor(...grey);
      doc.setFont('helvetica', 'normal');
      doc.text(cell.label, cx, cy);
      doc.setFontSize(9);
      doc.setTextColor(...white);
      doc.setFont('helvetica', 'bold');
      doc.text(cell.value, cx, cy + 6);
    });
    y += techH + 5;

    // ─── BLOCO REAJUSTE PRÉ-FIXADO ───
    doc.setFillColor(...gold);
    doc.rect(M, y, 3, 13, 'F');
    doc.setFontSize(8.5);
    doc.setTextColor(...lightGrey);
    doc.setFont('helvetica', 'normal');
    doc.text('Este grupo possui previsibilidade de correção de parcelas: reajuste', M + 7, y + 5.5);
    doc.setFontSize(9);
    doc.setTextColor(...gold);
    doc.setFont('helvetica', 'bold');
    doc.text('Pré-fixado de 5% ao ano.', M + 7, y + 12);
    y += 16;

    // ─── BLOCO COM BARRA VERTICAL AMARELA — indicado para ───
    const indicados = modalidade === 'imovel'
      ? [
          '• Construção gradual de patrimônio imobiliário',
          '• Diversificação em ativos reais',
          '• Planejamento de aquisições futuras',
          '• Estratégias familiares e sucessórias',
          '• Preservação de liquidez e rentabilidade dos investimentos',
        ]
      : [
          '• Planejamento de aquisições futuras',
          '• Estratégias familiares e sucessórias',
          '• Preservação de liquidez e rentabilidade dos investimentos',
        ];
    const barHeight2 = 8 + indicados.length * 4.5;
    doc.setFillColor(...gold);
    doc.rect(M, y, 3, barHeight2, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...grey);
    doc.setFont('helvetica', 'bold');
    doc.text('ESTRUTURA INDICADA PARA:', M + 7, y + 6);
    doc.setFontSize(8.5);
    doc.setTextColor(...lightGrey);
    doc.setFont('helvetica', 'normal');
    indicados.forEach((linha, i) => {
      doc.text(linha, M + 7, y + 11 + i * 4.5);
    });
    y += barHeight2 + 5;

    // ─── BOX CTA ───
    doc.setFillColor(22, 18, 0);
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.4);
    doc.roundedRect(M, y, W - 2 * M, 18, 4, 4, 'FD');
    doc.setFontSize(9);
    doc.setTextColor(...gold);
    doc.setFont('helvetica', 'bold');
    doc.text('Fale comigo para avaliarmos como este consórcio', W / 2, y + 7, { align: 'center' });
    doc.text('pode se integrar à sua estratégia patrimonial', W / 2, y + 13.5, { align: 'center' });
    y += 20;

    // ─── OBSERVAÇÕES LEGAIS (ancoradas acima do footer) ───
    const legalY = H - 28;
    if (y < legalY) {
      doc.setFontSize(6.5);
      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', 'normal');
      const observacao = OBSERVACOES_LEGAIS[modalidade];
      const linhasObs = doc.splitTextToSize(observacao, W - 2 * M);
      doc.text(linhasObs, M, legalY);
    }

    // ─── FOOTER ───
    doc.setFillColor(20, 20, 20);
    doc.rect(0, H - 16, W, 16, 'F');
    doc.setFontSize(9);
    doc.setTextColor(...gold);
    doc.setFont('helvetica', 'bold');
    doc.text('Consórcio XP', M, H - 6);
    const dataValidade = new Date();
    dataValidade.setDate(dataValidade.getDate() + 30);
    doc.setFontSize(8);
    doc.setTextColor(...grey);
    doc.setFont('helvetica', 'normal');
    doc.text(`Oferta válida até ${dataValidade.toLocaleDateString('pt-BR')}`, W - M, H - 6, { align: 'right' });

    doc.save(`proposta-xp-${modalidade}-grupo${grupo.grupo}-${linhaSelecionada?.credito ?? 0}.pdf`);
  };

  return (
    <div className="sim-etapa sim-etapa-simulacao">
      <button className="sim-btn-voltar" onClick={onVoltar}>← Voltar</button>
      
      {/* Filtros */}
      <div className="sim-filtros">
        <div className="sim-filtro-grupo">
          <span className="sim-filtro-label">Carta de crédito</span>
          <CustomDropdown
            options={tabela}
            value={creditoSelecionado}
            onChange={setCreditoSelecionado}
            formatLabel={(opt) => opt.taxaAdm
              ? `${formatarMoedaInteiro(opt.credito)} · TA ${formatarPercentual(opt.taxaAdm)}`
              : formatarMoedaInteiro(opt.credito)
            }
          />
        </div>
        <PillsToggle
          options={[
            { value: 'taxaReduzida', label: 'Taxa reduzida' },
            { value: 'parcelaReduzida', label: 'Parcela reduzida' }
          ]}
          value={plano}
          onChange={setPlano}
        />
      </div>

      {/* Layout duas colunas */}
      <div className="sim-colunas">
        {/* Coluna Esquerda - Parâmetros */}
        <div className="sim-col-esquerda">
          <div className="sim-painel">
            <div className="sim-info-bar">
              <div className="sim-info-item">
                <span className="sim-info-label">Taxa adm</span>
                <span className="sim-info-valor">{formatarPercentual(efetivaTaxaAdm)}</span>
              </div>
              <div className="sim-info-item">
                <span className="sim-info-label">Taxa/mês</span>
                <span className="sim-info-valor">{formatarPercentual(dadosPlano.taxaMes)}</span>
              </div>
              <div className="sim-info-item">
                <span className="sim-info-label">Fundo reserva</span>
                <span className="sim-info-valor">{formatarPercentual(dadosPlano.fundoReserva)}</span>
              </div>
              <div className="sim-info-item">
                <span className="sim-info-label">Lance embutido</span>
                <span className="sim-info-valor">30%</span>
              </div>
              <div className="sim-info-item">
                <span className="sim-info-label">Lance fixo</span>
                <span className="sim-info-valor">30%</span>
              </div>
              <div className="sim-info-item">
                <span className="sim-info-label">Prazo</span>
                <span className="sim-info-valor">{grupo.prazo} meses</span>
              </div>
            </div>

            <div className="sim-inputs">
              <div className="sim-input-grupo">
                <label>Lance recursos próprios (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={lanceProprioPercent}
                  onChange={(e) => setLanceProprioPercent(Number(e.target.value))}
                />
              </div>
              <div className="sim-input-grupo">
                <label>Lance embutido (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={lanceEmbutidoPercent}
                  onChange={(e) => setLanceEmbutidoPercent(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="sim-reajuste">
              Reajuste anual → <strong>Pré-fixado 5%</strong>
            </div>

            <div className="sim-resultados">
              <div className="sim-resultado-item">
                <span className="sim-resultado-label">Lance próprio</span>
                <span className="sim-resultado-valor">{formatarMoedaInteiro(simulacao.lanceProprio)}</span>
              </div>
              <div className="sim-resultado-item">
                <span className="sim-resultado-label">Lance embutido</span>
                <span className="sim-resultado-valor">{formatarMoedaInteiro(simulacao.lanceEmbutido)}</span>
              </div>
              <div className="sim-resultado-item">
                <span className="sim-resultado-label">Lance total</span>
                <span className="sim-resultado-valor valor-cobre">{formatarMoedaInteiro(simulacao.lanceTotal)}</span>
              </div>
              <div className="sim-resultado-item">
                <span className="sim-resultado-label">Crédito disponível pós contemplação</span>
                <span className="sim-resultado-valor">{formatarMoedaInteiro(simulacao.creditoDisponivel)}</span>
              </div>
            </div>

            <button className="sim-btn-pdf" onClick={() => setShowModalNome(true)}>
              Gerar PDF da proposta
            </button>

            <p className="sim-observacao">
              {OBSERVACOES_LEGAIS[modalidade]}
            </p>
          </div>
        </div>

        {/* Coluna Direita - Tabela */}
        <div className="sim-col-direita">
          <div className="sim-painel">
            <TabelaParcelas
              tabela={tabela}
              plano={plano}
              creditoSelecionado={creditoSelecionado}
              onSelectCredito={setCreditoSelecionado}
              defaultTaxaAdm={dadosPlano.taxaAdm}
            />
            <p className="sim-nota-parcela">
              ✦ O valor reduzido é válido até a contemplação ou metade do prazo do grupo, o que vier primeiro. Após esse evento, a parcela é recalculada com base no saldo devedor atualizado.
            </p>
          </div>
        </div>
      </div>

      {/* Resumo Full Width */}
      <div className="sim-painel sim-painel-resumo">
        <h3 className="sim-titulo-secao">Resumo da proposta</h3>
        <ResumoProposta simulacao={simulacao} />
      </div>

      {/* Modal: nome do cliente */}
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

// Componente Principal
function Simulador() {
  const [etapa, setEtapa] = useState(1);
  const [modalidade, setModalidade] = useState(null);
  const [estrategia, setEstrategia] = useState(null);

  const handleSelectModalidade = (mod) => {
    setModalidade(mod);
    setEtapa(2);
  };

  const handleSelectEstrategia = (est) => {
    setEstrategia(est);
    setEtapa(3);
  };

  const handleVoltar = () => {
    if (etapa === 2) {
      setModalidade(null);
      setEtapa(1);
    } else if (etapa === 3) {
      setEstrategia(null);
      setEtapa(2);
    }
  };

  return (
    <div className="sim-container">
      {etapa === 1 && <EtapaModalidade onSelect={handleSelectModalidade} />}
      {etapa === 2 && (
        <EtapaEstrategia
          modalidade={modalidade}
          onSelect={handleSelectEstrategia}
          onVoltar={handleVoltar}
        />
      )}
      {etapa === 3 && (
        modalidade === 'automovel' && estrategia === 'contemplacao'
          ? <EtapaContemplacaoRapidaAuto onVoltar={handleVoltar} />
          : <EtapaSimulacao modalidade={modalidade} onVoltar={handleVoltar} />
      )}
    </div>
  );
}

export default Simulador;
