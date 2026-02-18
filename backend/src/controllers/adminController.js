const ImportService = require('../services/importService');
const db = require('../config/database');

const ADMIN_EMAIL = 'sabrina@jtdkinvest.com';

const AdminController = {
  async importarDados(req, res) {
    try {
      // Verifica se é admin
      if (req.userEmail !== ADMIN_EMAIL) {
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
      if (req.userEmail !== ADMIN_EMAIL) {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }

      const result = db.prepare('UPDATE usuarios SET senha_hash = NULL').run();

      return res.json({
        success: true,
        message: `${result.changes} usuários resetados!`
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
