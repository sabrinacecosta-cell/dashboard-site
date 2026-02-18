const db = require('../config/database');

const UsuarioModel = {
  findByEmail(email) {
    const stmt = db.prepare('SELECT * FROM usuarios WHERE email = ?');
    return stmt.get(email) || null;
  },

  findById(id) {
    const stmt = db.prepare('SELECT nome, email FROM usuarios WHERE id = ?');
    return stmt.get(id) || null;
  },

  findByIdFull(id) {
    const stmt = db.prepare('SELECT * FROM usuarios WHERE id = ?');
    return stmt.get(id) || null;
  },

  create({ nome, email, senha_hash }) {
    const id = crypto.randomUUID();
    const stmt = db.prepare(`
      INSERT INTO usuarios (id, nome, email, senha_hash) 
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(id, nome, email, senha_hash);
    return this.findById(id);
  },

  updateSenha(id, senha_hash) {
    const stmt = db.prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?');
    stmt.run(senha_hash, id);
    return this.findById(id);
  },
};

module.exports = UsuarioModel;
