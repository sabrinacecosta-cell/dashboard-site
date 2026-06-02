const bcrypt = require('bcrypt');
const db = require('../config/database');
const AuthService = require('../services/authService');

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

  async esqueceuSenha(req, res) {
    // Resposta sempre genérica para não revelar quais e-mails existem (anti-enumeração)
    const respostaGenerica = { message: 'Se o e-mail estiver cadastrado, enviaremos as instruções de redefinição.' };
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email é obrigatório' });

      const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email.toLowerCase().trim()]);
      const u = result.rows[0];
      if (!u) return res.json(respostaGenerica);

      await AuthService.enviarLinkRedefinicao(u, { contexto: 'redefinicao', horasValidade: 1 });

      return res.json(respostaGenerica);
    } catch (error) {
      console.error('Erro em esqueci-senha:', error);
      return res.json(respostaGenerica);
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
      console.error('Erro ao redefinir senha:', error);
      return res.status(500).json({ error: 'Erro ao redefinir senha' });
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
