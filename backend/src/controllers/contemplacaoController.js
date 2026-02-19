const ContemplacaoModel = require('../models/contemplacaoModel');

const ContemplacaoController = {
  async getAll(req, res) {
    try {
      const dados = await ContemplacaoModel.findAll();
      const grupos = await ContemplacaoModel.getGrupos();
      const resumo = await ContemplacaoModel.getResumoGrupos();

      return res.json({
        grupos,
        resumo,
        dados
      });
    } catch (error) {
      console.error('Erro ao buscar contemplações:', error);
      return res.status(500).json({ error: 'Erro ao buscar dados' });
    }
  },

  async getByGrupo(req, res) {
    try {
      const { grupo } = req.params;
      const dados = await ContemplacaoModel.findByGrupo(grupo);

      if (dados.length === 0) {
        return res.status(404).json({ error: 'Grupo não encontrado' });
      }

      return res.json(dados);
    } catch (error) {
      console.error('Erro ao buscar grupo:', error);
      return res.status(500).json({ error: 'Erro ao buscar dados' });
    }
  }
};

module.exports = ContemplacaoController;
