import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import AgendamentoForm from '../components/AgendamentoForm';

const ADMIN_EMAILS = ['sabrina@jtdkinvest.com', 'joel@wflowinvest.com'];

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatHojeLabel() {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function tabBtn(active) {
  return {
    padding: '0.45rem 1.1rem',
    borderRadius: '8px',
    border: active ? 'none' : '1px solid var(--border)',
    background: active ? 'var(--accent)' : 'var(--bg-secondary)',
    color: active ? '#000' : 'var(--text-primary)',
    cursor: 'pointer',
    fontWeight: active ? 600 : 400,
    fontSize: '0.88rem',
    fontFamily: 'var(--font-sans)',
  };
}

function outlineBtn() {
  return {
    padding: '0.45rem 1.1rem',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    fontSize: '0.88rem',
    fontFamily: 'var(--font-sans)',
  };
}

// ── Admin: Hoje ──────────────────────────────────────────────
function EventosHoje({ onAgendar }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.get('/agenda/events/today');
      setEvents(r.data.events || []);
    } catch {
      setError('Erro ao carregar eventos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{formatHojeLabel()}</span>
        <button onClick={load} disabled={loading} style={outlineBtn()}>
          {loading ? '...' : '↻ Atualizar'}
        </button>
      </div>

      {error && (
        <p style={{ color: '#ff6b6b', fontSize: '0.85rem', margin: 0 }}>{error}</p>
      )}

      {!loading && !error && events.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
          Nenhum compromisso encontrado.
        </p>
      )}

      {events.map((ev, i) => (
        <div key={i} style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderLeft: '3px solid var(--accent)',
          borderRadius: '10px',
          padding: '0.9rem 1rem',
          display: 'flex', flexDirection: 'column', gap: '0.3rem',
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>
            🕙 {formatTime(ev.start)} – {formatTime(ev.end)}
          </span>
          <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {ev.title}
          </span>
          {ev.attendees?.length > 0 && (
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              👥 {ev.attendees.join(', ')}
            </span>
          )}
        </div>
      ))}

      <button
        onClick={onAgendar}
        style={{
          alignSelf: 'flex-start',
          marginTop: '0.25rem',
          padding: '0.5rem 1.2rem',
          borderRadius: '8px',
          border: 'none',
          background: 'var(--accent)',
          color: '#000',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '0.88rem',
          fontFamily: 'var(--font-sans)',
        }}
      >
        + Agendar nova reunião
      </button>
    </div>
  );
}

// ── Admin: Semana ────────────────────────────────────────────
function EventosSemana() {
  const [semana, setSemana] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.get('/agenda/semana');
      setSemana(r.data || []);
    } catch {
      setError('Erro ao carregar semana.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={load} disabled={loading} style={outlineBtn()}>
          {loading ? '...' : '↻ Atualizar'}
        </button>
      </div>

      {error && (
        <p style={{ color: '#ff6b6b', fontSize: '0.85rem', margin: 0 }}>{error}</p>
      )}

      {!loading && !error && semana.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
          Nenhum compromisso encontrado.
        </p>
      )}

      {semana.map(day => {
        const occupied = day.slots?.filter(s => s.status === 'occupied').length || 0;
        const available = day.slots?.filter(s => s.status === 'available').length || 0;
        return (
          <div key={day.date} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '0.85rem 1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
          }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                {day.dayName}
              </p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {day.dayNumber} de {day.month}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.82rem' }}>
              {occupied > 0 && (
                <span style={{ color: '#ff6b6b' }}>● {occupied} ocupado{occupied !== 1 ? 's' : ''}</span>
              )}
              <span style={{ color: 'var(--success)' }}>● {available} livre{available !== 1 ? 's' : ''}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Modal de agendamento ─────────────────────────────────────
function ModalAgendar({ onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem',
    }}>
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: '14px',
        padding: '1.75rem',
        width: '100%', maxWidth: '480px',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
      }}>
        <h3 style={{ margin: '0 0 1.5rem', fontSize: '1rem', color: 'var(--text-primary)' }}>
          Nova reunião
        </h3>
        <AgendamentoForm
          onSuccess={() => setTimeout(onClose, 2500)}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}

// ── Admin ────────────────────────────────────────────────────
function AdminAgenda() {
  const [tab, setTab] = useState('hoje');
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button onClick={() => setTab('hoje')} style={tabBtn(tab === 'hoje')}>Hoje</button>
        <button onClick={() => setTab('semana')} style={tabBtn(tab === 'semana')}>Esta semana</button>
      </div>

      {tab === 'hoje' && <EventosHoje onAgendar={() => setShowModal(true)} />}
      {tab === 'semana' && <EventosSemana />}

      {showModal && <ModalAgendar onClose={() => setShowModal(false)} />}
    </>
  );
}

// ── Assessor ─────────────────────────────────────────────────
function AssessorAgenda({ user }) {
  return (
    <div style={{ maxWidth: 520 }}>
      <AgendamentoForm initialEmail={user?.email || ''} />
    </div>
  );
}

// ── Página ───────────────────────────────────────────────────
function Agenda() {
  const { user } = useAuth();
  const isAdmin = ADMIN_EMAILS.includes(user?.email);

  return (
    <div className="page-agenda">
      <div className="page-header">
        <h1>📅 Agenda</h1>
        <p className="page-subtitle">
          {isAdmin ? 'Gerencie os compromissos da mesa' : 'Agende uma reunião com nossa equipe'}
        </p>
      </div>
      {isAdmin ? <AdminAgenda /> : <AssessorAgenda user={user} />}
    </div>
  );
}

export default Agenda;
