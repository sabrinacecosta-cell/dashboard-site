const ContemplacaoModel = require('../models/contemplacaoModel');
const ContemplacaoAutoModel = require('../models/contemplacaoAutoModel');

const ContemplacaoController = {
  async getAll(req, res) {
    try {
      const { tipo } = req.query; // 'auto' ou 'imovel' (default)
      const Model = tipo === 'auto' ? ContemplacaoAutoModel : ContemplacaoModel;

      const dados = await Model.findAll();
      const grupos = await Model.getGrupos();
      const resumo = await Model.getResumoGrupos();

      return res.json({
        tipo: tipo || 'imovel',
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
      const { tipo } = req.query;
      const Model = tipo === 'auto' ? ContemplacaoAutoModel : ContemplacaoModel;

      const dados = await Model.findByGrupo(grupo);

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
