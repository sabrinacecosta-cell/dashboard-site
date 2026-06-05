const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/database');
const UsuarioModel = require('../models/usuarioModel');
const { enviarEmailRedefinicaoSenha } = require('./emailService');

const AuthService = {
  async login(email, senha) {
    const usuario = await UsuarioModel.findByEmail(String(email).toLowerCase().trim());

    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    // Sem senha definida: o acesso é criado por e-mail (link de definição de senha)
    if (!usuario.senha_hash) {
      throw new Error('Sua senha ainda não foi definida. Verifique o e-mail enviado ao criar sua conta ou clique em "Esqueci minha senha".');
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    
    if (!senhaValida) {
      throw new Error('Senha inválida');
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
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

  // Gera um token de redefinição e envia o e-mail com o link.
  // contexto: 'redefinicao' | 'novo' | 'reset'
  async enviarLinkRedefinicao(usuario, { contexto = 'redefinicao', horasValidade = 1 } = {}) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + horasValidade * 60 * 60 * 1000);

    await db.query(
      'INSERT INTO password_reset_tokens (usuario_id, token, expires_at) VALUES ($1, $2, $3)',
      [usuario.id, token, expiresAt]
    );

    const link = `${process.env.FRONTEND_URL}/redefinir-senha?token=${token}`;
    const validadeTexto = horasValidade >= 24
      ? `${Math.round(horasValidade / 24)} dias`
      : `${horasValidade} hora${horasValidade > 1 ? 's' : ''}`;

    await enviarEmailRedefinicaoSenha(usuario.email, usuario.nome, link, { contexto, validadeTexto });
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
