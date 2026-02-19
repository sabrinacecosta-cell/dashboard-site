import React, { useState, useEffect } from 'react';
import api from '../services/api';

function Grupos() {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [grupoSelecionado, setGrupoSelecionado] = useState(null);

  useEffect(() => {
    loadDados();
  }, []);

  async function loadDados() {
    try {
      const response = await api.get('/contemplacao');
      setDados(response.data);
    } catch (err) {
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  const formatPercent = (value) => {
    if (!value && value !== 0) return '-';
    return `${value}%`;
  };

  if (loading) return <div className="page-loading">Carregando...</div>;
  if (error) return <div className="page-error">{error}</div>;

  // Filtra dados pelo grupo selecionado
  const dadosFiltrados = grupoSelecionado 
    ? dados.dados.filter(d => d.grupo === grupoSelecionado)
    : dados.dados;

  // Agrupa por grupo para exibição
  const dadosPorGrupo = {};
  dadosFiltrados.forEach(d => {
    if (!dadosPorGrupo[d.grupo]) {
      dadosPorGrupo[d.grupo] = [];
    }
    dadosPorGrupo[d.grupo].push(d);
  });

  return (
    <div className="page-grupos">
      <div className="page-header">
        <h1>Análise de Grupos</h1>
        <p className="page-subtitle">Contemplações e lances por grupo</p>
      </div>

      {/* Filtro de Grupos */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 500 }}>Filtrar grupo:</label>
          <select 
            value={grupoSelecionado || ''} 
            onChange={(e) => setGrupoSelecionado(e.target.value ? Number(e.target.value) : null)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: '1rem'
            }}
          >
            <option value="">Todos os grupos</option>
            {dados.grupos.map(g => (
              <option key={g} value={g}>Grupo {g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Resumo Geral */}
      {!grupoSelecionado && (
        <div className="card">
          <h3>Resumo por Grupo</h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Grupo</th>
                  <th style={{ textAlign: 'right' }}>Meses</th>
                  <th style={{ textAlign: 'right' }}>Média Lance %</th>
                  <th style={{ textAlign: 'right' }}>Total Lances</th>
                  <th style={{ textAlign: 'right' }}>Total Contemplados</th>
                </tr>
              </thead>
              <tbody>
                {dados.resumo.map((r, i) => (
                  <tr 
                    key={i} 
                    onClick={() => setGrupoSelecionado(r.grupo)}
                    style={{ cursor: 'pointer' }}
                    className="row-clickable"
                  >
                    <td className="text-primary">Grupo {r.grupo}</td>
                    <td style={{ textAlign: 'right' }}>{r.total_meses}</td>
                    <td style={{ textAlign: 'right' }}>{r.media_lance}%</td>
                    <td style={{ textAlign: 'right' }}>{r.total_lances}</td>
                    <td style={{ textAlign: 'right' }} className="text-primary">{r.total_contemplados}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detalhes por Grupo */}
      {Object.entries(dadosPorGrupo).map(([grupo, registros]) => (
        <div className="card" key={grupo} style={{ marginTop: '1.5rem' }}>
          <h3>Grupo {grupo}</h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Mês</th>
                  <th style={{ textAlign: 'right' }}>Lance %</th>
                  <th style={{ textAlign: 'right' }}>Qnt Lances</th>
                  <th style={{ textAlign: 'right' }}>Contemplados</th>
                  <th style={{ textAlign: 'right' }}>Contemp. Mensal</th>
                  <th style={{ textAlign: 'right' }}>Média Contemp.</th>
                  <th style={{ textAlign: 'right' }}>Média Lance</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r, i) => (
                  <tr key={i}>
                    <td className="text-primary" style={{ textTransform: 'capitalize' }}>{r.mes}</td>
                    <td style={{ textAlign: 'right' }}>{r.lance_percent}%</td>
                    <td style={{ textAlign: 'right' }}>{r.qnt_lances}</td>
                    <td style={{ textAlign: 'right' }}>{r.contemplados}</td>
                    <td style={{ textAlign: 'right' }}>{r.contemplacao_mensal || '-'}</td>
                    <td style={{ textAlign: 'right' }} className="text-primary">{r.media_contemplacao || '-'}</td>
                    <td style={{ textAlign: 'right' }}>{r.media_lance_percent ? `${r.media_lance_percent}%` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Grupos;
