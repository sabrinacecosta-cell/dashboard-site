const db = require('../config/database');

// Lista de emails com acesso admin
const ADMIN_EMAILS = [
  'sabrina@jtdkinvest.com',
  'joel@wflowinvest.com'
];

const ProducaoModel = {
  isAdmin(email) {
    return ADMIN_EMAILS.includes(email?.toLowerCase());
  },

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

  // ========== MÉTODOS ADMIN ==========

  async findAll(filters = {}) {
    let query = 'SELECT * FROM producao WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (filters.mes) {
      query += ` AND mes = $${paramIndex++}`;
      params.push(filters.mes);
    }
    if (filters.ano) {
      query += ` AND ano = $${paramIndex++}`;
      params.push(filters.ano);
    }
    if (filters.escritorio) {
      query += ` AND escritorio = $${paramIndex++}`;
      params.push(filters.escritorio);
    }
    if (filters.assessor) {
      query += ` AND assessor = $${paramIndex++}`;
      params.push(filters.assessor);
    }

    query += ' ORDER BY ano DESC, mes DESC';
    const result = await db.query(query, params);
    return result.rows;
  },

  async getTotalGeral(filters = {}) {
    let query = `SELECT COUNT(*) as quantidade, SUM(valor_do_bem) as total FROM producao WHERE 1=1`;
    const params = [];
    let paramIndex = 1;

    if (filters.mes) {
      query += ` AND mes = $${paramIndex++}`;
      params.push(filters.mes);
    }
    if (filters.ano) {
      query += ` AND ano = $${paramIndex++}`;
      params.push(filters.ano);
    }
    if (filters.escritorio) {
      query += ` AND escritorio = $${paramIndex++}`;
      params.push(filters.escritorio);
    }
    if (filters.assessor) {
      query += ` AND assessor = $${paramIndex++}`;
      params.push(filters.assessor);
    }

    const result = await db.query(query, params);
    return result.rows[0];
  },

  async getTotalPorEscritorio(filters = {}) {
    let query = `SELECT escritorio, SUM(valor_do_bem) as total, COUNT(*) as quantidade FROM producao WHERE 1=1`;
    const params = [];
    let paramIndex = 1;

    if (filters.mes) {
      query += ` AND mes = $${paramIndex++}`;
      params.push(filters.mes);
    }
    if (filters.ano) {
      query += ` AND ano = $${paramIndex++}`;
      params.push(filters.ano);
    }
    if (filters.escritorio) {
      query += ` AND escritorio = $${paramIndex++}`;
      params.push(filters.escritorio);
    }
    if (filters.assessor) {
      query += ` AND assessor = $${paramIndex++}`;
      params.push(filters.assessor);
    }

    query += ' GROUP BY escritorio ORDER BY total DESC';
    const result = await db.query(query, params);
    return result.rows;
  },

  async getTotalPorMes(filters = {}) {
    let query = `SELECT mes, SUM(valor_do_bem) as total, COUNT(*) as quantidade FROM producao WHERE 1=1`;
    const params = [];
    let paramIndex = 1;

    if (filters.ano) {
      query += ` AND ano = $${paramIndex++}`;
      params.push(filters.ano);
    }
    if (filters.escritorio) {
      query += ` AND escritorio = $${paramIndex++}`;
      params.push(filters.escritorio);
    }
    if (filters.assessor) {
      query += ` AND assessor = $${paramIndex++}`;
      params.push(filters.assessor);
    }

    query += ' GROUP BY mes ORDER BY mes';
    const result = await db.query(query, params);
    return result.rows;
  },

  async getTotalPorAssessor(filters = {}) {
    let query = `SELECT assessor, SUM(valor_do_bem) as total, COUNT(*) as quantidade FROM producao WHERE 1=1`;
    const params = [];
    let paramIndex = 1;

    if (filters.mes) {
      query += ` AND mes = $${paramIndex++}`;
      params.push(filters.mes);
    }
    if (filters.ano) {
      query += ` AND ano = $${paramIndex++}`;
      params.push(filters.ano);
    }
    if (filters.escritorio) {
      query += ` AND escritorio = $${paramIndex++}`;
      params.push(filters.escritorio);
    }

    query += ' GROUP BY assessor ORDER BY total DESC';
    const result = await db.query(query, params);
    return result.rows;
  },

  async getFilterOptions() {
    const [meses, anos, escritorios, assessores] = await Promise.all([
      db.query('SELECT DISTINCT mes FROM producao ORDER BY mes'),
      db.query('SELECT DISTINCT ano FROM producao ORDER BY ano DESC'),
      db.query('SELECT DISTINCT escritorio FROM producao WHERE escritorio IS NOT NULL ORDER BY escritorio'),
      db.query('SELECT DISTINCT assessor FROM producao ORDER BY assessor')
    ]);

    return {
      meses: meses.rows.map(r => r.mes),
      anos: anos.rows.map(r => r.ano),
      escritorios: escritorios.rows.map(r => r.escritorio),
      assessores: assessores.rows.map(r => r.assessor)
    };
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
