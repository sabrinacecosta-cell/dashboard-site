const XLSX = require('xlsx');
const bcrypt = require('bcrypt');
const db = require('../config/database');

const EXCEL_PATH = '/Users/sabrinacosta/Documents/Base .xlsx';

const ImportService = {
  async importarPlanilha() {
    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const dados = XLSX.utils.sheet_to_json(sheet);

    // Limpa tabela de produção
    db.exec('DELETE FROM producao');

    // Insere produção
    const stmtProd = db.prepare(`
      INSERT INTO producao (mes, cliente, valor_do_bem, assessor, email_assessor, escritorio, ano)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((registros) => {
      for (const r of registros) {
        stmtProd.run(
          r.Mes,
          r.Cliente,
          r.Valor_do_bem,
          r.Assessor,
          r.Email || null,
          r.Escritorio,
          r.Ano
        );
      }
    });

    insertMany(dados);

    // Coleta assessores únicos com email
    const assessoresComEmail = new Map();
    for (const r of dados) {
      if (r.Email && r.Assessor) {
        assessoresComEmail.set(r.Email.toLowerCase().trim(), r.Assessor);
      }
    }

    // Cria usuários novos
    const senhaHash = await bcrypt.hash('123456', 10);
    const stmtUser = db.prepare(`
      INSERT OR IGNORE INTO usuarios (id, nome, email, senha_hash)
      VALUES (?, ?, ?, ?)
    `);

    let novosUsuarios = 0;
    for (const [email, nome] of assessoresComEmail) {
      const result = stmtUser.run(crypto.randomUUID(), nome, email, senhaHash);
      if (result.changes > 0) novosUsuarios++;
    }

    return {
      registrosImportados: dados.length,
      assessoresEncontrados: assessoresComEmail.size,
      novosUsuariosCriados: novosUsuarios
    };
  }
};

module.exports = ImportService;
