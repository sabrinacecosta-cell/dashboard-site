import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';

function RedefinirSenha() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (novaSenha !== confirmarSenha) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);
    try {
      await api.post('/redefinir-senha', { token, novaSenha });
      setSucesso(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="login-container">
        <div className="card login-card">
          <h1>Link inválido</h1>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 24 }}>
            Este link de redefinição é inválido ou está incompleto.
          </p>
          <p style={{ textAlign: 'center' }}>
            <Link to="/login" style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>
              Voltar ao login
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (sucesso) {
    return (
      <div className="login-container">
        <div className="card login-card">
          <h1>Senha redefinida!</h1>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 24 }}>
            Você já pode fazer login com sua nova senha.
          </p>
          <p style={{ textAlign: 'center' }}>
            <Link to="/login" style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>
              Ir para o login
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="card login-card">
        <h1>Redefinir Senha</h1>
        <p style={{ textAlign: 'center', marginBottom: 25, color: 'var(--text-secondary)' }}>
          Escolha uma nova senha para sua conta
        </p>
        <form onSubmit={handleSubmit}>
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
          <div className="form-group">
            <label>Confirmar Senha</label>
            <input
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              placeholder="Repita a nova senha"
              required
              minLength={6}
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Redefinir Senha'}
          </button>
          {error && <p className="error">{error}</p>}
        </form>
        <p style={{ textAlign: 'center', marginTop: 16 }}>
          <Link to="/login" style={{ color: 'var(--primary)', fontSize: '0.9rem', background: 'none', border: 'none', cursor: 'pointer' }}>
            Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RedefinirSenha;
