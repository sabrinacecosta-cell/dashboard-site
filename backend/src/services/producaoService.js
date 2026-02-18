const ProducaoModel = require('../models/producaoModel');
const UsuarioModel = require('../models/usuarioModel');

const ProducaoService = {
  async getProducaoDoUsuario(userId, userEmail) {
    // Busca o nome do usuário para usar como assessor
    const usuario = await UsuarioModel.findByIdFull(userId);
    
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    const nomeAssessor = usuario.nome;
    const emailAssessor = userEmail;

    // Busca produção
    const producao = await ProducaoModel.findByAssessor(nomeAssessor, emailAssessor);
    const resumo = await ProducaoModel.getResumoByAssessor(nomeAssessor, emailAssessor);
    const totais = await ProducaoModel.getTotalByAssessor(nomeAssessor, emailAssessor);

    return {
      assessor: nomeAssessor,
      totais: {
        quantidade: parseInt(totais.quantidade) || 0,
        valorTotal: parseFloat(totais.total) || 0
      },
      resumoMensal: resumo,
      detalhes: producao
    };
  }
};

module.exports = ProducaoService;
