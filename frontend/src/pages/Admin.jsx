import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const ADMIN_EMAILS = ['sabrina@jtdkinvest.com', 'joel@jtdkinvest.com'];

function Section({ title, open, onToggle, children }) {
  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: 0, color: 'var(--text-primary)', textAlign: 'left',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>{title}</h3>
        <span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={{ marginTop: '1rem' }}>{children}</div>}
    </div>
  );
}

/* ── 1. COMISSÕES ─────────────────────────────────────── */
function SecaoComissoes() {
  const [clientes, setClientes] = useState([]);
  const [editando, setEditando] = useState({});
  const [status, setStatus] = useState({});

  useEffect(() => {
    api.get('/admin/comissoes/clientes').then(r => {
      setClientes(r.data);
      const init = {};
      r.data.forEach(c => { init[c] = c; });
      setEditando(init);
    });
  }, []);

  const salvar = async (nomeAntigo) => {
    const nomeNovo = editando[nomeAntigo]?.trim();
    if (!nomeNovo || nomeNovo === nomeAntigo) return;
    try {
      const res = await api.put('/admin/comissoes/cliente', { nomeAntigo, nomeNovo });
      setStatus(s => ({ ...s, [nomeAntigo]: `✓ ${res.data.updated} linhas` }));
      setClientes(cs => cs.map(c => c === nomeAntigo ? nomeNovo : c));
      const newEdit = { ...editando };
      newEdit[nomeNovo] = nomeNovo;
      delete newEdit[nomeAntigo];
      setEditando(newEdit);
      setTimeout(() => setStatus(s => { const n = { ...s }; delete n[nomeAntigo]; delete n[nomeNovo]; return n; }), 3000);
    } catch { setStatus(s => ({ ...s, [nomeAntigo]: '✗ Erro' })); }
  };

  return (
    <div className="table-scroll">
      <table>
        <thead><tr><th>Nome atual</th><th>Novo nome</th><th></th></tr></thead>
        <tbody>
          {clientes.map(c => (
            <tr key={c}>
              <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{c}</td>
              <td>
                <input
                  value={editando[c] ?? c}
                  onChange={e => setEditando(s => ({ ...s, [c]: e.target.value }))}
                  style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13px' }}
                />
              </td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button className="btn-admin-sm" onClick={() => salvar(c)}>Salvar</button>
                {status[c] && <span style={{ marginLeft: '8px', fontSize: '12px', color: status[c].startsWith('✓') ? 'var(--success)' : '#ff453a' }}>{status[c]}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── 2. PRAZO RESTANTE ────────────────────────────────── */
function SecaoPrazo() {
  const [grupos, setGrupos] = useState([]);
  const [vals, setVals] = useState({});
  const [status, setStatus] = useState({});
  const [decrementando, setDecrementando] = useState(false);

  const carregar = useCallback(() => {
    api.get('/admin/grupos').then(r => {
      setGrupos(r.data);
      const init = {};
      r.data.forEach(g => { init[g.id] = String(g.prazo_restante); });
      setVals(init);
    });
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async (g) => {
    try {
      await api.put(`/admin/grupos/${g.id}`, {
        prazo_restante: parseInt(vals[g.id]),
        media_contemplacao: g.media_contemplacao,
        lance_maximo_contemplado: g.lance_maximo_contemplado,
        lance_ultimo_mes: g.lance_ultimo_mes,
        sem_media_contemplacao: g.sem_media_contemplacao,
      });
      setStatus(s => ({ ...s, [g.id]: '✓' }));
      setTimeout(() => setStatus(s => { const n = { ...s }; delete n[g.id]; return n; }), 2000);
    } catch { setStatus(s => ({ ...s, [g.id]: '✗' })); }
  };

  const decrementar = async () => {
    if (!confirm('Decrementar prazo restante de todos os grupos em 1 mês?')) return;
    setDecrementando(true);
    try {
      await api.put('/admin/grupos/prazo/decrement');
      carregar();
    } finally { setDecrementando(false); }
  };

  return (
    <>
      <div style={{ marginBottom: '12px' }}>
        <button className="btn-admin-action" onClick={decrementar} disabled={decrementando}>
          {decrementando ? '...' : '−1 mês em todos'}
        </button>
      </div>
      <div className="table-scroll">
        <table>
          <thead><tr><th>Modalidade</th><th>Grupo</th><th>Prazo restante</th><th></th></tr></thead>
          <tbody>
            {grupos.map(g => (
              <tr key={g.id}>
                <td>{g.modalidade}</td>
                <td>{g.numero_grupo}</td>
                <td>
                  <input type="number" value={vals[g.id] ?? ''} onChange={e => setVals(s => ({ ...s, [g.id]: e.target.value }))}
                    style={{ width: '80px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13px' }} />
                </td>
                <td>
                  <button className="btn-admin-sm" onClick={() => salvar(g)}>Salvar</button>
                  {status[g.id] && <span style={{ marginLeft: '8px', fontSize: '12px', color: status[g.id] === '✓' ? 'var(--success)' : '#ff453a' }}>{status[g.id]}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ── 3. MÉDIAS E LANCE ────────────────────────────────── */
function SecaoMedias() {
  const [grupos, setGrupos] = useState([]);
  const [vals, setVals] = useState({});
  const [status, setStatus] = useState({});

  useEffect(() => {
    api.get('/admin/grupos').then(r => {
      setGrupos(r.data);
      const init = {};
      r.data.forEach(g => {
        init[g.id] = {
          media_contemplacao: g.media_contemplacao ?? '',
          lance_maximo_contemplado: g.lance_maximo_contemplado ?? '',
          lance_ultimo_mes: g.lance_ultimo_mes ?? '',
          sem_media_contemplacao: g.sem_media_contemplacao ?? false,
        };
      });
      setVals(init);
    });
  }, []);

  const set = (id, field, value) => setVals(s => ({ ...s, [id]: { ...s[id], [field]: value } }));

  const salvar = async (g) => {
    const v = vals[g.id];
    try {
      await api.put(`/admin/grupos/${g.id}`, {
        prazo_restante: g.prazo_restante,
        media_contemplacao: v.media_contemplacao === '' ? null : parseFloat(v.media_contemplacao),
        lance_maximo_contemplado: v.lance_maximo_contemplado === '' ? null : parseFloat(v.lance_maximo_contemplado),
        lance_ultimo_mes: v.lance_ultimo_mes === '' ? null : parseFloat(v.lance_ultimo_mes),
        sem_media_contemplacao: v.sem_media_contemplacao,
      });
      setStatus(s => ({ ...s, [g.id]: '✓' }));
      setTimeout(() => setStatus(s => { const n = { ...s }; delete n[g.id]; return n; }), 2000);
    } catch { setStatus(s => ({ ...s, [g.id]: '✗' })); }
  };

  const inp = (style) => ({
    width: '90px', padding: '4px 6px', borderRadius: '6px',
    border: '1px solid var(--border)', background: 'var(--bg-primary)',
    color: 'var(--text-primary)', fontSize: '12px', ...style,
  });

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Mod.</th><th>Grupo</th><th>Média 12m</th>
            <th>Lance máx. cont.</th><th>Lance últ. mês</th><th>Sem média</th><th></th>
          </tr>
        </thead>
        <tbody>
          {grupos.map(g => {
            const v = vals[g.id] || {};
            return (
              <tr key={g.id}>
                <td>{g.modalidade}</td>
                <td>{g.numero_grupo}</td>
                <td><input style={inp()} value={v.media_contemplacao ?? ''} onChange={e => set(g.id, 'media_contemplacao', e.target.value)} /></td>
                <td><input style={inp()} value={v.lance_maximo_contemplado ?? ''} onChange={e => set(g.id, 'lance_maximo_contemplado', e.target.value)} /></td>
                <td><input style={inp()} value={v.lance_ultimo_mes ?? ''} onChange={e => set(g.id, 'lance_ultimo_mes', e.target.value)} /></td>
                <td style={{ textAlign: 'center' }}>
                  <input type="checkbox" checked={!!v.sem_media_contemplacao} onChange={e => set(g.id, 'sem_media_contemplacao', e.target.checked)} />
                </td>
                <td>
                  <button className="btn-admin-sm" onClick={() => salvar(g)}>Salvar</button>
                  {status[g.id] && <span style={{ marginLeft: '6px', fontSize: '12px', color: status[g.id] === '✓' ? 'var(--success)' : '#ff453a' }}>{status[g.id]}</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── 4. DADOS MENSAIS ─────────────────────────────────── */
function SecaoDadosMensais() {
  const [grupos, setGrupos] = useState([]);
  const [grupoSel, setGrupoSel] = useState('');
  const [registros, setRegistros] = useState([]);
  const [form, setForm] = useState({ mes: '', lance_percent: '', qnt_lances: '', contemplados: '', contemplacao_mensal: '' });
  const [status, setStatus] = useState('');

  useEffect(() => { api.get('/admin/grupos').then(r => setGrupos(r.data)); }, []);

  const grupoObj = grupos.find(g => String(g.id) === grupoSel);

  const carregarRegistros = useCallback((id) => {
    const g = grupos.find(gg => String(gg.id) === id);
    if (!g) return;
    api.get(`/admin/contemplacao?tipo=${g.modalidade}&grupo=${g.numero_grupo}`)
      .then(r => setRegistros(r.data));
  }, [grupos]);

  useEffect(() => { if (grupoSel) carregarRegistros(grupoSel); }, [grupoSel, carregarRegistros]);

  const adicionar = async () => {
    if (!grupoObj || !form.mes) return;
    try {
      await api.post('/admin/contemplacao', {
        tipo: grupoObj.modalidade,
        grupo: grupoObj.numero_grupo,
        mes: form.mes,
        lance_percent: form.lance_percent || null,
        qnt_lances: form.qnt_lances || null,
        contemplados: form.contemplados || null,
        contemplacao_mensal: form.contemplacao_mensal || null,
      });
      setForm({ mes: '', lance_percent: '', qnt_lances: '', contemplados: '', contemplacao_mensal: '' });
      carregarRegistros(grupoSel);
      setStatus('✓ Adicionado');
      setTimeout(() => setStatus(''), 2000);
    } catch { setStatus('✗ Erro'); }
  };

  const excluir = async (id) => {
    if (!grupoObj) return;
    await api.delete(`/admin/contemplacao/${id}?tipo=${grupoObj.modalidade}`);
    setRegistros(rs => rs.filter(r => r.id !== id));
  };

  const inp = { padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13px' };

  return (
    <>
      <div style={{ marginBottom: '12px' }}>
        <select value={grupoSel} onChange={e => setGrupoSel(e.target.value)}
          style={{ ...inp, marginRight: '8px' }}>
          <option value="">Selecionar grupo...</option>
          {grupos.map(g => <option key={g.id} value={g.id}>{g.modalidade} — Grupo {g.numero_grupo}</option>)}
        </select>
      </div>

      {grupoSel && (
        <>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'flex-end' }}>
            {[['mes','Mês','120px'],['lance_percent','Lance %','80px'],['qnt_lances','Qnt lances','80px'],['contemplados','Contemplados','80px'],['contemplacao_mensal','Contemp. mensal','100px']].map(([field, label, width]) => (
              <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}</label>
                <input style={{ ...inp, width }} value={form[field]} onChange={e => setForm(s => ({ ...s, [field]: e.target.value }))} />
              </div>
            ))}
            <button className="btn-admin-action" onClick={adicionar}>Adicionar</button>
            {status && <span style={{ fontSize: '12px', color: status.startsWith('✓') ? 'var(--success)' : '#ff453a' }}>{status}</span>}
          </div>

          <div className="table-scroll">
            <table>
              <thead><tr><th>Mês</th><th>Lance %</th><th>Qnt</th><th>Contemp.</th><th>Mensal</th><th></th></tr></thead>
              <tbody>
                {registros.map(r => (
                  <tr key={r.id}>
                    <td>{r.mes}</td>
                    <td>{r.lance_percent}</td>
                    <td>{r.qnt_lances}</td>
                    <td>{r.contemplados}</td>
                    <td>{r.contemplacao_mensal}</td>
                    <td><button className="btn-admin-del" onClick={() => excluir(r.id)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

/* ── 5. COTAS E PARCELAS ──────────────────────────────── */
function SecaoCotas() {
  const [grupos, setGrupos] = useState([]);
  const [grupoSel, setGrupoSel] = useState('');
  const [cotas, setCotas] = useState([]);
  const [editCotas, setEditCotas] = useState({});
  const [novaForm, setNovaForm] = useState({ bem_referencia: '', parcela: '', redutor_parcela: '0' });
  const [status, setStatus] = useState({});
  const [addStatus, setAddStatus] = useState('');

  useEffect(() => { api.get('/admin/grupos').then(r => setGrupos(r.data)); }, []);

  const grupoObj = grupos.find(g => String(g.id) === grupoSel);

  const carregarCotas = useCallback((id) => {
    const g = grupos.find(gg => String(gg.id) === id);
    if (!g) return;
    api.get(`/admin/cotas?grupo=${g.numero_grupo}&modalidade=${g.modalidade}`).then(r => {
      setCotas(r.data);
      const init = {};
      r.data.forEach(c => { init[c.id] = { bem_referencia: c.bem_referencia, parcela: c.parcela, redutor_parcela: c.redutor_parcela }; });
      setEditCotas(init);
    });
  }, [grupos]);

  useEffect(() => { if (grupoSel) carregarCotas(grupoSel); }, [grupoSel, carregarCotas]);

  const setEdit = (id, field, value) => setEditCotas(s => ({ ...s, [id]: { ...s[id], [field]: value } }));

  const salvarCota = async (id) => {
    const v = editCotas[id];
    try {
      await api.put(`/admin/cotas/${id}`, { bem_referencia: parseFloat(v.bem_referencia), parcela: parseFloat(v.parcela), redutor_parcela: parseFloat(v.redutor_parcela) });
      setStatus(s => ({ ...s, [id]: '✓' }));
      setTimeout(() => setStatus(s => { const n = { ...s }; delete n[id]; return n; }), 2000);
    } catch { setStatus(s => ({ ...s, [id]: '✗' })); }
  };

  const excluirCota = async (id) => {
    await api.delete(`/admin/cotas/${id}`);
    setCotas(cs => cs.filter(c => c.id !== id));
  };

  const adicionarCota = async () => {
    if (!grupoObj || !novaForm.bem_referencia || !novaForm.parcela) return;
    try {
      const res = await api.post('/admin/cotas', {
        numero_grupo: grupoObj.numero_grupo,
        modalidade: grupoObj.modalidade,
        bem_referencia: parseFloat(novaForm.bem_referencia),
        parcela: parseFloat(novaForm.parcela),
        redutor_parcela: parseFloat(novaForm.redutor_parcela) || 0,
      });
      setCotas(cs => [...cs, res.data]);
      setEditCotas(s => ({ ...s, [res.data.id]: { bem_referencia: res.data.bem_referencia, parcela: res.data.parcela, redutor_parcela: res.data.redutor_parcela } }));
      setNovaForm({ bem_referencia: '', parcela: '', redutor_parcela: '0' });
      setAddStatus('✓ Adicionado');
      setTimeout(() => setAddStatus(''), 2000);
    } catch { setAddStatus('✗ Erro'); }
  };

  const inp = { padding: '4px 6px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '12px' };

  return (
    <>
      <div style={{ marginBottom: '12px' }}>
        <select value={grupoSel} onChange={e => setGrupoSel(e.target.value)} style={{ ...inp, fontSize: '13px', marginRight: '8px' }}>
          <option value="">Selecionar grupo...</option>
          {grupos.map(g => <option key={g.id} value={g.id}>{g.modalidade} — Grupo {g.numero_grupo}</option>)}
        </select>
      </div>

      {grupoSel && (
        <>
          <div className="table-scroll" style={{ marginBottom: '16px' }}>
            <table>
              <thead><tr><th>Cota (R$)</th><th>Parcela (R$)</th><th>Redutor</th><th></th></tr></thead>
              <tbody>
                {cotas.map(c => {
                  const v = editCotas[c.id] || {};
                  return (
                    <tr key={c.id}>
                      <td><input style={{ ...inp, width: '110px' }} value={v.bem_referencia ?? ''} onChange={e => setEdit(c.id, 'bem_referencia', e.target.value)} /></td>
                      <td><input style={{ ...inp, width: '110px' }} value={v.parcela ?? ''} onChange={e => setEdit(c.id, 'parcela', e.target.value)} /></td>
                      <td><input style={{ ...inp, width: '70px' }} value={v.redutor_parcela ?? ''} onChange={e => setEdit(c.id, 'redutor_parcela', e.target.value)} /></td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn-admin-sm" onClick={() => salvarCota(c.id)}>Salvar</button>
                        <button className="btn-admin-del" onClick={() => excluirCota(c.id)} style={{ marginLeft: '6px' }}>✕</button>
                        {status[c.id] && <span style={{ marginLeft: '6px', fontSize: '12px', color: status[c.id] === '✓' ? 'var(--success)' : '#ff453a' }}>{status[c.id]}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {[['bem_referencia','Cota (R$)','110px'],['parcela','Parcela (R$)','110px'],['redutor_parcela','Redutor','70px']].map(([field, label, width]) => (
              <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}</label>
                <input style={{ ...inp, width }} value={novaForm[field]} onChange={e => setNovaForm(s => ({ ...s, [field]: e.target.value }))} />
              </div>
            ))}
            <button className="btn-admin-action" onClick={adicionarCota}>Adicionar cota</button>
            {addStatus && <span style={{ fontSize: '12px', color: addStatus.startsWith('✓') ? 'var(--success)' : '#ff453a' }}>{addStatus}</span>}
          </div>
        </>
      )}
    </>
  );
}

/* ── PÁGINA PRINCIPAL ─────────────────────────────────── */
export default function Admin() {
  const { user } = useAuth();
  const [open, setOpen] = useState({});
  const toggle = (k) => setOpen(s => ({ ...s, [k]: !s[k] }));

  if (!ADMIN_EMAILS.includes(user?.email)) {
    return (
      <div className="page-admin">
        <div className="page-header">
          <h1>Administração</h1>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h3>Acesso restrito</h3>
          <p>Esta área é exclusiva para administradores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-admin">
      <div className="page-header">
        <h1>Administração</h1>
        <p className="page-subtitle">Gerenciamento de dados do sistema</p>
      </div>

      <Section title="1. Comissões — Editar nomes de clientes" open={!!open.comissoes} onToggle={() => toggle('comissoes')}>
        <SecaoComissoes />
      </Section>

      <Section title="2. Prazo Restante dos Grupos" open={!!open.prazo} onToggle={() => toggle('prazo')}>
        <SecaoPrazo />
      </Section>

      <Section title="3. Médias e Lance Último Mês" open={!!open.medias} onToggle={() => toggle('medias')}>
        <SecaoMedias />
      </Section>

      <Section title="4. Dados Mensais — Métricas" open={!!open.mensais} onToggle={() => toggle('mensais')}>
        <SecaoDadosMensais />
      </Section>

      <Section title="5. Cotas e Parcelas" open={!!open.cotas} onToggle={() => toggle('cotas')}>
        <SecaoCotas />
      </Section>
    </div>
  );
}
