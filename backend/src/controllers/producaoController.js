const ProducaoService = require('../services/producaoService');

const ProducaoController = {
  async getMinhaProducao(req, res) {
    try {
      const producao = await ProducaoService.getProducaoDoUsuario(
        req.userId,
        req.userEmail
      );

      return res.json(producao);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
};

module.exports = ProducaoController;
