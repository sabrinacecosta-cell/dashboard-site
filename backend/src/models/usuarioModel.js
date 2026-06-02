const db = require('../config/database');
const crypto = require('crypto');

const UsuarioModel = {
  async findByEmail(email) {
    const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    return result.rows[0] || null;
  },

  async findById(id) {
    const result = await db.query('SELECT id, nome, email FROM usuarios WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findByIdFull(id) {
    const result = await db.query('SELECT * FROM usuarios WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async create({ nome, email, senha_hash }) {
    const id = crypto.randomUUID();
    await db.query(
      'INSERT INTO usuarios (id, nome, email, senha_hash) VALUES ($1, $2, $3, $4)',
      [id, nome, email, senha_hash]
    );
    return this.findById(id);
  },

  async createIfNotExists({ nome, email, senha_hash }) {
    const result = await db.query(
      `INSERT INTO usuarios (id, nome, email, senha_hash)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [crypto.randomUUID(), nome, email, senha_hash]
    );
    return result.rowCount > 0;
  },

  async resetAllPasswords() {
    const result = await db.query('UPDATE usuarios SET senha_hash = NULL');
    return result.rowCount;
  },

  async resetPasswordByEmail(email) {
    const result = await db.query(
      'UPDATE usuarios SET senha_hash = NULL WHERE email = $1 RETURNING id, nome, email',
      [email]
    );
    return result.rows[0] || null;
  }
};

module.exports = UsuarioModel;
