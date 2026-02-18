const pool = require('../config/database');

const UsuarioModel = {
  async findByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  },

  async findById(id) {
    const result = await pool.query(
      'SELECT nome, email FROM usuarios WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async findByIdFull(id) {
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async create({ nome, email, senha_hash }) {
    const result = await pool.query(
      `INSERT INTO usuarios (id, nome, email, senha_hash) 
       VALUES (gen_random_uuid(), $1, $2, $3) 
       RETURNING id, nome, email, criado_em`,
      [nome, email, senha_hash]
    );
    return result.rows[0];
  },

  async createIfNotExists({ nome, email, senha_hash }) {
    const result = await pool.query(
      `INSERT INTO usuarios (id, nome, email, senha_hash) 
       VALUES (gen_random_uuid(), $1, $2, $3) 
       ON CONFLICT (email) DO NOTHING
       RETURNING id, nome, email, criado_em`,
      [nome, email, senha_hash]
    );
    return result.rows[0] || null;
  },

  async updateSenha(id, senha_hash) {
    const result = await pool.query(
      `UPDATE usuarios SET senha_hash = $1 WHERE id = $2 
       RETURNING id, nome, email, criado_em`,
      [senha_hash, id]
    );
    return result.rows[0];
  },

  async resetAllPasswords() {
    const result = await pool.query('UPDATE usuarios SET senha_hash = NULL');
    return result.rowCount;
  }
};

module.exports = UsuarioModel;
