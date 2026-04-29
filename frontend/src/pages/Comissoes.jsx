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

function Comissoes() {
  const { user } = useAuth();
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = ADMIN_EMAILS.includes(user?.email);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    api.get('/comissoes')
      .then(r => setDados(r.data))
      .catch(() => setError('Erro ao carregar comissões'))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const totalCarta    = dados.reduce((s, r) => s + Number(r.valor_carta),    0);
  const totalComissao = dados.reduce((s, r) => s + Number(r.valor_comissao), 0);
  const totalLiquido  = dados.reduce((s, r) => s + Number(r.valor_liquido),  0);

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
        <div className="card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Mês Ref.</th>
                  <th>Data Venda</th>
                  <th>Contrato</th>
                  <th>Grupo/Cota</th>
                  <th style={{ textAlign: 'center' }}>Parcela</th>
                  <th style={{ textAlign: 'right' }}>Valor Carta</th>
                  <th style={{ textAlign: 'right' }}>Comissão</th>
                  <th style={{ textAlign: 'right' }}>Valor Líquido</th>
                  <th>Cliente</th>
                </tr>
              </thead>
              <tbody>
                {dados.map(r => (
                  <tr key={r.id}>
                    <td>{fmtData(r.mes_referencia)}</td>
                    <td>{fmtData(r.data_venda)}</td>
                    <td className="text-primary">{r.contrato}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{r.grupo_cota_versao}</td>
                    <td style={{ textAlign: 'center' }}>{r.parcela}</td>
                    <td style={{ textAlign: 'right' }}>{fmtMoeda(r.valor_carta)}</td>
                    <td style={{ textAlign: 'right' }} className="text-primary">{fmtMoeda(r.valor_comissao)}</td>
                    <td style={{ textAlign: 'right' }}>{fmtMoeda(r.valor_liquido)}</td>
                    <td>{r.cliente}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700 }}>
                  <td colSpan={5}>Total ({dados.length} registros)</td>
                  <td style={{ textAlign: 'right' }}>{fmtMoeda(totalCarta)}</td>
                  <td style={{ textAlign: 'right' }} className="text-primary">{fmtMoeda(totalComissao)}</td>
                  <td style={{ textAlign: 'right' }}>{fmtMoeda(totalLiquido)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Comissoes;
