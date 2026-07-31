import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const ADMIN_EMAILS = ['sabrina@jtdkinvest.com', 'joel@jtdkinvest.com', 'joel@wflowinvest.com'];

const TITULOS = {
  faq: 'FAQ — Regras das administradoras',
  log: 'FAQ — Perguntas feitas',
  gerenciar: 'FAQ — Gerenciar entradas',
};

// Renderiza um trecho com **...** em negrito (destaque do ts_headline).
function Destaque({ texto }) {
  if (!texto) return null;
  const partes = String(texto).split('**');
  return (
    <>
      {partes.map((p, i) =>
        i % 2 === 1 ? <strong key={i} style={{ color: 'var(--text-primary)' }}>{p}</strong> : <span key={i}>{p}</span>
      )}
    </>
  );
}

// Rótulo "categoria › subcategoria › tópico" (omite subcategoria quando nula).
function rotuloFonte(t) {
  return [t.categoria, t.subcategoria, t.topico].filter(Boolean).join(' › ');
}

const inputStyle = {
  width: '100%',
  padding: '0.6rem 0.85rem',
  borderRadius: '10px',
  border: '1px solid var(--border)',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: '0.9rem',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const btnPrimary = {
  padding: '0.6rem 1.2rem',
  borderRadius: '10px',
  border: 'none',
  background: 'var(--primary)',
  color: '#1d1d1f',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: '0.9rem',
  whiteSpace: 'nowrap',
};

function FaqModal({ user, view = 'faq', onClose }) {
  const isAdmin = ADMIN_EMAILS.includes(user?.email);
  // Views administrativas só para admin; qualquer outro cai no FAQ público.
  const efetivo = (view === 'log' || view === 'gerenciar') && !isAdmin ? 'faq' : view;

  const [administradoras, setAdministradoras] = useState([]);
  const [administradora, setAdministradora] = useState('');

  useEffect(() => {
    api.get('/faq/administradoras')
      .then(r => {
        setAdministradoras(r.data);
        if (r.data.length >= 1) setAdministradora(r.data[0]);
      })
      .catch(() => setAdministradoras([]));
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1200, padding: '3vh 1rem', overflowY: 'auto' }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ position: 'relative', background: 'var(--bg-secondary)', borderRadius: '14px', padding: '1.5rem', width: '100%', maxWidth: '760px', boxShadow: '0 12px 40px rgba(0,0,0,0.45)', border: '1px solid var(--border)' }}>
        {/* Título à esquerda; × pequeno no fim da linha, canto direito */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)', flexShrink: 0, whiteSpace: 'nowrap' }}>
            {TITULOS[efetivo] || TITULOS.faq}
          </h2>
          <button onClick={onClose} aria-label="Fechar" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.1rem', cursor: 'pointer', lineHeight: 1, padding: '2px 6px', flexShrink: 0 }}>×</button>
        </div>

        {efetivo === 'faq' && (
          <FaqPrincipal
            administradoras={administradoras}
            administradora={administradora}
            setAdministradora={setAdministradora}
          />
        )}
        {efetivo === 'log' && <AbaLog />}
        {efetivo === 'gerenciar' && (
          <AbaGerenciar administradoras={administradoras} administradoraSel={administradora} userEmail={user?.email} />
        )}
      </div>
    </div>
  );
}

// ── FAQ público: seletor (pills) + campo de pergunta + conteúdo aberto ───────
function FaqPrincipal({ administradoras, administradora, setAdministradora }) {
  return (
    <>
      {/* Seletor de administradora — mesmo estilo de pills do Simulador */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          Administradora
        </label>
        <div className="toggle-group" style={{ marginBottom: 0, flexWrap: 'wrap' }} role="tablist" aria-label="Administradora">
          {administradoras.map((a) => (
            <button
              key={a}
              type="button"
              role="tab"
              aria-selected={administradora === a}
              className={`toggle-btn ${administradora === a ? 'active' : ''}`}
              onClick={() => setAdministradora(a)}
              style={administradora === a ? { background: '#d1d1d6', borderColor: '#d1d1d6', color: '#1d1d1f' } : undefined}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <PerguntarENavegar administradora={administradora} podeUsar={!!administradora} />
    </>
  );
}

// Campo de pergunta (largura total) + resposta + navegação sempre aberta.
function PerguntarENavegar({ administradora, podeUsar }) {
  const [pergunta, setPergunta] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');

  const [entradas, setEntradas] = useState([]);
  const [carregandoNav, setCarregandoNav] = useState(false);
  const [aberto, setAberto] = useState({});

  // Carrega o conteúdo do FAQ (navegação) da administradora selecionada,
  // já com todos os tópicos abertos.
  useEffect(() => {
    setResultado(null);
    setErro('');
    setPergunta('');
    if (!podeUsar) { setEntradas([]); return; }
    setCarregandoNav(true);
    api.get('/faq/entradas', { params: { administradora } })
      .then(r => {
        setEntradas(r.data);
        setAberto({}); // tópicos começam fechados
      })
      .catch(() => setEntradas([]))
      .finally(() => setCarregandoNav(false));
  }, [administradora, podeUsar]);

  async function buscar() {
    const texto = pergunta.trim();
    if (!texto || !podeUsar || carregando) return;
    setCarregando(true);
    setErro('');
    setResultado(null);
    try {
      const { data } = await api.post('/faq/perguntar', { administradora, pergunta: texto });
      setResultado(data);
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao processar a pergunta');
    } finally {
      setCarregando(false);
    }
  }

  if (!podeUsar) {
    return <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '1rem 0' }}>Selecione uma administradora para começar.</p>;
  }

  const nada = resultado && (!resultado.trechos || resultado.trechos.length === 0);

  // Agrupa por categoria → subcategoria
  const grupos = {};
  for (const e of entradas) {
    const cat = e.categoria;
    const sub = e.subcategoria || '';
    grupos[cat] = grupos[cat] || {};
    grupos[cat][sub] = grupos[cat][sub] || [];
    grupos[cat][sub].push(e);
  }

  return (
    <>
      {/* Campo de pergunta — input ocupa a linha inteira; Buscar abaixo à direita */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && buscar()}
          placeholder="Ex.: quais garantias são aceitas no imobiliário?"
          disabled={carregando}
          style={{ ...inputStyle, width: '100%', display: 'block', marginBottom: '8px' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={buscar} disabled={carregando || !pergunta.trim()} style={{ ...btnPrimary, opacity: (carregando || !pergunta.trim()) ? 0.5 : 1 }}>
            {carregando ? '…' : 'Buscar'}
          </button>
        </div>
      </div>

      {erro && <p style={{ color: '#ff6b6b', fontSize: '0.85rem' }}>{erro}</p>}
      {carregando && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Buscando nas regras cadastradas…</p>}

      {/* Resultado da pergunta */}
      {resultado && !carregando && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ padding: '1rem', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border)', marginBottom: nada ? 0 : '1rem', fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
            {resultado.resposta}
          </div>
          {!nada && (
            <div>
              <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', margin: '0 0 0.6rem' }}>
                Fontes na cartilha
              </p>
              {resultado.trechos.map((t, i) => (
                <div key={i} style={{ padding: '0.75rem 0.9rem', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border)', marginBottom: '0.6rem' }}>
                  <p style={{ margin: '0 0 0.4rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>{rotuloFonte(t)}</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.55, color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
                    <Destaque texto={t.destaque || t.texto} />
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conteúdo do FAQ aberto (navegação) */}
      {carregandoNav ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Carregando…</p>
      ) : entradas.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Nenhuma entrada cadastrada.</p>
      ) : (
        <div style={{ maxHeight: '52vh', overflowY: 'auto' }}>
          {Object.entries(grupos).map(([cat, subs]) => (
            <div key={cat} style={{ marginBottom: '1rem' }}>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{cat}</h3>
              {Object.entries(subs).map(([sub, itens]) => (
                <div key={sub} style={{ marginBottom: sub ? '0.75rem' : '0.4rem', paddingLeft: sub ? '0.5rem' : 0 }}>
                  {sub && <p style={{ margin: '0 0 0.4rem', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{sub}</p>}
                  {itens.map((e) => {
                    const isOpen = !!aberto[e.id];
                    return (
                      <div key={e.id} style={{ borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '0.4rem', overflow: 'hidden' }}>
                        <button
                          onClick={() => setAberto(a => ({ ...a, [e.id]: !a[e.id] }))}
                          style={{ width: '100%', textAlign: 'left', padding: '0.6rem 0.8rem', background: 'var(--bg-primary)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.87rem', fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}
                        >
                          <span>{e.topico}</span>
                          <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>{isOpen ? '−' : '+'}</span>
                        </button>
                        {isOpen && (
                          <div style={{ padding: '0.75rem 0.8rem', fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-secondary)', borderTop: '1px solid var(--border)', whiteSpace: 'pre-line' }}>
                            {e.texto}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── Gerenciar (admin) ────────────────────────────────────────────────────────
const FORM_VAZIO = { administradora: '', categoria: '', subcategoria: '', topico: '', texto: '', ordem: 0 };

function AbaGerenciar({ administradoras, administradoraSel, userEmail }) {
  const [entradas, setEntradas] = useState([]);
  const [filtroAdm, setFiltroAdm] = useState(administradoraSel || '');
  const [carregando, setCarregando] = useState(false);
  const [form, setForm] = useState({ ...FORM_VAZIO, administradora: administradoraSel || '' });
  const [editandoId, setEditandoId] = useState(null);
  const [msg, setMsg] = useState('');

  const carregar = useCallback((adm) => {
    if (!adm) { setEntradas([]); return; }
    setCarregando(true);
    api.get('/faq/entradas', { params: { administradora: adm } })
      .then(r => setEntradas(r.data))
      .catch(() => setEntradas([]))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => { carregar(filtroAdm); }, [filtroAdm, carregar]);

  function resetForm() {
    setForm({ ...FORM_VAZIO, administradora: filtroAdm || '' });
    setEditandoId(null);
  }

  async function salvar() {
    setMsg('');
    try {
      if (editandoId) {
        await api.put(`/faq/entradas/${editandoId}`, form);
      } else {
        await api.post('/faq/entradas', form);
      }
      setMsg('Salvo!');
      resetForm();
      carregar(filtroAdm || form.administradora);
      if (!filtroAdm) setFiltroAdm(form.administradora);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Erro ao salvar');
    }
  }

  async function excluir(id) {
    if (!confirm('Excluir esta entrada?')) return;
    try {
      await api.delete(`/faq/entradas/${id}`);
      carregar(filtroAdm);
      if (editandoId === id) resetForm();
    } catch {
      setMsg('Erro ao excluir');
    }
  }

  function editar(e) {
    setForm({
      administradora: e.administradora,
      categoria: e.categoria,
      subcategoria: e.subcategoria || '',
      topico: e.topico,
      texto: e.texto,
      ordem: e.ordem ?? 0,
    });
    setEditandoId(e.id);
  }

  const admListaDatalist = [...new Set([...administradoras, form.administradora].filter(Boolean))];

  return (
    <div>
      <div style={{ padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-primary)', marginBottom: '1rem' }}>
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>{editandoId ? 'Editar entrada' : 'Nova entrada'}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
          <input list="faq-adms" placeholder="Administradora" value={form.administradora} onChange={e => setForm(f => ({ ...f, administradora: e.target.value }))} style={inputStyle} />
          <datalist id="faq-adms">{admListaDatalist.map(a => <option key={a} value={a} />)}</datalist>
          <input placeholder="Ordem" type="number" value={form.ordem} onChange={e => setForm(f => ({ ...f, ordem: e.target.value }))} style={inputStyle} />
          <input placeholder="Categoria" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} style={inputStyle} />
          <input placeholder="Subcategoria (opcional)" value={form.subcategoria} onChange={e => setForm(f => ({ ...f, subcategoria: e.target.value }))} style={inputStyle} />
        </div>
        <input placeholder="Tópico" value={form.topico} onChange={e => setForm(f => ({ ...f, topico: e.target.value }))} style={{ ...inputStyle, marginBottom: '0.6rem' }} />
        <textarea placeholder="Texto da regra" value={form.texto} onChange={e => setForm(f => ({ ...f, texto: e.target.value }))} rows={4} style={{ ...inputStyle, marginBottom: '0.6rem', resize: 'vertical' }} />
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={salvar} style={btnPrimary}>{editandoId ? 'Atualizar' : 'Adicionar'}</button>
          {editandoId && <button onClick={resetForm} style={{ ...inputStyle, width: 'auto', cursor: 'pointer', color: 'var(--text-secondary)' }}>Cancelar</button>}
          {msg && <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{msg}</span>}
        </div>
      </div>

      <div style={{ marginBottom: '0.6rem' }}>
        <select value={filtroAdm} onChange={e => setFiltroAdm(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="">Ver entradas de…</option>
          {administradoras.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {carregando ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Carregando…</p>
      ) : (
        <div style={{ maxHeight: '40vh', overflowY: 'auto' }}>
          {entradas.map(e => (
            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', padding: '0.5rem 0.7rem', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '0.4rem' }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)' }}>{rotuloFonte(e)}</p>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.texto}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                <button onClick={() => editar(e)} title="Editar" style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.2rem 0.5rem' }}>✎</button>
                <button onClick={() => excluir(e.id)} title="Excluir" style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: '#ff6b6b', padding: '0.2rem 0.5rem' }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Log de perguntas (admin) ─────────────────────────────────────────────────
function AbaLog() {
  const [rows, setRows] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api.get('/faq/log', { params: { limit: 100 } })
      .then(r => setRows(r.data))
      .catch(() => setRows([]))
      .finally(() => setCarregando(false));
  }, []);

  const fmt = (d) => {
    if (!d) return '-';
    const dt = new Date(d);
    return dt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const exportarExcel = async () => {
    const XLSX = await import('xlsx');
    const dados = rows.map(r => ({
      'Data': fmt(r.criado_em),
      'Usuário': r.email_usuario || '',
      'Administradora': r.administradora || '',
      'Pergunta': r.pergunta || '',
      'Resposta': r.resposta || '',
      'Encontrou resposta': r.encontrou_resposta ? 'Sim' : 'Não',
    }));
    const ws = XLSX.utils.json_to_sheet(dados);
    ws['!cols'] = [
      { wch: 16 }, { wch: 28 }, { wch: 14 }, { wch: 50 }, { wch: 70 }, { wch: 18 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Perguntas FAQ');
    const hoje = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `faq-perguntas-${hoje}.xlsx`);
  };

  if (carregando) return <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Carregando…</p>;
  if (rows.length === 0) return <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Nenhuma pergunta registrada.</p>;

  const thBase = { padding: '0.5rem', verticalAlign: 'bottom', fontWeight: 600 };
  const tdBase = { padding: '0.5rem', verticalAlign: 'top', overflowWrap: 'anywhere', wordBreak: 'break-word' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.6rem' }}>
        <button
          onClick={exportarExcel}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '0.4rem 0.8rem', borderRadius: '8px',
            border: '1px solid var(--border)', background: 'var(--bg-card-hover)',
            color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer',
          }}
        >
          ⬇ Exportar Excel
        </button>
      </div>
      <div style={{ maxHeight: '58vh', overflowY: 'auto', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '11%' }} />
            <col style={{ width: '17%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '29%' }} />
            <col style={{ width: '30%' }} />
            <col style={{ width: '6%' }} />
          </colgroup>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--text-secondary)' }}>
              <th style={thBase}>Data</th>
              <th style={thBase}>Usuário</th>
              <th style={thBase}>Adm.</th>
              <th style={thBase}>Pergunta</th>
              <th style={thBase}>Resposta</th>
              <th style={{ ...thBase, textAlign: 'center' }}>Achou?</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} style={{ borderTop: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                <td style={tdBase}>{fmt(r.criado_em)}</td>
                <td style={tdBase}>{r.email_usuario}</td>
                <td style={tdBase}>{r.administradora}</td>
                <td style={tdBase}>{r.pergunta}</td>
                <td style={{ ...tdBase, color: 'var(--text-secondary)' }}>{r.resposta}</td>
                <td style={{ ...tdBase, textAlign: 'center' }}>{r.encontrou_resposta ? '✓' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default FaqModal;
