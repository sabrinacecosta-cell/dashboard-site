const router = require('express').Router();
const { oauth2Client, saveTokens, isConnected } = require('../config/google');

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.readonly',
];

// Inicia fluxo OAuth com todos os escopos necessários
router.get('/auth/google', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent select_account',
    login_hint: 'sabrina@jtdkinvest.com',
    scope: SCOPES,
  });
  res.redirect(url);
});

// Callback OAuth — salva tokens e exibe página de confirmação
router.get('/auth/google/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).send(`<h2>Autorização negada: ${error}</h2>`);
  }
  if (!code) {
    return res.status(400).send('<h2>Código de autorização não fornecido.</h2>');
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    saveTokens(tokens);

    const scopes = (tokens.scope || '').split(' ');
    const hasCalendar = scopes.some(s => s.includes('calendar'));
    const hasGmail = scopes.some(s => s.includes('gmail'));

    res.send(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Google autorizado</title>
<style>
body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;
  min-height:100vh;margin:0;background:#0f0f0f;color:#fff;}
.box{background:#1a1a1a;border:1px solid #333;border-radius:14px;
  padding:2.5rem 3rem;text-align:center;max-width:420px;}
h2{margin:0 0 1rem;font-size:1.25rem;}
p{color:#aaa;margin:.4rem 0;font-size:.9rem;}
.badge{display:inline-block;margin:.25rem;padding:.2rem .7rem;
  border-radius:20px;font-size:.8rem;font-weight:600;}
.ok{background:#1a3a1a;border:1px solid #2d7a2d;color:#4caf50;}
.miss{background:#3a1a1a;border:1px solid #7a2d2d;color:#f44336;}
</style></head>
<body><div class="box">
  <div style="font-size:2.5rem;margin-bottom:1rem">✅</div>
  <h2>Google autorizado com sucesso!</h2>
  <p>Escopos autorizados:</p>
  <div style="margin:1rem 0">
    <span class="badge ${hasCalendar ? 'ok' : 'miss'}">${hasCalendar ? '✓' : '✗'} Google Calendar</span>
    <span class="badge ${hasGmail ? 'ok' : 'miss'}">${hasGmail ? '✓' : '✗'} Gmail</span>
  </div>
  <p style="margin-top:1.5rem;color:#666;font-size:.8rem">Pode fechar esta aba.</p>
</div></body></html>`);
  } catch (err) {
    console.error('OAuth callback error:', err.message);
    res.status(500).send(`<h2>Erro na autorização.</h2><pre>${err.message}</pre>`);
  }
});

// Status da conexão Google
router.get('/api/google/status', (req, res) => {
  res.json({ connected: isConnected() });
});

module.exports = router;
