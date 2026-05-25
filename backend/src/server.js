require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const googleAuth = require('./routes/googleAuth');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';

// Middlewares
app.use(cors({
  origin: [
    'https://dashboardconsorcio.up.railway.app',
    'http://localhost:5173'
  ],
  credentials: true,
}));
app.use(express.json());

// Rotas OAuth Google (sem prefixo /api — callback precisa bater com GOOGLE_REDIRECT_URI)
app.use('/', googleAuth);

// Rotas da API
app.use('/api', routes);

const acompanhamentoExterno = require('./routes/acompanhamentoExternoRoutes');
app.use('/api/externo', acompanhamentoExterno);

// Migração + seed automáticos na inicialização
const migrate = require('../scripts/migrate');
const seedSimulador = require('../scripts/seed_simulador');

async function initDb() {
  try { await migrate(); } catch (e) { console.error('migrate error:', e.message); }
  try { await seedSimulador(); } catch (e) { console.error('seed_simulador error:', e.message); }
}

initDb();

// Rota raiz
app.get('/', (req, res) => {
  res.json({ 
    message: 'API de Autenticação',
    version: '1.0.0',
    endpoints: {
      login: 'POST /api/login',
      definirSenha: 'POST /api/definir-senha',
      me: 'GET /api/me (requer token)',
      health: 'GET /api/health',
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, HOST, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
