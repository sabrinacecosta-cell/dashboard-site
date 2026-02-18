const express = require('express');
const AdminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/admin/importar', authMiddleware, AdminController.importarDados);
router.post('/admin/resetar-senhas', authMiddleware, AdminController.resetarSenhas);

module.exports = router;
