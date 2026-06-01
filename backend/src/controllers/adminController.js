const ImportService = require('../services/importService');
const UsuarioModel = require('../models/usuarioModel');

const ADMIN_EMAILS = ['sabrina@jtdkinvest.com', 'joel@jtdkinvest.com'];

const AdminController = {
  async importarDados(req, res) {
    try {
      // Verifica se é admin
      if (!ADMIN_EMAILS.includes(req.userEmail)) {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }

      const resultado = await ImportService.importarPlanilha();

      return res.json({
        success: true,
        message: 'Dados importados com sucesso!',
        ...resultado
      });
    } catch (error) {
      console.error('Erro na importação:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Erro ao importar dados: ' + error.message 
      });
    }
  },

  async resetarSenhas(req, res) {
    try {
      // Verifica se é admin
      if (!ADMIN_EMAILS.includes(req.userEmail)) {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }

      const count = await UsuarioModel.resetAllPasswords();

      return res.json({
        success: true,
        message: `${count} usuários resetados!`
      });
    } catch (error) {
      return res.status(500).json({ 
        success: false,
        error: 'Erro ao resetar senhas: ' + error.message 
      });
    }
  }
};

module.exports = AdminController;
