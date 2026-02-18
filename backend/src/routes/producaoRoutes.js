const express = require('express');
const ProducaoController = require('../controllers/producaoController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/producao', authMiddleware, ProducaoController.getMinhaProducao);

module.exports = router;
