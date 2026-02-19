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
      WITH ultimo_mes AS (
        SELECT DISTINCT ON (grupo) 
          grupo, 
          lance_percent as ultimo_lance_percent
        FROM contemplacao 
        ORDER BY grupo, id DESC
      ),
      medias AS (
        SELECT 
          grupo,
          ROUND(AVG(
            CASE 
              WHEN contemplacao_mensal IS NOT NULL 
              THEN REPLACE(contemplacao_mensal, '%', '')::numeric 
            END
          ), 0) as media_contemplacao
        FROM contemplacao 
        GROUP BY grupo
      )
      SELECT 
        m.grupo,
        m.media_contemplacao,
        u.ultimo_lance_percent
      FROM medias m
      JOIN ultimo_mes u ON m.grupo = u.grupo
      ORDER BY m.grupo
    `);
    return result.rows;
  },

  async deleteAll() {
    await db.query('DELETE FROM contemplacao');
  }
};

module.exports = ContemplacaoModel;
