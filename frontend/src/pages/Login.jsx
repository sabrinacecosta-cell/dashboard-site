import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [primeiroAcesso, setPrimeiroAcesso] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, definirSenha } = useAuth();
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, senha);
      
      if (result.primeiroAcesso) {
        setPrimeiroAcesso(result);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  async function handleDefinirSenha(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await definirSenha(primeiroAcesso.usuarioId, novaSenha);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao definir senha');
    } finally {
      setLoading(false);
    }
  }

  if (primeiroAcesso) {
    return (
      <div className="login-container">
        <div className="card login-card">
          <h1>Primeiro Acesso</h1>
          <p style={{ textAlign: 'center', marginBottom: 25, color: 'var(--text-secondary)' }}>
            Defina sua senha para continuar
          </p>
          <form onSubmit={handleDefinirSenha}>
            <div className="form-group">
              <label>Nova Senha</label>
              <input
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
              />
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Definir Senha'}
            </button>
            {error && <p className="error">{error}</p>}
          </form>
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
      </div>
    </div>
  );
}

export default Login;
