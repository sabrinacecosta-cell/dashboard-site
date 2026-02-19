const db = require('../config/database');

const ProducaoModel = {
  async findByAssessor(nomeAssessor, emailAssessor) {
    const result = await db.query(
      `SELECT * FROM producao 
       WHERE assessor = $1 OR email_assessor = $2
       ORDER BY ano DESC, mes DESC`,
      [nomeAssessor, emailAssessor]
    );
    return result.rows;
  },

  async getResumoByAssessor(nomeAssessor, emailAssessor) {
    const result = await db.query(
      `SELECT 
        ano,
        mes,
        COUNT(*) as quantidade,
        SUM(valor_do_bem) as total
       FROM producao 
       WHERE assessor = $1 OR email_assessor = $2
       GROUP BY ano, mes
       ORDER BY ano DESC, mes DESC`,
      [nomeAssessor, emailAssessor]
    );
    return result.rows;
  },

  async getTotalByAssessor(nomeAssessor, emailAssessor) {
    const result = await db.query(
      `SELECT 
        COUNT(*) as quantidade,
        SUM(valor_do_bem) as total
       FROM producao 
       WHERE assessor = $1 OR email_assessor = $2`,
      [nomeAssessor, emailAssessor]
    );
    return result.rows[0];
  },

  async getResumoAnualByAssessor(nomeAssessor, emailAssessor) {
    const result = await db.query(
      `SELECT 
        ano,
        COUNT(*) as quantidade,
        SUM(valor_do_bem) as total
       FROM producao 
       WHERE assessor = $1 OR email_assessor = $2
       GROUP BY ano
       ORDER BY ano DESC`,
      [nomeAssessor, emailAssessor]
    );
    return result.rows;
  },

  async deleteAll() {
    await db.query('DELETE FROM producao');
  },

  async insert({ mes, cliente, valor_do_bem, assessor, email_assessor, escritorio, ano }) {
    await db.query(
      `INSERT INTO producao (mes, cliente, valor_do_bem, assessor, email_assessor, escritorio, ano)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [mes, cliente, valor_do_bem, assessor, email_assessor, escritorio, ano]
    );
  },

  async insertMany(registros) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      for (const r of registros) {
        await client.query(
          `INSERT INTO producao (mes, cliente, valor_do_bem, assessor, email_assessor, escritorio, ano)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [r.mes, r.cliente, r.valor_do_bem, r.assessor, r.email_assessor, r.escritorio, r.ano]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
};

module.exports = ProducaoModel;
