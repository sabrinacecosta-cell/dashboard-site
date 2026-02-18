const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UsuarioModel = require('../models/usuarioModel');

const AuthService = {
  async login(email, senha) {
    const usuario = await UsuarioModel.findByEmail(email);
    
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    // Verifica se senha_hash é null (primeiro acesso)
    if (!usuario.senha_hash) {
      return {
        primeiroAcesso: true,
        usuarioId: usuario.id,
        email: usuario.email,
        message: 'Primeiro acesso - defina sua senha',
      };
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    
    if (!senhaValida) {
      throw new Error('Senha inválida');
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return {
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
      },
    };
  },

  async definirSenha(usuarioId, novaSenha) {
    const usuario = await UsuarioModel.findByIdFull(usuarioId);
    
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    const senha_hash = await bcrypt.hash(novaSenha, 10);
    const usuarioAtualizado = await UsuarioModel.updateSenha(usuarioId, senha_hash);

    const token = jwt.sign(
      { id: usuarioAtualizado.id, email: usuarioAtualizado.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return {
      token,
      usuario: usuarioAtualizado,
    };
  },

  async getUsuarioAutenticado(id) {
    const usuario = await UsuarioModel.findById(id);
    
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    return usuario;
  },
};

module.exports = AuthService;
