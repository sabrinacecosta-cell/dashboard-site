import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const ADMIN_EMAILS = ['sabrina@jtdkinvest.com', 'joel@wflowinvest.com'];

const fmtMoeda = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtData = (d) => {
  if (!d) return '-';
  const [y, m, day] = d.split('T')[0].split('-');
  return `${day}/${m}/${y}`;
};

const fmtGrupoCota = (val) => {
  if (!val) return '-';
  const parts = val.trim().split(/\s+/);
  if (parts.length < 2) return val;
  const [grupo, cota] = parts;
  return `${parseInt(grupo)} / ${parseInt(cota)}`;
};

const TITULO_SECAO = {
  '2026-05': 'Base de cálculo abril | Exercício maio',
  '2026-04': 'Base cálculo março | Exercício abril',
  '2026-03': 'Base cálculo fevereiro | Exercício março',
};

function getTituloSecao(mesRef) {
  if (!mesRef) return mesRef;
  const ym = String(mesRef).split('T')[0].substring(0, 7);
  return TITULO_SECAO[ym] || ym;
}

function getYM(mesRef) {
  if (!mesRef) return '';
  return String(mesRef).split('T')[0].substring(0, 7);
}

function TabelaComissoes({ rows }) {
  const [clienteFiltro, setClienteFiltro] = useState('');
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const dropdownRef = useRef(null);

  const clientesUnicos = [...new Set(rows.map(r => r.cliente).filter(Boolean))].sort();

  useEffect(() => {
    function handleClickFora(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  const rowsFiltrados = clienteFiltro
    ? rows.filter(r => r.cliente === clienteFiltro)
    : rows;

  const totalCarta   = rowsFiltrados.reduce((s, r) => s + Number(r.valor_carta),    0);
  const totalBruto   = rowsFiltrados.reduce((s, r) => s + Number(r.valor_comissao), 0);
  const totalLiquido = rowsFiltrados.reduce((s, r) => s + Number(r.valor_liquido) * 0.80, 0);

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Data Venda</th>
            <th>Contrato</th>
            <th>Grupo/Cota</th>
            <th style={{ textAlign: 'center' }}>Parcela</th>
            <th style={{ textAlign: 'right' }}>Valor Carta</th>
            <th style={{ textAlign: 'right' }}>Comissão %</th>
            <th style={{ textAlign: 'right' }}>Comissão Bruta</th>
            <th style={{ textAlign: 'right' }}>Comissão Líquida</th>
            <th>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }} ref={dropdownRef}>
                Cliente
                <button
                  type="button"
                  onClick={() => setDropdownAberto(v => !v)}
                  style={{
                    background: clienteFiltro ? 'var(--primary)' : 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    borderRadius: '4px',
                    color: clienteFiltro ? '#1d1d1f' : 'var(--text-secondary)',
                    fontSize: '12px',
                    lineHeight: 1,
                  }}
                  title="Filtrar por cliente"
                >
                  ▼
                </button>
                {dropdownAberto && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    zIndex: 100,
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                    minWidth: '220px',
                    maxHeight: '260px',
                    overflowY: 'auto',
                    padding: '4px 0',
                  }}>
                    <button
                      type="button"
                      onClick={() => { setClienteFiltro(''); setDropdownAberto(false); }}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 16px',
                        background: !clienteFiltro ? 'var(--primary)' : 'none',
                        color: !clienteFiltro ? '#1d1d1f' : 'var(--text-primary)',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                      }}
                    >
                      Todos
                    </button>
                    {clientesUnicos.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => { setClienteFiltro(c); setDropdownAberto(false); }}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 16px',
                          background: clienteFiltro === c ? 'var(--primary)' : 'none',
                          color: clienteFiltro === c ? '#1d1d1f' : 'var(--text-primary)',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {rowsFiltrados.map(r => (
            <tr key={r.id}>
              <td>{fmtData(r.data_venda)}</td>
              <td className="text-primary">{r.contrato}</td>
              <td>{fmtGrupoCota(r.grupo_cota_versao)}</td>
              <td style={{ textAlign: 'center' }}>{r.parcela}</td>
              <td style={{ textAlign: 'right' }}>{fmtMoeda(r.valor_carta)}</td>
              <td style={{ textAlign: 'right' }}>
                {r.percentual_comissao != null
                  ? (Number(r.percentual_comissao) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + '%'
                  : '-'}
              </td>
              <td style={{ textAlign: 'right' }} className="text-primary">{fmtMoeda(r.valor_comissao)}</td>
              <td style={{ textAlign: 'right' }}>{fmtMoeda(Number(r.valor_liquido) * 0.80)}</td>
              <td>{r.cliente}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ fontWeight: 700 }}>
            <td colSpan={4}>Total ({rowsFiltrados.length} registros)</td>
            <td style={{ textAlign: 'right' }}>{fmtMoeda(totalCarta)}</td>
            <td />
            <td style={{ textAlign: 'right' }} className="text-primary">{fmtMoeda(totalBruto)}</td>
            <td style={{ textAlign: 'right' }}>{fmtMoeda(totalLiquido)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function ChatComissoes({ dados }) {
  const [pergunta, setPergunta] = useState('');
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const inputRef = useRef(null);
  const historicoRef = useRef(null);

  useEffect(() => {
    if (historicoRef.current) {
      historicoRef.current.scrollTop = historicoRef.current.scrollHeight;
    }
  }, [historico]);

  async function enviar(e) {
    e.preventDefault();
    const texto = pergunta.trim();
    if (!texto || carregando) return;

    setPergunta('');
    setHistorico(h => [...h, { role: 'user', content: texto }]);
    setCarregando(true);

    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY não configurada');

      const dadosContexto = dados.map(r => ({
        cliente: r.cliente,
        contrato: r.contrato,
        grupo_cota: fmtGrupoCota(r.grupo_cota_versao),
        data_venda: fmtData(r.data_venda),
        parcela: r.parcela,
        valor_carta: Number(r.valor_carta),
        comissao_bruta: Number(r.valor_comissao),
        comissao_liquida: Number(r.valor_liquido) * 0.80,
        mes_referencia: r.mes_referencia ? String(r.mes_referencia).split('T')[0].substring(0, 7) : null,
      }));

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: `Você é um assistente que responde perguntas sobre dados de comissões de consórcio. Responda de forma direta e objetiva em português. Use os valores monetários formatados em reais (R$). Dados disponíveis (${dadosContexto.length} registros): ${JSON.stringify(dadosContexto)}`,
          messages: [{ role: 'user', content: texto }],
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Erro na API');
      }

      const data = await response.json();
      const resposta = data.content?.[0]?.text || 'Sem resposta';
      setHistorico(h => [...h, { role: 'assistant', content: resposta }]);
    } catch (err) {
      setHistorico(h => [...h, { role: 'assistant', content: `Erro: ${err.message}`, erro: true }]);
    } finally {
      setCarregando(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ marginBottom: '12px', fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
        Pergunte sobre os dados
      </h3>

      {historico.length > 0 && (
        <div
          ref={historicoRef}
          style={{
            maxHeight: '280px',
            overflowY: 'auto',
            marginBottom: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {historico.map((msg, i) => (
            <div
              key={i}
              style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg-secondary)',
                color: msg.role === 'user' ? '#1d1d1f' : (msg.erro ? '#ff6b6b' : 'var(--text-primary)'),
                fontSize: '0.88rem',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
              }}
            >
              {msg.content}
            </div>
          ))}
          {carregando && (
            <div style={{
              alignSelf: 'flex-start',
              padding: '10px 14px',
              borderRadius: '16px 16px 16px 4px',
              background: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              fontSize: '0.88rem',
            }}>
              ...
            </div>
          )}
        </div>
      )}

      <form onSubmit={enviar} style={{ display: 'flex', gap: '8px' }}>
        <input
          ref={inputRef}
          type="text"
          value={pergunta}
          onChange={e => setPergunta(e.target.value)}
          placeholder='Ex: "Qual o total de comissão líquida de maio?"'
          disabled={carregando}
          className="chat-input"
          style={{
            color: '#f5f5f7',
            backgroundColor: '#2c2c2e',
            fontSize: '14px',
            minHeight: '44px',
            padding: '12px',
            width: '100%',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.1)',
            WebkitTextFillColor: '#f5f5f7',
            caretColor: '#f5f5f7',
            flex: 1,
            minWidth: 0,
            boxSizing: 'border-box',
          }}
        />
        <button
          type="submit"
          disabled={carregando || !pergunta.trim()}
          style={{
            padding: '0.5rem 1.2rem',
            borderRadius: '8px',
            border: 'none',
            background: 'var(--primary)',
            color: '#1d1d1f',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
            opacity: (carregando || !pergunta.trim()) ? 0.5 : 1,
          }}
        >
          Enviar
        </button>
      </form>
    </div>
  );
}

function Comissoes() {
  const { user } = useAuth();
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = ADMIN_EMAILS.includes(user?.email);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    api.get('/comissoes')
      .then(r => setDados(r.data))
      .catch(() => setError('Erro ao carregar comissões'))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const secoes = React.useMemo(() => {
    const map = {};
    dados.forEach(r => {
      const ym = getYM(r.mes_referencia);
      if (!map[ym]) map[ym] = [];
      map[ym].push(r);
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [dados]);

  return (
    <div className="page-comissoes">
      <div className="page-header">
        <h1>Comissões</h1>
        <p className="page-subtitle">Acompanhe seus ganhos</p>
      </div>

      {!isAdmin ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-icon">🔒</span>
            <h3>Acesso restrito</h3>
            <p>Você não tem permissão para visualizar esta página.</p>
          </div>
        </div>
      ) : loading ? (
        <div className="page-loading">Carregando...</div>
      ) : error ? (
        <div className="page-error">{error}</div>
      ) : (
        <>
          <ChatComissoes dados={dados} />
          {secoes.map(([ym, rows]) => (
            <div className="card" key={ym} style={{ marginBottom: '1.5rem' }}>
              <h3>{getTituloSecao(rows[0]?.mes_referencia)}</h3>
              <TabelaComissoes rows={rows} />
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default Comissoes;
