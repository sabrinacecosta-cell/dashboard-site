const ProducaoService = require('../services/producaoService');
const { PRODUCAO } = require('../data/mockData');

const ProducaoController = {
  async getMinhaProducao(req, res) {
    if (req.isDemo) return res.json(PRODUCAO);
    try {
      // Extrai filtros da query string (apenas para admins)
      const filters = {
        mes: req.query.mes ? parseInt(req.query.mes) : null,
        ano: req.query.ano ? parseInt(req.query.ano) : null,
        escritorio: req.query.escritorio || null,
        assessor: req.query.assessor || null
      };

      // Remove filtros vazios
      Object.keys(filters).forEach(key => {
        if (filters[key] === null) delete filters[key];
      });

      const producao = await ProducaoService.getProducaoDoUsuario(
        req.userId,
        req.userEmail,
        filters
      );

      return res.json(producao);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
};

module.exports = ProducaoController;
