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

  async function exportarExcel() {
    const XLSX = await import('xlsx');
    const header = [
      'Grupo', 'Cota', 'Contrato', 'Valor do Bem', 'Data Venda', 'Prazo do Grupo', 'Taxa Adm',
      'Próximo Reajuste', 'Parcelas Pagas', 'Soma Parcelas Pagas', 'Prazo Restante', 'Saldo Devedor Restante',
    ];
    const body = contratos.map((c) => [
      c.grupo,
      String(c.cota).replace('-00', ''),
      c.contrato,
      c.valor_do_bem != null ? Number(c.valor_do_bem) : '',
      c.data_venda,
      c.prazo_grupo,
      c.taxa_adm,
      c.proximo_reajuste,
      c.parcelas_pagas,
      Number(c.soma_parcelas_pagas),
      c.prazo_restante,
      Number(c.saldo_devedor),
    ]);
    const total = ['Total', `${contratos.length} contratos`, '', '', '', '', '', '', '',
      Number(totalSomaParcelas.toFixed(2)), '', ''];
    const ws = XLSX.utils.aoa_to_sheet([header, ...body, total]);
    ws['!cols'] = header.map((h) => ({ wch: Math.max(12, h.length + 2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Acompanhamento');
    const nome = clienteSelecionado.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
    XLSX.writeFile(wb, `Acompanhamento-${nome}.xlsx`);
  }

  return (
    <div className="page-acompanhamento">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1>Acompanhamento</h1>
          <p className="page-subtitle">
            {clienteSelecionado.nome} — CPF {clienteSelecionado.cpf}
          </p>
        </div>
        {user && !user.is_demo && (
          <button
            type="button"
            onClick={exportarExcel}
            style={{
              width: 'auto', marginTop: 0, whiteSpace: 'nowrap',
              padding: '0.55rem 1rem', borderRadius: '8px', border: 'none',
              background: 'var(--accent)', color: '#000', fontWeight: 600,
              fontSize: '0.85rem', cursor: 'pointer',
            }}
          >
            📊 Exportar Excel
          </button>
        )}
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
                <th style={{ textAlign: 'right' }}>Valor do Bem</th>
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
                  <td style={{ textAlign: 'right' }}>{c.valor_do_bem != null ? fmtMoeda(c.valor_do_bem) : '-'}</td>
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
                <td colSpan={8} />
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
