const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');

const AGENDA_API = process.env.AGENDA_BACKEND_URL || 'http://localhost:3002';

async function proxyGet(url, res) {
  const r = await fetch(url);
  const data = await r.json();
  res.status(r.ok ? 200 : r.status).json(data);
}

async function proxyPost(url, body, res) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  res.status(r.ok ? 200 : r.status).json(data);
}

router.get('/agenda/events/today', authMiddleware, async (req, res) => {
  try { await proxyGet(`${AGENDA_API}/api/agenda/events/today`, res); }
  catch (err) { console.error('agenda/events/today:', err.message); res.status(500).json({ error: 'Erro ao buscar eventos' }); }
});

router.get('/agenda/semana', authMiddleware, async (req, res) => {
  try { await proxyGet(`${AGENDA_API}/api/booking/week-summary`, res); }
  catch (err) { console.error('agenda/semana:', err.message); res.status(500).json({ error: 'Erro ao buscar semana' }); }
});

router.get('/agenda/slots/:date', authMiddleware, async (req, res) => {
  try { await proxyGet(`${AGENDA_API}/api/booking/slots/${req.params.date}`, res); }
  catch (err) { console.error('agenda/slots:', err.message); res.status(500).json({ error: 'Erro ao buscar slots' }); }
});

router.get('/agenda/datas', authMiddleware, async (req, res) => {
  try { await proxyGet(`${AGENDA_API}/api/booking/dates`, res); }
  catch (err) { console.error('agenda/datas:', err.message); res.status(500).json({ error: 'Erro ao buscar datas' }); }
});

router.post('/agenda/agendar', authMiddleware, async (req, res) => {
  try { await proxyPost(`${AGENDA_API}/api/booking/schedule`, req.body, res); }
  catch (err) { console.error('agenda/agendar:', err.message); res.status(500).json({ error: 'Erro ao criar agendamento' }); }
});

module.exports = router;
