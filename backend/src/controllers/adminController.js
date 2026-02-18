const ImportService = require('../services/importService');

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
  }
};

module.exports = AdminController;
