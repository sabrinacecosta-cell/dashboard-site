import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const EMAILS_PERMITIDOS = ['sabrina@jtdkinvest.com', 'joaomatheus_heckler@outlook.com'];

const fmtMoeda = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Cabeçalho da planilha (normalizado) → coluna do banco
const norm = (h) => String(h || '').toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[%:]/g, '').replace(/\s+/g, ' ').trim();

const COLMAP = {
  'cliente': 'cliente_nome', 'cliente nome': 'cliente_nome', 'nome': 'cliente_nome',
  'nome do cliente': 'cliente_nome', 'nome cliente': 'cliente_nome',
  'cpf': 'cliente_cpf', 'cliente cpf': 'cliente_cpf', 'cpf do cliente': 'cliente_cpf', 'cpf cliente': 'cliente_cpf',
  'grupo': 'grupo',
  'cota': 'cota',
  'contrato': 'contrato',
  'data venda': 'data_venda', 'data da venda': 'data_venda',
  'prazo do grupo': 'prazo_grupo', 'prazo grupo': 'prazo_grupo',
  'taxa adm': 'taxa_adm', 'taxa administracao': 'taxa_adm', 'taxa de administracao': 'taxa_adm',
  'proximo reajuste': 'proximo_reajuste', 'proximo reajuste em': 'proximo_reajuste',
  'parcelas pagas': 'parcelas_pagas',
  'soma parcelas pagas': 'soma_parcelas_pagas', 'soma das parcelas pagas': 'soma_parcelas_pagas', 'soma parcelas': 'soma_parcelas_pagas',
  'prazo restante': 'prazo_restante',
  'saldo devedor': 'saldo_devedor', 'saldo devedor restante': 'saldo_devedor',
};

function Acompanhamento() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clienteIdx, setClienteIdx] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const fileRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';               // permite reimportar o mesmo arquivo
    if (!file) return;
    setImporting(true);
    setImportMsg('');
    try {
      const XLSX = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const linhas = raw.map((row) => {
        const o = {};
        for (const [k, v] of Object.entries(row)) {
          const field = COLMAP[norm(k)];
          if (field) o[field] = typeof v === 'string' ? v.trim() : v;
        }
        return o;
      }).filter((o) => o.grupo && o.cota && o.cliente_nome);

      if (!linhas.length) {
        setImportMsg('Nenhuma linha válida — confira os cabeçalhos (precisa de Cliente, Grupo e Cota).');
        return;
      }

      const r = await api.post('/acompanhamento/importar', { linhas });
      const { inseridos, atualizados, ignorados } = r.data;
      setImportMsg(`Importado: ${inseridos} inserida(s), ${atualizados} atualizada(s)${ignorados ? `, ${ignorados} ignorada(s)` : ''}.`);
      const nd = await api.get('/acompanhamento');
      setDados(nd.data);
    } catch (err) {
      setImportMsg(err?.response?.data?.error || 'Erro ao importar o arquivo.');
    } finally {
      setImporting(false);
    }
  }

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
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1>Acompanhamento</h1>
          <p className="page-subtitle">
            {clienteSelecionado.nome} — CPF {clienteSelecionado.cpf}
          </p>
        </div>
        {user && !user.is_demo && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFile}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="btn-admin-action"
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              style={{ width: 'auto', marginTop: 0, whiteSpace: 'nowrap' }}
            >
              {importing ? 'Importando…' : '📊 Importar Excel'}
            </button>
            {importMsg && (
              <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', maxWidth: '260px', textAlign: 'right' }}>
                {importMsg}
              </span>
            )}
          </div>
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
