const express = require('express');
const router = express.Router();
const ContemplacaoController = require('../controllers/contemplacaoController');
const authMiddleware = require('../middlewares/authMiddleware');

// Todas as rotas precisam de autenticação
router.use(authMiddleware);

router.get('/', ContemplacaoController.getAll);
router.get('/:grupo', ContemplacaoController.getByGrupo);

module.exports = router;
