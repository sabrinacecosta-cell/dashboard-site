const XLSX = require('xlsx');
const ProducaoModel = require('../models/producaoModel');
const UsuarioModel = require('../models/usuarioModel');

const EXCEL_PATH = process.env.EXCEL_PATH || '/Users/sabrinacosta/Documents/Base .xlsx';

const ImportService = {
  async importarPlanilha() {
    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const dados = XLSX.utils.sheet_to_json(sheet);

    // Limpa tabela de produção
    await ProducaoModel.deleteAll();

    // Insere produção
    for (const r of dados) {
      await ProducaoModel.insert({
        mes: r.Mes,
        cliente: r.Cliente,
        valor_do_bem: r.Valor_do_bem,
        assessor: r.Assessor,
        email_assessor: r.Email || null,
        escritorio: r.Escritorio,
        ano: r.Ano
      });
    }

    // Coleta assessores únicos com email
    const assessoresComEmail = new Map();
    for (const r of dados) {
      if (r.Email && r.Assessor) {
        assessoresComEmail.set(r.Email.toLowerCase().trim(), r.Assessor);
      }
    }

    // Cria usuários novos (sem senha - primeiro acesso)
    let novosUsuarios = 0;
    for (const [email, nome] of assessoresComEmail) {
      const created = await UsuarioModel.createIfNotExists({ 
        nome, 
        email, 
        senha_hash: null 
      });
      if (created) novosUsuarios++;
    }

    return {
      registrosImportados: dados.length,
      assessoresEncontrados: assessoresComEmail.size,
      novosUsuariosCriados: novosUsuarios
    };
  }
};

module.exports = ImportService;
