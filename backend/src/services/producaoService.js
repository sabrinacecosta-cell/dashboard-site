const ProducaoModel = require('../models/producaoModel');
const UsuarioModel = require('../models/usuarioModel');

const ProducaoService = {
  async getProducaoDoUsuario(userId, userEmail, filters = {}) {
    // Verifica se é admin
    const isAdmin = ProducaoModel.isAdmin(userEmail);

    if (isAdmin) {
      return this.getProducaoAdmin(filters);
    }

    // Busca o nome do usuário para usar como assessor
    const usuario = await UsuarioModel.findByIdFull(userId);
    
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    const nomeAssessor = usuario.nome;
    const emailAssessor = userEmail;

    // Assessor sempre filtrado pelos seus próprios dados
    const assessorFilters = { ...filters, assessorNome: nomeAssessor, assessorEmail: emailAssessor };

    const [
      detalhes,
      totais,
      porEscritorio,
      porMes,
      filterOptions
    ] = await Promise.all([
      ProducaoModel.findByAssessorWithFilters(nomeAssessor, emailAssessor, filters),
      ProducaoModel.getTotalByAssessorWithFilters(nomeAssessor, emailAssessor, filters),
      ProducaoModel.getTotalPorEscritorioByAssessor(nomeAssessor, emailAssessor, filters),
      ProducaoModel.getTotalPorMesByAssessor(nomeAssessor, emailAssessor, filters),
      ProducaoModel.getFilterOptionsByAssessor(nomeAssessor, emailAssessor)
    ]);

    return {
      isAdmin: false,
      assessor: nomeAssessor,
      totais: {
        quantidade: parseInt(totais.quantidade) || 0,
        valorTotal: parseFloat(totais.total) || 0
      },
      porEscritorio: porEscritorio.map(r => ({
        escritorio: r.escritorio || 'Não informado',
        total: parseFloat(r.total) || 0,
        quantidade: parseInt(r.quantidade) || 0
      })),
      porMes: porMes.map(r => ({
        mes: parseInt(r.mes),
        total: parseFloat(r.total) || 0,
        quantidade: parseInt(r.quantidade) || 0
      })),
      filterOptions,
      detalhes
    };
  },

  async getProducaoAdmin(filters = {}) {
    const [
      detalhes,
      totais,
      porEscritorio,
      porMes,
      porAssessor,
      filterOptions
    ] = await Promise.all([
      ProducaoModel.findAll(filters),
      ProducaoModel.getTotalGeral(filters),
      ProducaoModel.getTotalPorEscritorio(filters),
      ProducaoModel.getTotalPorMes(filters),
      ProducaoModel.getTotalPorAssessor(filters),
      ProducaoModel.getFilterOptions()
    ]);

    return {
      isAdmin: true,
      totais: {
        quantidade: parseInt(totais.quantidade) || 0,
        valorTotal: parseFloat(totais.total) || 0
      },
      porEscritorio: porEscritorio.map(r => ({
        escritorio: r.escritorio || 'Não informado',
        total: parseFloat(r.total) || 0,
        quantidade: parseInt(r.quantidade) || 0
      })),
      porMes: porMes.map(r => ({
        mes: parseInt(r.mes),
        total: parseFloat(r.total) || 0,
        quantidade: parseInt(r.quantidade) || 0
      })),
      porAssessor: porAssessor.map(r => ({
        assessor: r.assessor,
        total: parseFloat(r.total) || 0,
        quantidade: parseInt(r.quantidade) || 0
      })),
      filterOptions,
      detalhes
    };
  }
};

module.exports = ProducaoService;
