import React, { useState, useMemo, useEffect } from 'react';
import api from '../../services/api';
import { formatarMoeda } from '../../business/calculos';

// Defaults de mercado por modalidade (apenas chutes editáveis)
const DEFAULTS = {
  imovel: { juros: 1.09, prazo: 360 },
  auto:   { juros: 1.79, prazo: 60 },
};

function num(v) {
  return parseFloat(String(v).replace(/\./g, '').replace(',', '.'));
}

// Soma das parcelas aplicando a correção anual do indexador.
// A parcela é reajustada a cada 12 meses pelo índice informado (% a.a.).
function totalParcelas(parcela, prazoMeses, indexAnualPct) {
  const g = (parseFloat(indexAnualPct) || 0) / 100;
  let total = 0;
  for (let m = 0; m < prazoMeses; m++) {
    total += parcela * Math.pow(1 + g, Math.floor(m / 12));
  }
  return total;
}

// Totais do consórcio a partir da cesta do multiplicador (mesma lógica:
// maior média de contemplação concentra cotas).
function consorcioDaCesta(cesta, grupos) {
  let creditoContratado = 0, parcela = 0, totalPago = 0, prazo = 0;
  for (const item of cesta) {
    const g = grupos.find(gr => Number(gr.numero_grupo) === Number(item.grupo)) || {};
    const cartaTotal = item.credito_contratado;
    const taxaAdm = (item.com_redutor && g.taxa_adm_redutor != null)
      ? parseFloat(g.taxa_adm_redutor) : parseFloat(g.taxa_adm || 0);
    const fundoReserva = parseFloat(g.fundo_reserva || 0);
    creditoContratado += cartaTotal;
    parcela           += item.parcela_total_grupo;
    totalPago         += cartaTotal * (1 + taxaAdm + fundoReserva);
    prazo = Math.max(prazo, parseInt(g.prazo_restante || 0));
  }
  return { creditoContratado, parcela, custoExtra: totalPago - creditoContratado,
           totalPago, prazo, origem: 'media' };
}

export default function ComparativoFinanciamento({ modalidade, consorcioBuilt, grupos }) {
  const def = DEFAULTS[modalidade] || DEFAULTS.imovel;

  const [valorFinanciado, setValorFinanciado] = useState('');
  const [entrada, setEntrada]                 = useState('');
  const [parcela, setParcela]                 = useState('');
  const [prazo, setPrazo]                     = useState(def.prazo);
  const [juros, setJuros]                     = useState(def.juros);
  const [indexador, setIndexador]             = useState('');

  const [consorcioFallback, setConsorcioFallback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro]       = useState('');

  useEffect(() => {
    setPrazo(def.prazo);
    setJuros(def.juros);
    setConsorcioFallback(null);
    setErro('');
  }, [modalidade]); // eslint-disable-line react-hooks/exhaustive-deps

  const consorcio = consorcioBuilt || consorcioFallback;

  // Sem simulação montada: estima o consórcio pelos melhores grupos,
  // usando como crédito o valor do bem (financiado + entrada).
  const montarConsorcioMedio = async () => {
    const credito = (num(valorFinanciado) || 0) + (num(entrada) || 0);
    if (!(credito > 0)) {
      setErro('Informe o valor financiado (e a entrada) para estimar o consórcio.');
      return;
    }
    setErro('');
    setLoading(true);
    try {
      const { data } = await api.get('/simulador/multiplicador', {
        params: { modalidade, credito },
      });
      setConsorcioFallback(consorcioDaCesta(data.cesta, grupos));
    } catch (err) {
      setConsorcioFallback(null);
      setErro(err?.response?.data?.error || 'Não foi possível estimar o consórcio para esse valor.');
    } finally {
      setLoading(false);
    }
  };

  const fin = useMemo(() => {
    const financiado = num(valorFinanciado) || 0;
    const ent = num(entrada) || 0;
    const p   = num(parcela) || 0;
    const n   = parseInt(prazo) || 0;
    if (!(p > 0) || n <= 0) return null;

    const bem        = financiado + ent;
    const somaParc   = totalParcelas(p, n, indexador);
    const totalPago  = ent + somaParc;
    const totalJuros = somaParc - financiado;
    const anos       = Math.ceil(n / 12);
    const parcelaFinal = p * Math.pow(1 + (parseFloat(indexador) || 0) / 100, Math.max(0, anos - 1));

    // Custo Efetivo Total: taxa de juros mensal capitalizada em base anual.
    const iMensal  = (parseFloat(juros) || 0) / 100;
    const cetAnual = iMensal > 0 ? (Math.pow(1 + iMensal, 12) - 1) * 100 : 0;

    return { bem, entrada: ent, financiado, parcela: p, parcelaFinal,
             somaParc, totalPago, totalJuros, cetAnual, n };
  }, [valorFinanciado, entrada, parcela, prazo, juros, indexador]);

  const economia    = (consorcio && fin) ? fin.totalPago - consorcio.totalPago : 0;
  const economiaPct = (consorcio && fin && fin.totalPago > 0) ? (economia / fin.totalPago) * 100 : 0;
  const difParcela  = (consorcio && fin) ? fin.parcela - consorcio.parcela : 0;
  const temCorrecao = (parseFloat(indexador) || 0) > 0;

  return (
    <div className="sim-fin-painel">
      <h3 className="sim-mult-titulo">Comparar com financiamento</h3>

      <div className="sim-fin-inputs">
        <Campo label="Valor total financiado" sufixo="R$">
          <input type="number" className="sim-fin-input" min={0} placeholder="0"
            value={valorFinanciado}
            onChange={e => { setValorFinanciado(e.target.value); if (!consorcioBuilt) setConsorcioFallback(null); }} />
        </Campo>

        <Campo label="Entrada paga" sufixo="R$">
          <input type="number" className="sim-fin-input" min={0} placeholder="0"
            value={entrada}
            onChange={e => { setEntrada(e.target.value); if (!consorcioBuilt) setConsorcioFallback(null); }} />
        </Campo>

        <Campo label="Valor da parcela" sufixo="R$">
          <input type="number" className="sim-fin-input" min={0} placeholder="0"
            value={parcela} onChange={e => setParcela(e.target.value)} />
        </Campo>

        <Campo label="Prazo" sufixo="meses">
          <input type="number" className="sim-fin-input sim-fin-input-sm" min={1}
            value={prazo} onChange={e => setPrazo(e.target.value)} />
        </Campo>

        <Campo label="Taxa de juros" sufixo="% a.m.">
          <input type="number" className="sim-fin-input sim-fin-input-sm" min={0} step="0.01"
            value={juros} onChange={e => setJuros(e.target.value)} />
        </Campo>

        <Campo label="Correção anual das parcelas" sufixo="% a.a.">
          <input type="number" className="sim-fin-input sim-fin-input-sm" min={0} step="0.01" placeholder="0"
            value={indexador} onChange={e => setIndexador(e.target.value)} />
        </Campo>
      </div>

      {!consorcioBuilt && (
        <button className="sim-mult-btn-montar" onClick={montarConsorcioMedio} disabled={loading}>
          {loading ? 'Estimando...' : 'Estimar consórcio e comparar'}
        </button>
      )}

      {erro && <p className="sim-mult-erro">{erro}</p>}

      {consorcio && fin && (
        <>
          {consorcio.origem === 'media' && (
            <p className="sim-fin-origem">
              Consórcio estimado pelos grupos de melhor contemplação (mesma lógica do Multiplicador).
            </p>
          )}

          <div className="sim-fin-comparativo">
            <div className="sim-fin-coluna sim-fin-consorcio">
              <h4 className="sim-fin-coluna-titulo">Consórcio</h4>
              <Linha label="Parcela" valor={formatarMoeda(consorcio.parcela)} />
              <Linha label="Custo extra (taxa adm. + fundo)" valor={formatarMoeda(consorcio.custoExtra)} />
              <Linha label="Total pago" valor={formatarMoeda(consorcio.totalPago)} destaque />
              <Linha label="Prazo" valor={`${consorcio.prazo} meses`} />
            </div>

            <div className="sim-fin-coluna sim-fin-financiamento">
              <h4 className="sim-fin-coluna-titulo">Financiamento</h4>
              <Linha label="Parcela"
                valor={temCorrecao
                  ? `${formatarMoeda(fin.parcela)} → ${formatarMoeda(fin.parcelaFinal)}`
                  : formatarMoeda(fin.parcela)} />
              <Linha label="Total de juros" valor={formatarMoeda(fin.totalJuros)} />
              {fin.cetAnual > 0 && (
                <Linha label="Custo Efetivo Total (CET)"
                  valor={`${fin.cetAnual.toFixed(2).replace('.', ',')}% a.a.`} />
              )}
              <Linha label="Total pago" valor={formatarMoeda(fin.totalPago)} destaque />
              <Linha label="Prazo" valor={`${fin.n} meses`} />
            </div>
          </div>

          <div className="sim-fin-economia">
            {economia >= 0 ? (
              <>
                <span className="sim-fin-economia-label">No consórcio você economiza</span>
                <span className="sim-fin-economia-valor">
                  {formatarMoeda(economia)}
                  <small> ({economiaPct.toFixed(0)}% a menos)</small>
                </span>
                {difParcela > 0 && (
                  <span className="sim-fin-economia-sub">
                    Parcela {formatarMoeda(Math.abs(difParcela))} menor que a do financiamento
                  </span>
                )}
              </>
            ) : (
              <span className="sim-fin-economia-label">
                Neste cenário o financiamento sai {formatarMoeda(Math.abs(economia))} mais barato.
              </span>
            )}
          </div>

          <p className="sim-fin-nota">
            Comparação em valores nominais com os dados informados da proposta do banco. O
            consórcio não cobra juros (apenas taxa de administração e fundo de reserva), mas
            depende do prazo de contemplação e o crédito é reajustado pelo índice do grupo. O
            financiamento entrega o bem na hora.
          </p>
        </>
      )}
    </div>
  );
}

function Campo({ label, sufixo, children }) {
  return (
    <div className="sim-fin-campo">
      <label className="sim-mult-label">{label}</label>
      <div className="sim-mult-input-wrapper">
        {children}
        <span className="sim-mult-input-sufixo">{sufixo}</span>
      </div>
    </div>
  );
}

function Linha({ label, valor, destaque }) {
  return (
    <div className="sim-fin-linha">
      <span className="sim-fin-linha-label">{label}</span>
      <span className={`sim-fin-linha-valor ${destaque ? 'destaque' : ''}`}>{valor}</span>
    </div>
  );
}
