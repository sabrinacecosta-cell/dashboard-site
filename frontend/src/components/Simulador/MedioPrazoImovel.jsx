import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { GRUPOS_MEDIO_PRAZO, OBSERVACOES_LEGAIS } from '../../data/grupos';
import { formatarMoeda, formatarMoedaInteiro } from '../../business/calculos';

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
  const [grupoAtivo, setGrupoAtivo] = useState(1047);
  const [plano,      setPlano]      = useState('reduzida');
  const [linhasSim,  setLinhasSim]  = useState([]);

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

  const gerarExcel = () => {
    const dados = linhasSimCalc.map(l => ({
      'Grupo':                   l.grupo,
      'Qtde Cotas':              l.qtde,
      'Carta Total (R$)':        l.cartaTotal,
      'Parcela Inicial (R$)':    l.parcelaInicial,
      'Redutor':                 redutorDisplay === 50 ? '50%' : '0%',
      'Rec. Próprios (R$)':      l.recProprios || 0,
      'Lance Emb. (%)':          l.lanceEmbutidoPercent,
      'Lance Emb. (R$)':         l.lanceEmb,
      'Lance Total (R$)':        l.lanceTotal,
      'Crédito Contemplado (R$)': l.creditoContemplado,
    }));
    dados.push({
      'Grupo':                   'TOTAL',
      'Qtde Cotas':              '',
      'Carta Total (R$)':        totaisSim.cartaTotal,
      'Parcela Inicial (R$)':    totaisSim.parcelaInicial,
      'Redutor':                 '',
      'Rec. Próprios (R$)':      totaisSim.recProprios,
      'Lance Emb. (%)':          '',
      'Lance Emb. (R$)':         totaisSim.lanceEmb,
      'Lance Total (R$)':        totaisSim.lanceTotal,
      'Crédito Contemplado (R$)': totaisSim.creditoContemplado,
    });
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Simulação');
    XLSX.writeFile(wb, `simulacao-xp-imovel-medio-prazo.xlsx`);
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
                <span className="sim-info-label">Lance máx. contemp.</span>
                <span className="sim-info-valor">59%</span>
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

            <p className="sim-info-contemplacao">
              Nos últimos 11 meses, a média de contemplações é de 7% — ou seja, do total de lances máximos ofertados, 7% foram contemplados, conforme a aba de métricas.
            </p>

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
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
            <button
              className="sim-btn-pdf sim-btn-excel"
              onClick={gerarExcel}
            >
              Gerar Excel da proposta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
