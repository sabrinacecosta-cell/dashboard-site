import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const ADMIN_EMAILS = ['sabrina@jtdkinvest.com', 'joel@wflowinvest.com'];

// ── Helpers ─────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function fmtMes(ano, mes) {
  return new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

const STATUS_LABELS = {
  em_andamento: 'Em andamento',
  fechou:       'Fechou negócio',
  nao_fechou:   'Não fechou',
  retorno:      'Retorno agendado',
};
const STATUS_COLORS = {
  em_andamento: '#f5a623',
  fechou:       '#4caf50',
  nao_fechou:   '#f44336',
  retorno:      '#2196f3',
};

// ── Estilos reutilizáveis ────────────────────────────────────
const btn = (variant = 'default', small = false) => ({
  padding: small ? '0.3rem 0.7rem' : '0.5rem 1rem',
  borderRadius: '8px',
  border: variant === 'accent' ? 'none' : '1px solid var(--border)',
  background: variant === 'accent' ? 'var(--accent)' : variant === 'danger' ? 'rgba(244,67,54,.15)' : 'var(--bg-secondary)',
  color: variant === 'accent' ? '#000' : variant === 'danger' ? '#f44336' : 'var(--text-primary)',
  cursor: 'pointer',
  fontSize: small ? '0.78rem' : '0.85rem',
  fontWeight: variant === 'accent' ? 600 : 400,
  fontFamily: 'var(--font-sans)',
});

const inp = {
  width: '100%',
  padding: '0.5rem 0.7rem',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  fontSize: '0.85rem',
  fontFamily: 'var(--font-sans)',
  boxSizing: 'border-box',
};

// ── Modal de Ata ─────────────────────────────────────────────
function AtaModal({ reuniao, onClose }) {
  const [processando, setProcessando] = useState(false);
  const [resumo, setResumo] = useState(reuniao.resumo_ia || '');

  async function processar() {
    setProcessando(true);
    try {
      const r = await api.post(`/reunioes/${reuniao.id}/processar`);
      setResumo(r.data.resumo_ia);
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao processar');
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: '14px', padding: '1.75rem', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>{reuniao.titulo}</h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{fmtDate(reuniao.data_reuniao)} às {fmtTime(reuniao.data_reuniao)}</p>
          </div>
          <button onClick={onClose} style={{ ...btn(), padding: '0.3rem 0.65rem', fontSize: '1rem' }}>✕</button>
        </div>

        {resumo && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--accent)', borderRadius: '10px', padding: '0.9rem 1rem', marginBottom: '1.25rem' }}>
            <p style={{ margin: '0 0 0.4rem', fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Resumo IA</p>
            <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{resumo}</p>
          </div>
        )}

        {!resumo && reuniao.ata_original && (
          <button onClick={processar} disabled={processando} style={{ ...btn('accent'), marginBottom: '1.25rem' }}>
            {processando ? 'Processando…' : '✨ Processar com IA'}
          </button>
        )}

        {reuniao.ata_original ? (
          <pre style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.65, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {reuniao.ata_original}
          </pre>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Nenhuma ata disponível. Importe as reuniões após conectar o Gmail.</p>
        )}
      </div>
    </div>
  );
}

// ── Card de Reunião ──────────────────────────────────────────
function ReuniaoCard({ reuniao, onUpdate }) {
  const [status, setStatus] = useState(reuniao.status || 'em_andamento');
  const [motivo, setMotivo] = useState(reuniao.motivo_nao_fechamento || '');
  const [dataRetorno, setDataRetorno] = useState(reuniao.data_retorno?.slice(0, 10) || '');
  const [motivoRetorno, setMotivoRetorno] = useState(reuniao.motivo_retorno || '');
  const [tarefas, setTarefas] = useState(reuniao.tarefas || []);
  const [novaTarefa, setNovaTarefa] = useState('');
  const [showAtaModal, setShowAtaModal] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const participantes = Array.isArray(reuniao.participantes)
    ? reuniao.participantes
    : JSON.parse(reuniao.participantes || '[]');

  async function salvarStatus(novoStatus, extra = {}) {
    setSalvando(true);
    try {
      await api.put(`/reunioes/${reuniao.id}/status`, {
        status: novoStatus,
        motivo_nao_fechamento: extra.motivo || motivo || null,
        data_retorno: extra.dataRetorno || dataRetorno || null,
        motivo_retorno: extra.motivoRetorno || motivoRetorno || null,
        cliente: participantes.find(e => !['sabrina@jtdkinvest.com', 'joel@wflowinvest.com'].includes(e)) || '',
      });
      if (onUpdate) onUpdate();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  async function handleStatusChange(e) {
    const novo = e.target.value;
    setStatus(novo);
    await salvarStatus(novo);
  }

  async function adicionarTarefa() {
    if (!novaTarefa.trim()) return;
    try {
      const r = await api.post(`/reunioes/${reuniao.id}/tarefas`, { descricao: novaTarefa.trim() });
      setTarefas(prev => [...prev, r.data]);
      setNovaTarefa('');
    } catch (e) {
      alert('Erro ao criar tarefa');
    }
  }

  async function toggleTarefa(tarefa) {
    const nova = !tarefa.concluida;
    setTarefas(prev => prev.map(t => t.id === tarefa.id ? { ...t, concluida: nova } : t));
    try {
      await api.put(`/tarefas/${tarefa.id}/concluir`, { concluida: nova });
    } catch {
      setTarefas(prev => prev.map(t => t.id === tarefa.id ? { ...t, concluida: !nova } : t));
    }
  }

  const cor = STATUS_COLORS[status] || '#888';

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: `3px solid ${cor}`, borderRadius: '10px', padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{reuniao.titulo}</p>
          <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {fmtDate(reuniao.data_reuniao)} às {fmtTime(reuniao.data_reuniao)}
            {participantes.length > 0 && ` · ${participantes.slice(0, 2).join(', ')}${participantes.length > 2 ? ` +${participantes.length - 2}` : ''}`}
          </p>
        </div>
        <select value={status} onChange={handleStatusChange} disabled={salvando} style={{ ...inp, width: 'auto', fontSize: '0.82rem', color: cor, borderColor: cor, background: 'var(--bg-secondary)' }}>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* Campos condicionais por status */}
      {status === 'nao_fechou' && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            style={{ ...inp, flex: 1 }}
            placeholder="Motivo do não fechamento…"
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            onBlur={() => salvarStatus(status, { motivo })}
          />
        </div>
      )}

      {status === 'retorno' && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            type="date"
            style={{ ...inp, width: '150px', flex: '0 0 auto' }}
            value={dataRetorno}
            onChange={e => setDataRetorno(e.target.value)}
            onBlur={() => salvarStatus(status, { dataRetorno, motivoRetorno })}
          />
          <input
            style={{ ...inp, flex: 1 }}
            placeholder="O que tratar no retorno…"
            value={motivoRetorno}
            onChange={e => setMotivoRetorno(e.target.value)}
            onBlur={() => salvarStatus(status, { dataRetorno, motivoRetorno })}
          />
        </div>
      )}

      {/* Resumo IA inline */}
      {reuniao.resumo_ia && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--accent)', borderRadius: '8px', padding: '0.6rem 0.8rem' }}>
          <p style={{ margin: '0 0 0.2rem', fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Resumo IA</p>
          <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{reuniao.resumo_ia}</p>
        </div>
      )}

      {/* Tarefas */}
      {(tarefas.length > 0 || true) && (
        <div>
          {tarefas.map(t => (
            <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={t.concluida} onChange={() => toggleTarefa(t)} />
              <span style={{ fontSize: '0.83rem', color: t.concluida ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: t.concluida ? 'line-through' : 'none' }}>
                {t.descricao}
              </span>
            </label>
          ))}
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
            <input
              style={{ ...inp, flex: 1, padding: '0.35rem 0.6rem' }}
              placeholder="Nova tarefa…"
              value={novaTarefa}
              onChange={e => setNovaTarefa(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && adicionarTarefa()}
            />
            <button onClick={adicionarTarefa} style={btn('default', true)}>+ Tarefa</button>
          </div>
        </div>
      )}

      {/* Ações */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button onClick={() => setShowAtaModal(true)} style={btn('default', true)}>📄 Ver ata</button>
      </div>

      {showAtaModal && <AtaModal reuniao={{ ...reuniao, resumo_ia: reuniao.resumo_ia }} onClose={() => setShowAtaModal(false)} />}
    </div>
  );
}

// ── Tab: Esta Semana ─────────────────────────────────────────
function TabSemana() {
  const [reunioes, setReunioes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importando, setImportando] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/reunioes?periodo=semana');
      setReunioes(r.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function importar() {
    setImportando(true);
    setImportResult(null);
    try {
      const r = await api.post('/reunioes/importar');
      setImportResult(`✅ ${r.data.imported} importada(s), ${r.data.skipped} já existia(m).`);
      load();
    } catch (e) {
      setImportResult('❌ ' + (e.response?.data?.error || 'Erro ao importar'));
    } finally {
      setImportando(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button onClick={importar} disabled={importando} style={btn('accent')}>
          {importando ? 'Importando…' : '⬇ Importar reuniões'}
        </button>
        <button onClick={load} disabled={loading} style={btn()}>↻</button>
        {importResult && <span style={{ fontSize: '0.85rem', color: importResult.startsWith('✅') ? 'var(--success)' : '#f44336' }}>{importResult}</span>}
      </div>

      {loading && <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Carregando…</p>}

      {!loading && reunioes.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          <p>Nenhuma reunião esta semana.</p>
          <p style={{ fontSize: '0.82rem' }}>Clique em "Importar reuniões" para buscar do Google Calendar.</p>
        </div>
      )}

      {reunioes.map(r => (
        <ReuniaoCard key={r.id} reuniao={r} onUpdate={load} />
      ))}
    </div>
  );
}

// ── Tab: Métricas ────────────────────────────────────────────
function TabMetricas() {
  const [anoMes, setAnoMes] = useState(() => {
    const n = new Date();
    return { ano: n.getFullYear(), mes: n.getMonth() + 1 };
  });
  const [metricas, setMetricas] = useState(null);
  const [motivos, setMotivos] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mr, mot] = await Promise.all([
        api.get(`/reunioes/metricas/mes?ano=${anoMes.ano}&mes=${anoMes.mes}`),
        api.get(`/reunioes/metricas/motivos?ano=${anoMes.ano}&mes=${anoMes.mes}`),
      ]);
      setMetricas(mr.data);
      setMotivos(mot.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [anoMes]);

  useEffect(() => { load(); }, [load]);

  function navMes(delta) {
    setAnoMes(prev => {
      let m = prev.mes + delta;
      let a = prev.ano;
      if (m > 12) { m = 1; a++; }
      if (m < 1) { m = 12; a--; }
      return { ano: a, mes: m };
    });
  }

  const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1.1rem 1.3rem', textAlign: 'center' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Navegação por mês */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button onClick={() => navMes(-1)} style={btn('default', true)}>←</button>
        <span style={{ fontWeight: 600, fontSize: '0.95rem', textTransform: 'capitalize', minWidth: '160px', textAlign: 'center' }}>
          {fmtMes(anoMes.ano, anoMes.mes)}
        </span>
        <button onClick={() => navMes(1)} style={btn('default', true)}>→</button>
      </div>

      {loading && <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Carregando…</p>}

      {!loading && metricas && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
            <div style={cardStyle}>
              <p style={{ margin: '0 0 0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</p>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>{metricas.total || 0}</p>
            </div>
            <div style={cardStyle}>
              <p style={{ margin: '0 0 0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fechamentos</p>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: '#4caf50' }}>{metricas.fechamentos || 0}</p>
            </div>
            <div style={cardStyle}>
              <p style={{ margin: '0 0 0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Não fechou</p>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: '#f44336' }}>{metricas.nao_fechou || 0}</p>
            </div>
            <div style={{ ...cardStyle, borderColor: 'var(--accent)' }}>
              <p style={{ margin: '0 0 0.4rem', fontSize: '0.75rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Conversão</p>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: 'var(--accent)' }}>{metricas.taxa_conversao ?? '—'}%</p>
            </div>
          </div>

          {motivos.length > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1.1rem 1.3rem' }}>
              <p style={{ margin: '0 0 0.9rem', fontSize: '0.85rem', fontWeight: 600 }}>Motivos de não fechamento</p>
              {motivos.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: i < motivos.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{m.motivo}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f44336' }}>{m.contagem}×</span>
                </div>
              ))}
            </div>
          )}

          {motivos.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Nenhum motivo de não fechamento registrado neste mês.</p>
          )}
        </>
      )}
    </div>
  );
}

// ── Tab: Retornos ────────────────────────────────────────────
function TabRetornos() {
  const [retornos, setRetornos] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/retornos/pendentes');
      setRetornos(r.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function concluir(id) {
    try {
      await api.put(`/retornos/${id}/concluir`);
      load();
    } catch { alert('Erro'); }
  }

  async function adiar(id, dias) {
    try {
      await api.put(`/retornos/${id}/adiar`, { dias });
      load();
    } catch { alert('Erro'); }
  }

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje); amanha.setDate(amanha.getDate() + 1);
  const fimSemana = new Date(hoje); fimSemana.setDate(fimSemana.getDate() + 7);

  function grupo(dataRetorno) {
    const d = new Date(dataRetorno + 'T00:00:00');
    if (d < hoje) return 'vencido';
    if (d.toDateString() === hoje.toDateString()) return 'hoje';
    if (d.toDateString() === amanha.toDateString()) return 'amanha';
    if (d <= fimSemana) return 'semana';
    return 'depois';
  }

  const grupos = {
    vencido: { label: 'Vencidos', cor: '#f44336', items: [] },
    hoje:    { label: 'Hoje',     cor: '#f5a623', items: [] },
    amanha:  { label: 'Amanhã',   cor: '#2196f3', items: [] },
    semana:  { label: 'Esta semana', cor: 'var(--text-secondary)', items: [] },
    depois:  { label: 'Próximas semanas', cor: 'var(--text-secondary)', items: [] },
  };

  retornos.forEach(r => {
    const g = grupo(r.data_retorno);
    grupos[g].items.push(r);
  });

  const ordemGrupos = ['vencido', 'hoje', 'amanha', 'semana', 'depois'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={load} style={btn()}>↻ Atualizar</button>
      </div>

      {loading && <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Carregando…</p>}

      {!loading && retornos.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhum retorno pendente. 🎉</p>
      )}

      {!loading && ordemGrupos.map(key => {
        const g = grupos[key];
        if (g.items.length === 0) return null;
        return (
          <div key={key}>
            <p style={{ margin: '0 0 0.6rem', fontSize: '0.78rem', fontWeight: 700, color: g.cor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {g.label} ({g.items.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {g.items.map(ret => (
                <div key={ret.id} style={{ background: 'var(--bg-card)', border: `1px solid ${key === 'vencido' ? '#f44336' : 'var(--border)'}`, borderRadius: '10px', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: key === 'vencido' ? '#f44336' : 'var(--text-primary)' }}>
                      {ret.cliente || ret.reuniao_titulo}
                    </p>
                    {ret.motivo_retorno && (
                      <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{ret.motivo_retorno}</p>
                    )}
                    <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {fmtDate(ret.data_retorno)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                    <button onClick={() => concluir(ret.id)} style={btn('accent', true)}>Feito</button>
                    <button onClick={() => adiar(ret.id, 1)} style={btn('default', true)}>+1d</button>
                    <button onClick={() => adiar(ret.id, 7)} style={btn('default', true)}>+1s</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Página ───────────────────────────────────────────────────
function Reunioes() {
  const { user } = useAuth();
  const isAdmin = ADMIN_EMAILS.includes(user?.email);
  const [tab, setTab] = useState('semana');

  if (!isAdmin) {
    return (
      <div className="page-agenda">
        <div className="page-header">
          <h1>🤝 Reuniões</h1>
        </div>
        <p style={{ color: 'var(--text-muted)' }}>Acesso restrito a administradores.</p>
      </div>
    );
  }

  const tabStyle = active => ({
    padding: '0.45rem 1.1rem',
    borderRadius: '8px',
    border: active ? 'none' : '1px solid var(--border)',
    background: active ? 'var(--accent)' : 'var(--bg-secondary)',
    color: active ? '#000' : 'var(--text-primary)',
    cursor: 'pointer',
    fontWeight: active ? 600 : 400,
    fontSize: '0.88rem',
    fontFamily: 'var(--font-sans)',
  });

  return (
    <div className="page-agenda">
      <div className="page-header">
        <h1>🤝 Reuniões</h1>
        <p className="page-subtitle">Gestão de reuniões e follow-ups</p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button style={tabStyle(tab === 'semana')} onClick={() => setTab('semana')}>Esta semana</button>
        <button style={tabStyle(tab === 'metricas')} onClick={() => setTab('metricas')}>Métricas</button>
        <button style={tabStyle(tab === 'retornos')} onClick={() => setTab('retornos')}>Retornos</button>
      </div>

      {tab === 'semana'   && <TabSemana />}
      {tab === 'metricas' && <TabMetricas />}
      {tab === 'retornos' && <TabRetornos />}
    </div>
  );
}

export default Reunioes;
