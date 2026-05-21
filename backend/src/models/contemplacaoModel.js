const db = require('../config/database');

const ContemplacaoModel = {
  async findAll() {
    const result = await db.query(
      `SELECT * FROM contemplacao ORDER BY grupo,
       CASE mes
         WHEN 'abril' THEN 1 WHEN 'maio' THEN 2 WHEN 'junho' THEN 3
         WHEN 'julho' THEN 4 WHEN 'agosto' THEN 5 WHEN 'setembro' THEN 6
         WHEN 'outubro' THEN 7 WHEN 'novembro' THEN 8 WHEN 'dezembro' THEN 9
         WHEN 'janeiro' THEN 10 WHEN 'fevereiro' THEN 11 WHEN 'março' THEN 12
       END DESC`
    );
    return result.rows;
  },

  async findByGrupo(grupo) {
    const result = await db.query(
      `SELECT * FROM contemplacao WHERE grupo = $1
       ORDER BY CASE mes
         WHEN 'abril' THEN 1 WHEN 'maio' THEN 2 WHEN 'junho' THEN 3
         WHEN 'julho' THEN 4 WHEN 'agosto' THEN 5 WHEN 'setembro' THEN 6
         WHEN 'outubro' THEN 7 WHEN 'novembro' THEN 8 WHEN 'dezembro' THEN 9
         WHEN 'janeiro' THEN 10 WHEN 'fevereiro' THEN 11 WHEN 'março' THEN 12
       END DESC`,
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
          MAX(media_contemplacao) as media_contemplacao
        FROM contemplacao
        GROUP BY grupo
      )
      SELECT
        m.grupo,
        sg.prazo_restante,
        m.media_contemplacao,
        u.ultimo_lance_percent
      FROM medias m
      JOIN ultimo_mes u ON m.grupo = u.grupo
      LEFT JOIN simulador_grupos sg ON sg.numero_grupo = m.grupo AND sg.modalidade = 'imovel'
      ORDER BY m.grupo
    `);
    return result.rows;
  },

  async deleteAll() {
    await db.query('DELETE FROM contemplacao');
  }
};

module.exports = ContemplacaoModel;
