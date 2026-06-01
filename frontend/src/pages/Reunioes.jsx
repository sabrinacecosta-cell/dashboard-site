import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, CartesianGrid,
} from 'recharts';

const ADMIN_EMAILS = ['sabrina@jtdkinvest.com', 'joel@wflowinvest.com'];

const TITULO_IGNORADO     = ['clube da programação', 'terapia'];
const TITULO_NAO_COMERCIAL = ['kickoff de produtos'];
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

const CORES = {
  fechou:      '#22c55e',
  nao_fechou:  '#ef4444',
  retorno:     '#3b82f6',
  em_andamento:'#f5a623',
  cinza:       '#6b7280',
};

const TT = {
  contentStyle: { background: '#1c1c1c', border: '1px solid #333', borderRadius: '8px', fontSize: '0.82rem' },
  itemStyle:    { color: '#e0e0e0' },
  labelStyle:   { color: '#aaa' },
};

const MESES_PTBR = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

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
  const [reuniao, setReuniao]             = useState(initial);
  const [status, setStatus]               = useState(initial.status || 'em_andamento');
  const [motivo, setMotivo]               = useState(initial.motivo_nao_fechamento || '');
  const [dataRetorno, setDataRetorno]     = useState(initial.data_retorno?.slice(0, 10) || '');
  const [motivoRet, setMotivoRet]         = useState(initial.motivo_retorno || '');
  const [tarefas, setTarefas]             = useState(initial.tarefas || []);
  const [novaTarefa, setNovaTarefa]       = useState('');
  const [showNovaInput, setShowNovaInput] = useState(false);
  const [showAtaFull, setShowAtaFull]     = useState(false);
  const [processando, setProcessando]     = useState(false);
  const [resumo, setResumo]               = useState(initial.resumo_ia || '');
  const [statusSugerido, setStatusSugerido] = useState(false);
  const [salvando, setSalvando]           = useState(false);

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

  function fmtHorario(start, end) {
    const date = fmtDate(start);
    const startT = fmtTime(start);
    if (!end) return `${date} às ${startT}`;
    const endT = fmtTime(end);
    if (!endT || startT === endT) return `${date} às ${startT}`;
    return `${date} às ${startT} – ${endT}`;
  }

  async function salvarStatus(novoStatus, extra = {}) {
    setSalvando(true);
    try {
      await api.put(`/reunioes/${reuniao.id}/status`, {
        status:                novoStatus,
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
    setStatusSugerido(false);
    await salvarStatus(novo);
  }

  async function processar() {
    setProcessando(true);
    try {
      const r = await api.post(`/reunioes/${reuniao.id}/processar`);
      setResumo(r.data.resumo_ia);

      if (r.data.status_sugerido && !r.data.cached) {
        const novoStatus = r.data.status_sugerido;
        const novoMotivo = r.data.motivo || '';
        const novoOQueTratar = r.data.o_que_tratar || '';
        setStatus(novoStatus);
        setStatusSugerido(true);
        if (novoMotivo) setMotivo(novoMotivo);
        if (novoOQueTratar) setMotivoRet(novoOQueTratar);
        await salvarStatus(novoStatus, { motivo: novoMotivo || motivo, motivoRet: novoOQueTratar || motivoRet });
      }
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
      setShowNovaInput(false);
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
  const lbl = { display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.4px' };
  const sec = { margin: '0 0 0.45rem', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' };

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
        onClick={onClose}
      >
        <div
          style={{ background: 'var(--bg-secondary)', borderRadius: '16px', width: '100%', maxWidth: '660px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,.5)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* ── Título + X fixos no topo ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <h3 style={{ flex: 1, margin: 0, fontSize: '1rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {reuniao.titulo}
            </h3>
            <button
              onClick={async () => {
                if (!window.confirm('Remover esta reunião da lista?')) return;
                try { await api.delete(`/reunioes/${reuniao.id}`); if (onUpdate) onUpdate(); }
                catch { alert('Erro ao remover'); }
              }}
              style={{ ...btn('danger', true), flexShrink: 0 }}
              title="Remover da lista"
            >Remover</button>
            <button onClick={onClose} style={{ ...btn(), padding: '0.25rem 0.6rem', fontSize: '1rem', flexShrink: 0 }}>✕</button>
          </div>

          {/* ── Conteúdo rolável ── */}
          <div style={{ overflowY: 'auto', padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Data + participantes */}
            <div>
              <p style={{ margin: '0 0 0.2rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {fmtHorario(reuniao.data_reuniao, reuniao.data_fim)}
              </p>
              {participantes.length > 0 && (
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {participantes.join(', ')}
                </p>
              )}
            </div>

            {/* Ata */}
            <div>
              <p style={sec}>📋 Ata da reunião</p>
              {reuniao.ata_original ? (
                <>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem' }}>
                    <pre style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.65, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {reuniao.ata_original}
                    </pre>
                  </div>
                  <button onClick={() => setShowAtaFull(true)} style={{ ...btn('default', true), marginTop: '0.5rem' }}>
                    📄 Ver ata completa
                  </button>
                </>
              ) : (
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhuma ata encontrada.</p>
              )}
            </div>

            {/* Resumo IA */}
            <div>
              <p style={sec}>🤖 Resumo IA</p>
              {resumo ? (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--accent)', borderRadius: '10px', padding: '0.85rem 1rem' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>{resumo}</p>
                </div>
              ) : reuniao.ata_original ? (
                <button onClick={processar} disabled={processando} style={btn('accent')}>
                  {processando ? '⏳ Processando…' : '✨ Processar com IA'}
                </button>
              ) : (
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sem ata para processar.</p>
              )}
            </div>

            {/* Status */}
            <div>
              <label style={lbl}>Status</label>
              <select value={status} onChange={handleStatusChange} disabled={salvando} style={{ ...inp, color: cor, borderColor: cor }}>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {statusSugerido && (
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: 'var(--accent)', fontStyle: 'italic' }}>
                  ✨ Status sugerido pela IA — você pode alterar
                </p>
              )}
            </div>

            {/* Campos condicionais */}
            {status === 'nao_fechou' && (
              <div>
                <label style={lbl}>Motivo do não fechamento</label>
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
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '0 0 auto' }}>
                  <label style={lbl}>Data de retorno</label>
                  <input
                    type="date"
                    style={{ ...inp, width: '160px' }}
                    value={dataRetorno}
                    onChange={e => setDataRetorno(e.target.value)}
                    onBlur={() => salvarStatus(status, { dataRet: dataRetorno, motivoRet })}
                  />
                </div>
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <label style={lbl}>O que tratar</label>
                  <input
                    style={inp}
                    placeholder="Ex: Apresentar simulação grupo 1042, limite R$1.800/mês"
                    value={motivoRet}
                    onChange={e => setMotivoRet(e.target.value)}
                    onBlur={() => salvarStatus(status, { dataRet: dataRetorno, motivoRet })}
                  />
                </div>
              </div>
            )}

            {/* Tarefas */}
            <div>
              <p style={sec}>Tarefas</p>
              {tarefas.length === 0 && !showNovaInput && (
                <p style={{ margin: '0 0 0.4rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhuma tarefa ainda.</p>
              )}
              {tarefas.map(t => (
                <label key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={t.concluida} onChange={() => toggleTarefa(t)} style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.85rem', color: t.concluida ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: t.concluida ? 'line-through' : 'none' }}>
                    {t.descricao}
                  </span>
                </label>
              ))}
              {showNovaInput ? (
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem' }}>
                  <input
                    autoFocus
                    style={{ ...inp, flex: 1, padding: '0.35rem 0.6rem' }}
                    placeholder="Descreva a tarefa…"
                    value={novaTarefa}
                    onChange={e => setNovaTarefa(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') adicionarTarefa();
                      if (e.key === 'Escape') { setShowNovaInput(false); setNovaTarefa(''); }
                    }}
                  />
                  <button onClick={adicionarTarefa} style={btn('accent', true)}>✓</button>
                  <button onClick={() => { setShowNovaInput(false); setNovaTarefa(''); }} style={btn('default', true)}>✕</button>
                </div>
              ) : (
                <button onClick={() => setShowNovaInput(true)} style={{ ...btn('default', true), marginTop: '0.35rem' }}>
                  + Nova tarefa
                </button>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Modal de ata completa (secundário) */}
      {showAtaFull && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1rem' }}
          onClick={() => setShowAtaFull(false)}
        >
          <div
            style={{ background: 'var(--bg-secondary)', borderRadius: '14px', width: '100%', maxWidth: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,.6)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, paddingRight: '1rem' }}>
                Ata completa — {reuniao.titulo}
              </p>
              <button onClick={() => setShowAtaFull(false)} style={{ ...btn(), padding: '0.2rem 0.6rem', flexShrink: 0 }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', padding: '1.25rem', flex: 1 }}>
              <pre style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.7, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {reuniao.ata_original}
              </pre>
            </div>
          </div>
        </div>
      )}
    </>
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

// ── Barra de resumo da semana ─────────────────────────────────
function SummaryBar({ reunioes: reunioesRaw, proximosRetornos = [] }) {
  const reunioes = reunioesRaw.filter(r =>
    !TITULO_NAO_COMERCIAL.some(t => (r.titulo || '').toLowerCase().includes(t))
  );
  const total       = reunioes.length;
  const fechamentos = reunioes.filter(r => r.status === 'fechou').length;
  const retornos    = reunioes.filter(r => r.status === 'retorno').length;
  const naoFechou   = reunioes.filter(r => r.status === 'nao_fechou').length;
  const emAndamento = reunioes.filter(r => r.status === 'em_andamento').length;

  const pieData = [
    { name: 'Fechou',       value: fechamentos, color: CORES.fechou },
    { name: 'Retorno',      value: retornos,    color: CORES.retorno },
    { name: 'Não fechou',   value: naoFechou,   color: CORES.nao_fechou },
    { name: 'Em andamento', value: emAndamento, color: CORES.em_andamento },
  ].filter(d => d.value > 0);

  const motivosData = Object.values(
    reunioes
      .filter(r => r.status === 'nao_fechou' && r.motivo_nao_fechamento)
      .reduce((acc, r) => {
        const m = r.motivo_nao_fechamento;
        acc[m] = acc[m] || { motivo: m, contagem: 0 };
        acc[m].contagem++;
        return acc;
      }, {})
  ).sort((a, b) => b.contagem - a.contagem);

  const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.85rem 1rem' };

  function fmtRetornoDate(d) {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}`;
  }

  return (
    <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      {/* Cards numéricos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem' }}>
        {[
          { label: 'Reuniões', value: total, color: 'var(--text-muted)' },
          { label: 'Fechamentos', value: fechamentos, color: CORES.fechou },
          { label: 'Retornos', value: retornos, color: CORES.retorno },
          { label: 'Não fechou', value: naoFechou, color: CORES.nao_fechou },
        ].map(c => (
          <div key={c.label} style={cardStyle}>
            <p style={{ margin: '0 0 0.2rem', fontSize: '0.7rem', color: c.color, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{c.label}</p>
            <p style={{ margin: 0, fontSize: '1.7rem', fontWeight: 700, color: c.color === 'var(--text-muted)' ? 'var(--text-primary)' : c.color }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Gráfico + Próximas ações lado a lado */}
      {total > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>

          {/* Pizza menor */}
          <div style={{ ...cardStyle, padding: '0.85rem 1rem' }}>
            <p style={{ margin: '0 0 0.4rem', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Resultado das Reuniões</p>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={52} dataKey="value" paddingAngle={2}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip {...TT} formatter={(v, n) => [v, n]} />
                  <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', margin: '2.5rem 0' }}>Sem dados</p>
            )}
          </div>

          {/* Próximas ações */}
          <div style={{ ...cardStyle, padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0' }}>
            <p style={{ margin: '0 0 0.6rem', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Próximas ações</p>
            {proximosRetornos.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>Nenhum retorno pendente</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                {proximosRetornos.map((ret, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <span style={{
                      flexShrink: 0, fontSize: '0.7rem', fontWeight: 700,
                      background: 'rgba(33,150,243,.15)', color: CORES.retorno,
                      borderRadius: '4px', padding: '0.1rem 0.35rem', marginTop: '1px',
                    }}>{fmtRetornoDate(ret.data_retorno)}</span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ret.cliente || ret.reuniao_titulo || '—'}
                      </p>
                      {ret.motivo_retorno && (
                        <p style={{ margin: 0, fontSize: '0.73rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ret.motivo_retorno}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Motivos de não fechamento */}
      {motivosData.length > 0 && (
        <div style={{ ...cardStyle, padding: '0.85rem 1rem' }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Motivos de Não Fechamento</p>
          <ResponsiveContainer width="100%" height={Math.max(100, motivosData.length * 36)}>
            <BarChart layout="vertical" data={motivosData} margin={{ left: 8, right: 24, top: 4 }}>
              <XAxis type="number" tick={{ fontSize: 11, fill: '#888' }} allowDecimals={false} />
              <YAxis type="category" dataKey="motivo" width={140} tick={{ fontSize: 11, fill: '#888' }} />
              <Tooltip {...TT} formatter={(v) => [v, 'Ocorrências']} />
              <Bar dataKey="contagem" fill={CORES.nao_fechou} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── Métricas mensais ──────────────────────────────────────────
function MetricasMensais() {
  const [open, setOpen]           = useState(false);
  const [anoMes, setAnoMes]       = useState(() => { const n = new Date(); return { ano: n.getFullYear(), mes: n.getMonth() + 1 }; });
  const [metricas, setMetricas]   = useState(null);
  const [semanas, setSemanas]     = useState([]);
  const [evolucao, setEvolucao]   = useState([]);
  const [loadingMes, setLoadingMes] = useState(false);

  const loadMes = useCallback(async () => {
    setLoadingMes(true);
    try {
      const [reuRes, vendRes] = await Promise.all([
        api.get(`/reunioes?periodo=mes&ano=${anoMes.ano}&mes=${anoMes.mes}`),
        api.get(`/producao?mes=${anoMes.mes}&ano=${anoMes.ano}`),
      ]);
      const all = reuRes.data.filter(m =>
        !TITULO_NAO_COMERCIAL.some(t => (m.titulo || '').toLowerCase().includes(t))
      );

      // Fechamentos = clientes distintos confirmados na aba de Vendas
      const vendItems = vendRes.data?.items || [];
      const fechamentos  = new Set(vendItems.map(i => i.cliente)).size;
      const nao_fechou   = all.filter(m => m.status === 'nao_fechou').length;
      const retornos     = all.filter(m => m.status === 'retorno').length;
      const finalizadas  = fechamentos + nao_fechou;
      const taxa_conversao = finalizadas > 0 ? Math.round((fechamentos / finalizadas) * 100) : null;
      setMetricas({ total: all.length, fechamentos, nao_fechou, retornos, taxa_conversao });

      const semanasMap = {};
      all.forEach(m => {
        const key = `S${Math.ceil(new Date(m.data_reuniao).getDate() / 7)}`;
        if (!semanasMap[key]) semanasMap[key] = { semana: key, total: 0, fechamentos: 0 };
        semanasMap[key].total++;
        if (m.status === 'fechou') semanasMap[key].fechamentos++;
      });
      setSemanas(Object.values(semanasMap).sort((a, b) => a.semana.localeCompare(b.semana)));
    } catch {} finally { setLoadingMes(false); }
  }, [anoMes]);

  const loadEvolucao = useCallback(async () => {
    try {
      const now = new Date();
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return { ano: d.getFullYear(), mes: d.getMonth() + 1 };
      });
      const [reuResps, vendResps] = await Promise.all([
        Promise.all(months.map(({ ano, mes }) => api.get(`/reunioes?periodo=mes&ano=${ano}&mes=${mes}`))),
        Promise.all(months.map(({ ano, mes }) => api.get(`/producao?mes=${mes}&ano=${ano}`))),
      ]);
      const results = months.map(({ ano, mes }, i) => {
        const all = reuResps[i].data.filter(m =>
          !TITULO_NAO_COMERCIAL.some(t => (m.titulo || '').toLowerCase().includes(t))
        );
        const vendItems = vendResps[i].data?.items || [];
        const fechamentos = new Set(vendItems.map(v => v.cliente)).size;
        const nao_fechou  = all.filter(m => m.status === 'nao_fechou').length;
        const finalizadas = fechamentos + nao_fechou;
        const taxa_conversao = finalizadas > 0 ? Math.round((fechamentos / finalizadas) * 100) : 0;
        return { label: `${MESES_PTBR[mes - 1].slice(0, 3)}/${ano}`, taxa_conversao };
      });
      setEvolucao(results);
    } catch {}
  }, []);

  useEffect(() => { if (open) { loadMes(); loadEvolucao(); } }, [open, loadMes, loadEvolucao]);

  function navMes(delta) {
    setAnoMes(prev => {
      let m = prev.mes + delta, a = prev.ano;
      if (m > 12) { m = 1; a++; } if (m < 1) { m = 12; a--; }
      return { ano: a, mes: m };
    });
  }

  const taxa     = metricas?.taxa_conversao ?? null;
  const convData = metricas ? [
    { name: 'Convertidas',     value: parseInt(metricas.fechamentos || 0), color: CORES.fechou },
    { name: 'Não convertidas', value: parseInt(metricas.nao_fechou  || 0), color: CORES.nao_fechou },
  ].filter(d => d.value > 0) : [];

  const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.85rem 1rem' };
  const noData    = <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', margin: '4rem 0' }}>Sem dados suficientes para exibir</p>;

  return (
    <div style={{ marginTop: '0.85rem' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem 1rem', cursor: 'pointer', width: '100%', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600, fontFamily: 'var(--font-sans)' }}
      >
        <span>📊 Métricas do Mês</span>
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.78rem' }}>{open ? '▲ Recolher' : '▼ Expandir'}</span>
      </button>

      {open && (
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Navegação de mês */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={() => navMes(-1)} style={btn('default', true)}>←</button>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', textTransform: 'capitalize', minWidth: '180px', textAlign: 'center' }}>
              {MESES_PTBR[anoMes.mes - 1]} / {anoMes.ano}
            </span>
            <button onClick={() => navMes(1)} style={btn('default', true)}>→</button>
          </div>

          {loadingMes && <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Carregando…</p>}

          {!loadingMes && metricas && (
            <>
              {/* Cards mensais */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.65rem' }}>
                <div style={cardStyle}>
                  <p style={{ margin: '0 0 0.2rem', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Total</p>
                  <p style={{ margin: 0, fontSize: '1.7rem', fontWeight: 700 }}>{metricas.total || 0}</p>
                </div>
                <div style={cardStyle}>
                  <p style={{ margin: '0 0 0.2rem', fontSize: '0.7rem', color: CORES.fechou, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Fechamentos</p>
                  <p style={{ margin: 0, fontSize: '1.7rem', fontWeight: 700, color: CORES.fechou }}>{metricas.fechamentos || 0}</p>
                </div>
                <div style={{ ...cardStyle, borderColor: taxa !== null ? 'var(--accent)' : 'var(--border)' }}>
                  <p style={{ margin: '0 0 0.2rem', fontSize: '0.7rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Conversão</p>
                  <p style={{ margin: 0, fontSize: '1.7rem', fontWeight: 700, color: 'var(--accent)' }}>{taxa ?? '—'}%</p>
                </div>
                <div style={cardStyle}>
                  <p style={{ margin: '0 0 0.2rem', fontSize: '0.7rem', color: CORES.retorno, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Retornos</p>
                  <p style={{ margin: 0, fontSize: '1.7rem', fontWeight: 700, color: CORES.retorno }}>{metricas.retornos || 0}</p>
                </div>
              </div>

              {/* Gráficos mensais: barras por semana + pizza conversão */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.65rem' }}>
                {/* Barras agrupadas por semana */}
                <div style={{ ...cardStyle, padding: '1rem' }}>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>Reuniões × Fechamentos por Semana</p>
                  {semanas.some(s => s.total > 0) ? (
                    <ResponsiveContainer width="100%" height={210}>
                      <BarChart data={semanas} barCategoryGap="35%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                        <XAxis dataKey="semana" tick={{ fontSize: 11, fill: '#888' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#888' }} allowDecimals={false} />
                        <Tooltip {...TT} />
                        <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                        <Bar dataKey="total"       name="Total"        fill={CORES.cinza}  radius={[4, 4, 0, 0]} />
                        <Bar dataKey="fechamentos" name="Fechamentos"  fill={CORES.fechou} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : noData}
                </div>

                {/* Pizza de conversão (donut) */}
                <div style={{ ...cardStyle, padding: '1rem' }}>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>
                    Taxa de Conversão — {MESES_PTBR[anoMes.mes - 1]}
                  </p>
                  {convData.length > 0 ? (
                    <div style={{ position: 'relative' }}>
                      <ResponsiveContainer width="100%" height={210}>
                        <PieChart>
                          <Pie data={convData} cx="50%" cy="46%" innerRadius={55} outerRadius={82} startAngle={90} endAngle={-270} dataKey="value">
                            {convData.map((d, i) => <Cell key={i} fill={d.color} />)}
                          </Pie>
                          <Tooltip {...TT} formatter={(v, n) => [v, n]} />
                          <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ position: 'absolute', top: '42%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                        <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>{taxa ?? '—'}%</p>
                      </div>
                    </div>
                  ) : noData}
                </div>
              </div>

              {/* Linha: evolução 6 meses */}
              <div style={{ ...cardStyle, padding: '1rem' }}>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>Evolução de Conversão</p>
                {evolucao.length >= 2 ? (
                  <ResponsiveContainer width="100%" height={210}>
                    <LineChart data={evolucao} margin={{ left: 0, right: 24, top: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#888' }} />
                      <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#888' }} />
                      <Tooltip {...TT} formatter={(v) => [`${v}%`, 'Conversão']} />
                      <Line type="monotone" dataKey="taxa_conversao" name="Conversão" stroke={CORES.fechou} strokeWidth={2} dot={{ fill: CORES.fechou, r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : noData}
              </div>
            </>
          )}
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
  const [proximosRetornos, setProximosRetornos] = useState([]);
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
        if (d < monday || d > fridayEnd) return false;
        const titulo = (r.titulo || '').toLowerCase();
        return !TITULO_IGNORADO.some(t => titulo.includes(t));
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
      setProximosRetornos(
        r.data
          .filter(ret => ret.data_retorno >= today)
          .sort((a, b) => a.data_retorno.localeCompare(b.data_retorno))
          .slice(0, 5)
      );
    } catch {}
  }, []);

  // Auto-importa ao montar para garantir que reuniões de hoje e futuras apareçam
  useEffect(() => {
    async function init() {
      try { await api.post('/reunioes/importar'); } catch {}
      loadReunioes();
      loadRetornosHoje();
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadReunioes(); }, [loadReunioes]);

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

      {/* Barra de resumo + Métricas mensais */}
      {!loading && <SummaryBar reunioes={reunioes} proximosRetornos={proximosRetornos} />}
      {!loading && <MetricasMensais />}

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
