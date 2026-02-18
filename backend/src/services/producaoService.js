const ProducaoModel = require('../models/producaoModel');
const UsuarioModel = require('../models/usuarioModel');

const ProducaoService = {
  async getProducaoDoUsuario(userId, userEmail) {
    // Busca o nome do usuário para usar como assessor
    const usuario = UsuarioModel.findByIdFull(userId);
    
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    const nomeAssessor = usuario.nome;
    const emailAssessor = userEmail;

    // Busca produção
    const producao = ProducaoModel.findByAssessor(nomeAssessor, emailAssessor);
    const resumo = ProducaoModel.getResumoByAssessor(nomeAssessor, emailAssessor);
    const resumoAnual = ProducaoModel.getResumoAnualByAssessor(nomeAssessor, emailAssessor);
    const totais = ProducaoModel.getTotalByAssessor(nomeAssessor, emailAssessor);

    return {
      assessor: nomeAssessor,
      totais: {
        quantidade: totais.quantidade || 0,
        valorTotal: totais.total || 0
      },
      resumoAnual: resumoAnual,
      resumoMensal: resumo,
      detalhes: producao
    };
  }
};

module.exports = ProducaoService;
