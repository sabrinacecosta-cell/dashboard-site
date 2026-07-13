import React, { useState, useMemo } from 'react';
import { formatarMoeda, formatarMoedaInteiro } from '../../business/calculos';

// ── Termos do produto Embracon (imóvel) ─────────────────────────────────────
// Fornecidos pela equipe: taxa administrativa 19%, fundo de reserva 2% e taxa
// de adesão 1% diluída nas 12 primeiras parcelas.
const TAXA_ADM = 0.19;
const FUNDO_RESERVA = 0.02;
const TAXA_ADESAO = 0.01;
const MESES_ADESAO = 12;

// Créditos de 250 mil até 2,2 mi, de 50 mil em 50 mil.
const CREDITOS = [];
for (let c = 250000; c <= 2200000; c += 50000) CREDITOS.push(c);

// Prazos disponíveis (meses), em ordem crescente.
const PRAZOS = [96, 100, 102, 104, 105, 106, 108, 109];

// Lance embutido máximo (% da carta) — Embracon.
const LANCE_EMB_MAX = 25;

// Parcela do plano a partir do crédito e do prazo.
// total = crédito × (1 + adm + fundo); parcela base = total / prazo.
// A adesão (1% do crédito) é diluída nas 12 primeiras parcelas.
function calcularParcela(credito, prazo) {
  const totalPlano = credito * (1 + TAXA_ADM + FUNDO_RESERVA);
  const parcelaBase = totalPlano / prazo;
  const adesaoMensal = (credito * TAXA_ADESAO) / MESES_ADESAO;
  return {
    totalPlano,
    parcelaBase,
    parcelaPrimeiras: parcelaBase + adesaoMensal, // 1ª a 12ª
    parcelaDemais: parcelaBase,                   // 13ª em diante
  };
}

let _uid = 0;

export default function EmbraconSimulador() {
  const [credito, setCredito] = useState(CREDITOS[0]);
  const [prazo, setPrazo] = useState(PRAZOS[0]);
  const [qtde, setQtde] = useState(1);
  const [linhas, setLinhas] = useState([]);

  const previa = useMemo(() => calcularParcela(credito, prazo), [credito, prazo]);

  const adicionar = () => {
    const p = calcularParcela(credito, prazo);
    setLinhas(prev => [
      ...prev,
      {
        id: ++_uid,
        credito,
        prazo,
        qtde: Math.max(1, Number(qtde) || 1),
        lanceEmbPercent: LANCE_EMB_MAX, // inicia no máximo, editável
        ...p,
      },
    ]);
  };

  const remover = (id) => setLinhas(prev => prev.filter(l => l.id !== id));

  const atualizarLance = (id, valor) => {
    const pct = Math.min(LANCE_EMB_MAX, Math.max(0, Number(valor) || 0));
    setLinhas(prev => prev.map(l => (l.id === id ? { ...l, lanceEmbPercent: pct } : l)));
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

  return (
    <>
      {/* Card de opções da Embracon */}
      <div className="sim-cotas-area">
        <div className="sim-cotas-header">
          <h2 className="sim-cotas-titulo">Embracon — Imóvel</h2>
          <div className="sim-cotas-meta">
            <span>Taxa adm: 19%</span>
            <span>Fundo reserva: 2%</span>
            <span>Taxa de adesão: 1% (12 primeiras parcelas)</span>
            <span>Lance embutido máximo: 25%</span>
          </div>
        </div>

        <div className="emb-form">
          <label className="emb-campo">
            <span className="emb-label">Crédito</span>
            <select
              className="emb-select"
              value={credito}
              onChange={e => setCredito(Number(e.target.value))}
            >
              {CREDITOS.map(c => (
                <option key={c} value={c}>{formatarMoedaInteiro(c)}</option>
              ))}
            </select>
          </label>

          <label className="emb-campo">
            <span className="emb-label">Prazo</span>
            <select
              className="emb-select"
              value={prazo}
              onChange={e => setPrazo(Number(e.target.value))}
            >
              {PRAZOS.map(p => (
                <option key={p} value={p}>{p} meses</option>
              ))}
            </select>
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
            <span className="cr-resumo-label">Crédito contemplado (lance emb. 25%)</span>
            <span className="cr-resumo-valor cr-verde">{formatarMoeda(credito * (1 - LANCE_EMB_MAX / 100))}</span>
          </div>
        </div>

        <div className="sim-acoes" style={{ marginTop: 16 }}>
          <button className="sim-btn-add" onClick={adicionar}>+ Adicionar à simulação</button>
        </div>
      </div>

      {/* Monte sua simulação */}
      <div className="sim-monte-container">
        <h3 className="sim-monte-titulo">Monte sua simulação</h3>
        <div className="cr-tabela-wrapper">
          <table className="cr-tabela-sim">
            <thead>
              <tr>
                <th>Crédito</th>
                <th>Prazo</th>
                <th>Qtde</th>
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
                    <td>{formatarMoedaInteiro(l.credito)}</td>
                    <td>{l.prazo} meses</td>
                    <td>{l.qtde}</td>
                    <td>{formatarMoeda(cartaTotal)}</td>
                    <td>{formatarMoeda(l.parcelaPrimeiras * l.qtde)}</td>
                    <td>{formatarMoeda(l.parcelaDemais * l.qtde)}</td>
                    <td>
                      <input
                        type="number"
                        className="cr-input-celula cr-input-pct"
                        min={0}
                        max={LANCE_EMB_MAX}
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
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '18px' }}>
                    Escolha crédito e prazo acima e clique em "Adicionar à simulação".
                  </td>
                </tr>
              )}
            </tbody>
            {linhas.length > 0 && (
              <tfoot>
                <tr className="cr-totais-row">
                  <td colSpan={3}><strong>Total</strong></td>
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
      </div>
    </>
  );
}
