const db = require('../config/database');

const ProducaoModel = {
  findByAssessor(nomeAssessor, emailAssessor) {
    const stmt = db.prepare(`
      SELECT * FROM producao 
      WHERE assessor = ? OR email_assessor = ?
      ORDER BY ano DESC, mes DESC
    `);
    return stmt.all(nomeAssessor, emailAssessor);
  },

  getResumoByAssessor(nomeAssessor, emailAssessor) {
    const stmt = db.prepare(`
      SELECT 
        ano,
        mes,
        COUNT(*) as quantidade,
        SUM(valor_do_bem) as total
      FROM producao 
      WHERE assessor = ? OR email_assessor = ?
      GROUP BY ano, mes
      ORDER BY ano DESC, mes DESC
    `);
    return stmt.all(nomeAssessor, emailAssessor);
  },

  getTotalByAssessor(nomeAssessor, emailAssessor) {
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as quantidade,
        SUM(valor_do_bem) as total
      FROM producao 
      WHERE assessor = ? OR email_assessor = ?
    `);
    return stmt.get(nomeAssessor, emailAssessor);
  },

  deleteAll() {
    db.exec('DELETE FROM producao');
  },

  insert({ mes, cliente, valor_do_bem, assessor, email_assessor, escritorio, ano }) {
    const stmt = db.prepare(`
      INSERT INTO producao (mes, cliente, valor_do_bem, assessor, email_assessor, escritorio, ano)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(mes, cliente, valor_do_bem, assessor, email_assessor, escritorio, ano);
  }
};

module.exports = ProducaoModel;
