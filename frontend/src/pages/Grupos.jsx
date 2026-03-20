import React, { useState, useEffect } from 'react';
import api from '../services/api';

function Grupos() {
  const [tipoSelecionado, setTipoSelecionado] = useState('imovel'); // 'imovel' ou 'auto'
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [grupoSelecionado, setGrupoSelecionado] = useState(null);

  useEffect(() => {
    loadDados();
  }, [tipoSelecionado]);

  async function loadDados() {
    try {
      setLoading(true);
      setError('');
      setGrupoSelecionado(null);
      const response = await api.get(`/contemplacao?tipo=${tipoSelecionado}`);
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

  const formatMesAno = (mes) => {
    const mesLower = mes?.toLowerCase();
    if (mesLower === 'janeiro') return 'janeiro/2026';
    if (mesLower === 'fevereiro') return 'fevereiro/2026';
    if (mesLower === 'março') return 'março/2026';
    return `${mes}/2025`;
  };

  const handleTipoChange = (novoTipo) => {
    if (novoTipo !== tipoSelecionado) {
      setTipoSelecionado(novoTipo);
    }
  };

  if (loading) return <div className="page-loading">Carregando...</div>;
  if (error) return <div className="page-error">{error}</div>;
  if (!dados || !dados.dados) return <div className="page-error">Nenhum dado disponível</div>;

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

      {/* Toggle Auto / Imóvel */}
      <div className="toggle-group">
        <button
          type="button"
          className={`toggle-btn ${tipoSelecionado === 'auto' ? 'active' : ''}`}
          onClick={() => handleTipoChange('auto')}
        >
          🚗 Auto
        </button>
        <button
          type="button"
          className={`toggle-btn ${tipoSelecionado === 'imovel' ? 'active' : ''}`}
          onClick={() => handleTipoChange('imovel')}
        >
          🏠 Imóvel
        </button>
      </div>

      {/* Filtro de Grupos */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 500, marginBottom: 0 }}>Filtrar grupo:</label>
          <select 
            value={grupoSelecionado || ''} 
            onChange={(e) => setGrupoSelecionado(e.target.value ? Number(e.target.value) : null)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              width: 'auto'
            }}
          >
            <option value="">Todos os grupos</option>
            {dados.grupos && dados.grupos.map(g => (
              <option key={g} value={g}>Grupo {g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Nota explicativa sobre os cálculos */}
      <div style={{
        background: '#1e1e1e',
        borderLeft: '3px solid #F5C000',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '1.5rem',
        color: 'var(--text-secondary)',
        fontSize: '0.82rem',
        lineHeight: '1.6',
      }}>
        Estes cálculos mostram a efetividade do lance máximo, calculada pela relação entre a quantidade de cotas que ofertaram lance máximo VS contempladas em cada mês. A análise considera tanto o desempenho mês a mês quanto as médias dos últimos 6 e 11 meses, permitindo ao assessor entender a probabilidade de contemplação e planejar a estratégia com maior previsibilidade.
      </div>

      {/* Resumo Geral */}
      {!grupoSelecionado && dados.resumo && dados.resumo.length > 0 && (
        <div className="card">
          <h3>Resumo por Grupo</h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'center' }}>Grupo</th>
                  <th style={{ textAlign: 'center' }}>Média Contemplação (últimos 6 meses)</th>
                  <th style={{ textAlign: 'center' }}>Lance % (último mês)</th>
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
                    <td style={{ textAlign: 'center' }} className="text-primary">Grupo {r.grupo}</td>
                    <td style={{ textAlign: 'center' }}>{r.media_contemplacao}%</td>
                    <td style={{ textAlign: 'center' }} className="text-primary">{r.ultimo_lance_percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mensagem quando não há dados */}
      {Object.keys(dadosPorGrupo).length === 0 && (
        <div className="card">
          <div className="empty-state">
            <span className="empty-icon">{tipoSelecionado === 'auto' ? '🚗' : '🏠'}</span>
            <h3>Nenhum dado disponível</h3>
            <p>Não há registros de contemplação para {tipoSelecionado === 'auto' ? 'Auto' : 'Imóvel'}.</p>
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
                  <th style={{ textAlign: 'center' }}>Mês</th>
                  <th style={{ textAlign: 'center' }}>Lance %</th>
                  <th style={{ textAlign: 'center' }}>Qnt Lances</th>
                  <th style={{ textAlign: 'center' }}>Contemplados</th>
                  <th style={{ textAlign: 'center' }}>Contemp. Mensal</th>
                  {tipoSelecionado === 'imovel' ? (
                    <>
                      <th style={{ textAlign: 'center' }}>Média Contemp. (11 meses)</th>
                      <th style={{ textAlign: 'center' }}>Média Contemp. (6 meses)</th>
                    </>
                  ) : (
                    <th style={{ textAlign: 'center' }}>Média Contemp.</th>
                  )}
                  <th style={{ textAlign: 'center' }}>Média Lance</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r, i) => (
                  <tr key={i}>
                    <td className="text-primary" style={{ textAlign: 'center', textTransform: 'capitalize' }}>{formatMesAno(r.mes)}</td>
                    <td style={{ textAlign: 'center' }}>{r.lance_percent}%</td>
                    <td style={{ textAlign: 'center' }}>{r.qnt_lances}</td>
                    <td style={{ textAlign: 'center' }}>{r.contemplados}</td>
                    <td style={{ textAlign: 'center' }}>{r.contemplacao_mensal || '-'}</td>
                    {tipoSelecionado === 'imovel' ? (
                      <>
                        <td style={{ textAlign: 'center' }} className="text-primary">{r.media_contemplacao || '-'}</td>
                        <td style={{ textAlign: 'center' }} className="text-primary">{r.media_contemplacao_6m || '-'}</td>
                      </>
                    ) : (
                      <td style={{ textAlign: 'center' }} className="text-primary">{r.media_contemplacao || '-'}</td>
                    )}
                    <td style={{ textAlign: 'center' }}>{r.media_lance_percent ? `${r.media_lance_percent}%` : '-'}</td>
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
