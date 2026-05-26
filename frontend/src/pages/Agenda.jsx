import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const ADMIN_EMAILS = ['sabrina@jtdkinvest.com', 'joel@wflowinvest.com'];

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function welcomeText(isAdmin) {
  return isAdmin
    ? 'Olá! Sou o assistente de agendamento da Mesa Consórcio.\n\nPosso verificar seus compromissos de hoje ou da semana, e agendar novas reuniões. Como posso ajudar?'
    : 'Olá! Sou o assistente de agendamento da Mesa Consórcio.\n\nPosso verificar a disponibilidade da agenda e ajudar a agendar uma reunião com nossa equipe. Como posso ajudar?';
}

// ── Message content renderer ─────────────────────────────────
function MessageContent({ msg, onOptionClick, bookingStep }) {
  const { type } = msg;

  if (type === 'text') {
    return <span style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{msg.content}</span>;
  }

  if (type === 'events_today') {
    const { events, label } = msg;
    if (!events || events.length === 0) {
      return <span>Nenhum compromisso encontrado para hoje.</span>;
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'capitalize' }}>{label}</span>
        {events.map((ev, i) => (
          <div key={i} style={{
            background: 'rgba(0,0,0,0.15)',
            borderLeft: '3px solid var(--accent)',
            borderRadius: '6px',
            padding: '0.55rem 0.75rem',
            display: 'flex', flexDirection: 'column', gap: '0.15rem',
          }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600 }}>
              🕙 {formatTime(ev.start)} – {formatTime(ev.end)}
            </span>
            <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{ev.title}</span>
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

  if (type === 'week_summary') {
    const { semana } = msg;
    if (!semana || semana.length === 0) {
      return <span>Nenhum compromisso encontrado para esta semana.</span>;
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        <span>Resumo desta semana:</span>
        {semana.map(day => {
          const occupied = day.slots?.filter(s => s.status === 'occupied').length || 0;
          const available = day.slots?.filter(s => s.status === 'available').length || 0;
          return (
            <div key={day.date} style={{
              background: 'rgba(0,0,0,0.15)',
              borderRadius: '6px',
              padding: '0.45rem 0.75rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <span style={{ fontWeight: 600, textTransform: 'capitalize', fontSize: '0.86rem' }}>{day.dayName}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginLeft: '0.4rem' }}>
                  {day.dayNumber} de {day.month}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', fontSize: '0.76rem' }}>
                {occupied > 0 && <span style={{ color: '#ff6b6b' }}>● {occupied} ocup.</span>}
                <span style={{ color: 'var(--success)' }}>● {available} livre{available !== 1 ? 's' : ''}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (type === 'dates_picker') {
    const active = bookingStep === 'date';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
        <span>Escolha uma data disponível:</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {msg.datas.map(d => (
            <button
              key={d.date}
              onClick={() => active && onOptionClick(d.date, d.label)}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                background: 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-muted)',
                cursor: active ? 'pointer' : 'default',
                fontSize: '0.84rem',
                fontFamily: 'var(--font-sans)',
                textAlign: 'left',
                opacity: active ? 1 : 0.5,
              }}
            >
              📅 {d.label} ({d.dayOfWeek}) — {d.slotsAvailable} horário{d.slotsAvailable !== 1 ? 's' : ''}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'slots_picker') {
    const active = bookingStep === 'slot';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
        <span>Escolha um horário:</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {msg.slots.map(slot => (
            <button
              key={slot.start}
              onClick={() => active && onOptionClick(slot.start, slot.label)}
              style={{
                padding: '0.38rem 0.8rem',
                borderRadius: '8px',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                background: 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-muted)',
                cursor: active ? 'pointer' : 'default',
                fontSize: '0.84rem',
                fontFamily: 'var(--font-sans)',
                opacity: active ? 1 : 0.5,
              }}
            >
              🕐 {slot.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'booking_success') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        <span>✅ {msg.message}</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Um convite foi enviado para {msg.email}.
        </span>
      </div>
    );
  }

  return <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>;
}

function getPlaceholder(step) {
  switch (step) {
    case 'date':    return 'Clique em uma data acima…';
    case 'slot':    return 'Clique em um horário acima…';
    case 'name':    return 'Seu nome completo…';
    case 'email':   return 'Seu e-mail…';
    case 'assunto': return 'Assunto da reunião (ou "-" para pular)…';
    case 'confirm': return '"sim" para confirmar ou "não" para cancelar…';
    default:        return 'Digite sua pergunta…';
  }
}

// ── Natural language date resolver ───────────────────────────
function parseDateRef(text) {
  const t = text.toLowerCase();

  const addDays = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d;
  };

  const toStr = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  if (t.includes('hoje')) return toStr(new Date());
  if (t.includes('depois de amanhã') || t.includes('depois de amanha')) return toStr(addDays(2));
  if (t.includes('amanhã') || t.includes('amanha')) return toStr(addDays(1));

  const DAY_MAP = {
    'segunda-feira': 1, 'segunda': 1,
    'terça-feira': 2, 'terca-feira': 2, 'terça': 2, 'terca': 2,
    'quarta-feira': 3, 'quarta': 3,
    'quinta-feira': 4, 'quinta': 4,
    'sexta-feira': 5, 'sexta': 5,
  };

  const isNextWeek = t.includes('próxima') || t.includes('proxima') || t.includes('semana que vem');

  for (const [key, target] of Object.entries(DAY_MAP)) {
    if (t.includes(key)) {
      const current = new Date().getDay();
      let diff = (target - current + 7) % 7 || 7;
      if (isNextWeek) diff += 7;
      return toStr(addDays(diff));
    }
  }

  return null;
}

// ── Chat component ───────────────────────────────────────────
function AgendaChat({ isAdmin, user }) {
  const [messages, setMessages] = useState(() => [{
    id: 1, role: 'assistant', type: 'text', content: welcomeText(isAdmin),
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const addMsg = useCallback((role, data) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role, ...data }]);
  }, []);

  // ── API helpers ──────────────────────────────────────────
  async function fetchToday() {
    try {
      const r = await api.get('/agenda/events/today');
      const events = r.data.events || [];
      const label = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
      addMsg('assistant', { type: 'events_today', events, label });
    } catch {
      addMsg('assistant', { type: 'text', content: 'Não foi possível carregar os compromissos de hoje. Tente novamente.' });
    }
  }

  async function fetchSemana() {
    try {
      const r = await api.get('/agenda/semana');
      addMsg('assistant', { type: 'week_summary', semana: r.data || [] });
    } catch {
      addMsg('assistant', { type: 'text', content: 'Não foi possível carregar a agenda da semana. Tente novamente.' });
    }
  }

  async function startBooking(autoDate = null) {
    try {
      const r = await api.get('/agenda/datas');
      const datas = r.data || [];
      if (datas.length === 0) {
        addMsg('assistant', { type: 'text', content: 'Não há datas disponíveis para agendamento no momento.' });
        return;
      }

      if (autoDate) {
        const match = datas.find(d => d.date === autoDate);
        if (match) {
          setBooking({ step: 'date', date: null, slotStart: null, slotLabel: null, name: '', email: user?.email || '', assunto: '', availableDates: datas, availableSlots: [] });
          addMsg('user', { type: 'text', content: match.label });
          await selectDate(match.date, match.label);
          return;
        }
        addMsg('assistant', { type: 'text', content: 'Essa data não tem horários disponíveis. Escolha uma das opções abaixo:' });
      }

      setBooking({ step: 'date', date: null, slotStart: null, slotLabel: null, name: '', email: user?.email || '', assunto: '', availableDates: datas, availableSlots: [] });
      addMsg('assistant', { type: 'dates_picker', datas });
    } catch {
      addMsg('assistant', { type: 'text', content: 'Não foi possível carregar as datas disponíveis. Tente novamente.' });
    }
  }

  async function selectDate(date, label) {
    try {
      const r = await api.get(`/agenda/slots/${date}`);
      const all = r.data || [];
      const slots = all.filter(s => !s.status || s.status === 'available');
      if (slots.length === 0) {
        addMsg('assistant', { type: 'text', content: `Sem horários disponíveis em ${label}. Escolha outra data.` });
        setBooking(prev => prev ? { ...prev, step: 'date' } : null);
        return;
      }
      setBooking(prev => prev ? { ...prev, step: 'slot', date, availableSlots: slots } : null);
      addMsg('assistant', { type: 'slots_picker', slots });
    } catch {
      addMsg('assistant', { type: 'text', content: 'Erro ao carregar horários. Tente novamente.' });
    }
  }

  function selectSlot(slotStart, slotLabel) {
    setBooking(prev => prev ? { ...prev, step: 'name', slotStart, slotLabel } : null);
    addMsg('assistant', { type: 'text', content: 'Qual é o seu nome completo?' });
  }

  async function confirmBooking(bk) {
    try {
      const r = await api.post('/agenda/agendar', {
        date: bk.date,
        time: bk.slotStart,
        emails: [bk.email],
        title: bk.assunto || undefined,
      });
      setBooking(null);
      addMsg('assistant', { type: 'booking_success', message: r.data.message || 'Agendamento confirmado!', email: bk.email });
    } catch (err) {
      addMsg('assistant', { type: 'text', content: err.response?.data?.error || 'Erro ao confirmar agendamento. Tente novamente.' });
    }
  }

  // ── Booking flow ─────────────────────────────────────────
  async function handleBookingInput(text) {
    const { step } = booking;

    if (step === 'date') {
      const lower = text.toLowerCase();

      // Try natural language first ("amanhã", "segunda", etc.)
      const dateRef = parseDateRef(lower);
      if (dateRef) {
        const match = booking.availableDates.find(d => d.date === dateRef);
        if (match) { await selectDate(match.date, match.label); return; }
        addMsg('assistant', { type: 'text', content: 'Essa data não está disponível. Escolha uma das opções acima.' });
        return;
      }

      const match = booking.availableDates.find(d =>
        d.label.toLowerCase().includes(lower) ||
        d.dayOfWeek?.toLowerCase().includes(lower) ||
        d.date === text
      );
      if (match) await selectDate(match.date, match.label);
      else addMsg('assistant', { type: 'text', content: 'Por favor clique em uma das datas acima ou digite "amanhã", "segunda", etc.' });
      return;
    }

    if (step === 'slot') {
      const match = booking.availableSlots.find(s => s.label?.includes(text) || s.start?.includes(text));
      if (match) selectSlot(match.start, match.label);
      else addMsg('assistant', { type: 'text', content: 'Por favor clique em um dos horários acima.' });
      return;
    }

    if (step === 'name') {
      setBooking(prev => ({ ...prev, step: 'email', name: text }));
      addMsg('assistant', { type: 'text', content: 'Qual é o seu e-mail? (será usado para o convite da reunião)' });
      return;
    }

    if (step === 'email') {
      if (!text.includes('@')) {
        addMsg('assistant', { type: 'text', content: 'Por favor informe um e-mail válido.' });
        return;
      }
      setBooking(prev => ({ ...prev, step: 'assunto', email: text }));
      addMsg('assistant', { type: 'text', content: 'Qual é o assunto da reunião? (opcional — digite "-" para pular)' });
      return;
    }

    if (step === 'assunto') {
      const assunto = (text === '-' || text.toLowerCase() === 'pular') ? '' : text;
      const newBk = { ...booking, step: 'confirm', assunto };
      setBooking(newBk);
      addMsg('assistant', {
        type: 'text',
        content: `Confira os detalhes:\n\n📅 ${formatDateLabel(newBk.date)}\n🕐 ${newBk.slotLabel}\n👤 ${newBk.name}\n📧 ${newBk.email}${assunto ? '\n📝 ' + assunto : ''}\n\nConfirmar? (sim / não)`,
      });
      return;
    }

    if (step === 'confirm') {
      const lower = text.toLowerCase();
      if (['sim', 's', 'yes', 'confirmar', 'ok'].includes(lower)) {
        await confirmBooking(booking);
      } else if (['não', 'nao', 'n', 'no', 'cancelar'].includes(lower)) {
        setBooking(null);
        addMsg('assistant', { type: 'text', content: 'Agendamento cancelado. Posso ajudar com mais alguma coisa?' });
      } else {
        addMsg('assistant', { type: 'text', content: 'Responda "sim" para confirmar ou "não" para cancelar.' });
      }
    }
  }

  // ── Free-text interpreter ────────────────────────────────
  async function interpret(raw) {
    const t = raw.toLowerCase();
    const wantsToday = isAdmin && (t.includes('hoje') || (t.includes('compromisso') && !t.includes('agendar')));
    const wantsSemana = isAdmin && t.includes('semana');
    const wantsBook = t.includes('agendar') || t.includes('reunião') || t.includes('reuniao') || t.includes('marcar');
    const wantsAvail = t.includes('disponibilidade') || t.includes('disponív') || t.includes('horário') || t.includes('horario');

    if (wantsToday) {
      await fetchToday();
    } else if (wantsSemana) {
      await fetchSemana();
    } else if (wantsBook || wantsAvail) {
      await startBooking(parseDateRef(t));
    } else {
      const tips = isAdmin
        ? 'Posso ajudar com:\n• "compromissos de hoje"\n• "agenda desta semana"\n• "quero agendar uma reunião"'
        : 'Posso ajudar com:\n• "quero agendar uma reunião"\n• "verificar disponibilidade"';
      addMsg('assistant', { type: 'text', content: tips });
    }
  }

  // ── Picker click handler ─────────────────────────────────
  async function handleOptionClick(msgType, value, label) {
    if (!booking) return;
    if (msgType === 'dates_picker' && booking.step !== 'date') return;
    if (msgType === 'slots_picker' && booking.step !== 'slot') return;

    addMsg('user', { type: 'text', content: label });
    setLoading(true);
    try {
      if (msgType === 'dates_picker') await selectDate(value, label);
      else selectSlot(value, label);
    } finally {
      setLoading(false);
    }
  }

  // ── Send ─────────────────────────────────────────────────
  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    addMsg('user', { type: 'text', content: text });
    inputRef.current?.focus();

    setLoading(true);
    try {
      if (booking) await handleBookingInput(text);
      else await interpret(text);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const step = booking?.step ?? null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 210px)',
      minHeight: '420px',
      background: 'var(--bg-card)',
      borderRadius: '14px',
      border: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      {/* Messages area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1.25rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.8rem',
      }}>
        {messages.map(msg => (
          <div key={msg.id} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '84%',
              padding: '0.65rem 0.9rem',
              borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-secondary)',
              color: msg.role === 'user' ? '#000' : 'var(--text-primary)',
              fontSize: '0.87rem',
              border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
              lineHeight: 1.5,
            }}>
              <MessageContent
                msg={msg}
                onOptionClick={(value, label) => handleOptionClick(msg.type, value, label)}
                bookingStep={step}
              />
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '0.6rem 0.9rem',
              borderRadius: '14px 14px 14px 4px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              fontSize: '0.84rem',
            }}>
              Consultando agenda…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '0.65rem 0.9rem',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
        background: 'var(--bg-secondary)',
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder(step)}
          disabled={loading}
          autoComplete="off"
          style={{
            flex: 1,
            minWidth: 0,
            padding: '0.58rem 0.85rem',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.15)',
            background: '#3a3a3c',
            color: '#ffffff',
            WebkitTextFillColor: '#ffffff',
            caretColor: '#ffffff',
            fontSize: '0.88rem',
            fontFamily: 'inherit',
            outline: 'none',
            opacity: loading ? 0.6 : 1,
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          style={{
            width: 'auto',
            flexShrink: 0,
            padding: '0.58rem 1.1rem',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: (input.trim() && !loading) ? 'var(--accent)' : 'transparent',
            color: (input.trim() && !loading) ? '#000' : 'var(--text-muted)',
            cursor: (input.trim() && !loading) ? 'pointer' : 'not-allowed',
            fontWeight: 600,
            fontSize: '0.87rem',
            fontFamily: 'var(--font-sans)',
            marginTop: 0,
            whiteSpace: 'nowrap',
          }}
        >
          Enviar
        </button>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────
function Agenda() {
  const { user } = useAuth();
  const isAdmin = ADMIN_EMAILS.includes(user?.email);

  return (
    <div className="page-agenda">
      <div className="page-header">
        <h1>📅 Agendamentos</h1>
        <p className="page-subtitle">
          {isAdmin ? 'Gerencie os compromissos da mesa' : 'Agende uma reunião com nossa equipe'}
        </p>
      </div>
      <AgendaChat isAdmin={isAdmin} user={user} />
    </div>
  );
}

export default Agenda;
