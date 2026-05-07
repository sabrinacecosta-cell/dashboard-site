import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const EMAILS_PERMITIDOS = ['sabrina@jtdkinvest.com', 'joaomatheus_heckler@outlook.com'];

const CLIENTES = [
  {
    nome: 'Marcelo Rodrigo Weckerlin',
    cpf: '027.140.749-28',
    contratos: [
      // ── Grupo 001002 ─────────────────────────────
      { grupo: '001002', cota: '0069-00', contrato: '103818', dataVenda: '14/07/2025', prazoGrupo: 150, taxaAdm: '18,50%', proximoReajuste: '01/02/2027', parcelasPagas: 10, somaParcelasPagas: 6202.23,  prazoRestante: 140, saldoDevedor: '97,0970%' },
      { grupo: '001002', cota: '0414-00', contrato: '103816', dataVenda: '14/07/2025', prazoGrupo: 150, taxaAdm: '18,50%', proximoReajuste: '01/02/2027', parcelasPagas: 10, somaParcelasPagas: 6202.23,  prazoRestante: 140, saldoDevedor: '97,0970%' },
      { grupo: '001002', cota: '0468-00', contrato: '103817', dataVenda: '14/07/2025', prazoGrupo: 150, taxaAdm: '18,50%', proximoReajuste: '01/02/2027', parcelasPagas: 10, somaParcelasPagas: 6202.23,  prazoRestante: 140, saldoDevedor: '97,0970%' },
      // ── Grupo 001003 ─────────────────────────────
      { grupo: '001003', cota: '0016-00', contrato: '103525', dataVenda: '10/06/2025', prazoGrupo: 150, taxaAdm: '12,50%', proximoReajuste: '09/06/2026', parcelasPagas: 11, somaParcelasPagas: 11550.00, prazoRestante: 139, saldoDevedor: '94,5000%' },
      { grupo: '001003', cota: '0027-00', contrato: '103524', dataVenda: '10/06/2025', prazoGrupo: 150, taxaAdm: '12,50%', proximoReajuste: '09/06/2026', parcelasPagas: 11, somaParcelasPagas:  9900.00, prazoRestante: 139, saldoDevedor: '94,5000%' },
      { grupo: '001003', cota: '0087-00', contrato: '103820', dataVenda: '14/07/2025', prazoGrupo: 150, taxaAdm: '18,50%', proximoReajuste: '11/07/2026', parcelasPagas: 10, somaParcelasPagas:  5170.10, prazoRestante: 140, saldoDevedor: '97,8770%' },
      { grupo: '001003', cota: '0126-00', contrato: '103523', dataVenda: '10/06/2025', prazoGrupo: 150, taxaAdm: '12,50%', proximoReajuste: '09/06/2026', parcelasPagas: 11, somaParcelasPagas:  9900.00, prazoRestante: 139, saldoDevedor: '94,5000%' },
      { grupo: '001003', cota: '0218-00', contrato: '103815', dataVenda: '14/07/2025', prazoGrupo: 150, taxaAdm: '18,50%', proximoReajuste: '11/07/2026', parcelasPagas: 10, somaParcelasPagas:  5965.50, prazoRestante: 140, saldoDevedor: '97,8770%' },
      { grupo: '001003', cota: '0235-00', contrato: '103819', dataVenda: '14/07/2025', prazoGrupo: 150, taxaAdm: '18,50%', proximoReajuste: '11/07/2026', parcelasPagas: 10, somaParcelasPagas:  4772.40, prazoRestante: 140, saldoDevedor: '97,8770%' },
      { grupo: '001003', cota: '0264-00', contrato: '103814', dataVenda: '14/07/2025', prazoGrupo: 150, taxaAdm: '18,50%', proximoReajuste: '11/07/2026', parcelasPagas: 10, somaParcelasPagas:  5965.50, prazoRestante: 140, saldoDevedor: '97,8770%' },
      { grupo: '001003', cota: '0330-00', contrato: '103522', dataVenda: '10/06/2025', prazoGrupo: 150, taxaAdm: '12,50%', proximoReajuste: '09/06/2026', parcelasPagas: 11, somaParcelasPagas:  9900.00, prazoRestante: 139, saldoDevedor: '94,5000%' },
    ],
  },
  // CLIENTE 2 — a ser adicionado depois
  // CLIENTE 3 — a ser adicionado depois
];

const fmtMoeda = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function Acompanhamento() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clienteIdx, setClienteIdx] = useState(0);

  useEffect(() => {
    if (user && !EMAILS_PERMITIDOS.includes(user.email)) {
      navigate('/vendas');
    }
  }, [user, navigate]);

  const clienteSelecionado = CLIENTES[clienteIdx];
  const { contratos } = clienteSelecionado;
  const totalSomaParcelas = contratos.reduce((s, c) => s + c.somaParcelasPagas, 0);

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
            {CLIENTES.map((c, i) => (
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
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{c.cota}</td>
                  <td>{c.contrato}</td>
                  <td>{c.dataVenda}</td>
                  <td style={{ textAlign: 'center' }}>{c.prazoGrupo} meses</td>
                  <td style={{ textAlign: 'center' }}>{c.taxaAdm}</td>
                  <td>{c.proximoReajuste}</td>
                  <td style={{ textAlign: 'center' }}>{c.parcelasPagas}</td>
                  <td style={{ textAlign: 'right' }} className="text-primary">
                    {fmtMoeda(c.somaParcelasPagas)}
                  </td>
                  <td style={{ textAlign: 'center' }}>{c.prazoRestante} meses</td>
                  <td style={{ textAlign: 'right' }}>{c.saldoDevedor}</td>
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
