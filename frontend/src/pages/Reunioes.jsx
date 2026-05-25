import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const ADMIN_EMAILS = ['sabrina@jtdkinvest.com', 'joel@wflowinvest.com'];
const DAY_NAMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];

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

// ── Helpers ──────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function getWeekDays(referenceDate) {
  const d = new Date(referenceDate);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return Array.from({ length: 5 }, (_, i) => {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    return day;
  });
}

function fmtWeekLabel(days) {
  const first = days[0];
  const last  = days[4];
  const sameMonth = first.getMonth() === last.getMonth();
  if (sameMonth) {
    return `${first.getDate()} a ${last.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  }
  return `${first.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} a ${last.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

// ── Style helpers ─────────────────────────────────────────────
const btn = (variant = 'default', small = false) => ({
  padding: small ? '0.3rem 0.7rem' : '0.5rem 1rem',
  borderRadius: '8px',
  border: variant === 'accent' ? 'none' : variant === 'danger' ? '1px solid rgba(244,67,54,.4)' : '1px solid var(--border)',
  background: variant === 'accent' ? 'var(--accent)' : variant === 'danger' ? 'rgba(244,67,54,.15)' : 'var(--bg-secondary)',
  color: variant === 'accent' ? '#000' : variant === 'danger' ? '#f44336' : 'var(--text-primary)',
  cursor: 'pointer',
  fontSize: small ? '0.78rem' : '0.85rem',
  fontWeight: variant === 'accent' ? 600 : 400,
  fontFamily: 'var(--font-sans)',
  whiteSpace: 'nowrap',
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

// ── Modal de reunião ──────────────────────────────────────────
function ReuniaoModal({ reuniao: initial, onClose, onUpdate }) {
  const [reuniao, setReuniao]           = useState(initial);
  const [status, setStatus]             = useState(initial.status || 'em_andamento');
  const [motivo, setMotivo]             = useState(initial.motivo_nao_fechamento || '');
  const [dataRetorno, setDataRetorno]   = useState(initial.data_retorno?.slice(0, 10) || '');
  const [motivoRet, setMotivoRet]       = useState(initial.motivo_retorno || '');
  const [tarefas, setTarefas]           = useState(initial.tarefas || []);
  const [novaTarefa, setNovaTarefa]     = useState('');
  const [showAta, setShowAta]           = useState(false);
  const [processando, setProcessando]   = useState(false);
  const [resumo, setResumo]             = useState(initial.resumo_ia || '');
  const [salvando, setSalvando]         = useState(false);

  const participantes = Array.isArray(reuniao.participantes)
    ? reuniao.participantes
    : JSON.parse(reuniao.participantes || '[]');

  useEffect(() => {
    api.get(`/reunioes/${initial.id}`)
      .then(r => {
        setReuniao(r.data);
        setTarefas(r.data.tarefas || []);
        setResumo(r.data.resumo_ia || '');
      })
      .catch(() => {});
  }, [initial.id]);

  async function salvarStatus(novoStatus, extra = {}) {
    setSalvando(true);
    try {
      await api.put(`/reunioes/${reuniao.id}/status`, {
        status: novoStatus,
        motivo_nao_fechamento: extra.motivo    ?? motivo     ?? null,
        data_retorno:          extra.dataRet   ?? dataRetorno ?? null,
        motivo_retorno:        extra.motivoRet ?? motivoRet  ?? null,
        cliente: participantes.find(e => !ADMIN_EMAILS.includes(e)) || '',
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

  async function adicionarTarefa() {
    if (!novaTarefa.trim()) return;
    try {
      const r = await api.post(`/reunioes/${reuniao.id}/tarefas`, { descricao: novaTarefa.trim() });
      setTarefas(prev => [...prev, r.data]);
      setNovaTarefa('');
    } catch { alert('Erro ao criar tarefa'); }
  }

  async function toggleTarefa(t) {
    const nova = !t.concluida;
    setTarefas(prev => prev.map(x => x.id === t.id ? { ...x, concluida: nova } : x));
    try {
      await api.put(`/tarefas/${t.id}/concluir`, { concluida: nova });
    } catch {
      setTarefas(prev => prev.map(x => x.id === t.id ? { ...x, concluida: !nova } : x));
    }
  }

  const cor = STATUS_COLORS[status] || '#888';

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '660px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,.5)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem', lineHeight: 1.3 }}>{reuniao.titulo}</h3>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {fmtDate(reuniao.data_reuniao)} às {fmtTime(reuniao.data_reuniao)}
            </p>
            {participantes.length > 0 && (
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {participantes.join(', ')}
              </p>
            )}
          </div>
          <button onClick={onClose} style={{ ...btn(), padding: '0.3rem 0.65rem', fontSize: '1rem', flexShrink: 0 }}>✕</button>
        </div>

        {/* Status */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Status</label>
          <select value={status} onChange={handleStatusChange} disabled={salvando} style={{ ...inp, color: cor, borderColor: cor }}>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {/* Campos condicionais */}
        {status === 'nao_fechou' && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Motivo do não fechamento</label>
            <input
              style={inp}
              placeholder="Descreva o motivo…"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              onBlur={() => salvarStatus(status, { motivo })}
            />
          </div>
        )}

        {status === 'retorno' && (
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '0 0 auto' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Data de retorno</label>
              <input
                type="date"
                style={{ ...inp, width: '160px' }}
                value={dataRetorno}
                onChange={e => setDataRetorno(e.target.value)}
                onBlur={() => salvarStatus(status, { dataRet: dataRetorno, motivoRet })}
              />
            </div>
            <div style={{ flex: 1, minWidth: '180px' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>O que tratar</label>
              <input
                style={inp}
                placeholder="Assunto do retorno…"
                value={motivoRet}
                onChange={e => setMotivoRet(e.target.value)}
                onBlur={() => salvarStatus(status, { dataRet: dataRetorno, motivoRet })}
              />
            </div>
          </div>
        )}

        {/* Resumo IA */}
        {resumo ? (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--accent)', borderRadius: '10px', padding: '0.9rem 1rem', marginBottom: '1rem' }}>
            <p style={{ margin: '0 0 0.4rem', fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Resumo IA</p>
            <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>{resumo}</p>
          </div>
        ) : reuniao.ata_original ? (
          <div style={{ marginBottom: '1rem' }}>
            <button onClick={processar} disabled={processando} style={btn('accent')}>
              {processando ? '⏳ Processando…' : '✨ Processar com IA'}
            </button>
          </div>
        ) : null}

        {/* Ata */}
        {reuniao.ata_original && (
          <div style={{ marginBottom: '1rem' }}>
            <button onClick={() => setShowAta(v => !v)} style={btn('default', true)}>
              {showAta ? '▲ Ocultar ata' : '📄 Ver ata completa'}
            </button>
            {showAta && (
              <pre style={{ marginTop: '0.75rem', fontSize: '0.8rem', lineHeight: 1.65, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: 'var(--bg-card)', borderRadius: '8px', padding: '0.75rem', border: '1px solid var(--border)' }}>
                {reuniao.ata_original}
              </pre>
            )}
          </div>
        )}

        {/* Tarefas */}
        <div>
          <p style={{ margin: '0 0 0.6rem', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Tarefas</p>
          {tarefas.length === 0 && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>Nenhuma tarefa ainda.</p>}
          {tarefas.map(t => (
            <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={t.concluida} onChange={() => toggleTarefa(t)} />
              <span style={{ fontSize: '0.85rem', color: t.concluida ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: t.concluida ? 'line-through' : 'none' }}>
                {t.descricao}
              </span>
            </label>
          ))}
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
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
      </div>
    </div>
  );
}

// ── Modal de retornos do dia ──────────────────────────────────
function RetornosDiaModal({ retornos, onClose, onUpdate }) {
  async function concluir(id) {
    try { await api.put(`/retornos/${id}/concluir`); onUpdate(); } catch { alert('Erro'); }
  }
  async function adiar(id, dias) {
    try { await api.put(`/retornos/${id}/adiar`, { dias }); onUpdate(); } catch { alert('Erro'); }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '560px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,.5)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Retornos para hoje</h3>
          <button onClick={onClose} style={{ ...btn(), padding: '0.3rem 0.65rem' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {retornos.map(ret => (
            <div key={ret.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.85rem 1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem' }}>{ret.cliente || ret.reuniao_titulo}</p>
                {ret.motivo_retorno && (
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{ret.motivo_retorno}</p>
                )}
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
    </div>
  );
}

// ── Grade semanal ─────────────────────────────────────────────
function WeeklyGrid({ reunioes, weekDays, onCardClick }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function isToday(day) { return day.toDateString() === today.toDateString(); }

  function reunioesForDay(day) {
    return reunioes
      .filter(r => {
        const rd = new Date(r.data_reuniao);
        rd.setHours(0, 0, 0, 0);
        return rd.toDateString() === day.toDateString();
      })
      .sort((a, b) => new Date(a.data_reuniao) - new Date(b.data_reuniao));
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
      {/* Header */}
      {weekDays.map((day, i) => {
        const todayCol = isToday(day);
        return (
          <div key={`h${i}`} style={{
            padding: '0.65rem 0.5rem',
            background: todayCol ? 'rgba(245,166,35,0.1)' : 'var(--bg-card)',
            borderBottom: '1px solid var(--border)',
            borderRight: i < 4 ? '1px solid var(--border)' : 'none',
            textAlign: 'center',
          }}>
            <p style={{ margin: 0, fontSize: '0.68rem', color: todayCol ? 'var(--accent)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
              {DAY_NAMES[i]}
            </p>
            <p style={{ margin: '0.12rem 0 0', fontSize: '1.2rem', fontWeight: todayCol ? 700 : 400, color: todayCol ? 'var(--accent)' : 'var(--text-primary)' }}>
              {day.getDate()}
            </p>
          </div>
        );
      })}

      {/* Células */}
      {weekDays.map((day, i) => {
        const items = reunioesForDay(day);
        const todayCol = isToday(day);
        return (
          <div key={`c${i}`} style={{
            minHeight: '140px',
            padding: '0.45rem',
            background: todayCol ? 'rgba(245,166,35,0.03)' : 'var(--bg-secondary)',
            borderRight: i < 4 ? '1px solid var(--border)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.3rem',
          }}>
            {items.map(r => {
              const cor = STATUS_COLORS[r.status] || '#888';
              return (
                <div
                  key={r.id}
                  onClick={() => onCardClick(r)}
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: `3px solid ${cor}`, borderRadius: '6px', padding: '0.3rem 0.4rem', cursor: 'pointer', transition: 'opacity 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>{fmtTime(r.data_reuniao)}</p>
                  <p style={{ margin: '0.04rem 0 0', fontSize: '0.73rem', color: 'var(--text-primary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {r.titulo}
                  </p>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Barra de resumo ───────────────────────────────────────────
function SummaryBar({ reunioes }) {
  const total       = reunioes.length;
  const fechamentos = reunioes.filter(r => r.status === 'fechou').length;
  const retornos    = reunioes.filter(r => r.status === 'retorno').length;
  const tarefas     = reunioes.flatMap(r => (r.tarefas || []).filter(t => !t.concluida));

  const cardStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '0.85rem 1rem',
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.65rem', marginTop: '0.85rem' }}>
      <div style={cardStyle}>
        <p style={{ margin: '0 0 0.2rem', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Reuniões</p>
        <p style={{ margin: 0, fontSize: '1.7rem', fontWeight: 700 }}>{total}</p>
      </div>
      <div style={cardStyle}>
        <p style={{ margin: '0 0 0.2rem', fontSize: '0.7rem', color: '#4caf50', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Fechamentos</p>
        <p style={{ margin: 0, fontSize: '1.7rem', fontWeight: 700, color: '#4caf50' }}>{fechamentos}</p>
      </div>
      <div style={cardStyle}>
        <p style={{ margin: '0 0 0.2rem', fontSize: '0.7rem', color: '#2196f3', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Retornos</p>
        <p style={{ margin: 0, fontSize: '1.7rem', fontWeight: 700, color: '#2196f3' }}>{retornos}</p>
      </div>
      {tarefas.length > 0 && (
        <div style={{ ...cardStyle, gridColumn: 'span 1' }}>
          <p style={{ margin: '0 0 0.45rem', fontSize: '0.7rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Próximas ações</p>
          {tarefas.slice(0, 5).map((t, i) => (
            <p key={i} style={{ margin: '0.12rem 0', fontSize: '0.76rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>• {t.descricao}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────
function Reunioes() {
  const { user } = useAuth();
  const isAdmin = ADMIN_EMAILS.includes(user?.email);

  const [weekOffset, setWeekOffset]           = useState(0);
  const [reunioes, setReunioes]               = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [importando, setImportando]           = useState(false);
  const [importMsg, setImportMsg]             = useState('');
  const [selectedReuniao, setSelectedReuniao] = useState(null);
  const [retornosHoje, setRetornosHoje]       = useState([]);
  const [showRetModal, setShowRetModal]       = useState(false);

  const weekDays = React.useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    return getWeekDays(base);
  }, [weekOffset]);

  const loadReunioes = useCallback(async () => {
    setLoading(true);
    try {
      const monday = weekDays[0];
      const friday = weekDays[4];
      const fridayEnd = new Date(friday);
      fridayEnd.setHours(23, 59, 59, 999);

      let all = [];
      if (monday.getMonth() === friday.getMonth()) {
        const r = await api.get(`/reunioes?periodo=mes&ano=${monday.getFullYear()}&mes=${monday.getMonth() + 1}`);
        all = r.data;
      } else {
        const [r1, r2] = await Promise.all([
          api.get(`/reunioes?periodo=mes&ano=${monday.getFullYear()}&mes=${monday.getMonth() + 1}`),
          api.get(`/reunioes?periodo=mes&ano=${friday.getFullYear()}&mes=${friday.getMonth() + 1}`),
        ]);
        all = [...r1.data, ...r2.data];
      }

      const filtered = all.filter(r => {
        const d = new Date(r.data_reuniao);
        return d >= monday && d <= fridayEnd;
      });
      setReunioes(filtered);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [weekDays]);

  const loadRetornosHoje = useCallback(async () => {
    try {
      const r = await api.get('/retornos/pendentes');
      const today = new Date().toISOString().slice(0, 10);
      setRetornosHoje(r.data.filter(ret => ret.data_retorno === today));
    } catch {}
  }, []);

  useEffect(() => { loadReunioes(); }, [loadReunioes]);
  useEffect(() => { loadRetornosHoje(); }, [loadRetornosHoje]);

  async function importar() {
    setImportando(true);
    setImportMsg('');
    try {
      const r = await api.post('/reunioes/importar');
      setImportMsg(`✓ ${r.data.imported} importada(s), ${r.data.skipped} já existia(m)`);
      loadReunioes();
    } catch (e) {
      setImportMsg('Erro: ' + (e.response?.data?.error || 'falha ao importar'));
    } finally {
      setImportando(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="page-agenda">
        <div className="page-header"><h1>🤝 Reuniões</h1></div>
        <p style={{ color: 'var(--text-muted)' }}>Acesso restrito a administradores.</p>
      </div>
    );
  }

  const weekLabel = fmtWeekLabel(weekDays);

  return (
    <div className="page-agenda">
      {/* Banner de retornos hoje */}
      {retornosHoje.length > 0 && (
        <div style={{ background: 'rgba(244,67,54,.1)', border: '1px solid rgba(244,67,54,.3)', borderRadius: '10px', padding: '0.7rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#f44336', fontWeight: 600 }}>
            🔴 {retornosHoje.length} retorno{retornosHoje.length > 1 ? 's' : ''} para hoje
          </p>
          <button onClick={() => setShowRetModal(true)} style={btn('danger', true)}>Ver detalhes</button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem' }}>🤝 Reuniões</h1>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Gestão de reuniões e follow-ups</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {importMsg && (
            <span style={{ fontSize: '0.78rem', color: importMsg.startsWith('Erro') ? '#f44336' : 'var(--text-muted)' }}>
              {importMsg}
            </span>
          )}
          <button onClick={importar} disabled={importando} style={{ ...btn('default', true), opacity: importando ? 0.6 : 1 }}>
            {importando ? '⏳ Importando…' : '⬇ Importar'}
          </button>
        </div>
      </div>

      {/* Navegação de semana */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem' }}>
        <button onClick={() => setWeekOffset(v => v - 1)} style={btn('default', true)}>←</button>
        <span style={{ fontWeight: 600, fontSize: '0.9rem', minWidth: '200px', textAlign: 'center', textTransform: 'capitalize' }}>
          {weekOffset === 0 ? 'Esta semana' : `Semana de ${weekLabel}`}
        </span>
        <button onClick={() => setWeekOffset(v => v + 1)} style={btn('default', true)}>→</button>
        {weekOffset !== 0 && (
          <button onClick={() => setWeekOffset(0)} style={btn('default', true)}>Hoje</button>
        )}
      </div>

      {/* Grade */}
      {loading
        ? <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', padding: '3rem 0', textAlign: 'center' }}>Carregando…</p>
        : <WeeklyGrid reunioes={reunioes} weekDays={weekDays} onCardClick={setSelectedReuniao} />
      }

      {/* Barra de resumo */}
      {!loading && <SummaryBar reunioes={reunioes} />}

      {/* Modal da reunião */}
      {selectedReuniao && (
        <ReuniaoModal
          reuniao={selectedReuniao}
          onClose={() => setSelectedReuniao(null)}
          onUpdate={() => { loadReunioes(); setSelectedReuniao(null); }}
        />
      )}

      {/* Modal de retornos do dia */}
      {showRetModal && (
        <RetornosDiaModal
          retornos={retornosHoje}
          onClose={() => setShowRetModal(false)}
          onUpdate={() => {
            loadRetornosHoje();
            setShowRetModal(false);
          }}
        />
      )}
    </div>
  );
}

export default Reunioes;
