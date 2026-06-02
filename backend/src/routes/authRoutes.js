const express = require('express');
const rateLimit = require('express-rate-limit');
const AuthController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Limita tentativas em rotas sensíveis de autenticação (força bruta / flood de e-mail)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
});

// Rotas públicas
router.post('/login', authLimiter, AuthController.login);
router.post('/esqueci-senha', authLimiter, AuthController.esqueceuSenha);
router.post('/redefinir-senha', authLimiter, AuthController.redefinirSenha);

// Rotas protegidas
router.get('/me', authMiddleware, AuthController.me);

module.exports = router;
