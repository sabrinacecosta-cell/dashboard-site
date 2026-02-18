require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas
app.use('/api', routes);

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
