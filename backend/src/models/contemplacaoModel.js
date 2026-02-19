const db = require('../config/database');

const ContemplacaoModel = {
  async findAll() {
    const result = await db.query(
      `SELECT * FROM contemplacao ORDER BY grupo, 
       CASE mes 
         WHEN 'janeiro' THEN 1 WHEN 'fevereiro' THEN 2 WHEN 'março' THEN 3
         WHEN 'abril' THEN 4 WHEN 'maio' THEN 5 WHEN 'junho' THEN 6
         WHEN 'julho' THEN 7 WHEN 'agosto' THEN 8 WHEN 'setembro' THEN 9
         WHEN 'outubro' THEN 10 WHEN 'novembro' THEN 11 WHEN 'dezembro' THEN 12
       END`
    );
    return result.rows;
  },

  async findByGrupo(grupo) {
    const result = await db.query(
      `SELECT * FROM contemplacao WHERE grupo = $1 
       ORDER BY CASE mes 
         WHEN 'janeiro' THEN 1 WHEN 'fevereiro' THEN 2 WHEN 'março' THEN 3
         WHEN 'abril' THEN 4 WHEN 'maio' THEN 5 WHEN 'junho' THEN 6
         WHEN 'julho' THEN 7 WHEN 'agosto' THEN 8 WHEN 'setembro' THEN 9
         WHEN 'outubro' THEN 10 WHEN 'novembro' THEN 11 WHEN 'dezembro' THEN 12
       END`,
      [grupo]
    );
    return result.rows;
  },

  async getGrupos() {
    const result = await db.query(
      'SELECT DISTINCT grupo FROM contemplacao ORDER BY grupo'
    );
    return result.rows.map(r => r.grupo);
  },

  async getResumoGrupos() {
    const result = await db.query(`
      SELECT 
        grupo,
        COUNT(*) as total_meses,
        ROUND(AVG(lance_percent)::numeric, 2) as media_lance,
        SUM(contemplados) as total_contemplados,
        SUM(qnt_lances) as total_lances
      FROM contemplacao 
      GROUP BY grupo 
      ORDER BY grupo
    `);
    return result.rows;
  },

  async deleteAll() {
    await db.query('DELETE FROM contemplacao');
  }
};

module.exports = ContemplacaoModel;
