import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { gerarExcelSimulacao } from '../../business/excelExport';
import { formatarMoeda, formatarMoedaInteiro, formatarPercentual } from '../../business/calculos';
import { ResumoProposta } from './ResumoProposta';
import ComparativoFinanciamento from './ComparativoFinanciamento';
import EmbraconSimulador from './EmbraconSimulador';
import AdministradoraToggle from '../AdministradoraToggle';
import { useAuth } from '../../contexts/AuthContext';
import { OBSERVACOES_LEGAIS } from '../../data/grupos';
import './Simulador.css';

// Seguro prestamista (ao mês sobre o saldo devedor): taxa por modalidade.
const SEGURO_PRESTAMISTA = {
  imovel: { taxa: 0.0003863, label: '0,038630%' },
  auto:   { taxa: 0.00068,   label: '0,06800%' },
};


function LinhaSimulacaoLanc({ linha, onRemove, onUpdate }) {
  const cartaTotal         = linha.credito * linha.qtde;
  const parcelaInicial     = linha.parcelaInicialSim;
  const lanceEmb           = cartaTotal * ((Number(linha.lanceEmbutidoPercent) || 0) / 100);
  const recPropriosReais   = cartaTotal * ((Number(linha.recProprios) || 0) / 100);
  const lanceTotal         = recPropriosReais + lanceEmb;
  const creditoContemplado = Math.max(0, cartaTotal - lanceEmb);

  return (
    <tr>
      <td>
        {linha.grupo}
        {linha.media_estimada && (
          <span
            className="sim-mult-badge-estimada"
            title={`Média estimada com ${linha.meses_amostra} meses de dados`}
          >*</span>
        )}
      </td>
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
            value={linha.recProprios ?? ''}
            onChange={e => {
              const raw = e.target.value;
              onUpdate(linha.id, 'recProprios', raw === '' ? '' : Math.max(0, Number(raw)));
            }}
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
          value={linha.lanceEmbutidoPercent ?? ''}
          onChange={e => {
            const raw = e.target.value;
            onUpdate(linha.id, 'lanceEmbutidoPercent',
              raw === '' ? '' : Math.min(linha.lanceEmbutidoMax, Math.max(0, Number(raw)))
            );
          }}
        />
        <span className="cr-lance-emb-label">% · {formatarMoeda(lanceEmb)}</span>
      </td>
      <td>{formatarMoeda(lanceTotal)}</td>
      <td className="cr-credito-contemplado">{formatarMoeda(creditoContemplado)}</td>
      <td>
        <button type="button" className="cr-btn-remover" onClick={() => onRemove(linha.id)} title="Remover esta cota">×</button>
      </td>
    </tr>
  );
}

export default function Simulador() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [administradora, setAdministradora]       = useState('CNP'); // 'CNP' ou 'EMBRACON'
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
  const [modalAcaoSim, setModalAcaoSim]           = useState('pdf'); // 'pdf' | 'excel'
  const [nomeClienteInputSim, setNomeClienteInputSim] = useState('');
  const [incluirParcelaPosNoPDF, setIncluirParcelaPosNoPDF] = useState(true);
  const [simParcelasX, setSimParcelasX]                   = useState(18);
  const [incluirSeguro, setIncluirSeguro]                 = useState(false);
  const [showSeguroModal, setShowSeguroModal]             = useState(false);

  // Modo Multiplicador
  const [modoMultiplicador, setModoMultiplicador] = useState(false);
  const [multCredito, setMultCredito]             = useState('');
  const [multLoading, setMultLoading]             = useState(false);
  const [multResultado, setMultResultado]         = useState(null);
  const [multErro, setMultErro]                   = useState('');

  // Comparar com financiamento
  const [comparandoFin, setComparandoFin]         = useState(false);

  useEffect(() => {
    setLoadingGrupos(true);
    setGrupoSelecionado(null);
    setCotas([]);
    api.get(`/simulador/grupos?modalidade=${modalidade}`)
      .then(r => { console.log('grupos:', r.data); setGrupos(r.data); })
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
    setMultResultado(null);
    setMultErro('');
  };

  const montarPortfolio = async () => {
    const credito = parseFloat(String(multCredito).replace(',', '.'));
    if (!Number.isFinite(credito) || credito <= 0) {
      setMultErro('Informe um crédito desejado maior que zero.');
      return;
    }
    setMultErro('');
    setMultLoading(true);
    try {
      const { data } = await api.get('/simulador/multiplicador', {
        params: { modalidade, credito },
      });
      const novasLinhas = data.cesta.map(item => {
        const g = grupos.find(gr => Number(gr.numero_grupo) === Number(item.grupo)) || {};
        const redutorVal = item.com_redutor ? 50 : 0;
        const lanceEmbutidoMax = item.lance_embutido_max_pct;
        return {
          id:                   Date.now() + Math.random(),
          simKey: `mult_${item.grupo}_${redutorVal}_${Math.random()}`,
          grupo:                String(item.grupo),
          credito:              item.cota_unitaria,
          parcela:              item.parcela_unitaria,
          redutor:              redutorVal,
          lanceEmbutidoPercent: lanceEmbutidoMax,
          lanceEmbutidoMax,
          taxaAdm:              (redutorVal === 50 && g.taxa_adm_redutor != null)
                                  ? parseFloat(g.taxa_adm_redutor) : parseFloat(g.taxa_adm),
          fundoReserva:         parseFloat(g.fundo_reserva),
          prazoRestante:        parseInt(g.prazo_restante),
          reajuste:             g.reajuste,
          mesReajuste:          g.mes_reajuste,
          qtde:                 item.qtde_cotas,
          recProprios:          0,
          media_estimada:       item.media_estimada,
          meses_amostra:        item.meses_amostra,
        };
      });
      setLinhasSim(novasLinhas);
      setMultResultado(data);
    } catch (err) {
      setMultResultado(null);
      setMultErro(err?.response?.data?.error || 'Erro ao montar o portfólio.');
    } finally {
      setMultLoading(false);
    }
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
    const parcelaBase         = l.parcela  * l.qtde;
    const lanceEmb            = cartaTotal * ((Number(l.lanceEmbutidoPercent) || 0) / 100);
    const recPropriosReais    = cartaTotal * ((Number(l.recProprios) || 0) / 100);
    const lanceTotal          = recPropriosReais + lanceEmb;
    const creditoContemplado  = Math.max(0, cartaTotal - lanceEmb);
    const saldoDevedor        = cartaTotal * (1 + (l.taxaAdm || 0) + (l.fundoReserva || 0));
    const totalFundoReserva   = cartaTotal * (l.fundoReserva || 0);
    const totalTaxas          = saldoDevedor - cartaTotal;
    const prazoR = l.prazoRestante || 1;
    const parcelasPagas   = simParcelasX * parcelaBase;
    const prazoAtualizado = Math.max(1, prazoR - simParcelasX);

    // Saldo devedor restante na contemplação (base do seguro pós) e parcela pós base.
    let parcelaPosBase, saldoRestantePos;
    if (l.redutor === 50) {
      saldoRestantePos = Math.max(0, saldoDevedor - parcelasPagas - lanceTotal);
      parcelaPosBase   = saldoRestantePos / prazoAtualizado;
    } else if (lanceTotal === 0) {
      saldoRestantePos = Math.max(0, saldoDevedor - parcelasPagas);
      parcelaPosBase   = parcelaBase;
    } else {
      saldoRestantePos = Math.max(0, saldoDevedor - lanceTotal);
      parcelaPosBase   = saldoRestantePos / prazoAtualizado;
    }

    // Seguro prestamista (mensal) = saldo devedor × taxa da modalidade. A parcela
    // inicial usa o saldo cheio; a pós, o saldo restante na contemplação.
    const taxaSeguro = (SEGURO_PRESTAMISTA[modalidade] || SEGURO_PRESTAMISTA.imovel).taxa;
    const seguroInicial = saldoDevedor * taxaSeguro;
    const seguroPos     = saldoRestantePos * taxaSeguro;
    const parcelaInicialSim      = incluirSeguro ? parcelaBase   + seguroInicial : parcelaBase;
    const parcelaPosContemplacao = incluirSeguro ? parcelaPosBase + seguroPos    : parcelaPosBase;

    return { ...l, cartaTotal, parcelaInicialSim, parcelaBase, lanceEmb, lanceTotal, creditoContemplado,
             recPropriosReais, saldoDevedor, totalFundoReserva, totalTaxas,
             seguroInicial, seguroPos, parcelaPosContemplacao };
  }), [linhasSim, simParcelasX, incluirSeguro, modalidade]);

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

  // Base do consórcio para o comparativo com financiamento (null se nada montado)
  const consorcioBuilt = useMemo(() => {
    if (!linhasSimCalc.length) return null;
    const prazo = Math.max(...linhasSimCalc.map(l => l.prazoRestante || 1));
    return {
      creditoContratado: totaisSim.cartaTotal,
      parcela:           totaisSim.parcelaInicialSim,
      custoExtra:        totaisSim.totalTaxas,
      totalPago:         totaisSim.saldoDevedor,
      prazo,
      origem:            'simulacao',
    };
  }, [linhasSimCalc, totaisSim]);

  const gerarExcel = (nomeCliente) => {
    const projeto = modalidade === 'imovel' ? 'Projeto imóvel' : 'Projeto auto';
    const nomeLimpo = nomeCliente ? nomeCliente.replace(/[\\/:*?"<>|]/g, '').trim() : '';
    const nomeBase = nomeLimpo ? `${nomeLimpo} - ${projeto}` : projeto;
    gerarExcelSimulacao({
      rows: linhasSimCalc.map(l => ({
        grupo:                  l.grupo,
        taxaAdm:                l.taxaAdm,
        fundoReserva:           l.fundoReserva,
        prazo:                  l.prazoRestante,
        qtde:                   l.qtde,
        redutor:                l.redutor,
        cartaTotal:             l.cartaTotal,
        parcelaInicial:         l.parcelaInicialSim,
        parcelaPosContemplacao: l.parcelaPosContemplacao,
        recProprios:            l.recPropriosReais || 0,
        lanceEmbPerc:           Number(l.lanceEmbutidoPercent) || 0,
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
      nomeArquivo: `${nomeBase}.xlsx`,
      temReductor: linhasSimCalc.some(l => l.redutor === 50),
      temLance: linhasSimCalc.some(l => l.lanceTotal > 0),
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

    const modalLabel = modalidade === 'imovel' ? 'IMOBILIÁRIO' : 'AUTOMÓVEL';
    const dataHoje   = new Date().toLocaleDateString('pt-BR');
    const rodapeTxt  = `Wflow Assessoria de Investimentos Ltda  |  Consórcio XP - ${dataHoje}`;

    // Fundo escuro + cantos dourados (padrão da marca).
    const drawBg = () => {
      doc.setFillColor(...black);
      doc.rect(0, 0, W, H, 'F');
      doc.setFillColor(...gold);
      doc.lines([[-65, 0], [65, 65], [0, -65]], W, 0, [1, 1], 'F', true);
      doc.setFillColor(200, 155, 0);
      doc.lines([[-35, 0], [35, 35], [0, -35]], W, 0, [1, 1], 'F', true);
    };

    // ── Página 1: Capa ──────────────────────────────────────
    drawBg();
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...white);
    doc.setFontSize(54);
    doc.text('Consórcio', M, 150);
    doc.text('XP', M, 172);
    doc.setFontSize(11);
    doc.setTextColor(...gold);
    doc.text(`CONSÓRCIO ${modalLabel}`, M, 188);

    // ── Página 2: Bem-vindo ─────────────────────────────────
    doc.addPage();
    drawBg();
    doc.setFillColor(...gold);
    doc.rect(0, 95, W, 6, 'F');
    let wy = 122;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...white);
    doc.setFontSize(30);
    doc.text('Bem-vindo(a)', M, wy);
    wy += 14;
    if (nomeCliente) {
      doc.setFontSize(15);
      doc.setTextColor(...gold);
      doc.splitTextToSize(`${nomeCliente},`, W - 2 * M).forEach(l => { doc.text(l, M, wy); wy += 8; });
    }
    wy += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...lightGrey);
    [
      'Obrigado por nos escolher para fazer parte desse momento tão importante para você!',
      'Aqui está o PDF da cotação do seu plano de consórcio, que contém todas as informações sobre o produto que você pretende adquirir. Solicitamos sua confirmação dos detalhes mencionados neste documento com seu assessor(a).',
      'Fique à vontade de tirar as suas dúvidas conosco sempre que precisar!',
    ].forEach(p => {
      doc.splitTextToSize(p, W - 2 * M).forEach(l => { doc.text(l, M, wy); wy += 6; });
      wy += 5;
    });
    wy += 8;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...white);
    doc.text(user?.nome || '', M, wy); wy += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grey);
    doc.text(user?.email || '', M, wy);

    // ── Página 3: Dados da simulação (formato atual, sem cabeçalho) ──
    doc.addPage();
    drawBg();
    y = M + 4;

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

    // Cards de informações por grupo.
    // Vários grupos: um único quadro com as MÉDIAS dos grupos usados.
    // Um grupo: quadro detalhado do grupo (como antes).
    const gruposUnicos = [...new Map(linhasSim.map(l => [l.grupo, l])).values()];
    const nGrupos = gruposUnicos.length;
    const infoCardH = 40;
    const infoCardW = W - 2 * M;

    doc.setFillColor(...darkCard);
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.5);
    doc.roundedRect(M, y, infoCardW, infoCardH, 4, 4, 'FD');

    if (nGrupos > 1) {
      const media = arr => arr.reduce((s, v) => s + v, 0) / arr.length;
      const prazoMedio = Math.round(media(gruposUnicos.map(l => l.prazoRestante || 0)));
      const lanceMedio = Math.round(media(gruposUnicos.map(l => l.lanceEmbutidoMax || 0)));
      const taxaMedia  = media(gruposUnicos.map(l => l.taxaAdm || 0));
      const fundoMedio = media(gruposUnicos.map(l => l.fundoReserva || 0));
      doc.setFontSize(6.5);
      doc.setTextColor(...grey);
      doc.setFont('helvetica', 'bold');
      doc.text(`MÉDIA DE ${nGrupos} GRUPOS`, M + 6, y + 7);
      doc.setFontSize(8.5);
      doc.setTextColor(...white);
      doc.setFont('helvetica', 'bold');
      doc.text(`Prazo restante médio: ${prazoMedio} meses`, M + 6, y + 14);
      doc.text(`Lance embutido máximo médio: ${lanceMedio}%`, M + 6, y + 21);
      doc.text(`Taxa administrativa média: ${formatarPercentual(taxaMedia)}   Fundo de reserva médio: ${formatarPercentual(fundoMedio)}`, M + 6, y + 28);
      doc.setFontSize(7);
      doc.setTextColor(...grey);
      doc.setFont('helvetica', 'normal');
      doc.text('Os valores demonstrados são as somas e/ou as médias de todos os grupos.', M + 6, y + 36);
    } else {
      const l = gruposUnicos[0];
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
    }
    y += infoCardH + 8;

    const gruposComAviso = [1035, 1036, 1037, 1038, 1039, 1040, 1041, 1042];
    const temGrupoComAviso = linhasSim.some(l => gruposComAviso.includes(Number(l.grupo)));

    if (incluirParcelaPosNoPDF && temGrupoComAviso) {
      const notaParcelaPosTexto = `A parcela pós contemplação foi calculada considerando ${simParcelasX} meses de parcelas iniciais pagas e o valor de lance máximo para a próxima assembleia. A contemplação sendo antes ou depois causará alterações no valor calculado. O lance máximo diminui 0,5 a cada mês.`;
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

    if (incluirSeguro) {
      const taxaSeguroLabel = (SEGURO_PRESTAMISTA[modalidade] || SEGURO_PRESTAMISTA.imovel).label;
      const notaSeguroTexto = `Incluso seguro prestamista nessa simulação. O cálculo é de ${taxaSeguroLabel} sobre o saldo devedor.`;
      doc.setFontSize(8);
      const notaSeguroLinhas = doc.splitTextToSize(notaSeguroTexto, W - 2 * M - 8);
      const notaSeguroBarH = Math.max(13, 4 + notaSeguroLinhas.length * 4);
      doc.setFillColor(...gold);
      doc.rect(M, y, 3, notaSeguroBarH, 'F');
      doc.setTextColor(...lightGrey);
      doc.setFont('helvetica', 'normal');
      notaSeguroLinhas.forEach((linha, i) => doc.text(linha, M + 7, y + 5.5 + i * 4));
      y += notaSeguroBarH + 5;
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
      ? ['• Construção gradual de patrimônio imobiliário', '• Planejamento de aquisições futuras', '• Estratégias familiares e sucessórias', '• Preservação de liquidez e rentabilidade dos investimentos']
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
    // Validade = penúltimo dia útil do mês corrente
    const dataValidade = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    let diasUteis = 0;
    while (true) {
      const dow = dataValidade.getDay();
      if (dow !== 0 && dow !== 6) { diasUteis++; if (diasUteis === 2) break; }
      dataValidade.setDate(dataValidade.getDate() - 1);
    }
    doc.setFontSize(8);
    doc.setTextColor(...grey);
    doc.setFont('helvetica', 'normal');
    doc.text(`Oferta válida até ${dataValidade.toLocaleDateString('pt-BR')}`, W - M, H - 6, { align: 'right' });

    // ── Glossário (termos até "Sorteio") ────────────────────
    const termosGlossario = [
      ['Consórcio', ['O consórcio é uma excelente opção para quem deseja realizar um sonho, mas não tem o valor total disponível de imediato. Ao entrar em um consórcio, você se compromete a contribuir mensalmente, o que torna seu planejamento financeiro mais acessível, sem a necessidade de comprometer os recursos investidos na aquisição de um bem.']],
      ['Parcela Reduzida ou Redutor', ['Uma parcela reduzida de consórcio é um valor menor que o habitual, geralmente é apresentado como um percentual de redução (redutor), que o consorciado paga até sua carta de crédito ser contemplada. Após a contemplação, o valor da redução é diluído nas parcelas restantes.']],
      ['Seguro Prestamista', ['O seguro prestamista tem a função de cobrir o saldo devedor da cota de consórcio em caso de morte, invalidez total ou permanente por acidente ou por doença do consorciado. Não é obrigatório e em caso de contratação, será cobrado a partir da 2ª parcela. A contratação é destinada a pessoas físicas, desde que a idade do consorciado, somado ao prazo da cota, seja menor que 80 anos.']],
      ['Lance', [
        'O lance é uma ferramenta importante para quem deseja acelerar a contemplação do seu consórcio. Para isso, é possível ofertar lance livre, lance fixo ou lance embutido.',
        'Lance Fixo: A administradora estabelece um percentual mínimo para o lance, e todos que atingem ou superam esse valor participam de um sorteio para definir quem será contemplado.',
        'Lance Livre: O consorciado oferece o valor que deseja, e o maior lance ganha a contemplação.',
        'Lance Embutido: O consorciado usa parte da carta de crédito como lance, possibilitando conseguir a contemplação com mais facilidade.',
      ]],
      ['Assembleia', ['A assembleia geral ordinária se destina à contemplação e à prestação de contas de tudo o que ocorreu no grupo durante o período (valores arrecadados, rendimento de aplicações financeiras, número de consorciados já contemplados e a contemplar, dentre outras informações). Ela é realizada em dia, hora e local previamente estabelecidos pela administradora de consórcio, conforme o calendário fornecido pela empresa aos participantes do grupo.']],
      ['Sorteio', ['O sorteio representa a essência do consórcio, uma vez que todo consorciado em dia com o pagamento de suas parcelas concorre em absoluta igualdade de condições, assim como o consorciado excluído. A dinâmica dos sorteios fica a critério da administradora e deve ser estabelecida em contrato.']],
    ];

    const colTermW = 42;
    const colDescX = M + colTermW + 4;
    const colDescW = W - colDescX - M;
    const tituloGlossario = () => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...white);
      doc.setFontSize(26);
      doc.text('Glossário', M, M + 14);
      doc.setFontSize(7);
      doc.setTextColor(...grey);
      doc.setFont('helvetica', 'normal');
      doc.text(rodapeTxt, W - M, H - 8, { align: 'right' });
    };

    doc.addPage();
    drawBg();
    tituloGlossario();
    let gy = M + 26;
    termosGlossario.forEach(([termo, paras]) => {
      const termoLinhas = doc.splitTextToSize(termo, colTermW);
      const descLinhas  = [];
      paras.forEach((p, i) => {
        if (i > 0) descLinhas.push('');
        descLinhas.push(...doc.splitTextToSize(p, colDescW));
      });
      const blocoH = Math.max(termoLinhas.length, descLinhas.length) * 4.6 + 7;
      if (gy + blocoH > H - 18) {
        doc.addPage();
        drawBg();
        tituloGlossario();
        gy = M + 26;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...gold);
      termoLinhas.forEach((l, i) => doc.text(l, M, gy + 4 + i * 4.6));
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...lightGrey);
      descLinhas.forEach((l, i) => doc.text(l, colDescX, gy + 4 + i * 4.6));
      gy += blocoH;
    });

    const projetoPDF = modalidade === 'imovel' ? 'Projeto imóvel' : 'Projeto auto';
    const nomeLimpoPDF = nomeCliente ? nomeCliente.replace(/[\\/:*?"<>|]/g, '').trim() : '';
    const nomeArquivoPDF = nomeLimpoPDF ? `${nomeLimpoPDF} - ${projetoPDF}` : projetoPDF;
    doc.save(`${nomeArquivoPDF}.pdf`);
  };

  if (administradora === 'EMBRACON') {
    return (
      <div className="sim-container">
        {/* Toggle Administradora */}
        <AdministradoraToggle value={administradora} onChange={setAdministradora} />

        <EmbraconSimulador />
      </div>
    );
  }

  return (
    <div className="sim-container">

      {/* Toggle Administradora */}
      <AdministradoraToggle value={administradora} onChange={setAdministradora} />

      {/* Toggle Modalidade */}
      <div className="sim-toggle-modalidade">
        <button
          className={`sim-toggle-btn ${modalidade === 'imovel' ? 'active' : ''}`}
          onClick={() => trocarModalidade('imovel')}
        > Imóvel
        </button>
        <button
          className={`sim-toggle-btn ${modalidade === 'auto' ? 'active' : ''}`}
          onClick={() => trocarModalidade('auto')}
        > Auto
        </button>
      </div>

      {/* Grupos ou Cotas — sempre visíveis para permitir adicionar cotas manualmente */}
      {(!grupoSelecionado ? (
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
                      <span style={{ color: '#ffffff' }}>Lance último mês: {g.lance_ultimo_mes}%</span>
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
                    {g.lance_ultimo_mes && (
                      <span>Lance último mês: {parseFloat(g.lance_ultimo_mes).toFixed(2).replace('.', ',')}%</span>
                    )}
                    {g.numero_grupo === 1053 && (
                      <div style={{ color: 'red', fontWeight: 'bold', marginTop: 4 }}>Vagas esgotadas</div>
                    )}
                    {['1035','1038','1042','1043','1044','1051','1054','1055'].includes(String(g.numero_grupo)) && modalidade === 'imovel' && (
                      <span style={{ color: '#2d6a2d', fontSize: '11px', fontWeight: 500, display: 'block', marginTop: '6px' }}>
                        Campanha vigente julho
                      </span>
                    )}
                    {['2130','3002'].includes(String(g.numero_grupo)) && modalidade === 'auto' && (
                      <span style={{ color: '#2d6a2d', fontSize: '11px', fontWeight: 500, display: 'block', marginTop: '6px' }}>
                        Campanha vigente julho
                      </span>
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
      ))}

      {/* Painel do Modo Multiplicador — logo abaixo dos cards e acima de "Monte sua simulação" */}
      {modoMultiplicador && (
        <div className="sim-mult-painel">
          <h3 className="sim-mult-titulo">Modo Multiplicador</h3>

          <div className="sim-mult-campo">
            <label className="sim-mult-label">Crédito desejado</label>
            <div className="sim-mult-input-wrapper">
              <input
                type="number"
                className="sim-mult-input-credito"
                min={0}
                placeholder="0"
                value={multCredito}
                onChange={e => setMultCredito(e.target.value)}
              />
              <span className="sim-mult-input-sufixo">R$</span>
            </div>
          </div>

          <button
            className="sim-mult-btn-montar"
            onClick={montarPortfolio}
            disabled={multLoading}
          >
            {multLoading ? 'Montando...' : 'Montar portfólio'}
          </button>

          {multErro && <p className="sim-mult-erro">{multErro}</p>}

          {multResultado && (
            <div className="sim-mult-resumo cr-resumo-grid">
              <div className="cr-resumo-item">
                <span className="cr-resumo-label">Crédito líquido total</span>
                <span className="cr-resumo-valor cr-verde">{formatarMoeda(multResultado.credito_liquido_total)}</span>
              </div>
              <div className="cr-resumo-item">
                <span className="cr-resumo-label">Crédito contratado total</span>
                <span className="cr-resumo-valor">{formatarMoeda(multResultado.credito_contratado_total)}</span>
              </div>
              <div className="cr-resumo-item">
                <span className="cr-resumo-label">Parcela total</span>
                <span className="cr-resumo-valor">{formatarMoeda(multResultado.parcela_total)}</span>
              </div>
              <div className="cr-resumo-item">
                <span className="cr-resumo-label">Tempo do portfólio</span>
                <span className="cr-resumo-valor cr-ouro">
                  {multResultado.tempo_esperado_meses.toFixed(1).replace('.', ',')} meses
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Monte sua simulação */}
      <div className="sim-monte-container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 className="sim-monte-titulo" style={{ marginBottom: 0 }}>Monte sua simulação</h3>
            <button
              className="sim-toggle-mult-btn"
              onClick={() => setModoMultiplicador(v => !v)}
            >
              {modoMultiplicador ? 'Modo Manual' : 'Modo Multiplicador'}
            </button>
          </div>
          <div className="cr-tabela-wrapper">
            <table className="cr-tabela-sim">
              <thead>
                <tr>
                  <th>Grupo</th>
                  <th>Qtde</th>
                  <th>Cota</th>
                  <th>Carta Total</th>
                  <th>Parcela Inicial{incluirSeguro ? ' (c/ seguro)' : ''}</th>
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

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', color: 'var(--text-secondary)', whiteSpace: 'nowrap', marginTop: '12px', marginBottom: incluirSeguro ? '4px' : '0' }}>
            <input
              type="checkbox"
              checked={incluirSeguro}
              onChange={e => { setIncluirSeguro(e.target.checked); if (e.target.checked) setShowSeguroModal(true); }}
              style={{ margin: 0, padding: 0, flexShrink: 0, width: '14px', height: '14px' }}
            />
            Incluir seguro prestamista ({(SEGURO_PRESTAMISTA[modalidade] || SEGURO_PRESTAMISTA.imovel).label} sobre o saldo devedor)
          </label>
          {incluirSeguro && (
            <a
              href="/condicoes-gerais-seguro-prestamista.pdf"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-block', fontSize: '12px', color: 'var(--cor-destaque)', textDecoration: 'underline', cursor: 'pointer' }}
            >
              Condições gerais do seguro prestamista (PDF)
            </a>
          )}

          <div className="sim-acoes-secundarias">
            <button className="sim-btn-zerar" onClick={() => setLinhasSim([])}>
              Zerar simulação
            </button>
          </div>

          {comparandoFin && (
            <ComparativoFinanciamento
              modalidade={modalidade}
              consorcioBuilt={consorcioBuilt}
              grupos={grupos}
            />
          )}

          <ResumoProposta simulacao={simulacaoDoTotais} />

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            <input
              type="checkbox"
              checked={incluirParcelaPosNoPDF}
              onChange={e => setIncluirParcelaPosNoPDF(e.target.checked)}
              style={{ margin: 0, padding: 0, flexShrink: 0, width: '14px', height: '14px' }}
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
            <button className="sim-btn-excel" onClick={() => { setModalAcaoSim('excel'); setShowModalNomeSim(true); }}>
              Gerar Excel
            </button>
            <button className="sim-btn-pdf" onClick={() => { setModalAcaoSim('pdf'); setShowModalNomeSim(true); }}>
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
                const nome = nomeClienteInputSim.trim() || null;
                if (modalAcaoSim === 'excel') gerarExcel(nome);
                else gerarPDFSim(nome);
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
                  const nome = nomeClienteInputSim.trim() || null;
                  if (modalAcaoSim === 'excel') gerarExcel(nome);
                  else gerarPDFSim(nome);
                  setNomeClienteInputSim('');
                }}
              >
                {modalAcaoSim === 'excel' ? 'Gerar Excel' : 'Gerar PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Condições gerais do seguro prestamista */}
      {showSeguroModal && (
        <div className="sim-modal-overlay" onClick={() => setShowSeguroModal(false)}>
          <div className="sim-modal" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
            <button className="sim-modal-x" onClick={() => setShowSeguroModal(false)} aria-label="Fechar">×</button>
            <h3 className="sim-modal-titulo" style={{ paddingRight: '28px' }}>Segue as condições gerais do seguro prestamista</h3>
            <p style={{ fontSize: '13px', color: 'var(--texto-secundario)', margin: '0 0 18px', lineHeight: 1.5 }}>
              O documento com as condições gerais do seguro prestamista está disponível para download.
            </p>
            <div className="sim-modal-acoes">
              <a
                className="sim-modal-btn-gerar"
                href="/condicoes-gerais-seguro-prestamista.pdf"
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none', textAlign: 'center' }}
              >
                Baixar PDF
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
