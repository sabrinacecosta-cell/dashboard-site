import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#3a3a3a', '#5e5e5e'];

const MESES_NOME = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function Vendas() {
  const { user } = useAuth();
  const [producao, setProducao] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtros
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroAno, setFiltroAno] = useState('');
  const [filtroEscritorio, setFiltroEscritorio] = useState('');
  const [filtroAssessor, setFiltroAssessor] = useState('');

  useEffect(() => {
    loadProducao();
  }, [filtroMes, filtroAno, filtroEscritorio, filtroAssessor]);

  // Meses disponíveis: quando há ano selecionado, deriva apenas os meses com
  // dados daquele ano a partir dos próprios registros carregados (detalhes).
  // Sem ano selecionado, usa o filterOptions padrão (todos os meses do banco).
  const mesesDisponiveis = React.useMemo(() => {
    if (!filtroAno || !producao?.detalhes) {
      return producao?.filterOptions?.meses || [];
    }
    const set = new Set(
      producao.detalhes
        .filter(r => String(r.ano) === String(filtroAno))
        .map(r => r.mes)
    );
    return [...set].sort((a, b) => Number(a) - Number(b));
  }, [filtroAno, producao]);

  // Ao trocar o ano, limpa o mês selecionado se ele não existir no novo ano.
  useEffect(() => {
    if (filtroMes && mesesDisponiveis.length > 0 && !mesesDisponiveis.includes(Number(filtroMes))) {
      setFiltroMes('');
    }
  }, [filtroAno]);

  async function loadProducao() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtroMes) params.append('mes', filtroMes);
      if (filtroAno) params.append('ano', filtroAno);
      if (filtroEscritorio) params.append('escritorio', filtroEscritorio);
      if (filtroAssessor) params.append('assessor', filtroAssessor);
      
      const url = `/producao${params.toString() ? '?' + params.toString() : ''}`;
      const response = await api.get(url);
      setProducao(response.data);
    } catch (err) {
      setError('Erro ao carregar produção');
    } finally {
      setLoading(false);
    }
  }

  function limparFiltros() {
    setFiltroMes('');
    setFiltroAno('');
    setFiltroEscritorio('');
    setFiltroAssessor('');
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatCurrencyShort = (value) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}K`;
    }
    return formatCurrency(value);
  };

  const getMesNome = (mes) => MESES_NOME[mes] || mes;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          padding: '10px 14px',
          borderRadius: '8px'
        }}>
          <p style={{ color: 'var(--text-primary)', margin: 0, fontWeight: 500 }}>{label}</p>
          <p style={{ color: 'var(--accent)', margin: '4px 0 0' }}>
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading && !producao) return <div className="page-loading">Carregando...</div>;
  if (error) return <div className="page-error">{error}</div>;

  const isAdmin = producao?.isAdmin;

  const dadosMes = producao?.porMes?.map(item => ({
    name: getMesNome(item.mes),
    value: item.total
  })) || [];

  const totalMes = dadosMes.reduce((acc, item) => acc + (item.value || 0), 0);

  const dadosEscritorio = producao?.porEscritorio?.map(item => ({
    name: item.escritorio,
    value: item.total
  })) || [];

  const dadosAssessor = producao?.porAssessor?.slice(0, 15).map(item => ({
    name: item.assessor,
    value: item.total
  })) || [];

  return (
    <div className="page-vendas">
      <div className="page-header">
        <h1>{isAdmin ? 'Visão Geral de Vendas' : `Olá, ${user?.nome}!`}</h1>
        <p className="page-subtitle">{isAdmin ? 'Painel administrativo' : 'Acompanhe sua produção'}</p>
      </div>

      {/* Total em Destaque */}
      <div className="stats-grid">
        <div className="stat-card accent">
          <span className="stat-label">Total Geral</span>
          <span className="stat-value">{formatCurrency(producao?.totais?.valorTotal || 0)}</span>
          <span className="stat-detail">{producao?.totais?.quantidade || 0} contratos</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Filtros</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: '120px' }}>
            <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Mês</label>
            <select
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
              style={{ width: '100%', padding: '8px 12px' }}
            >
              <option value="">Todos</option>
              {mesesDisponiveis.map(m => (
                <option key={m} value={m}>{getMesNome(m)}</option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: '100px' }}>
            <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Ano</label>
            <select
              value={filtroAno}
              onChange={(e) => setFiltroAno(e.target.value)}
              style={{ width: '100%', padding: '8px 12px' }}
            >
              <option value="">Todos</option>
              {producao?.filterOptions?.anos?.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: '150px' }}>
            <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Escritório</label>
            <select
              value={filtroEscritorio}
              onChange={(e) => setFiltroEscritorio(e.target.value)}
              style={{ width: '100%', padding: '8px 12px' }}
            >
              <option value="">Todos</option>
              {producao?.filterOptions?.escritorios?.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          {/* Filtro de Assessor só para Admin */}
          {isAdmin && (
            <div style={{ minWidth: '180px' }}>
              <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Assessor</label>
              <select
                value={filtroAssessor}
                onChange={(e) => setFiltroAssessor(e.target.value)}
                style={{ width: '100%', padding: '8px 12px' }}
              >
                <option value="">Todos</option>
                {producao?.filterOptions?.assessores?.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={limparFiltros}
            style={{
              padding: '8px 16px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              marginTop: 0
            }}
          >
            Limpar
          </button>
        </div>
      </div>

      {/* Gráficos */}
      <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? 'repeat(auto-fit, minmax(400px, 1fr))' : '1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Gráfico por Escritório - Apenas Admin */}
        {isAdmin && dadosEscritorio.length > 0 && (
          <div className="card">
            <h3>Total por Escritório</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosEscritorio} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tickFormatter={formatCurrencyShort} stroke="var(--text-muted)" />
                  <YAxis type="category" dataKey="name" width={100} stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="var(--accent)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Gráfico por Mês (Rosca) */}
        {dadosMes.length > 0 && (
          <div className="card">
            <h3>Distribuição por Mês</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosMes}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                    labelLine={false}
                  >
                    {dadosMes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#F5C000" strokeWidth={1.5} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${formatCurrency(value)} (${totalMes ? ((value / totalMes) * 100).toFixed(1) : 0}%)`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Gráfico por Assessor - Apenas para Admin */}
      {isAdmin && dadosAssessor.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3>Total por Assessor (Top 15)</h3>
          <div style={{ height: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosAssessor} layout="vertical" margin={{ left: 30, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tickFormatter={formatCurrencyShort} stroke="var(--text-muted)" />
                <YAxis type="category" dataKey="name" width={140} stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="var(--accent)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabela de Detalhes */}
      <div className="card">
        <h3>Detalhes ({producao?.detalhes?.length || 0} registros)</h3>
        <div className="table-scroll" style={{ maxHeight: '500px', overflowX: 'auto' }}>
          <table style={{ minWidth: '1200px' }}>
            <thead>
              <tr>
                <th>Cliente</th>
                {isAdmin && <th>Assessor</th>}
                <th>Escritório</th>
                <th style={{ textAlign: 'right' }}>Valor</th>
                <th style={{ textAlign: 'center' }}>Período</th>
                <th>Administradora</th>
                <th>Modalidade</th>
                <th>Grupo</th>
                <th style={{ textAlign: 'right' }}>Cota</th>
                <th style={{ textAlign: 'right' }}>Parcela</th>
                <th>Natureza</th>
                <th>UF</th>
                <th>Tipo Produto</th>
                <th style={{ textAlign: 'right' }}>Taxa Adm</th>
              </tr>
            </thead>
            <tbody>
              {producao?.detalhes?.map((item, i) => (
                <tr key={i}>
                  <td className="text-primary">{item.cliente}</td>
                  {isAdmin && <td>{item.assessor || '-'}</td>}
                  <td>{item.escritorio || '-'}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(item.valor_do_bem)}</td>
                  <td style={{ textAlign: 'center' }}>{getMesNome(item.mes)}/{item.ano}</td>
                  <td>{item.administradora || '-'}</td>
                  <td>{item.modalidade || '-'}</td>
                  <td>{item.grupo || '-'}</td>
                  <td style={{ textAlign: 'right' }}>{item.cota || '-'}</td>
                  <td style={{ textAlign: 'right' }}>{item.parcela ? formatCurrency(item.parcela) : '-'}</td>
                  <td>{item.natureza_sujeito || '-'}</td>
                  <td>{item.uf || '-'}</td>
                  <td>{item.tipo_produto || '-'}</td>
                  <td style={{ textAlign: 'right' }}>{item.taxa_adm ? `${(item.taxa_adm * 100).toFixed(0)}%` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Vendas;
