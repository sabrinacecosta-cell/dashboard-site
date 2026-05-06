import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { gerarExcelSimulacao } from '../../business/excelExport';
import { formatarMoeda, formatarMoedaInteiro, formatarPercentual } from '../../business/calculos';
import { ResumoProposta } from './ResumoProposta';
import { OBSERVACOES_LEGAIS } from '../../data/grupos';
import './Simulador.css';


function LinhaSimulacaoLanc({ linha, onRemove, onUpdate }) {
  const cartaTotal         = linha.credito * linha.qtde;
  const parcelaInicial     = linha.parcela  * linha.qtde;
  const lanceEmb           = cartaTotal * (linha.lanceEmbutidoPercent / 100);
  const recPropriosReais   = cartaTotal * ((linha.recProprios || 0) / 100);
  const lanceTotal         = recPropriosReais + lanceEmb;
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
      <td>{formatarMoeda(linha.credito)}</td>
      <td>{formatarMoeda(cartaTotal)}</td>
      <td>{formatarMoeda(parcelaInicial)}</td>
      <td>{linha.redutor === 0 ? '0%' : '50%'}</td>
      <td>
        <div className="cr-lance-emb-cell">
          <input
            type="number"
            className="cr-input-celula cr-input-pct"
            min={0}
            max={100}
            value={linha.recProprios || 0}
            onChange={e => onUpdate(linha.id, 'recProprios', Math.max(0, Number(e.target.value)))}
          />
          <span className="cr-lance-emb-label">% · {formatarMoeda(recPropriosReais)}</span>
        </div>
      </td>
      <td>
        <input
          type="number"
          className="cr-input-celula cr-input-pct"
          min={0}
          max={linha.lanceEmbutidoMax}
          value={linha.lanceEmbutidoPercent}
          onChange={e => onUpdate(linha.id, 'lanceEmbutidoPercent',
            Math.min(linha.lanceEmbutidoMax, Math.max(0, Number(e.target.value)))
          )}
        />
        <span className="cr-lance-emb-label">% · {formatarMoeda(lanceEmb)}</span>
      </td>
      <td>{formatarMoeda(lanceTotal)}</td>
      <td className="cr-credito-contemplado">{formatarMoeda(creditoContemplado)}</td>
      <td>
        <button type="button" className="cr-btn-remover" onClick={() => onRemove(linha.id)}>✕</button>
      </td>
    </tr>
  );
}

export default function Simulador() {
  const navigate = useNavigate();
  const [modalidade, setModalidade]               = useState('imovel');
  const [grupos, setGrupos]                       = useState([]);
  const [loadingGrupos, setLoadingGrupos]         = useState(false);
  const [grupoSelecionado, setGrupoSelecionado]   = useState(null);
  const [cotas, setCotas]                         = useState([]);
  const [loadingCotas, setLoadingCotas]           = useState(false);
  const [comRedutor, setComRedutor]               = useState(false);
  const [qtdesCotas, setQtdesCotas]               = useState({});
  const [linhasSim, setLinhasSim]                 = useState([]);
  const [showModalNomeSim, setShowModalNomeSim]   = useState(false);
  const [nomeClienteInputSim, setNomeClienteInputSim] = useState('');
  const [incluirParcelaPosNoPDF, setIncluirParcelaPosNoPDF] = useState(true);
  const [simParcelasX, setSimParcelasX]                   = useState(18);

  useEffect(() => {
    setLoadingGrupos(true);
    setGrupoSelecionado(null);
    setCotas([]);
    api.get(`/simulador/grupos?modalidade=${modalidade}`)
      .then(r => setGrupos(r.data))
      .catch(() => setGrupos([]))
      .finally(() => setLoadingGrupos(false));
  }, [modalidade]);

  useEffect(() => {
    if (!grupoSelecionado) { setCotas([]); return; }
    setLoadingCotas(true);
    setQtdesCotas({});
    api.get(`/simulador/cotas?grupo=${grupoSelecionado.numero_grupo}&modalidade=${modalidade}`)
      .then(r => {
        setCotas(r.data);
        const temReducao = r.data.some(c => parseFloat(c.redutor_parcela) === 0.5);
        setComRedutor(temReducao);
      })
      .catch(() => setCotas([]))
      .finally(() => setLoadingCotas(false));
  }, [grupoSelecionado, modalidade]);

  const hasReducao     = cotas.some(c => parseFloat(c.redutor_parcela) === 0.5);
  const cotasFiltradas = cotas.filter(c =>
    comRedutor
      ? parseFloat(c.redutor_parcela) === 0.5
      : parseFloat(c.redutor_parcela) === 0
  );

  const trocarModalidade = (nova) => {
    setModalidade(nova);
    setLinhasSim([]);
  };

  const adicionarLinhaSim = (cota, qtde = 1) => {
    const g = grupoSelecionado;
    const redutorVal   = parseFloat(cota.redutor_parcela) === 0.5 ? 50 : 0;
    const simKey       = `${g.numero_grupo}_${cota.bem_referencia}_${redutorVal}`;
    const lanceEmbutidoMax = Math.round(parseFloat(g.lance_embutido_max) * 100);
    setLinhasSim(prev => {
      const existente = prev.find(l => l.simKey === simKey);
      if (existente) {
        return prev.map(l =>
          l.id === existente.id ? { ...l, qtde: Math.min(99, l.qtde + qtde) } : l
        );
      }
      return [...prev, {
        id:                   Date.now() + Math.random(),
        simKey,
        grupo:                String(g.numero_grupo),
        credito:              parseFloat(cota.cota),
        parcela:              parseFloat(cota.parcela),
        redutor:              redutorVal,
        lanceEmbutidoPercent: lanceEmbutidoMax,
        lanceEmbutidoMax,
        taxaAdm:              (redutorVal === 50 && g.taxa_adm_redutor != null) ? parseFloat(g.taxa_adm_redutor) : parseFloat(g.taxa_adm),
        fundoReserva:         parseFloat(g.fundo_reserva),
        prazoRestante:        parseInt(g.prazo_restante),
        reajuste:             g.reajuste,
        mesReajuste:          g.mes_reajuste,
        qtde,
        recProprios:          0,
      }];
    });
  };

  const removerLinhaSim   = (id) => setLinhasSim(prev => prev.filter(l => l.id !== id));
  const atualizarLinhaSim = (id, campo, valor) =>
    setLinhasSim(prev => prev.map(l => l.id === id ? { ...l, [campo]: valor } : l));

  const linhasSimCalc = useMemo(() => linhasSim.map(l => {
    const cartaTotal          = l.credito * l.qtde;
    const parcelaInicialSim   = l.parcela  * l.qtde;
    const lanceEmb            = cartaTotal * (l.lanceEmbutidoPercent / 100);
    const recPropriosReais    = cartaTotal * ((l.recProprios || 0) / 100);
    const lanceTotal          = recPropriosReais + lanceEmb;
    const creditoContemplado  = Math.max(0, cartaTotal - lanceEmb);
    const saldoDevedor        = cartaTotal * (1 + (l.taxaAdm || 0) + (l.fundoReserva || 0));
    const totalFundoReserva   = cartaTotal * (l.fundoReserva || 0);
    const totalTaxas          = saldoDevedor - cartaTotal;
    const prazoR = l.prazoRestante || 1;
    const parcelasPagas = simParcelasX * parcelaInicialSim;
    const saldoDevedorAtualizado = saldoDevedor - parcelasPagas - lanceTotal;
    const prazoAtualizado = Math.max(1, prazoR - simParcelasX);
    const parcelaPosContemplacao = Math.max(0, saldoDevedorAtualizado / prazoAtualizado);
    return { ...l, cartaTotal, parcelaInicialSim, lanceEmb, lanceTotal, creditoContemplado,
             recPropriosReais, saldoDevedor, totalFundoReserva, totalTaxas, parcelaPosContemplacao };
  }), [linhasSim, simParcelasX]);

  const totaisSim = useMemo(() => linhasSimCalc.reduce((acc, l) => ({
    cartaTotal:             acc.cartaTotal             + l.cartaTotal,
    parcelaInicialSim:      acc.parcelaInicialSim      + l.parcelaInicialSim,
    lanceEmb:               acc.lanceEmb               + l.lanceEmb,
    lanceTotal:             acc.lanceTotal             + l.lanceTotal,
    recProprios:            acc.recProprios            + (l.recPropriosReais || 0),
    creditoContemplado:     acc.creditoContemplado     + l.creditoContemplado,
    saldoDevedor:           acc.saldoDevedor           + (l.saldoDevedor || 0),
    totalFundoReserva:      acc.totalFundoReserva      + (l.totalFundoReserva || 0),
    totalTaxas:             acc.totalTaxas             + (l.totalTaxas || 0),
    parcelaPosContemplacao: acc.parcelaPosContemplacao + l.parcelaPosContemplacao,
  }), { cartaTotal: 0, parcelaInicialSim: 0, lanceEmb: 0, lanceTotal: 0, recProprios: 0,
       creditoContemplado: 0, saldoDevedor: 0, totalFundoReserva: 0, totalTaxas: 0, parcelaPosContemplacao: 0 }),
  [linhasSimCalc]);

  const simulacaoDoTotais = useMemo(() => ({
    credito:                totaisSim.cartaTotal,
    parcelaInicial:         totaisSim.parcelaInicialSim,
    parcelaPosContemplacao: totaisSim.parcelaPosContemplacao,
    creditoDisponivel:      totaisSim.creditoContemplado,
    lanceProprio:           totaisSim.recProprios,
    lanceEmbutido:          totaisSim.lanceEmb,
    lanceTotal:             totaisSim.lanceTotal,
    totalFundoReserva:      totaisSim.totalFundoReserva,
    totalTaxas:             totaisSim.totalTaxas,
    saldoDevedor:           totaisSim.saldoDevedor,
  }), [totaisSim]);

  const gerarExcel = () => {
    gerarExcelSimulacao({
      rows: linhasSimCalc.map(l => ({
        grupo:                  l.grupo,
        taxaAdm:                l.taxaAdm,
        fundoReserva:           l.fundoReserva,
        prazo:                  l.prazoRestante,
        qtde:                   l.qtde,
        cartaTotal:             l.cartaTotal,
        parcelaInicial:         l.parcelaInicialSim,
        parcelaPosContemplacao: l.parcelaPosContemplacao,
        recProprios:            l.recPropriosReais || 0,
        lanceEmbPerc:           l.lanceEmbutidoPercent,
        creditoContemplado:     l.creditoContemplado,
      })),
      totais: {
        cartaTotal:             totaisSim.cartaTotal,
        parcelaInicial:         totaisSim.parcelaInicialSim,
        parcelaPosContemplacao: totaisSim.parcelaPosContemplacao,
        recProprios:            totaisSim.recProprios,
        lanceEmb:               totaisSim.lanceEmb,
        lanceTotal:             totaisSim.lanceTotal,
        creditoContemplado:     totaisSim.creditoContemplado,
      },
      simularParcelas: simParcelasX,
      nomeArquivo: `simulacao-xp-${modalidade}.xlsx`,
    });
  };

  const gerarPDFSim = async (nomeCliente) => {
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

    const modalLabel   = modalidade === 'imovel' ? 'IMOBILIÁRIO' : 'AUTOMÓVEL';
    const gruposNoSim  = [...new Set(linhasSim.map(l => l.grupo))].join(', ');
    const prefixoGrupo = linhasSim.length > 1 ? 'GRUPOS' : 'GRUPO';

    doc.setFontSize(8);
    doc.setTextColor(...grey);
    doc.setFont('helvetica', 'bold');
    doc.text(`${prefixoGrupo} ${gruposNoSim} | ${modalLabel}`, M, y + 5);
    y += nomeCliente ? 10 : 13;

    if (nomeCliente) {
      doc.setFontSize(10);
      doc.setTextColor(...white);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Olá, ${nomeCliente}. Segue o planejamento ${modalidade === 'imovel' ? 'imobiliário' : 'de automóvel'} feito para você.`,
        M, y + 5
      );
      y += 11;
    }

    doc.setFontSize(7.5);
    doc.setTextColor(...grey);
    doc.setFont('helvetica', 'normal');
    doc.text('SIMULAÇÃO PERSONALIZADA | PLANEJAMENTO PATRIMONIAL', M, y);
    y += 10;

    doc.setFontSize(20);
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.text(`CONSÓRCIO ${modalLabel} XP`, M, y);
    y += 16;

    if (modalidade === 'imovel') {
      doc.setFillColor(...gold);
      doc.rect(M, y, 3, 8, 'F');
      doc.setFontSize(9.5);
      doc.setTextColor(...white);
      doc.setFont('helvetica', 'bold');
      doc.text('Consórcio XP como estratégia de aquisição patrimonial', M + 7, y + 5.5);
      y += 12;
    }

    const cardW = (W - 2 * M - 8) / 2;
    const cardH = 56;

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
    doc.text(formatarMoeda(totaisSim.cartaTotal), M + 7, y + 13);
    doc.setFontSize(7);
    doc.setTextColor(...grey);
    doc.setFont('helvetica', 'normal');
    doc.text('CRÉDITO CONTEMPLADO', M + 7, y + 24);
    doc.setFontSize(13);
    doc.setTextColor(...gold);
    doc.setFont('helvetica', 'bold');
    doc.text(formatarMoeda(totaisSim.creditoContemplado), M + 7, y + 32);

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
    doc.text(formatarMoeda(totaisSim.lanceEmb), card2X + 7, y + 14);
    if (totaisSim.recProprios > 0) {
      doc.setFontSize(7);
      doc.setTextColor(...grey);
      doc.setFont('helvetica', 'normal');
      doc.text('LANCE REC. PRÓPRIOS', card2X + cardW / 2 + 4, y + 7);
      doc.setFontSize(9);
      doc.setTextColor(...white);
      doc.setFont('helvetica', 'bold');
      doc.text(formatarMoeda(totaisSim.recProprios), card2X + cardW / 2 + 4, y + 14);
    }
    doc.setFontSize(7);
    doc.setTextColor(...grey);
    doc.setFont('helvetica', 'normal');
    doc.text('PARCELA INICIAL', card2X + 7, y + 26);
    doc.setFontSize(11);
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.text(formatarMoeda(totaisSim.parcelaInicialSim), card2X + 7, y + 34);
    if (incluirParcelaPosNoPDF) {
      doc.setFontSize(7);
      doc.setTextColor(...grey);
      doc.setFont('helvetica', 'normal');
      doc.text('PARCELA PÓS CONTEMPLAÇÃO', card2X + 7, y + 42);
      doc.setFontSize(10);
      doc.setTextColor(...gold);
      doc.setFont('helvetica', 'bold');
      doc.text(formatarMoeda(totaisSim.parcelaPosContemplacao), card2X + 7, y + 50);
    }
    y += cardH + 8;

    // Cards de informações por grupo
    const gruposUnicos = [...new Map(linhasSim.map(l => [l.grupo, l])).values()];
    const nGrupos = gruposUnicos.length;
    const infoCardH = 40;
    const infoCardW = nGrupos <= 2 ? (W - 2 * M - (nGrupos - 1) * 6) / nGrupos : W - 2 * M;
    if (nGrupos <= 2) {
      gruposUnicos.forEach((l, i) => {
        const cx = M + i * (infoCardW + 6);
        doc.setFillColor(...darkCard);
        doc.setDrawColor(...gold);
        doc.setLineWidth(0.5);
        doc.roundedRect(cx, y, infoCardW, infoCardH, 4, 4, 'FD');
        doc.setFontSize(6.5);
        doc.setTextColor(...grey);
        doc.setFont('helvetica', 'bold');
        doc.text(`GRUPO ${l.grupo}`, cx + 6, y + 7);
        doc.setFontSize(8.5);
        doc.setTextColor(...white);
        doc.setFont('helvetica', 'bold');
        doc.text(`Prazo restante: ${l.prazoRestante} meses`, cx + 6, y + 14);
        doc.text(`Lance embutido máximo: ${l.lanceEmbutidoMax}%`, cx + 6, y + 21);
        doc.text(`Taxa administrativa: ${formatarPercentual(l.taxaAdm)}   Fundo de reserva: ${formatarPercentual(l.fundoReserva)}`, cx + 6, y + 28);
        doc.setFontSize(7);
        doc.setTextColor(...grey);
        doc.setFont('helvetica', 'normal');
        doc.text(`Reajuste: ${l.reajuste || '—'}   Mês: ${l.mesReajuste || '—'}`, cx + 6, y + 36);
      });
      y += infoCardH + 8;
    } else {
      gruposUnicos.forEach(l => {
        doc.setFillColor(...darkCard);
        doc.setDrawColor(...gold);
        doc.setLineWidth(0.5);
        doc.roundedRect(M, y, infoCardW, infoCardH, 4, 4, 'FD');
        doc.setFontSize(6.5);
        doc.setTextColor(...grey);
        doc.setFont('helvetica', 'bold');
        doc.text(`GRUPO ${l.grupo}`, M + 6, y + 7);
        doc.setFontSize(8.5);
        doc.setTextColor(...white);
        doc.setFont('helvetica', 'bold');
        doc.text(`Prazo restante: ${l.prazoRestante} meses`, M + 6, y + 14);
        doc.text(`Lance embutido máximo: ${l.lanceEmbutidoMax}%`, M + 6, y + 21);
        doc.text(`Taxa administrativa: ${formatarPercentual(l.taxaAdm)}   Fundo de reserva: ${formatarPercentual(l.fundoReserva)}`, M + 6, y + 28);
        doc.setFontSize(7);
        doc.setTextColor(...grey);
        doc.setFont('helvetica', 'normal');
        doc.text(`Reajuste: ${l.reajuste || '—'}   Mês: ${l.mesReajuste || '—'}`, M + 6, y + 36);
        y += infoCardH + 5;
      });
      y += 3;
    }

    if (incluirParcelaPosNoPDF) {
      const notaParcelaPosTexto = 'O cálculo da parcela pós contemplação foi feito considerando o valor total de lance pago, subtraído 1 mês, que corresponde à parcela inicial e dividido pelo prazo restante.';
      const notaParcelaPosLinhas = doc.splitTextToSize(notaParcelaPosTexto, W - 2 * M - 14);
      const memHSim2 = 8 + notaParcelaPosLinhas.length * 4.5;
      doc.setFillColor(...gold);
      doc.rect(M, y, 3, memHSim2, 'F');
      doc.setFontSize(8);
      doc.setTextColor(...grey);
      doc.setFont('helvetica', 'bold');
      doc.text('Parcela pós contemplação', M + 7, y + 6);
      doc.setFontSize(8);
      doc.setTextColor(...lightGrey);
      doc.setFont('helvetica', 'normal');
      notaParcelaPosLinhas.forEach((linha, i) => doc.text(linha, M + 7, y + 11 + i * 4.5));
      y += memHSim2 + 5;
    }

    if (linhasSim.some(l => l.redutor === 50)) {
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
    }

    const indicados = modalidade === 'imovel'
      ? ['• Construção gradual de patrimônio imobiliário', '• Diversificação em ativos reais', '• Planejamento de aquisições futuras', '• Estratégias familiares e sucessórias', '• Preservação de liquidez e rentabilidade dos investimentos']
      : ['• Planejamento de aquisições futuras', '• Preservação de liquidez e rentabilidade dos investimentos'];
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

    doc.setFillColor(22, 18, 0);
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.4);
    doc.roundedRect(M, y, W - 2 * M, 16, 4, 4, 'FD');
    doc.setFontSize(9);
    doc.setTextColor(...gold);
    doc.setFont('helvetica', 'bold');
    doc.text('Fale conosco para avaliarmos como este consórcio', W / 2, y + 6.5, { align: 'center' });
    doc.text('pode se integrar à sua estratégia patrimonial', W / 2, y + 12.5, { align: 'center' });
    y += 23;

    const legalY   = H - 28;
    const legalKey = modalidade === 'imovel' ? 'imovel' : 'automovel';
    if (y < legalY && OBSERVACOES_LEGAIS[legalKey]) {
      doc.setFontSize(6.5);
      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', 'normal');
      doc.text(doc.splitTextToSize(OBSERVACOES_LEGAIS[legalKey], W - 2 * M), M, legalY);
    }

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

    doc.save(`proposta-xp-${modalidade}-${Date.now()}.pdf`);
  };

  return (
    <div className="sim-container">

      {/* Toggle Modalidade */}
      <div className="sim-toggle-modalidade">
        <button
          className={`sim-toggle-btn ${modalidade === 'imovel' ? 'active' : ''}`}
          onClick={() => trocarModalidade('imovel')}
        >
          🏠 Imóvel
        </button>
        <button
          className={`sim-toggle-btn ${modalidade === 'auto' ? 'active' : ''}`}
          onClick={() => trocarModalidade('auto')}
        >
          🚗 Auto
        </button>
      </div>

      {/* Grupos ou Cotas */}
      {!grupoSelecionado ? (
        <div className="sim-grupos-grid-area">
          <p className="sim-titulo-secao">Escolha um grupo</p>
          {loadingGrupos ? (
            <div className="sim-loading">Carregando grupos...</div>
          ) : (
            <div className="sim-grupos-grid">
              {grupos.map(g => {
                const mediaVal = g.media_contemplacao != null
                  ? `${(parseFloat(g.media_contemplacao) * 100).toFixed(2).replace('.', ',')}%`
                  : null;
                const lanceMaxCont = g.lance_maximo_contemplado != null
                  ? `${parseFloat(g.lance_maximo_contemplado).toFixed(1).replace('.', ',').replace(/,0$/, '')}%`
                  : null;
                return (
                  <button
                    key={g.id}
                    className="sim-card-grupo"
                    onClick={() => setGrupoSelecionado(g)}
                  >
                    <div className="sim-card-grupo-numero">Grupo {g.numero_grupo}</div>
                    <div className="sim-card-grupo-info">
                      <span>Prazo restante: {g.prazo_restante} meses</span>
                      <span>Lance embutido máximo: {Math.round(parseFloat(g.lance_embutido_max) * 100)}%</span>
                    </div>
                    <div className={`sim-card-grupo-media${g.sem_media_contemplacao ? ' sem-media' : ''}`}>
                      {g.sem_media_contemplacao
                        ? (
                          <span>
                            Este grupo ainda não tem uma média de contemplação, observar mais detalhes na{' '}
                            <span
                              role="button"
                              style={{ textDecoration: 'underline', cursor: 'pointer' }}
                              onClick={e => { e.stopPropagation(); navigate('/grupos'); }}
                            >
                              aba de Métricas
                            </span>
                          </span>
                        )
                        : mediaVal
                          ? `Média contemplação: ${mediaVal}/mês`
                          : ''}
                    </div>
                    {lanceMaxCont && (
                      <div className="sim-card-grupo-lance-max-cont">
                        Lance máximo contemplado: {lanceMaxCont}
                      </div>
                    )}
                    {g.numero_grupo === 1053 && (
                      <div style={{ color: 'red', fontWeight: 'bold', marginTop: 4 }}>Vagas esgotadas</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="sim-cotas-area">
          <button className="sim-btn-voltar" onClick={() => setGrupoSelecionado(null)}>
            ← Grupos
          </button>

          <div className="sim-cotas-header">
            <h2 className="sim-cotas-titulo">Grupo {grupoSelecionado.numero_grupo}</h2>
            <div className="sim-cotas-meta">
              <span>Taxa adm: {formatarPercentual((comRedutor && grupoSelecionado.taxa_adm_redutor != null) ? parseFloat(grupoSelecionado.taxa_adm_redutor) : parseFloat(grupoSelecionado.taxa_adm))}</span>
              <span>Fundo reserva: {formatarPercentual(parseFloat(grupoSelecionado.fundo_reserva))}</span>
              <span>Reajuste: {grupoSelecionado.reajuste} / {grupoSelecionado.mes_reajuste}</span>
              <span>Lance embutido máximo: {Math.round(parseFloat(grupoSelecionado.lance_embutido_max) * 100)}%</span>
              <span>Prazo restante: {grupoSelecionado.prazo_restante} meses</span>
            </div>
          </div>

          {hasReducao && (
            <div className="sim-redutor-toggle">
              <button
                className={`sim-redutor-btn${!comRedutor ? ' active' : ''}`}
                onClick={() => setComRedutor(false)}
              >
                Sem Redutor
              </button>
              <button
                className={`sim-redutor-btn${comRedutor ? ' active' : ''}`}
                onClick={() => setComRedutor(true)}
              >
                Com Redutor 50%
              </button>
            </div>
          )}

          {loadingCotas ? (
            <div className="sim-loading">Carregando cotas...</div>
          ) : (
            <table className="sim-cotas-tabela">
              <thead>
                <tr>
                  <th>Crédito</th>
                  <th>Parcela</th>
                  <th>Qtde</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cotasFiltradas.map(cota => {
                  const key  = `${cota.bem_referencia}_${cota.redutor_parcela}`;
                  const qtde = qtdesCotas[key] || 1;
                  return (
                    <tr key={cota.id}>
                      <td>{formatarMoedaInteiro(parseFloat(cota.cota))}</td>
                      <td>{formatarMoeda(parseFloat(cota.parcela))}</td>
                      <td>
                        <input
                          type="number"
                          className="cr-input-celula"
                          min={1}
                          max={99}
                          value={qtde}
                          onChange={e => setQtdesCotas(prev => ({
                            ...prev,
                            [key]: Math.max(1, Math.min(99, Number(e.target.value)))
                          }))}
                        />
                      </td>
                      <td>
                        <button
                          className="sim-btn-add"
                          onClick={() => adicionarLinhaSim(cota, qtde)}
                        >
                          + Add
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Monte sua simulação */}
      <div className="sim-monte-container">
          <h3 className="sim-monte-titulo">Monte sua simulação</h3>
          <div className="cr-tabela-wrapper">
            <table className="cr-tabela-sim">
              <thead>
                <tr>
                  <th>Grupo</th>
                  <th>Qtde</th>
                  <th>Cota</th>
                  <th>Carta Total</th>
                  <th>Parcela Inicial</th>
                  <th>Redutor</th>
                  <th>Rec. Próprios</th>
                  <th>Lance Emb. %</th>
                  <th>Lance Total</th>
                  <th>Crédito Contemplado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {linhasSimCalc.map(l => (
                  <LinhaSimulacaoLanc
                    key={l.id}
                    linha={l}
                    onRemove={removerLinhaSim}
                    onUpdate={atualizarLinhaSim}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr className="cr-totais-row">
                  <td colSpan={2}><strong>Total</strong></td>
                  <td></td>
                  <td>{formatarMoeda(totaisSim.cartaTotal)}</td>
                  <td>{formatarMoeda(totaisSim.parcelaInicialSim)}</td>
                  <td></td>
                  <td>{formatarMoeda(totaisSim.recProprios)}</td>
                  <td></td>
                  <td>{formatarMoeda(totaisSim.lanceTotal)}</td>
                  <td>{formatarMoeda(totaisSim.creditoContemplado)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="sim-acoes-secundarias">
            <button className="sim-btn-zerar" onClick={() => setLinhasSim([])}>
              Zerar simulação
            </button>
          </div>

          <ResumoProposta simulacao={simulacaoDoTotais} />

          <label className="sim-checkbox-label">
            <input
              type="checkbox"
              checked={incluirParcelaPosNoPDF}
              onChange={e => setIncluirParcelaPosNoPDF(e.target.checked)}
            />
            Incluir parcela pós contemplação no PDF
          </label>

          <label className="sim-checkbox-label">
            Simular{' '}
            <input
              type="number"
              className="cr-input-celula"
              min={1}
              value={simParcelasX}
              onChange={e => setSimParcelasX(Math.max(1, Number(e.target.value)))}
              style={{ width: 52, display: 'inline-block', margin: '0 4px' }}
            />
            {' '}parcelas até a contemplação
          </label>

          <div className="sim-acoes">
            <button className="sim-btn-excel" onClick={gerarExcel}>
              Gerar Excel
            </button>
            <button className="sim-btn-pdf" onClick={() => setShowModalNomeSim(true)}>
              Gerar PDF
            </button>
          </div>
        </div>

      {/* Modal nome para PDF */}
      {showModalNomeSim && (
        <div className="sim-modal-overlay" onClick={() => setShowModalNomeSim(false)}>
          <div className="sim-modal" onClick={e => e.stopPropagation()}>
            <h3 className="sim-modal-titulo">Nome do cliente (opcional)</h3>
            <input
              type="text"
              className="sim-modal-input"
              placeholder="Ex: João Silva"
              value={nomeClienteInputSim}
              onChange={e => setNomeClienteInputSim(e.target.value)}
              onKeyDown={e => {
                if (e.key !== 'Enter') return;
                setShowModalNomeSim(false);
                gerarPDFSim(nomeClienteInputSim.trim() || null);
                setNomeClienteInputSim('');
              }}
              autoFocus
            />
            <div className="sim-modal-acoes">
              <button className="sim-modal-btn-cancelar" onClick={() => setShowModalNomeSim(false)}>
                Cancelar
              </button>
              <button
                className="sim-modal-btn-gerar"
                onClick={() => {
                  setShowModalNomeSim(false);
                  gerarPDFSim(nomeClienteInputSim.trim() || null);
                  setNomeClienteInputSim('');
                }}
              >
                Gerar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
