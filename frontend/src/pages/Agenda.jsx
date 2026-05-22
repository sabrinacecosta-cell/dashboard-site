import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const ADMIN_EMAILS = ['sabrina@jtdkinvest.com', 'joel@wflowinvest.com'];

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatHoje() {
  return new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
}

function EventPanel() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/agenda/events/today');
      setEvents(res.data.events || []);
    } catch {
      setError('Erro ao carregar eventos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  return (
    <div style={{
      width: 280, minWidth: 280,
      background: 'var(--bg-card)',
      borderLeft: '1px solid var(--border)',
      padding: '1.25rem 1rem',
      display: 'flex', flexDirection: 'column', gap: '1rem',
      overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
          📅 Hoje, {formatHoje()}
        </span>
        <button
          onClick={fetchEvents}
          disabled={loading}
          style={{
            background: 'none', border: '1px solid var(--border)', borderRadius: 8,
            padding: '3px 10px', cursor: 'pointer', color: 'var(--text-secondary)',
            fontSize: '0.78rem',
          }}
        >
          {loading ? '...' : 'Atualizar'}
        </button>
      </div>

      {error && (
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{error}</span>
      )}

      {!loading && !error && events.length === 0 && (
        <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          Nenhum compromisso hoje.
        </span>
      )}

      {events.map((ev, i) => (
        <div key={i} style={{
          borderLeft: '3px solid var(--accent)',
          paddingLeft: '0.75rem',
          display: 'flex', flexDirection: 'column', gap: '0.25rem',
        }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 500 }}>
            🕙 {formatTime(ev.start)} – {formatTime(ev.end)}
          </span>
          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {ev.title}
          </span>
          {ev.attendees?.length > 0 && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              👥 {ev.attendees.join(', ')}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function Agenda() {
  const { user } = useAuth();
  const [iframeLoading, setIframeLoading] = useState(true);
  const isAdmin = ADMIN_EMAILS.includes(user?.email);

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - var(--header-height))',
      margin: '-1.5rem',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {iframeLoading && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg-primary)', zIndex: 1,
        }}>
          <div style={{
            width: 36, height: 36,
            border: '3px solid var(--border)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      )}
      <iframe
        src="https://agenda-mesaconsorcio.up.railway.app"
        title="Agenda"
        style={{ flex: 1, border: 'none', display: 'block' }}
        onLoad={() => setIframeLoading(false)}
        allow="fullscreen"
      />
      {isAdmin && <EventPanel />}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default Agenda;
