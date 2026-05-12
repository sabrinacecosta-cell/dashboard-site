import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const ADMIN_EMAILS = ['sabrina@jtdkinvest.com', 'joel@wflowinvest.com'];

const fmtMoeda = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtData = (d) => {
  if (!d) return '-';
  const [y, m, day] = d.split('T')[0].split('-');
  return `${day}/${m}/${y}`;
};

const fmtGrupoCota = (val) => {
  if (!val) return '-';
  const parts = val.trim().split(/\s+/);
  if (parts.length < 2) return val;
  const [grupo, cota] = parts;
  return `${parseInt(grupo)} / ${parseInt(cota)}`;
};

const TITULO_SECAO = {
  '2026-05': 'Base de cálculo abril | Exercício maio',
  '2026-04': 'Base cálculo março | Exercício abril',
  '2026-03': 'Base cálculo fevereiro | Exercício março',
};

function getTituloSecao(mesRef) {
  if (!mesRef) return mesRef;
  const ym = String(mesRef).split('T')[0].substring(0, 7);
  return TITULO_SECAO[ym] || ym;
}

function getYM(mesRef) {
  if (!mesRef) return '';
  return String(mesRef).split('T')[0].substring(0, 7);
}

function TabelaComissoes({ rows, filtro }) {
  const rowsFiltrados = filtro
    ? rows.filter(r => (r.cliente || '').toLowerCase().includes(filtro.toLowerCase()))
    : rows;

  const totalCarta    = rowsFiltrados.reduce((s, r) => s + Number(r.valor_carta),    0);
  const totalBruto    = rowsFiltrados.reduce((s, r) => s + Number(r.valor_comissao), 0);
  const totalLiquido  = rowsFiltrados.reduce((s, r) => s + Number(r.valor_liquido) * 0.80, 0);

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Data Venda</th>
            <th>Contrato</th>
            <th>Grupo/Cota</th>
            <th style={{ textAlign: 'center' }}>Parcela</th>
            <th style={{ textAlign: 'right' }}>Valor Carta</th>
            <th style={{ textAlign: 'right' }}>Comissão %</th>
            <th style={{ textAlign: 'right' }}>Comissão Bruta</th>
            <th style={{ textAlign: 'right' }}>Comissão Líquida</th>
            <th>Cliente</th>
          </tr>
        </thead>
        <tbody>
          {rowsFiltrados.map(r => (
            <tr key={r.id}>
              <td>{fmtData(r.data_venda)}</td>
              <td className="text-primary">{r.contrato}</td>
              <td>{fmtGrupoCota(r.grupo_cota_versao)}</td>
              <td style={{ textAlign: 'center' }}>{r.parcela}</td>
              <td style={{ textAlign: 'right' }}>{fmtMoeda(r.valor_carta)}</td>
              <td style={{ textAlign: 'right' }}>
                {r.percentual_comissao != null
                  ? (Number(r.percentual_comissao) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + '%'
                  : '-'}
              </td>
              <td style={{ textAlign: 'right' }} className="text-primary">{fmtMoeda(r.valor_comissao)}</td>
              <td style={{ textAlign: 'right' }}>{fmtMoeda(Number(r.valor_liquido) * 0.80)}</td>
              <td>{r.cliente}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ fontWeight: 700 }}>
            <td colSpan={4}>Total ({rowsFiltrados.length} registros)</td>
            <td style={{ textAlign: 'right' }}>{fmtMoeda(totalCarta)}</td>
            <td />
            <td style={{ textAlign: 'right' }} className="text-primary">{fmtMoeda(totalBruto)}</td>
            <td style={{ textAlign: 'right' }}>{fmtMoeda(totalLiquido)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function Comissoes() {
  const { user } = useAuth();
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('');

  const isAdmin = ADMIN_EMAILS.includes(user?.email);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    api.get('/comissoes')
      .then(r => setDados(r.data))
      .catch(() => setError('Erro ao carregar comissões'))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const secoes = React.useMemo(() => {
    const map = {};
    dados.forEach(r => {
      const ym = getYM(r.mes_referencia);
      if (!map[ym]) map[ym] = [];
      map[ym].push(r);
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [dados]);

  return (
    <div className="page-comissoes">
      <div className="page-header">
        <h1>Comissões</h1>
        <p className="page-subtitle">Acompanhe seus ganhos</p>
      </div>

      {!isAdmin ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-icon">🔒</span>
            <h3>Acesso restrito</h3>
            <p>Você não tem permissão para visualizar esta página.</p>
          </div>
        </div>
      ) : loading ? (
        <div className="page-loading">Carregando...</div>
      ) : error ? (
        <div className="page-error">{error}</div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <input
              type="text"
              placeholder="Buscar por cliente..."
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                boxSizing: 'border-box',
              }}
            />
          </div>
          {secoes.map(([ym, rows]) => (
            <div className="card" key={ym} style={{ marginBottom: '1.5rem' }}>
              <h3>{getTituloSecao(rows[0]?.mes_referencia)}</h3>
              <TabelaComissoes rows={rows} filtro={filtro} />
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default Comissoes;
