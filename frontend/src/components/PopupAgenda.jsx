import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const ADMIN_EMAILS = ['sabrina@jtdkinvest.com', 'joel@wflowinvest.com'];
const INTERVAL_MS = 7_200_000; // 2 horas
const AUTO_CLOSE_MS = 15_000;  // 15 segundos
const STORAGE_KEY = 'popup_agenda_last_shown';

function fmtTime(d) {
  return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function PopupAgenda({ userEmail, onNavigate }) {
  const [visible, setVisible] = useState(false);
  const [eventos, setEventos] = useState([]);
  const [retornos, setRetornos] = useState([]);
  const [loading, setLoading] = useState(false);

  const shouldShow = useCallback(() => {
    const last = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    return Date.now() - last > INTERVAL_MS;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ev, ret] = await Promise.all([
        api.get('/agenda/events/today').catch(() => ({ data: { events: [] } })),
        api.get('/retornos/pendentes').catch(() => ({ data: [] })),
      ]);
      setEventos(ev.data.events || []);

      const hoje = new Date().toISOString().slice(0, 10);
      setRetornos((ret.data || []).filter(r => r.data_retorno <= hoje));
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, []);

  const show = useCallback(async () => {
    await load();
    setVisible(true);
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  }, [load]);

  const close = useCallback(() => setVisible(false), []);

  // Popup inicial: 3s após mount
  useEffect(() => {
    if (!ADMIN_EMAILS.includes(userEmail)) return;
    const t = setTimeout(show, 3000);
    return () => clearTimeout(t);
  }, [userEmail, show]);

  // Auto-close em 15s
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(close, AUTO_CLOSE_MS);
    return () => clearTimeout(t);
  }, [visible, close]);

  // Repete a cada 2h se houver retornos pendentes hoje
  useEffect(() => {
    if (!ADMIN_EMAILS.includes(userEmail)) return;

    const interval = setInterval(async () => {
      if (!shouldShow()) return;
      try {
        const hoje = new Date().toISOString().slice(0, 10);
        const ret = await api.get('/retornos/pendentes').catch(() => ({ data: [] }));
        const pendentesHoje = (ret.data || []).filter(r => r.data_retorno <= hoje);
        if (pendentesHoje.length > 0) show();
      } catch {}
    }, INTERVAL_MS);

    return () => clearInterval(interval);
  }, [userEmail, shouldShow, show]);

  if (!visible || (!eventos.length && !retornos.length && !loading)) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '1.5rem',
      right: '1.5rem',
      width: '320px',
      maxWidth: 'calc(100vw - 3rem)',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: '14px',
      boxShadow: '0 8px 32px rgba(0,0,0,.4)',
      zIndex: 900,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>📅 Agenda do dia</span>
        <button
          onClick={close}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', padding: '0 0.25rem' }}
        >✕</button>
      </div>

      <div style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '340px', overflowY: 'auto' }}>
        {loading && <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Carregando…</p>}

        {/* Eventos de hoje */}
        {eventos.length > 0 && (
          <div>
            <p style={{ margin: '0 0 0.45rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Compromissos de hoje
            </p>
            {eventos.map((ev, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap', paddingTop: '0.1rem' }}>
                  {fmtTime(ev.start)}
                </span>
                <span style={{ fontSize: '0.83rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>{ev.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* Retornos pendentes hoje */}
        {retornos.length > 0 && (
          <div>
            <p style={{ margin: '0 0 0.45rem', fontSize: '0.72rem', fontWeight: 700, color: '#f44336', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Retornos para hoje ({retornos.length})
            </p>
            {retornos.slice(0, 4).map((r, i) => (
              <div key={i} style={{ marginBottom: '0.35rem' }}>
                <p style={{ margin: 0, fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {r.cliente || r.reuniao_titulo}
                </p>
                {r.motivo_retorno && (
                  <p style={{ margin: '0.1rem 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{r.motivo_retorno}</p>
                )}
              </div>
            ))}
            {retornos.length > 4 && (
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>+ {retornos.length - 4} mais</p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {retornos.length > 0 && (
        <div style={{ padding: '0.6rem 1rem', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => { onNavigate('/reunioes'); close(); }}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.83rem', fontWeight: 600, padding: 0 }}
          >
            Ver todos os retornos →
          </button>
        </div>
      )}
    </div>
  );
}

export default PopupAgenda;
