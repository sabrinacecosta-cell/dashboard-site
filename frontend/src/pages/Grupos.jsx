import React, { useState, useEffect } from 'react';
import api from '../services/api';
import AdministradoraToggle from '../components/AdministradoraToggle';
import ModalidadeSubSelector from '../components/ModalidadeSubSelector';

const MODALIDADE_LABEL = {
  lance_livre: 'Lance Livre',
  lance_fixo_50: 'Lance Fixo 50%',
  segundo_lance_fixo_25: '2º Lance Fixo 25%',
};

function Grupos() {
  const [administradora, setAdministradora] = useState('CNP'); // 'CNP' ou 'EMBRACON'

  // ─────────────────────────── CNP (fluxo existente) ───────────────────────────
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

  // ─────────────────────────────── Embracon ───────────────────────────────────
  const [embGrupos, setEmbGrupos] = useState([]);
  const [embGrupo, setEmbGrupo] = useState(null);
  const [embModalidade, setEmbModalidade] = useState('lance_livre');
  const [embResp, setEmbResp] = useState(null);
  const [embLoading, setEmbLoading] = useState(false);
  const [embError, setEmbError] = useState('');

  // Lista de grupos da Embracon (hoje: só 7036)
  useEffect(() => {
    if (administradora !== 'EMBRACON') return;
    let ativo = true;
    (async () => {
      try {
        setEmbError('');
        const resp = await api.get('/simulador/grupos?administradora=EMBRACON');
        if (!ativo) return;
        const grupos = resp.data.map((g) => g.numero_grupo);
        setEmbGrupos(grupos);
        setEmbGrupo((prev) => (prev != null ? prev : grupos[0] ?? null));
      } catch (err) {
        if (ativo) setEmbError('Erro ao carregar grupos da Embracon');
      }
    })();
    return () => { ativo = false; };
  }, [administradora]);

  // Histórico mensal por grupo/modalidade
  useEffect(() => {
    if (administradora !== 'EMBRACON' || embGrupo == null) {
      setEmbResp(null);
      return;
    }
    let ativo = true;
    (async () => {
      try {
        setEmbLoading(true);
        setEmbError('');
        const resp = await api.get(`/simulador/embracon/${embGrupo}/${embModalidade}`);
        if (ativo) setEmbResp(resp.data);
      } catch (err) {
        if (ativo) setEmbError('Erro ao carregar dados da Embracon');
      } finally {
        if (ativo) setEmbLoading(false);
      }
    })();
    return () => { ativo = false; };
  }, [administradora, embGrupo, embModalidade]);

  // ─────────────────────────────── Helpers ────────────────────────────────────
  const formatPct = (val) => {
    if (!val && val !== 0) return '-';
    const pct = parseFloat(val) * 100;
    return pct % 1 === 0 ? `${pct}%` : `${pct.toFixed(1).replace('.', ',')}%`;
  };

  const formatMesAno = (mes) => {
    if (!mes) return '-';
    if (mes.includes('/')) return mes;
    return `${mes}/2025`;
  };

  // mes da Embracon é uma DATE (ex.: "2026-01-01"); exibe "jan/2026".
  const formatMesEmbracon = (mes) => {
    if (!mes) return '-';
    const d = new Date(mes);
    if (isNaN(d.getTime())) return mes;
    return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  };

  // Média já vem em % do backend (calculada em tempo real sobre a tabela).
  const formatMediaEmbracon = (val) => {
    if (val == null) return '-';
    const n = parseFloat(val);
    return n % 1 === 0 ? `${n}%` : `${n.toFixed(1).replace('.', ',')}%`;
  };

  const handleTipoChange = (novoTipo) => {
    if (novoTipo !== tipoSelecionado) {
      setTipoSelecionado(novoTipo);
    }
  };

  // ─────────────────────────────── Render CNP ─────────────────────────────────
  function renderCNP() {
    if (loading) return <div className="page-loading">Carregando...</div>;
    if (error) return <div className="page-error">{error}</div>;
    if (!dados || !dados.dados) return <div className="page-error">Nenhum dado disponível</div>;

    // Filtra dados pelo grupo selecionado
    const dadosFiltrados = grupoSelecionado
      ? dados.dados.filter((d) => d.grupo === grupoSelecionado)
      : dados.dados;

    // Agrupa por grupo para exibição
    const dadosPorGrupo = {};
    dadosFiltrados.forEach((d) => {
      if (!dadosPorGrupo[d.grupo]) {
        dadosPorGrupo[d.grupo] = [];
      }
      dadosPorGrupo[d.grupo].push(d);
    });

    return (
      <>
        {/* Toggle Auto / Imóvel */}
        <div className="toggle-group">
          <button
            type="button"
            className={`toggle-btn ${tipoSelecionado === 'auto' ? 'active' : ''}`}
            onClick={() => handleTipoChange('auto')}
          > Auto
          </button>
          <button
            type="button"
            className={`toggle-btn ${tipoSelecionado === 'imovel' ? 'active' : ''}`}
            onClick={() => handleTipoChange('imovel')}
          > Imóvel
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
              {dados.grupos && dados.grupos.map((g) => (
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
                    <th style={{ textAlign: 'center' }}>Prazo restante</th>
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
                      <td style={{ textAlign: 'center' }}>{r.prazo_restante != null ? `${r.prazo_restante}m` : '-'}</td>
                      <td style={{ textAlign: 'center' }}>{formatPct(r.media_contemplacao_6m)}</td>
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
              <span className="empty-icon">{tipoSelecionado === 'auto' ? ' ' : ' '}</span>
              <h3>Nenhum dado disponível</h3>
              <p>Não há registros de contemplação para {tipoSelecionado === 'auto' ? 'Auto' : 'Imóvel'}.</p>
            </div>
          </div>
        )}

        {/* Detalhes por Grupo */}
        {Object.entries(dadosPorGrupo).map(([grupo, registros]) => {
          const mediaContemp = registros.find((r) => r.media_contemplacao != null)?.media_contemplacao ?? null;
          const media6m = registros.find((r) => r.media_contemplacao_6m != null)?.media_contemplacao_6m ?? null;
          return (
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
                          <th style={{ textAlign: 'center' }}>Média Contemp. (12 meses)</th>
                          <th style={{ textAlign: 'center' }}>Média Contemp. (6 meses)</th>
                        </>
                      ) : (
                        <th style={{ textAlign: 'center' }}>Média Contemp.</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {registros.map((r, i) => (
                      <tr key={i}>
                        <td className="text-primary" style={{ textAlign: 'center', textTransform: 'capitalize' }}>{formatMesAno(r.mes)}</td>
                        <td style={{ textAlign: 'center' }}>{r.lance_percent}%</td>
                        <td style={{ textAlign: 'center' }}>{r.qnt_lances}</td>
                        <td style={{ textAlign: 'center' }}>{r.contemplados}</td>
                        <td style={{ textAlign: 'center' }}>{formatPct(r.contemplacao_mensal)}</td>
                        {tipoSelecionado === 'imovel' ? (
                          <>
                            <td style={{ textAlign: 'center' }} className="text-primary">{i === 0 ? formatPct(mediaContemp) : '-'}</td>
                            <td style={{ textAlign: 'center' }} className="text-primary">{i === 0 ? formatPct(media6m) : '-'}</td>
                          </>
                        ) : (
                          <td style={{ textAlign: 'center' }} className="text-primary">{i === 0 ? formatPct(mediaContemp) : '-'}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </>
    );
  }

  // ───────────────────────────── Render Embracon ──────────────────────────────
  function renderEmbracon() {
    const historico = embResp?.historico || [];
    const mostrarLance = embModalidade === 'lance_livre'; // demais modalidades têm lance_percent nulo

    return (
      <>
        {/* Filtro de Grupo */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <label style={{ fontWeight: 500, marginBottom: 0 }}>Grupo:</label>
            <select
              value={embGrupo ?? ''}
              onChange={(e) => setEmbGrupo(e.target.value ? Number(e.target.value) : null)}
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
              {embGrupos.length === 0 && <option value="">Nenhum grupo</option>}
              {embGrupos.map((g) => (
                <option key={g} value={g}>Grupo {g}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sub-seletor de modalidade */}
        <ModalidadeSubSelector
          administradora={administradora}
          value={embModalidade}
          onChange={setEmbModalidade}
        />

        {embError && <div className="page-error" style={{ marginTop: '1rem' }}>{embError}</div>}
        {embLoading && <div className="page-loading">Carregando...</div>}

        {!embLoading && !embError && (
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ margin: 0 }}>
                {embGrupo != null ? `Grupo ${embGrupo}` : 'Grupo'} — {MODALIDADE_LABEL[embModalidade]}
              </h3>
              <span className="text-primary" style={{ fontWeight: 600 }}>
                Média contemplação (últimos 6 meses): {formatMediaEmbracon(embResp?.media_contemplacao_percentual)}
              </span>
            </div>

            {historico.length === 0 ? (
              <div className="empty-state">
                <h3>Nenhum dado disponível</h3>
                <p>Não há histórico de lances para este grupo/modalidade.</p>
              </div>
            ) : (
              <div className="table-scroll" style={{ marginTop: '1rem' }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'center' }}>Mês</th>
                      <th style={{ textAlign: 'center' }}>Contemplados</th>
                      <th style={{ textAlign: 'center' }}>Ofertados</th>
                      {mostrarLance && <th style={{ textAlign: 'center' }}>Lance %</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map((r, i) => (
                      <tr key={i}>
                        <td className="text-primary" style={{ textAlign: 'center', textTransform: 'capitalize' }}>{formatMesEmbracon(r.mes)}</td>
                        <td style={{ textAlign: 'center' }}>{r.contemplados}</td>
                        <td style={{ textAlign: 'center' }}>{r.ofertados}</td>
                        {mostrarLance && (
                          <td style={{ textAlign: 'center' }}>{r.lance_percent != null ? `${r.lance_percent}%` : '-'}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="page-grupos">
      <div className="page-header">
        <h1>Análise de Grupos</h1>
        <p className="page-subtitle">Contemplações e lances por grupo</p>
      </div>

      {/* Toggle de administradora */}
      <AdministradoraToggle value={administradora} onChange={setAdministradora} />

      {administradora === 'CNP' ? renderCNP() : renderEmbracon()}
    </div>
  );
}

export default Grupos;
