const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const { oauth2Client, isConnected } = require('../config/google');
const authMiddleware = require('../middlewares/authMiddleware');

// Always included in every calendar invite
const INTERNAL_ATTENDEES = ['joel@wfloinvest.com', 'sabrina.costa@wflowinvest.com'];

// Brazil is always UTC-3 (no DST since 2019)
const WORK_START = 9;
const WORK_END = 18;
const SLOT_DURATION = 60; // minutes
const LUNCH_START_H = 12;
const LUNCH_START_M = 0;
const LUNCH_END_H = 13;
const LUNCH_END_M = 45;

function getCalendar() {
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

// Build a UTC Date from a Brazil date string (YYYY-MM-DD) + hour + minute
function brazilDT(dateStr, hour, minute = 0) {
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return new Date(`${dateStr}T${hh}:${mm}:00-03:00`);
}

// Format UTC Date as "HH:MM" in Brazil timezone
function fmtHHMM(date) {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' });
}

// Day of week for a YYYY-MM-DD string (0=Sun … 6=Sat) — timezone-independent
function dayOfWeek(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// Human-readable day-of-week in pt-BR
function dayOfWeekLabel(dateStr) {
  return brazilDT(dateStr, 12).toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' });
}

// "dd/MM/yyyy"
function fmtDate(dateStr) {
  return brazilDT(dateStr, 12).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' });
}

// YYYY-MM-DD → { day, month (short), dayNumber }
function dateParts(dateStr) {
  const d = brazilDT(dateStr, 12);
  return {
    dayName: d.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' }),
    dayNumber: d.toLocaleDateString('pt-BR', { day: '2-digit', timeZone: 'America/Sao_Paulo' }),
    month: d.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'America/Sao_Paulo' }).replace('.', ''),
  };
}

async function getEventsForDate(dateStr) {
  const calendar = getCalendar();
  const timeMin = brazilDT(dateStr, 0).toISOString();
  const timeMax = brazilDT(dateStr, 23, 59).toISOString();

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return res.data.items || [];
}

async function buildSlotsForDate(dateStr) {
  const dow = dayOfWeek(dateStr);
  if (dow === 0 || dow === 6) return []; // weekend

  const now = new Date();
  const dayEnd = brazilDT(dateStr, 23, 59);
  if (dayEnd < now) return []; // past date

  const events = await getEventsForDate(dateStr);
  const slots = [];

  const lunchStart = brazilDT(dateStr, LUNCH_START_H, LUNCH_START_M);
  const lunchEnd = brazilDT(dateStr, LUNCH_END_H, LUNCH_END_M);
  const workEnd = brazilDT(dateStr, WORK_END);

  let cur = brazilDT(dateStr, WORK_START);

  while (cur < workEnd) {
    const slotEnd = new Date(cur.getTime() + SLOT_DURATION * 60 * 1000);
    if (slotEnd > workEnd) break;

    if (cur >= now) {
      const isLunch = cur < lunchEnd && slotEnd > lunchStart;

      if (!isLunch) {
        const conflict = events.some(ev => {
          if (!ev.start?.dateTime || !ev.end?.dateTime) return false;
          const s = new Date(ev.start.dateTime);
          const e = new Date(ev.end.dateTime);
          return cur < e && slotEnd > s;
        });

        if (!conflict) {
          slots.push({
            start: cur.toISOString(),
            end: slotEnd.toISOString(),
            label: fmtHHMM(cur),
            status: 'available',
          });
        }
      }
    }

    cur = new Date(cur.getTime() + SLOT_DURATION * 60 * 1000);
  }

  return slots;
}

// ── Routes ────────────────────────────────────────────────────

// Today's events (admin view)
router.get('/agenda/events/today', authMiddleware, async (req, res) => {
  if (!isConnected()) return res.status(503).json({ error: 'Google Calendar não conectado' });

  try {
    const today = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      .split('/').reverse().join('-'); // YYYY-MM-DD

    const items = await getEventsForDate(today);
    const events = items
      .filter(ev => ev.start?.dateTime)
      .map(ev => ({
        title: ev.summary || '(sem título)',
        start: ev.start.dateTime,
        end: ev.end?.dateTime || ev.start.dateTime,
        attendees: (ev.attendees || []).map(a => a.email),
      }));

    res.json({ events });
  } catch (err) {
    console.error('agenda/events/today:', err.message);
    res.status(500).json({ error: 'Erro ao buscar eventos' });
  }
});

// Week summary
router.get('/agenda/semana', authMiddleware, async (req, res) => {
  if (!isConnected()) return res.status(503).json({ error: 'Google Calendar não conectado' });

  try {
    const result = [];
    const now = new Date();
    let day = new Date(now);
    let added = 0;

    while (added < 5) {
      const dateStr = day.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        .split('/').reverse().join('-');

      const dow = dayOfWeek(dateStr);
      if (dow !== 0 && dow !== 6) {
        const events = await getEventsForDate(dateStr);
        const lunchStart = brazilDT(dateStr, LUNCH_START_H, LUNCH_START_M);
        const lunchEnd = brazilDT(dateStr, LUNCH_END_H, LUNCH_END_M);
        const workEnd = brazilDT(dateStr, WORK_END);
        const slots = [];

        let cur = brazilDT(dateStr, WORK_START);
        while (cur < workEnd) {
          const slotEnd = new Date(cur.getTime() + 60 * 60 * 1000);
          if (slotEnd > workEnd) break;

          const isLunch = cur < lunchEnd && slotEnd > lunchStart;
          if (!isLunch) {
            const isPast = cur < now;
            const isOccupied = events.some(ev => {
              if (!ev.start?.dateTime || !ev.end?.dateTime) return false;
              const s = new Date(ev.start.dateTime);
              const e = new Date(ev.end.dateTime);
              return cur < e && slotEnd > s;
            });
            slots.push({ time: fmtHHMM(cur), status: isPast ? 'past' : (isOccupied ? 'occupied' : 'available') });
          }
          cur = new Date(cur.getTime() + 60 * 60 * 1000);
        }

        const { dayName, dayNumber, month } = dateParts(dateStr);
        result.push({ date: dateStr, dayName, dayNumber, month, slots });
        added++;
      }

      day = new Date(day.getTime() + 24 * 60 * 60 * 1000);
    }

    res.json(result);
  } catch (err) {
    console.error('agenda/semana:', err.message);
    res.status(500).json({ error: 'Erro ao buscar semana' });
  }
});

// Available dates for booking (next 30 weekdays)
router.get('/agenda/datas', authMiddleware, async (req, res) => {
  if (!isConnected()) return res.status(503).json({ error: 'Google Calendar não conectado' });

  try {
    // Default: next 7 days. Pass ?semanas=N for more weeks.
    const semanas = Math.min(parseInt(req.query.semanas) || 1, 8);
    const limitDays = semanas * 7;

    const dates = [];
    let day = new Date();
    const cutoff = new Date(day.getTime() + limitDays * 24 * 60 * 60 * 1000);

    while (day < cutoff) {
      const dateStr = day.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        .split('/').reverse().join('-');

      const dow = dayOfWeek(dateStr);
      if (dow !== 0 && dow !== 6) {
        const slots = await buildSlotsForDate(dateStr);
        if (slots.length > 0) {
          dates.push({
            date: dateStr,
            label: fmtDate(dateStr),
            dayOfWeek: dayOfWeekLabel(dateStr),
            slotsAvailable: slots.length,
          });
        }
      }

      day = new Date(day.getTime() + 24 * 60 * 60 * 1000);
    }

    res.json(dates);
  } catch (err) {
    console.error('agenda/datas:', err.message);
    res.status(500).json({ error: 'Erro ao buscar disponibilidade' });
  }
});

// Slots for a specific date
router.get('/agenda/slots/:date', authMiddleware, async (req, res) => {
  if (!isConnected()) return res.status(503).json({ error: 'Google Calendar não conectado' });

  try {
    const slots = await buildSlotsForDate(req.params.date);
    res.json(slots);
  } catch (err) {
    console.error('agenda/slots:', err.message);
    res.status(500).json({ error: 'Erro ao buscar horários' });
  }
});

// Create a booking
router.post('/agenda/agendar', authMiddleware, async (req, res) => {
  if (!isConnected()) return res.status(503).json({ error: 'Google Calendar não conectado' });

  const { date, time, emails, title } = req.body;
  if (!date || !time) return res.status(400).json({ error: 'Data e horário são obrigatórios' });

  const emailList = (Array.isArray(emails) ? emails : [emails]).filter(e => e?.trim());
  if (emailList.length === 0) return res.status(400).json({ error: 'Pelo menos um e-mail é obrigatório' });

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const em of emailList) {
    if (!emailRe.test(em.trim())) return res.status(400).json({ error: `E-mail inválido: ${em}` });
  }

  try {
    const startTime = new Date(time);
    const endTime = new Date(startTime.getTime() + SLOT_DURATION * 60 * 1000);

    // Conflict check
    const events = await getEventsForDate(date);
    const conflict = events.some(ev => {
      if (!ev.start?.dateTime || !ev.end?.dateTime) return false;
      const s = new Date(ev.start.dateTime);
      const e = new Date(ev.end.dateTime);
      return startTime < e && endTime > s;
    });

    if (conflict) return res.status(400).json({ error: 'Este horário não está mais disponível' });

    const calendar = getCalendar();
    const eventTitle = title || 'Reunião Mesa Consórcio';

    const event = await calendar.events.insert({
      calendarId: 'primary',
      resource: {
        summary: eventTitle,
        description: `Reunião agendada via sistema online\n\nParticipantes: ${emailList.join(', ')}`,
        start: { dateTime: startTime.toISOString(), timeZone: 'America/Sao_Paulo' },
        end: { dateTime: endTime.toISOString(), timeZone: 'America/Sao_Paulo' },
        attendees: [...new Set([...emailList.map(e => e.trim()), ...INTERNAL_ATTENDEES])].map(email => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 60 },
            { method: 'popup', minutes: 30 },
          ],
        },
      },
      conferenceDataVersion: 1,
      sendUpdates: 'all',
    });

    res.json({
      success: true,
      message: 'Agendamento confirmado! Os convites foram enviados por e-mail.',
      event: {
        id: event.data.id,
        summary: event.data.summary,
        start: event.data.start,
        end: event.data.end,
        meetLink: event.data.conferenceData?.entryPoints?.[0]?.uri || null,
        htmlLink: event.data.htmlLink,
      },
    });
  } catch (err) {
    console.error('agenda/agendar:', err.message);
    res.status(400).json({ error: err.message || 'Erro ao criar agendamento' });
  }
});

module.exports = router;
