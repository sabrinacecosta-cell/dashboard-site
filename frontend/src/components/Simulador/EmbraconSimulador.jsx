import React, { useState, useMemo, useEffect } from 'react';
import api from '../../services/api';
import { formatarMoeda, formatarMoedaInteiro } from '../../business/calculos';
import { gerarExcelSimulacao } from '../../business/excelExport';
import './Simulador.css';

// Taxa de adesão: 1,2% do crédito diluída nas 12 primeiras parcelas. Vale para o
// produto Embracon como um todo, não por grupo — por isso não vem do banco.
const TAXA_ADESAO = 0.012;
const MESES_ADESAO = 12;

// Passo do crédito dentro da faixa de cada grupo.
const PASSO_CREDITO = 10000;

// Converte a linha de simulador_grupos no formato usado pela tela. Colunas
// NUMERIC voltam do pg como string, daí o Number() em tudo. taxaAdm e
// fundoReserva podem ser null — grupo sem parâmetros ainda definidos.
function mapGrupo(row) {
  const num = (v) => (v == null ? null : Number(v));
  return {
    grupo:            row.numero_grupo,
    creditoMin:       num(row.credito_min),
    creditoMax:       num(row.credito_max),
    prazo:            row.prazo_restante,
    lanceContemplado: num(row.lance_contemplado_percent),
    taxaAdm:          num(row.taxa_adm),
    fundoReserva:     num(row.fundo_reserva),
    // lance_embutido_max é fração no banco (0.25); a tela trabalha em %.
    lanceEmbMax:      row.lance_embutido_max == null
      ? null
      : Math.round(Number(row.lance_embutido_max) * 100),
  };
}

// Um grupo só é simulável com taxa de adm, fundo de reserva, faixa e prazo.
const temParametros = (g) =>
  g.taxaAdm != null && g.fundoReserva != null &&
  g.creditoMin != null && g.creditoMax != null && g.prazo > 0;

// Formata % com 4 casas (ex.: 58.5984 → "58,5984%").
const fmtPct = (v) => `${Number(v).toFixed(4).replace('.', ',')}%`;

// Opções de crédito da faixa do grupo, de PASSO_CREDITO em PASSO_CREDITO,
// sempre incluindo o mínimo e o máximo.
function creditosDoGrupo(min, max) {
  const opts = [];
  for (let c = min; c < max; c += PASSO_CREDITO) opts.push(c);
  opts.push(max);
  return opts;
}

// Parcela do plano a partir do crédito e do prazo.
// total = crédito × (1 + adm + fundo); parcela base = total / prazo.
// A adesão (1,2% do crédito) é diluída nas 12 primeiras parcelas.
// Redutor de 50%: soma tudo (carta + taxas), aplica 50% e divide pelo prazo —
// equivale a dividir a parcela por 2 (as 12 primeiras, com adesão, também).
function calcularParcela(credito, prazo, taxaAdm, fundoReserva, comRedutor = false) {
  const fator = comRedutor ? 0.5 : 1;
  const totalPlano = credito * (1 + taxaAdm + fundoReserva);
  const parcelaBase = totalPlano / prazo;
  const adesaoMensal = (credito * TAXA_ADESAO) / MESES_ADESAO;
  return {
    totalPlano,
    parcelaBase: parcelaBase * fator,
    parcelaPrimeiras: (parcelaBase + adesaoMensal) * fator, // 1ª a 12ª
    parcelaDemais: parcelaBase * fator,                     // 13ª em diante
  };
}

let _uid = 0;

export default function EmbraconSimulador() {
  const [grupos, setGrupos] = useState([]);
  const [loadingGrupos, setLoadingGrupos] = useState(true);
  const [grupoSel, setGrupoSel] = useState(null); // objeto do grupo ou null (grid)
  const [credito, setCredito] = useState(null);
  const [qtde, setQtde] = useState(1);
  const [comRedutor, setComRedutor] = useState(false);
  const [linhas, setLinhas] = useState([]);
  const [simParcelas, setSimParcelas] = useState(18);
  const [showModalNome, setShowModalNome] = useState(false);
  const [nomeCliente, setNomeCliente] = useState('');

  useEffect(() => {
    setLoadingGrupos(true);
    api.get('/simulador/grupos?administradora=EMBRACON')
      .then(r => setGrupos(r.data.map(mapGrupo)))
      .catch(() => setGrupos([]))
      .finally(() => setLoadingGrupos(false));
  }, []);

  const selecionarGrupo = (g) => {
    setGrupoSel(g);
    setCredito(g.creditoMin);
    setQtde(1);
    setComRedutor(false);
  };

  const previa = useMemo(
    () => (grupoSel && credito && temParametros(grupoSel)
      ? calcularParcela(credito, grupoSel.prazo, grupoSel.taxaAdm, grupoSel.fundoReserva, comRedutor)
      : null),
    [grupoSel, credito, comRedutor]
  );

  const adicionar = () => {
    if (!grupoSel || !credito || !temParametros(grupoSel)) return;
    const p = calcularParcela(credito, grupoSel.prazo, grupoSel.taxaAdm, grupoSel.fundoReserva, comRedutor);
    const lanceMax = grupoSel.lanceEmbMax ?? 0;
    setLinhas(prev => [
      ...prev,
      {
        id: ++_uid,
        grupo: grupoSel.grupo,
        credito,
        prazo: grupoSel.prazo,
        taxaAdm: grupoSel.taxaAdm,
        fundoReserva: grupoSel.fundoReserva,
        qtde: Math.max(1, Number(qtde) || 1),
        comRedutor,
        lanceEmbMax: lanceMax,
        lanceEmbPercent: lanceMax, // inicia no máximo, editável
        ...p,
      },
    ]);
  };

  const remover = (id) => setLinhas(prev => prev.filter(l => l.id !== id));

  const atualizarLance = (id, valor) => {
    setLinhas(prev => prev.map(l => (
      l.id === id
        ? { ...l, lanceEmbPercent: Math.min(l.lanceEmbMax, Math.max(0, Number(valor) || 0)) }
        : l
    )));
  };

  const totais = useMemo(() => linhas.reduce(
    (acc, l) => {
      const cartaTotal = l.credito * l.qtde;
      const lanceEmb = cartaTotal * (l.lanceEmbPercent / 100);
      acc.cartaTotal += cartaTotal;
      acc.parcelaPrimeiras += l.parcelaPrimeiras * l.qtde;
      acc.parcelaDemais += l.parcelaDemais * l.qtde;
      acc.lanceEmb += lanceEmb;
      acc.creditoContemplado += cartaTotal - lanceEmb;
      return acc;
    },
    { cartaTotal: 0, parcelaPrimeiras: 0, parcelaDemais: 0, lanceEmb: 0, creditoContemplado: 0 }
  ), [linhas]);

  // Excel no mesmo formato do CNP. A função recalcula a parcela por
  // carta × (1 + taxaAdm + fundoReserva) / prazo (÷2 no redutor) — mesma base
  // da tela; a adesão das 12 primeiras não é representada no template do CNP.
  const gerarExcel = (nome) => {
    const nomeLimpo = nome ? nome.replace(/[\\/:*?"<>|]/g, '').trim() : '';
    const nomeBase = nomeLimpo ? `${nomeLimpo} - Consórcio Embracon` : 'Consórcio Embracon';
    gerarExcelSimulacao({
      rows: linhas.map(l => ({
        grupo:              l.grupo,
        taxaAdm:            l.taxaAdm,
        fundoReserva:       l.fundoReserva,
        prazo:              l.prazo,
        qtde:               l.qtde,
        redutor:            l.comRedutor ? 50 : 0,
        cartaTotal:         l.credito * l.qtde,
        recProprios:        0,
        lanceEmbPerc:       l.lanceEmbPercent,
        creditoContemplado: l.credito * l.qtde * (1 - l.lanceEmbPercent / 100),
      })),
      simularParcelas: simParcelas,
      nomeConsorcio: 'EMBRACON',
      nomeArquivo: `${nomeBase}.xlsx`,
      temReductor: linhas.some(l => l.comRedutor),
      temLance: linhas.some(l => l.lanceEmbPercent > 0),
    });
  };

  return (
    <>
      {/* Grade de grupos ou card do grupo selecionado */}
      {!grupoSel ? (
        <div className="sim-grupos-grid-area">
          <p className="sim-titulo-secao">Escolha um grupo</p>
          {loadingGrupos ? (
            <div className="sim-loading">Carregando grupos...</div>
          ) : grupos.length === 0 ? (
            <div className="sim-loading">Nenhum grupo Embracon disponível.</div>
          ) : (
            <div className="sim-grupos-grid">
              {grupos.map(g => (
                <button
                  key={g.grupo}
                  className="sim-card-grupo"
                  onClick={() => selecionarGrupo(g)}
                >
                  <div className="sim-card-grupo-numero">Grupo {g.grupo}</div>
                  <div className="sim-card-grupo-info">
                    {g.creditoMin != null && g.creditoMax != null && (
                      <span>Crédito: {formatarMoedaInteiro(g.creditoMin)} a {formatarMoedaInteiro(g.creditoMax)}</span>
                    )}
                    <span>Prazo restante: {g.prazo} meses</span>
                    {g.lanceEmbMax != null && <span>Lance embutido máximo: {g.lanceEmbMax}%</span>}
                    {g.lanceContemplado != null && (
                      <span>Lance contemplado: {fmtPct(g.lanceContemplado)}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="sim-cotas-area">
          <button className="sim-btn-voltar" onClick={() => setGrupoSel(null)}>
            ← Grupos
          </button>

          <div className="sim-cotas-header">
            <h2 className="sim-cotas-titulo">Grupo {grupoSel.grupo} — Embracon Imóvel</h2>
            <div className="sim-cotas-meta">
              {grupoSel.creditoMin != null && grupoSel.creditoMax != null && (
                <span>Crédito: {formatarMoedaInteiro(grupoSel.creditoMin)} a {formatarMoedaInteiro(grupoSel.creditoMax)}</span>
              )}
              <span>Prazo restante: {grupoSel.prazo} meses</span>
              {grupoSel.taxaAdm != null && <span>Taxa adm: {fmtPct(grupoSel.taxaAdm * 100)}</span>}
              {grupoSel.fundoReserva != null && <span>Fundo reserva: {fmtPct(grupoSel.fundoReserva * 100)}</span>}
              <span>Taxa de adesão: 1,2% (12 primeiras parcelas)</span>
              {grupoSel.lanceEmbMax != null && <span>Lance embutido máximo: {grupoSel.lanceEmbMax}%</span>}
              {grupoSel.lanceContemplado != null && (
                <span>Lance contemplado: {fmtPct(grupoSel.lanceContemplado)}</span>
              )}
            </div>
          </div>

          <h3 className="sim-monte-titulo">Crédito e parcelas</h3>

          {!temParametros(grupoSel) ? (
            <div className="sim-loading">Parâmetros pendentes</div>
          ) : (
          <>
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

          <div className="emb-form">
            <label className="emb-campo">
              <span className="emb-label">Crédito</span>
              <select
                className="emb-select"
                value={credito ?? ''}
                onChange={e => setCredito(Number(e.target.value))}
              >
                {creditosDoGrupo(grupoSel.creditoMin, grupoSel.creditoMax).map(c => (
                  <option key={c} value={c}>{formatarMoedaInteiro(c)}</option>
                ))}
              </select>
            </label>

            <label className="emb-campo">
              <span className="emb-label">Prazo</span>
              <input className="emb-select" value={`${grupoSel.prazo} meses`} disabled readOnly />
            </label>

            <label className="emb-campo">
              <span className="emb-label">Qtde</span>
              <input
                type="number"
                className="cr-input-celula"
                min={1}
                max={99}
                value={qtde}
                onChange={e => setQtde(Math.max(1, Math.min(99, Number(e.target.value))))}
              />
            </label>
          </div>

          {/* Prévia da cota selecionada */}
          {previa && (
            <div className="cr-resumo-grid" style={{ marginTop: 16 }}>
              <div className="cr-resumo-item">
                <span className="cr-resumo-label">Parcela (1ª à 12ª)</span>
                <span className="cr-resumo-valor cr-ouro">{formatarMoeda(previa.parcelaPrimeiras)}</span>
              </div>
              <div className="cr-resumo-item">
                <span className="cr-resumo-label">Parcela (13ª em diante)</span>
                <span className="cr-resumo-valor">{formatarMoeda(previa.parcelaDemais)}</span>
              </div>
              <div className="cr-resumo-item">
                <span className="cr-resumo-label">Total do plano</span>
                <span className="cr-resumo-valor">{formatarMoeda(previa.totalPlano)}</span>
              </div>
              <div className="cr-resumo-item">
                <span className="cr-resumo-label">Crédito contemplado (lance emb. {grupoSel.lanceEmbMax}%)</span>
                <span className="cr-resumo-valor cr-verde">{formatarMoeda(credito * (1 - grupoSel.lanceEmbMax / 100))}</span>
              </div>
            </div>
          )}

          <div className="sim-acoes" style={{ marginTop: 16 }}>
            <button className="sim-btn-add" onClick={adicionar}>+ Adicionar à simulação</button>
          </div>
          </>
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
                <th>Crédito</th>
                <th>Prazo</th>
                <th>Qtde</th>
                <th>Redutor</th>
                <th>Carta Total</th>
                <th>Parcela (1ª–12ª)</th>
                <th>Parcela (demais)</th>
                <th>Lance Emb. %</th>
                <th>Crédito Contemplado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {linhas.map(l => {
                const cartaTotal = l.credito * l.qtde;
                const lanceEmb = cartaTotal * (l.lanceEmbPercent / 100);
                const creditoContemplado = cartaTotal - lanceEmb;
                return (
                  <tr key={l.id}>
                    <td>{l.grupo}</td>
                    <td>{formatarMoedaInteiro(l.credito)}</td>
                    <td>{l.prazo} meses</td>
                    <td>{l.qtde}</td>
                    <td>{l.comRedutor ? '50%' : '0%'}</td>
                    <td>{formatarMoeda(cartaTotal)}</td>
                    <td>{formatarMoeda(l.parcelaPrimeiras * l.qtde)}</td>
                    <td>{formatarMoeda(l.parcelaDemais * l.qtde)}</td>
                    <td>
                      <input
                        type="number"
                        className="cr-input-celula cr-input-pct"
                        min={0}
                        max={l.lanceEmbMax}
                        value={l.lanceEmbPercent}
                        onChange={e => atualizarLance(l.id, e.target.value)}
                      />
                      <span className="cr-lance-emb-label">% · {formatarMoeda(lanceEmb)}</span>
                    </td>
                    <td className="cr-credito-contemplado">{formatarMoeda(creditoContemplado)}</td>
                    <td>
                      <button
                        type="button"
                        className="cr-btn-remover"
                        onClick={() => remover(l.id)}
                        title="Remover esta cota"
                      >×</button>
                    </td>
                  </tr>
                );
              })}
              {linhas.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '18px' }}>
                    Escolha um grupo, o crédito e clique em "Adicionar à simulação".
                  </td>
                </tr>
              )}
            </tbody>
            {linhas.length > 0 && (
              <tfoot>
                <tr className="cr-totais-row">
                  <td colSpan={5}><strong>Total</strong></td>
                  <td>{formatarMoeda(totais.cartaTotal)}</td>
                  <td>{formatarMoeda(totais.parcelaPrimeiras)}</td>
                  <td>{formatarMoeda(totais.parcelaDemais)}</td>
                  <td>{formatarMoeda(totais.lanceEmb)}</td>
                  <td>{formatarMoeda(totais.creditoContemplado)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="sim-acoes-secundarias">
          <button className="sim-btn-zerar" onClick={() => setLinhas([])}>
            Zerar simulação
          </button>
        </div>

        <label className="sim-checkbox-label">
          Simular{' '}
          <input
            type="number"
            className="cr-input-celula"
            min={1}
            value={simParcelas}
            onChange={e => setSimParcelas(Math.max(1, Number(e.target.value)))}
            style={{ width: 52, display: 'inline-block', margin: '0 4px' }}
          />
          {' '}parcelas até a contemplação
        </label>

        <div className="sim-acoes">
          <button
            className="sim-btn-excel"
            onClick={() => setShowModalNome(true)}
            disabled={linhas.length === 0}
          >
            Gerar Excel
          </button>
        </div>
      </div>

      {/* Modal nome para Excel */}
      {showModalNome && (
        <div className="sim-modal-overlay" onClick={() => setShowModalNome(false)}>
          <div className="sim-modal" onClick={e => e.stopPropagation()}>
            <h3 className="sim-modal-titulo">Nome do cliente (opcional)</h3>
            <input
              type="text"
              className="sim-modal-input"
              placeholder="Ex: João Silva"
              value={nomeCliente}
              onChange={e => setNomeCliente(e.target.value)}
              onKeyDown={e => {
                if (e.key !== 'Enter') return;
                setShowModalNome(false);
                gerarExcel(nomeCliente.trim() || null);
                setNomeCliente('');
              }}
              autoFocus
            />
            <div className="sim-modal-acoes">
              <button className="sim-modal-btn-cancelar" onClick={() => setShowModalNome(false)}>
                Cancelar
              </button>
              <button
                className="sim-modal-btn-gerar"
                onClick={() => {
                  setShowModalNome(false);
                  gerarExcel(nomeCliente.trim() || null);
                  setNomeCliente('');
                }}
              >
                Gerar Excel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
