const db = require('../config/database');

const ContemplacaoAutoModel = {
  async findAll() {
    const result = await db.query(
      `SELECT * FROM contemplacao_auto ORDER BY grupo,
       CASE
         WHEN mes NOT LIKE '%/%' THEN
           CASE mes
             WHEN 'abril' THEN 1 WHEN 'maio' THEN 2 WHEN 'junho' THEN 3
             WHEN 'julho' THEN 4 WHEN 'agosto' THEN 5 WHEN 'setembro' THEN 6
             WHEN 'outubro' THEN 7 WHEN 'novembro' THEN 8 WHEN 'dezembro' THEN 9
             WHEN 'janeiro' THEN 10 WHEN 'fevereiro' THEN 11 WHEN 'março' THEN 12
             ELSE 99
           END
         ELSE
           (CAST(SPLIT_PART(mes,'/',2) AS INTEGER) - 2024) * 12 +
           CASE LOWER(SPLIT_PART(mes,'/',1))
             WHEN 'janeiro' THEN 1 WHEN 'fevereiro' THEN 2 WHEN 'março' THEN 3
             WHEN 'abril' THEN 4 WHEN 'maio' THEN 5 WHEN 'junho' THEN 6
             WHEN 'julho' THEN 7 WHEN 'agosto' THEN 8 WHEN 'setembro' THEN 9
             WHEN 'outubro' THEN 10 WHEN 'novembro' THEN 11 WHEN 'dezembro' THEN 12
             ELSE 0
           END + 100
       END DESC`
    );
    return result.rows;
  },

  async findByGrupo(grupo) {
    const result = await db.query(
      `SELECT * FROM contemplacao_auto WHERE grupo = $1
       ORDER BY
       CASE
         WHEN mes NOT LIKE '%/%' THEN
           CASE mes
             WHEN 'abril' THEN 1 WHEN 'maio' THEN 2 WHEN 'junho' THEN 3
             WHEN 'julho' THEN 4 WHEN 'agosto' THEN 5 WHEN 'setembro' THEN 6
             WHEN 'outubro' THEN 7 WHEN 'novembro' THEN 8 WHEN 'dezembro' THEN 9
             WHEN 'janeiro' THEN 10 WHEN 'fevereiro' THEN 11 WHEN 'março' THEN 12
             ELSE 99
           END
         ELSE
           (CAST(SPLIT_PART(mes,'/',2) AS INTEGER) - 2024) * 12 +
           CASE LOWER(SPLIT_PART(mes,'/',1))
             WHEN 'janeiro' THEN 1 WHEN 'fevereiro' THEN 2 WHEN 'março' THEN 3
             WHEN 'abril' THEN 4 WHEN 'maio' THEN 5 WHEN 'junho' THEN 6
             WHEN 'julho' THEN 7 WHEN 'agosto' THEN 8 WHEN 'setembro' THEN 9
             WHEN 'outubro' THEN 10 WHEN 'novembro' THEN 11 WHEN 'dezembro' THEN 12
             ELSE 0
           END + 100
       END DESC`,
      [grupo]
    );
    return result.rows;
  },

  async getGrupos() {
    const result = await db.query(
      'SELECT DISTINCT grupo FROM contemplacao_auto ORDER BY grupo'
    );
    return result.rows.map(r => r.grupo);
  },

  async getResumoGrupos() {
    const result = await db.query(`
      WITH ultimo_mes AS (
        SELECT DISTINCT ON (grupo)
          grupo,
          lance_percent as ultimo_lance_percent
        FROM contemplacao_auto
        ORDER BY grupo, id DESC
      )
      SELECT
        u.grupo,
        sg.prazo_restante,
        sg.media_contemplacao,
        sg.media_contemplacao AS media_contemplacao_6m,
        u.ultimo_lance_percent
      FROM ultimo_mes u
      LEFT JOIN simulador_grupos sg ON sg.numero_grupo = u.grupo AND sg.modalidade = 'auto'
      ORDER BY u.grupo
    `);
    return result.rows;
  },

  async deleteAll() {
    await db.query('DELETE FROM contemplacao_auto');
  }
};

module.exports = ContemplacaoAutoModel;
