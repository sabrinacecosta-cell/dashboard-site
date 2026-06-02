import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [esqueceuSenha, setEsqueceuSenha] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState(false);
  const [emailRecuperacao, setEmailRecuperacao] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, senha);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  async function handleEsqueceuSenha(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/esqueci-senha', { email: emailRecuperacao });
      setEmailEnviado(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Email não encontrado');
    } finally {
      setLoading(false);
    }
  }

  if (esqueceuSenha) {
    if (emailEnviado) {
      return (
        <div className="login-container">
          <div className="card login-card">
            <h1>E-mail enviado!</h1>
            <p style={{ textAlign: 'center', marginBottom: 25, color: 'var(--text-secondary)' }}>
              Verifique sua caixa de entrada e siga o link para redefinir sua senha.
            </p>
            <p style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => { setEsqueceuSenha(false); setEmailEnviado(false); setError(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem' }}
              >
                Voltar ao login
              </button>
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="login-container">
        <div className="card login-card">
          <h1>Esqueci minha senha</h1>
          <p style={{ textAlign: 'center', marginBottom: 25, color: 'var(--text-secondary)' }}>
            Informe seu email para redefinir a senha
          </p>
          <form onSubmit={handleEsqueceuSenha}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={emailRecuperacao}
                onChange={(e) => setEmailRecuperacao(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar e-mail'}
            </button>
            {error && <p className="error">{error}</p>}
          </form>
          <p style={{ textAlign: 'center', marginTop: 16 }}>
            <button
              type="button"
              onClick={() => { setEsqueceuSenha(false); setError(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              Voltar ao login
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="card login-card">
        <h1>Login</h1>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Sua senha"
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          {error && <p className="error">{error}</p>}
        </form>
        <p style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            type="button"
            onClick={() => { setEsqueceuSenha(true); setError(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            Esqueci minha senha
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;
