const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const TOKEN_PATH = path.join(__dirname, '../../data/google-tokens.json');

function loadTokens() {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
      oauth2Client.setCredentials(tokens);
    }
  } catch (e) {
    console.error('google.js: erro ao carregar tokens:', e.message);
  }
}

function saveTokens(tokens) {
  try {
    fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    oauth2Client.setCredentials(tokens);
  } catch (e) {
    console.error('google.js: erro ao salvar tokens:', e.message);
  }
}

function isConnected() {
  const creds = oauth2Client.credentials;
  return !!(creds && (creds.access_token || creds.refresh_token));
}

// Renova tokens automaticamente
oauth2Client.on('tokens', (tokens) => {
  if (tokens.refresh_token) {
    saveTokens({ ...oauth2Client.credentials, ...tokens });
  }
});

loadTokens();

module.exports = { oauth2Client, saveTokens, isConnected };
