import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const ADMIN_EMAILS = ['sabrina@jtdkinvest.com', 'joel@jtdkinvest.com', 'joel@wflowinvest.com'];

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
function MessageContent({ msg, onOptionClick, onWeekSlotPick, bookingStep }) {
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
            <span style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600 }}> {formatTime(ev.start)} – {formatTime(ev.end)}
            </span>
            <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{ev.title}</span>
            {ev.attendees?.length > 0 && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}> {ev.attendees.join(', ')}
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

  if (type === 'week_availability') {
    const { dias } = msg;
    if (!dias || dias.length === 0) {
      return <span>Não há horários disponíveis nesta semana.</span>;
    }
    const chipStyle = {
      padding: '0.32rem 0.6rem',
      borderRadius: '6px',
      border: '1px solid var(--border)',
      background: 'rgba(0,0,0,0.15)',
      color: 'var(--text-primary)',
      cursor: 'pointer',
      fontSize: '0.8rem',
      fontFamily: 'var(--font-sans)',
      lineHeight: 1.2,
      whiteSpace: 'nowrap',
    };
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <span style={{ fontWeight: 600 }}>Disponibilidade da semana:</span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{
            display: 'flex', gap: '0.75rem',
            padding: '0.5rem 0.6rem',
            fontSize: '0.76rem', color: 'var(--text-secondary)', fontWeight: 600,
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ width: '54px', flexShrink: 0 }}>Dia</span>
            <span>Horários disponíveis</span>
          </div>
          {dias.map(dia => (
            <div key={dia.date} style={{
              display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
              padding: '0.6rem',
              borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ width: '54px', flexShrink: 0, fontSize: '0.8rem', fontWeight: 600, lineHeight: 1.35 }}>
                {dia.dayShort},<br />{dia.dayMonth}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {dia.slots.map(slot => (
                  <button
                    key={slot.start}
                    onClick={() => onWeekSlotPick(dia.date, slot)}
                    style={chipStyle}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
          Clique em um horário para agendar diretamente.
        </span>
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
            > {d.label} ({d.dayOfWeek}) — {d.slotsAvailable} horário{d.slotsAvailable !== 1 ? 's' : ''}
            </button>
          ))}
        </div>
        {active && (!msg.semanas || msg.semanas < 4) && (
          <button
            onClick={() => onOptionClick('__mais_datas__', 'Ver mais datas')}
            style={{
              padding: '0.38rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontFamily: 'var(--font-sans)',
              textAlign: 'left',
            }}
          >
            ↓ Ver mais datas
          </button>
        )}
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
            > {slot.label}
            </button>
          ))}
        </div>
        {active && (
          <button
            onClick={() => onOptionClick('__volta_datas__', 'Escolher outro dia')}
            style={{
              alignSelf: 'flex-start',
              padding: '0.28rem 0.7rem',
              borderRadius: '999px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.76rem',
              fontFamily: 'var(--font-sans)',
            }}
          >
            ← Escolher outro dia
          </button>
        )}
      </div>
    );
  }

  if (type === 'booking_success') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        <span> {msg.message}</span>
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

// ── Next-week date range (Mon–Fri) ───────────────────────────
function nextWeekRange() {
  const toStr = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const daysToNextMon = (8 - dow) % 7 || 7;
  const mon = new Date(today); mon.setDate(today.getDate() + daysToNextMon);
  const fri = new Date(mon);   fri.setDate(mon.getDate() + 4);
  return { from: toStr(mon), to: toStr(fri) };
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

  // dd/mm/yyyy or dd/mm
  const fullDate = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
  if (fullDate) {
    const now = new Date();
    const day = parseInt(fullDate[1], 10);
    const month = parseInt(fullDate[2], 10) - 1;
    const year = fullDate[3] ? parseInt(fullDate[3], 10) : now.getFullYear();
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return toStr(d);
  }

  // "dia 27" or just "27" (assumes current month/year)
  const MONTH_MAP = { janeiro:0, fevereiro:1, março:2, marco:2, abril:3, maio:4, junho:5, julho:6, agosto:7, setembro:8, outubro:9, novembro:10, dezembro:11 };
  for (const [name, idx] of Object.entries(MONTH_MAP)) {
    const m = t.match(new RegExp(`(\\d{1,2})\\s+de\\s+${name}`));
    if (m) {
      const now = new Date();
      const d = new Date(now.getFullYear(), idx, parseInt(m[1], 10));
      return toStr(d);
    }
  }

  const dayOnly = t.match(/\bdia\s+(\d{1,2})\b/);
  if (dayOnly) {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), parseInt(dayOnly[1], 10));
    return toStr(d);
  }

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
  async function fetchDay(dateStr) {
    try {
      const r = await api.get(`/agenda/events/${dateStr}`);
      const events = r.data.events || [];
      const [y, m, d] = dateStr.split('-').map(Number);
      const label = new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
      addMsg('assistant', { type: 'events_today', events, label });
    } catch {
      addMsg('assistant', { type: 'text', content: 'Não foi possível carregar os compromissos. Tente novamente.' });
    }
  }

  async function fetchToday() {
    const today = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      .split('/').reverse().join('-');
    await fetchDay(today);
  }

  async function fetchSemana() {
    try {
      const r = await api.get('/agenda/semana');
      addMsg('assistant', { type: 'week_summary', semana: r.data || [] });
    } catch {
      addMsg('assistant', { type: 'text', content: 'Não foi possível carregar a agenda da semana. Tente novamente.' });
    }
  }

  async function fetchSemanaDisponibilidade(semanas = 1) {
    try {
      const r = await api.get(`/agenda/semana-disponibilidade?semanas=${semanas}`);
      const dias = r.data || [];
      if (dias.length === 0) {
        addMsg('assistant', { type: 'text', content: 'Não há horários disponíveis nesta semana.' });
        return;
      }
      addMsg('assistant', { type: 'week_availability', dias });
    } catch {
      addMsg('assistant', { type: 'text', content: 'Não foi possível carregar a disponibilidade da semana. Tente novamente.' });
    }
  }

  // Clique num chip da tabela da semana → agenda aquele horário direto
  function pickWeekSlot(date, slot) {
    const [y, m, d] = date.split('-').map(Number);
    const dLabel = new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    addMsg('user', { type: 'text', content: `${dLabel} às ${slot.label}` });
    setBooking({ step: 'name', date, slotStart: slot.start, slotLabel: slot.label, name: '', email: user?.email || '', assunto: '', availableDates: [], availableSlots: [] });
    addMsg('assistant', { type: 'text', content: 'Qual é o seu nome completo?' });
  }

  async function startBooking(autoDate = null, semanas = 1, filterRange = null) {
    try {
      const r = await api.get(`/agenda/datas?semanas=${semanas}`);
      let datas = r.data || [];

      // Filter to a specific date range if provided (e.g. next week Mon–Fri)
      if (filterRange) {
        datas = datas.filter(d => d.date >= filterRange.from && d.date <= filterRange.to);
      }

      if (datas.length === 0) {
        addMsg('assistant', { type: 'text', content: filterRange ? 'Não há horários disponíveis na semana que vem.' : 'Não há datas disponíveis para agendamento no momento.' });
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
      addMsg('assistant', { type: 'dates_picker', datas, semanas });
    } catch {
      addMsg('assistant', { type: 'text', content: 'Não foi possível carregar as datas disponíveis. Tente novamente.' });
    }
  }

  // Mostra diretamente os slots de um dia específico sem passar pelo seletor de datas
  async function showSlotsForDate(dateStr) {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const label = new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
      const r = await api.get(`/agenda/slots/${dateStr}`);
      const slots = (r.data || []).filter(s => !s.status || s.status === 'available');

      if (slots.length === 0) {
        addMsg('assistant', { type: 'text', content: `Não há horários disponíveis em ${label}.` });
        return;
      }

      // Inicializa booking para que a seleção de slot funcione normalmente
      setBooking({ step: 'slot', date: dateStr, slotStart: null, slotLabel: null, name: '', email: user?.email || '', assunto: '', availableDates: [], availableSlots: slots });
      addMsg('assistant', { type: 'text', content: `Horários disponíveis em ${label}:` });
      addMsg('assistant', { type: 'slots_picker', slots });
    } catch {
      addMsg('assistant', { type: 'text', content: 'Não foi possível carregar os horários. Tente novamente.' });
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
        content: `Confira os detalhes:\n\n ${formatDateLabel(newBk.date)}\n ${newBk.slotLabel}\n ${newBk.name}\n ${newBk.email}\n joel@wflowinvest.com (já incluso)\n  Remetente: sabrina@jtdkinvest.com${assunto ? '\n ' + assunto : ''}\n\nConfirmar? (sim / não)`,
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
    const dateRef = parseDateRef(t);
    const isNextWeek = t.includes('semana que vem') || t.includes('próxima semana') || t.includes('proxima semana');
    const wantsCompromissos = isAdmin && (t.includes('compromisso') || t.includes('agenda') || (t.includes('reunião') && t.includes('tenho')));
    const wantsBook = t.includes('agendar') || t.includes('marcar') || (t.includes('reunião') && !t.includes('tenho'));
    const wantsAvail = t.includes('disponibilidade') || t.includes('disponív') || t.includes('horário') || t.includes('horario') || t.includes('horários');
    const wantsMore = t.includes('mais') && (t.includes('data') || t.includes('semana') || t.includes('opção') || t.includes('opcao'));
    const wantsSemanaDisp = t.includes('semana') && (wantsAvail || wantsBook) && !isNextWeek && !wantsMore;
    const wantsSemana = isAdmin && t.includes('semana') && !wantsBook && !wantsAvail && !isNextWeek;

    if (wantsCompromissos && dateRef) {
      await fetchDay(dateRef);
    } else if (wantsCompromissos && t.includes('hoje')) {
      await fetchToday();
    } else if (isNextWeek) {
      await startBooking(null, 2, nextWeekRange());
    } else if (wantsSemanaDisp) {
      await fetchSemanaDisponibilidade(1);
    } else if (wantsSemana) {
      await fetchSemana();
    } else if (wantsMore) {
      await startBooking(null, 4);
    } else if ((wantsAvail || wantsBook) && dateRef) {
      // Pediu disponibilidade/horários de um dia específico → mostra slots diretamente
      await showSlotsForDate(dateRef);
    } else if (wantsBook || wantsAvail) {
      await startBooking(null);
    } else if (dateRef) {
      await showSlotsForDate(dateRef);
    } else if (isAdmin && t.includes('hoje')) {
      await fetchToday();
    } else {
      const tips = isAdmin
        ? 'Posso ajudar com:\n• "compromissos de hoje"\n• "compromissos de amanhã"\n• "horários de semana que vem"\n• "quero agendar uma reunião"\n• "mostrar mais datas"'
        : 'Posso ajudar com:\n• "quero agendar uma reunião"\n• "horários de semana que vem"\n• "mostrar mais datas"';
      addMsg('assistant', { type: 'text', content: tips });
    }
  }

  // ── Picker click handler ─────────────────────────────────
  async function handleOptionClick(msgType, value, label) {
    if (!booking) return;
    if (msgType === 'dates_picker' && booking.step !== 'date') return;
    if (msgType === 'slots_picker' && booking.step !== 'slot') return;

    // "Ver mais datas" button
    if (value === '__mais_datas__') {
      setLoading(true);
      try { await startBooking(null, 4); } finally { setLoading(false); }
      return;
    }

    // "Escolher outro dia" — volta ao seletor de datas
    if (value === '__volta_datas__') {
      const datas = booking.availableDates || [];
      setBooking(prev => prev ? { ...prev, step: 'date', date: null, slotStart: null, slotLabel: null, availableSlots: [] } : null);
      addMsg('assistant', { type: 'dates_picker', datas, semanas: 1 });
      return;
    }

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

  async function quickAction(fn) {
    if (loading) return;
    setLoading(true);
    try { await fn(); } finally { setLoading(false); }
  }

  const qBtnStyle = {
    padding: '0.28rem 0.75rem',
    borderRadius: '999px',
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text-muted)',
    cursor: loading ? 'not-allowed' : 'pointer',
    fontSize: '0.76rem',
    fontFamily: 'var(--font-sans)',
    fontWeight: 500,
    opacity: loading ? 0.4 : 1,
    whiteSpace: 'nowrap',
    lineHeight: 1.4,
  };

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
                onWeekSlotPick={pickWeekSlot}
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

      {/* Quick action buttons */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '0.35rem',
        padding: '0.5rem 0.9rem 0',
        background: 'var(--bg-secondary)',
      }}>
        <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
          Escolha uma das 3 datas abaixo para ver as disponibilidades de horário
        </span>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'nowrap' }}>
          <button style={qBtnStyle} onClick={() => quickAction(() => showSlotsForDate(parseDateRef('hoje')))}>Hoje</button>
          <button style={qBtnStyle} onClick={() => quickAction(() => showSlotsForDate(parseDateRef('amanhã')))}>Amanhã</button>
          <button style={qBtnStyle} onClick={() => quickAction(() => fetchSemanaDisponibilidade(1))}>Esta semana</button>
        </div>
      </div>

      {/* Input bar */}
      <div style={{
        padding: '0.45rem 0.9rem 0.65rem',
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
        <h1> Agendamentos</h1>
        <p className="page-subtitle">
          {isAdmin ? 'Gerencie os compromissos da mesa' : 'Agende uma reunião com nossa equipe'}
        </p>
      </div>
      <AgendaChat isAdmin={isAdmin} user={user} />
    </div>
  );
}

export default Agenda;
