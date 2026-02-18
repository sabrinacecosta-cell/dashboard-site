const pool = require('../config/database');

const ProducaoModel = {
  async findByAssessor(nomeAssessor, emailAssessor) {
    const result = await pool.query(`
      SELECT * FROM producao 
      WHERE assessor = $1 OR email_assessor = $2
      ORDER BY ano DESC, mes DESC
    `, [nomeAssessor, emailAssessor]);
    return result.rows;
  },

  async getResumoByAssessor(nomeAssessor, emailAssessor) {
    const result = await pool.query(`
      SELECT 
        ano,
        mes,
        COUNT(*) as quantidade,
        SUM(valor_do_bem) as total
      FROM producao 
      WHERE assessor = $1 OR email_assessor = $2
      GROUP BY ano, mes
      ORDER BY ano DESC, mes DESC
    `, [nomeAssessor, emailAssessor]);
    return result.rows;
  },

  async getTotalByAssessor(nomeAssessor, emailAssessor) {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as quantidade,
        SUM(valor_do_bem) as total
      FROM producao 
      WHERE assessor = $1 OR email_assessor = $2
    `, [nomeAssessor, emailAssessor]);
    return result.rows[0];
  },

  async deleteAll() {
    await pool.query('DELETE FROM producao');
  },

  async insert({ mes, cliente, valor_do_bem, assessor, email_assessor, escritorio, ano }) {
    await pool.query(`
      INSERT INTO producao (mes, cliente, valor_do_bem, assessor, email_assessor, escritorio, ano)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [mes, cliente, valor_do_bem, assessor, email_assessor, escritorio, ano]);
  }
};

module.exports = ProducaoModel;
