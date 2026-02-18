import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

function Vendas() {
  const { user } = useAuth();
  const [producao, setProducao] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProducao();
  }, []);

  async function loadProducao() {
    try {
      const response = await api.get('/producao');
      setProducao(response.data);
    } catch (err) {
      setError('Erro ao carregar produção');
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getMesNome = (mes) => {
    const meses = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return meses[mes] || mes;
  };

  if (loading) return <div className="page-loading">Carregando...</div>;
  if (error) return <div className="page-error">{error}</div>;

  return (
    <div className="page-vendas">
      <div className="page-header">
        <h1>Olá, {user?.nome}!</h1>
        <p className="page-subtitle">Acompanhe sua produção</p>
      </div>

      {producao && (
        <>
          {/* Cards de Resumo */}
          <div className="stats-grid">
            <div className="stat-card accent">
              <span className="stat-label">Total Geral</span>
              <span className="stat-value">{formatCurrency(producao.totais.valorTotal)}</span>
              <span className="stat-detail">{producao.totais.quantidade} contratos</span>
            </div>
          </div>

          {/* Tabela Resumo Mensal */}
          <div className="card">
            <h3>Resumo Anual</h3>
            <table>
              <thead>
                <tr>
                  <th>Ano</th>
                  <th style={{ textAlign: 'right' }}>Quantidade</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {producao.resumoAnual?.map((item, i) => (
                  <tr key={i}>
                    <td className="text-primary">{item.ano}</td>
                    <td style={{ textAlign: 'right' }}>{item.quantidade}</td>
                    <td style={{ textAlign: 'right' }} className="text-primary">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tabela Resumo Mensal */}
          <div className="card">
            <h3>Resumo Mensal</h3>
            <table>
              <thead>
                <tr>
                  <th>Período</th>
                  <th style={{ textAlign: 'right' }}>Quantidade</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {producao.resumoMensal.map((item, i) => (
                  <tr key={i}>
                    <td className="text-primary">{getMesNome(item.mes)}/{item.ano}</td>
                    <td style={{ textAlign: 'right' }}>{item.quantidade}</td>
                    <td style={{ textAlign: 'right' }} className="text-primary">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detalhes */}
          <div className="card">
            <h3>Detalhes ({producao.detalhes.length} registros)</h3>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th style={{ textAlign: 'right' }}>Valor</th>
                    <th style={{ textAlign: 'center' }}>Período</th>
                  </tr>
                </thead>
                <tbody>
                  {producao.detalhes.map((item, i) => (
                    <tr key={i}>
                      <td className="text-primary">{item.cliente}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(item.valor_do_bem)}</td>
                      <td style={{ textAlign: 'center' }}>{item.mes}/{item.ano}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Vendas;
