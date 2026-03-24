const express = require('express');
const AuthController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Rotas públicas
router.post('/login', AuthController.login);
router.post('/definir-senha', AuthController.definirSenha);
router.post('/esqueci-senha', AuthController.esqueceuSenha);

// Rotas protegidas
router.get('/me', authMiddleware, AuthController.me);

module.exports = router;
