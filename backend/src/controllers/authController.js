const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('../config/database');
const AuthService = require('../services/authService');
const { enviarEmailRedefinicaoSenha } = require('../services/emailService');

const AuthController = {
  async login(req, res) {
    try {
      const { email, senha } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email é obrigatório' });
      }

      const resultado = await AuthService.login(email, senha);

      return res.json(resultado);
    } catch (error) {
      return res.status(401).json({ error: error.message });
    }
  },

  async definirSenha(req, res) {
    try {
      const { usuarioId, novaSenha } = req.body;

      if (!usuarioId || !novaSenha) {
        return res.status(400).json({ 
          error: 'usuarioId e novaSenha são obrigatórios' 
        });
      }

      if (novaSenha.length < 6) {
        return res.status(400).json({ 
          error: 'Senha deve ter no mínimo 6 caracteres' 
        });
      }

      const resultado = await AuthService.definirSenha(usuarioId, novaSenha);

      return res.json(resultado);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },

  async esqueceuSenha(req, res) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email é obrigatório' });

      const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
      if (!result.rows[0]) return res.status(404).json({ error: 'Email não encontrado' });

      const u = result.rows[0];
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await db.query(
        'INSERT INTO password_reset_tokens (usuario_id, token, expires_at) VALUES ($1, $2, $3)',
        [u.id, token, expiresAt]
      );

      const link = `${process.env.FRONTEND_URL}/redefinir-senha?token=${token}`;
      await enviarEmailRedefinicaoSenha(u.email, u.nome, link);

      return res.json({ message: 'E-mail enviado' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  async redefinirSenha(req, res) {
    try {
      const { token, novaSenha } = req.body;
      if (!token || !novaSenha) return res.status(400).json({ error: 'Dados inválidos' });
      if (novaSenha.length < 6) return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });

      const result = await db.query(
        'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()',
        [token]
      );
      if (!result.rows[0]) return res.status(400).json({ error: 'Link inválido ou expirado' });

      const { usuario_id, id: tokenId } = result.rows[0];
      const senha_hash = await bcrypt.hash(novaSenha, 10);

      await db.query('UPDATE usuarios SET senha_hash = $1 WHERE id = $2', [senha_hash, usuario_id]);
      await db.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [tokenId]);

      return res.json({ message: 'Senha redefinida com sucesso' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  async me(req, res) {
    try {
      const usuario = await AuthService.getUsuarioAutenticado(req.userId);

      return res.json(usuario);
    } catch (error) {
      return res.status(404).json({ error: error.message });
    }
  },
};

module.exports = AuthController;
