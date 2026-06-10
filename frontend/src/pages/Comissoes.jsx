import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const ADMIN_EMAILS = ['sabrina@jtdkinvest.com', 'joel@jtdkinvest.com', 'joel@wflowinvest.com'];

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
 '2026-02': 'Base cálculo janeiro | Exercício fevereiro',
 '2026-01': 'Base cálculo dezembro | Exercício janeiro',
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

const CLIENTES_ESPECIAIS = [
  { label: 'Eduardo de Franco Borges',  match: (nome) => nome?.trim().toLowerCase().includes('eduardo') && nome?.trim().toLowerCase().includes('franco') },
  { label: 'Vinicius Graczki Lupatini', match: (nome) => nome?.trim().toLowerCase().includes('vinicius') && (nome?.trim().toLowerCase().includes('graczcki') || nome?.trim().toLowerCase().includes('graczki') || nome?.trim().toLowerCase().includes('lupatini') || nome?.trim().toLowerCase().includes('lupatine')) },
];

function ResumoClientesEspeciais({ rows }) {
  const clientes = CLIENTES_ESPECIAIS.map(({ label, match }) => {
    const registros = rows.filter(r => match(r.cliente));
    if (registros.length === 0) return null;

    const bruto   = registros.reduce((s, r) => s + parseFloat(r.valor_comissao || 0), 0);
    const liquido = registros.reduce((s, r) => s + parseFloat(r.valor_liquido || 0) * 0.80, 0);
    const p67     = liquido * 0.67;
    const p33     = liquido * 0.33;

    return { nome: label, bruto, liquido, p67, p33 };
  }).filter(Boolean);

  if (clientes.length === 0) return null;

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap',
      marginBottom: '16px',
      padding: '14px 16px',
      background: 'rgba(245, 192, 0, 0.06)',
      border: '1px solid rgba(245, 192, 0, 0.18)',
      borderRadius: '10px',
    }}>
      {clientes.map((c, idx) => (
        <div key={c.nome} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          flex: '1',
          minWidth: '180px',
          paddingRight: idx < clientes.length - 1 ? '12px' : '0',
          borderRight: idx < clientes.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
        }}>
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            color: 'var(--cor-destaque, #F5C000)',
            marginBottom: '4px',
          }}>
            {c.nome}
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Comissão Bruta</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{fmtMoeda(c.bruto)}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Líquido (−20%)</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#5DCAA5' }}>{fmtMoeda(c.liquido)}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>67% do Líquido</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{fmtMoeda(c.p67)}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>33% do Líquido</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{fmtMoeda(c.p33)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TabelaComissoes({ rows, isAdmin }) {
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

  const rowsFiltrados = (clienteFiltro
    ? rows.filter(r => r.cliente === clienteFiltro)
    : rows
  ).slice().sort((a, b) => (a.cliente || '').localeCompare(b.cliente || '', 'pt-BR'));

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
            {isAdmin && <th>Assessor</th>}
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
              {isAdmin && <td>{r.assessor || '-'}</td>}
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
            {isAdmin && <td />}
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function ChatComissoes() {
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
      const { data } = await api.post('/comissoes/chat', { pergunta: texto });
      const resposta = data.resposta || 'Sem resposta';
      setHistorico(h => [...h, { role: 'assistant', content: resposta }]);
    } catch (err) {
      const mensagem = err.response?.data?.error || err.message || 'Erro ao processar a pergunta';
      setHistorico(h => [...h, { role: 'assistant', content: `Erro: ${mensagem}`, erro: true }]);
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

      <form onSubmit={enviar} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <textarea
          ref={inputRef}
          value={pergunta}
          onChange={e => setPergunta(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviar(e)}
          placeholder="Digite sua pergunta..."
          disabled={carregando}
          rows={1}
          style={{
            width: '100%',
            minHeight: '48px',
            padding: '12px 16px',
            background: '#3a3a3c',
            color: '#ffffff',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '10px',
            fontSize: '14px',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
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
            height: '48px',
            whiteSpace: 'nowrap',
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
  const podeVerResumoEspecial = isAdmin || user?.email === 'machado@belmontcapital.com.br';

  useEffect(() => {
    setLoading(true);
    api.get('/comissoes')
      .then(r => setDados(r.data))
      .catch(() => setError('Erro ao carregar comissões'))
      .finally(() => setLoading(false));
  }, []);

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

      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        marginBottom: '1.5rem',
        padding: '10px 14px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
        color: 'var(--text-secondary)',
        fontSize: '0.78rem',
        lineHeight: '1.5',
      }}>
        <span style={{ flexShrink: 0 }}>  </span>
        <span>
          A coluna de Comissão Líquida está descontando 20% de imposto. Essa será a base de cálculo da divisão entre o escritório, mesa e assessor (considerando o plano de carreira de cada um).
        </span>
      </div>

      {loading ? (
        <div className="page-loading">Carregando...</div>
      ) : error ? (
        <div className="page-error">{error}</div>
      ) : dados.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-icon"> </span>
            <h3>Nenhuma comissão encontrada</h3>
            <p>Não há comissões registradas para o seu cadastro.</p>
          </div>
        </div>
      ) : (
        <>
          {isAdmin && <ChatComissoes />}
          {secoes.map(([ym, rows]) => (
            <div className="card" key={ym} style={{ marginBottom: '1.5rem' }}>
              <h3>{getTituloSecao(rows[0]?.mes_referencia)}</h3>
              {podeVerResumoEspecial && <ResumoClientesEspeciais rows={rows} />}
              <TabelaComissoes rows={rows} isAdmin={isAdmin} />
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default Comissoes;
