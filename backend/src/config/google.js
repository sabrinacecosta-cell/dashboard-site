const { google } = require('googleapis');
const db = require('./database');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

async function loadTokens() {
  try {
    const r = await db.query(
      'SELECT tokens FROM google_tokens ORDER BY id DESC LIMIT 1'
    );
    if (r.rows.length > 0) {
      oauth2Client.setCredentials(r.rows[0].tokens);
      console.log('google.js: tokens carregados do banco');
    } else {
      console.log('google.js: nenhum token no banco');
    }
  } catch (e) {
    console.error('google.js: erro ao carregar tokens do banco:', e.message);
  }
}

async function saveTokens(tokens) {
  try {
    const merged = { ...oauth2Client.credentials, ...tokens };
    await db.query(`
      INSERT INTO google_tokens (tokens, atualizado_em)
      VALUES ($1, NOW())
      ON CONFLICT DO NOTHING
    `, [JSON.stringify(merged)]);
    // Mantém só o registro mais recente
    await db.query(`
      DELETE FROM google_tokens
      WHERE id NOT IN (
        SELECT id FROM google_tokens ORDER BY id DESC LIMIT 1
      )
    `);
    oauth2Client.setCredentials(merged);
    console.log('google.js: tokens salvos no banco');
  } catch (e) {
    console.error('google.js: erro ao salvar tokens no banco:', e.message);
  }
}

function isConnected() {
  const creds = oauth2Client.credentials;
  return !!(creds && (creds.access_token || creds.refresh_token));
}

// Renova tokens automaticamente quando o access_token expira
oauth2Client.on('tokens', (tokens) => {
  saveTokens(tokens);
});

// Carrega tokens na inicialização (assíncrono — não bloqueia o start)
loadTokens();

module.exports = { oauth2Client, saveTokens, isConnected, loadTokens };
