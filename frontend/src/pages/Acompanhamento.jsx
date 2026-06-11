import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const EMAILS_PERMITIDOS = ['sabrina@jtdkinvest.com', 'joaomatheus_heckler@outlook.com'];

const fmtMoeda = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function Acompanhamento() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clienteIdx, setClienteIdx] = useState(0);

  useEffect(() => {
    if (user && !user.is_demo && !EMAILS_PERMITIDOS.includes(user.email)) {
      navigate('/vendas');
    }
  }, [user, navigate]);

  useEffect(() => {
    api.get('/acompanhamento')
      .then(r => setDados(r.data))
      .catch(() => setError('Erro ao carregar dados'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading">Carregando...</div>;
  if (error)   return <div className="page-error">{error}</div>;

  // Agrupa por cliente
  const clientesMap = {};
  dados.forEach(r => {
    if (!clientesMap[r.cliente_nome]) {
      clientesMap[r.cliente_nome] = { nome: r.cliente_nome, cpf: r.cliente_cpf, contratos: [] };
    }
    clientesMap[r.cliente_nome].contratos.push(r);
  });
  const clientes = Object.values(clientesMap);

  if (clientes.length === 0) return <div className="page-error">Nenhum dado disponível</div>;

  const clienteSelecionado = clientes[clienteIdx] || clientes[0];
  const { contratos } = clienteSelecionado;
  const totalSomaParcelas = contratos.reduce((s, c) => s + Number(c.soma_parcelas_pagas), 0);

  return (
    <div className="page-acompanhamento">
      <div className="page-header">
        <h1>Acompanhamento</h1>
        <p className="page-subtitle">
          {clienteSelecionado.nome} — CPF {clienteSelecionado.cpf}
        </p>
      </div>

      {/* Seletor de cliente */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 500, color: 'var(--text-secondary)', fontSize: '13px' }}>
            Cliente:
          </span>
          <div className="toggle-group" style={{ marginBottom: 0 }}>
            {clientes.map((c, i) => (
              <button
                key={i}
                type="button"
                className={`toggle-btn${clienteIdx === i ? ' active' : ''}`}
                onClick={() => setClienteIdx(i)}
              >
                {c.nome.split(' ').slice(0, 2).join(' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela de contratos */}
      <div className="card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Grupo</th>
                <th>Cota</th>
                <th>Contrato</th>
                <th>Data Venda</th>
                <th style={{ textAlign: 'center' }}>Prazo do Grupo</th>
                <th style={{ textAlign: 'center' }}>Taxa Adm</th>
                <th>Próximo Reajuste</th>
                <th style={{ textAlign: 'center' }}>Parcelas Pagas</th>
                <th style={{ textAlign: 'right' }}>Soma Parcelas Pagas</th>
                <th style={{ textAlign: 'center' }}>Prazo Restante</th>
                <th style={{ textAlign: 'right' }}>Saldo Devedor Restante</th>
              </tr>
            </thead>
            <tbody>
              {contratos.map((c, i) => (
                <tr key={i}>
                  <td className="text-primary">{c.grupo}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{c.cota.replace('-00', '')}</td>
                  <td>{c.contrato}</td>
                  <td>{c.data_venda}</td>
                  <td style={{ textAlign: 'center' }}>{c.prazo_grupo} meses</td>
                  <td style={{ textAlign: 'center' }}>{c.taxa_adm}</td>
                  <td>{c.proximo_reajuste}</td>
                  <td style={{ textAlign: 'center' }}>{c.parcelas_pagas}</td>
                  <td style={{ textAlign: 'right' }} className="text-primary">
                    {fmtMoeda(c.soma_parcelas_pagas)}
                  </td>
                  <td style={{ textAlign: 'center' }}>{c.prazo_restante} meses</td>
                  <td style={{ textAlign: 'right' }}>{fmtMoeda(c.saldo_devedor)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700 }}>
                <td>Total ({contratos.length} contratos)</td>
                <td colSpan={7} />
                <td style={{ textAlign: 'right' }} className="text-primary">
                  {fmtMoeda(totalSomaParcelas)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Acompanhamento;
