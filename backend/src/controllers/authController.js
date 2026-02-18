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
