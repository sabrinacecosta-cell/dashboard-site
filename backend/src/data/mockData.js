// ── Dados fictícios para o usuário demo ──────────────────────
// Nenhum dado aqui é real. Usado exclusivamente quando is_demo = true.

const hoje = new Date();
const mes = (offset = 0) => {
  const d = new Date(hoje);
  d.setMonth(d.getMonth() + offset);
  return d.toISOString().slice(0, 7);
};
const dia = (offsetDias = 0) => {
  const d = new Date(hoje);
  d.setDate(d.getDate() + offsetDias);
  return d.toISOString();
};
// Data+hora válida (ISO) para reuniões: diaHora(-5, '14:00') → 2026-06-05T14:00:00Z
const diaHora = (offsetDias = 0, hora = '09:00') => {
  const d = new Date(hoje);
  d.setDate(d.getDate() + offsetDias);
  return `${d.toISOString().slice(0, 10)}T${hora}:00Z`;
};

// ── Comissões ────────────────────────────────────────────────
const COMISSOES = [
  { id: 'demo-1', cliente: 'Roberto Alves Silva', contrato: '2024-00123', grupo_cota_versao: '1234 0056', data_venda: dia(-90), parcela: 1800.00, valor_carta: 120000, valor_comissao: 3600.00, valor_liquido: 2880.00, mes_referencia: mes(-2) + '-01', email_assessor: 'demo@jtdkinvest.com', nome_assessor: 'Ana Lima' },
  { id: 'demo-2', cliente: 'Mariana Costa Pereira', contrato: '2024-00124', grupo_cota_versao: '1235 0032', data_venda: dia(-80), parcela: 2200.00, valor_carta: 180000, valor_comissao: 5400.00, valor_liquido: 4320.00, mes_referencia: mes(-2) + '-01', email_assessor: 'demo@jtdkinvest.com', nome_assessor: 'Ana Lima' },
  { id: 'demo-3', cliente: 'Fernando Machado Jr.', contrato: '2024-00201', grupo_cota_versao: '1240 0010', data_venda: dia(-60), parcela: 3100.00, valor_carta: 250000, valor_comissao: 7500.00, valor_liquido: 6000.00, mes_referencia: mes(-1) + '-01', email_assessor: 'demo@jtdkinvest.com', nome_assessor: 'Ana Lima' },
  { id: 'demo-4', cliente: 'Beatriz Lopes Carvalho', contrato: '2024-00202', grupo_cota_versao: '1241 0022', data_venda: dia(-50), parcela: 1500.00, valor_carta: 90000, valor_comissao: 2700.00, valor_liquido: 2160.00, mes_referencia: mes(-1) + '-01', email_assessor: 'carlos.mendes@demo.com', nome_assessor: 'Carlos Mendes' },
  { id: 'demo-5', cliente: 'Thiago Ramos Fontes', contrato: '2024-00310', grupo_cota_versao: '1250 0041', data_venda: dia(-30), parcela: 2800.00, valor_carta: 210000, valor_comissao: 6300.00, valor_liquido: 5040.00, mes_referencia: mes(0) + '-01', email_assessor: 'demo@jtdkinvest.com', nome_assessor: 'Ana Lima' },
  { id: 'demo-6', cliente: 'Juliana Neves Brandão', contrato: '2024-00311', grupo_cota_versao: '1251 0015', data_venda: dia(-20), parcela: 4200.00, valor_carta: 350000, valor_comissao: 10500.00, valor_liquido: 8400.00, mes_referencia: mes(0) + '-01', email_assessor: 'carlos.mendes@demo.com', nome_assessor: 'Carlos Mendes' },
  { id: 'demo-7', cliente: 'Ricardo Oliveira Pinto', contrato: '2024-00312', grupo_cota_versao: '1252 0008', data_venda: dia(-10), parcela: 1950.00, valor_carta: 140000, valor_comissao: 4200.00, valor_liquido: 3360.00, mes_referencia: mes(0) + '-01', email_assessor: 'fernanda.souza@demo.com', nome_assessor: 'Fernanda Souza' },
  { id: 'demo-8', cliente: 'Patrícia Duarte Melo', contrato: '2024-00313', grupo_cota_versao: '1253 0033', data_venda: dia(-5), parcela: 5500.00, valor_carta: 450000, valor_comissao: 13500.00, valor_liquido: 10800.00, mes_referencia: mes(0) + '-01', email_assessor: 'demo@jtdkinvest.com', nome_assessor: 'Ana Lima' },
];

// ── Produção (Vendas) ────────────────────────────────────────
// Cada registro representa uma venda; o objeto final é montado em
// getProducaoDemo() no mesmo formato que producaoService retornaria.
const mesNum = (offset = 0) => {
  const d = new Date(hoje);
  d.setMonth(d.getMonth() + offset);
  return { mes: d.getMonth() + 1, ano: d.getFullYear() };
};
const m0 = mesNum(0), m1 = mesNum(-1), m2 = mesNum(-2);

const PRODUCAO_DETALHES = [
  { cliente: 'Roberto Alves Silva',   assessor: 'Ana Lima',       email_assessor: 'demo@jtdkinvest.com',     escritorio: 'JTDK Matriz',       valor_do_bem: 120000, mes: m2.mes, ano: m2.ano, modalidade: 'Imóvel',    grupo: 1234, cota: '0056', parcela: 1800, natureza_sujeito: 'Pessoa Física',    uf: 'RS', tipo_produto: 'Imóvel',    taxa_adm: 0.18 },
  { cliente: 'Mariana Costa Pereira', assessor: 'Ana Lima',       email_assessor: 'demo@jtdkinvest.com',     escritorio: 'JTDK Matriz',       valor_do_bem: 180000, mes: m2.mes, ano: m2.ano, modalidade: 'Imóvel',    grupo: 1235, cota: '0032', parcela: 2200, natureza_sujeito: 'Pessoa Física',    uf: 'SC', tipo_produto: 'Imóvel',    taxa_adm: 0.18 },
  { cliente: 'Fernando Machado Jr.',  assessor: 'Carlos Mendes',  email_assessor: 'carlos.mendes@demo.com',  escritorio: 'JTDK Filial Sul',   valor_do_bem: 250000, mes: m1.mes, ano: m1.ano, modalidade: 'Imóvel',    grupo: 1240, cota: '0010', parcela: 3100, natureza_sujeito: 'Pessoa Física',    uf: 'PR', tipo_produto: 'Imóvel',    taxa_adm: 0.17 },
  { cliente: 'Beatriz Lopes Carvalho',assessor: 'Carlos Mendes',  email_assessor: 'carlos.mendes@demo.com',  escritorio: 'JTDK Filial Sul',   valor_do_bem: 90000,  mes: m1.mes, ano: m1.ano, modalidade: 'Automóvel', grupo: 1241, cota: '0022', parcela: 1500, natureza_sujeito: 'Pessoa Física',    uf: 'RS', tipo_produto: 'Automóvel', taxa_adm: 0.16 },
  { cliente: 'Thiago Ramos Fontes',   assessor: 'Ana Lima',       email_assessor: 'demo@jtdkinvest.com',     escritorio: 'JTDK Matriz',       valor_do_bem: 210000, mes: m0.mes, ano: m0.ano, modalidade: 'Imóvel',    grupo: 1250, cota: '0041', parcela: 2800, natureza_sujeito: 'Pessoa Física',    uf: 'SP', tipo_produto: 'Imóvel',    taxa_adm: 0.18 },
  { cliente: 'Juliana Neves Brandão', assessor: 'Carlos Mendes',  email_assessor: 'carlos.mendes@demo.com',  escritorio: 'JTDK Filial Sul',   valor_do_bem: 350000, mes: m0.mes, ano: m0.ano, modalidade: 'Imóvel',    grupo: 1251, cota: '0015', parcela: 4200, natureza_sujeito: 'Pessoa Jurídica',  uf: 'SC', tipo_produto: 'Imóvel',    taxa_adm: 0.17 },
  { cliente: 'Ricardo Oliveira Pinto',assessor: 'Fernanda Souza', email_assessor: 'fernanda.souza@demo.com', escritorio: 'JTDK Filial Norte', valor_do_bem: 140000, mes: m0.mes, ano: m0.ano, modalidade: 'Automóvel', grupo: 1252, cota: '0008', parcela: 1950, natureza_sujeito: 'Pessoa Física',    uf: 'BA', tipo_produto: 'Automóvel', taxa_adm: 0.16 },
  { cliente: 'Patrícia Duarte Melo',  assessor: 'Ana Lima',       email_assessor: 'demo@jtdkinvest.com',     escritorio: 'JTDK Matriz',       valor_do_bem: 450000, mes: m0.mes, ano: m0.ano, modalidade: 'Imóvel',    grupo: 1253, cota: '0033', parcela: 5500, natureza_sujeito: 'Pessoa Jurídica',  uf: 'SP', tipo_produto: 'Imóvel',    taxa_adm: 0.18 },
];

// Monta o objeto de produção no mesmo formato de producaoService.getProducaoAdmin()
function getProducaoDemo() {
  const agrupaPorChave = (chave, rotulo) => {
    const map = {};
    for (const r of PRODUCAO_DETALHES) {
      const k = r[chave];
      if (!map[k]) map[k] = { [rotulo]: k, total: 0, quantidade: 0 };
      map[k].total += r.valor_do_bem;
      map[k].quantidade += 1;
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  };

  const porMesMap = {};
  for (const r of PRODUCAO_DETALHES) {
    if (!porMesMap[r.mes]) porMesMap[r.mes] = { mes: r.mes, total: 0, quantidade: 0 };
    porMesMap[r.mes].total += r.valor_do_bem;
    porMesMap[r.mes].quantidade += 1;
  }
  const porMes = Object.values(porMesMap).sort((a, b) => a.mes - b.mes);

  const valorTotal = PRODUCAO_DETALHES.reduce((s, r) => s + r.valor_do_bem, 0);
  const meses = [...new Set(PRODUCAO_DETALHES.map(r => r.mes))].sort((a, b) => a - b);
  const anos = [...new Set(PRODUCAO_DETALHES.map(r => r.ano))].sort((a, b) => a - b);
  const escritorios = [...new Set(PRODUCAO_DETALHES.map(r => r.escritorio))];
  const assessores = [...new Set(PRODUCAO_DETALHES.map(r => r.assessor))];

  return {
    isAdmin: true,
    totais: { quantidade: PRODUCAO_DETALHES.length, valorTotal },
    porEscritorio: agrupaPorChave('escritorio', 'escritorio'),
    porMes,
    porAssessor: agrupaPorChave('assessor', 'assessor'),
    filterOptions: { meses, anos, escritorios, assessores },
    detalhes: PRODUCAO_DETALHES,
  };
}

// ── Reuniões ─────────────────────────────────────────────────
const REUNIOES = [
  {
    id: 'rdemo-1', titulo: 'Apresentação portfólio — Roberto Silva', data_reuniao: diaHora(-5, '14:00'), data_fim: diaHora(-5, '15:00'),
    participantes: JSON.stringify(['demo@jtdkinvest.com', 'roberto.silva@email.com']),
    status: 'retorno', motivo_retorno: 'Quer pensar sobre os valores', ata_original: 'Reunião realizada com Roberto Silva. Apresentamos simulação de portfólio de R$250k. Cliente demonstrou interesse mas pediu prazo para avaliar com a família.', resumo_ia: 'Apresentação de portfólio de R$250k. Cliente interessado, solicitou prazo de 1 semana para decisão com a família. Próximo passo: follow-up na sexta-feira.', assessor_email: 'demo@jtdkinvest.com', tarefas: [{ id: 'tdemo-1', descricao: 'Enviar simulação por e-mail', concluida: true }, { id: 'tdemo-2', descricao: 'Ligar sexta-feira para follow-up', concluida: false }],
  },
  {
    id: 'rdemo-2', titulo: 'Reunião Mariana Costa — Imóvel', data_reuniao: diaHora(-12, '10:00'), data_fim: diaHora(-12, '11:00'),
    participantes: JSON.stringify(['demo@jtdkinvest.com', 'mariana.costa@email.com']),
    status: 'fechou', ata_original: 'Reunião com Mariana Costa para fechar consórcio de imóvel R$180k. Cliente assinou proposta ao final da reunião.', resumo_ia: 'Fechamento de consórcio imóvel R$180k. Cliente assinou proposta. Grupo 1235, cota 0032.', assessor_email: 'demo@jtdkinvest.com', tarefas: [{ id: 'tdemo-3', descricao: 'Enviar documentação para a administradora', concluida: true }],
  },
  {
    id: 'rdemo-3', titulo: 'Prospecção — Empresa Construtora ABC', data_reuniao: diaHora(-2, '16:00'), data_fim: diaHora(-2, '17:00'),
    participantes: JSON.stringify(['demo@jtdkinvest.com', 'diretoria@construtorabc.com.br']),
    status: 'em_andamento', ata_original: null, resumo_ia: null, assessor_email: 'demo@jtdkinvest.com', tarefas: [],
  },
  {
    id: 'rdemo-4', titulo: 'Revisão carteira — Fernando Machado', data_reuniao: diaHora(2, '09:00'), data_fim: diaHora(2, '09:30'),
    participantes: JSON.stringify(['demo@jtdkinvest.com', 'fernando.machado@email.com']),
    status: 'em_andamento', ata_original: null, resumo_ia: null, assessor_email: 'demo@jtdkinvest.com', tarefas: [],
  },
];

// ── Acompanhamento ───────────────────────────────────────────
// Shape conforme esperado por Acompanhamento.jsx (agrupa por cliente_nome).
const ACOMPANHAMENTO = [
  { id: 'ademo-1', cliente_nome: 'Roberto Alves Silva', cliente_cpf: '123.456.789-00', grupo: 1234, cota: '0056-00', contrato: '2024-00123', data_venda: '12/03/2024', prazo_grupo: 200, taxa_adm: '18%', proximo_reajuste: '03/2027', parcelas_pagas: 27, soma_parcelas_pagas: 48600,  prazo_restante: 173, saldo_devedor: 95000 },
  { id: 'ademo-2', cliente_nome: 'Roberto Alves Silva', cliente_cpf: '123.456.789-00', grupo: 1240, cota: '0010-00', contrato: '2024-00201', data_venda: '11/04/2024', prazo_grupo: 180, taxa_adm: '17%', proximo_reajuste: '04/2027', parcelas_pagas: 26, soma_parcelas_pagas: 80600,  prazo_restante: 154, saldo_devedor: 168000 },
  { id: 'ademo-3', cliente_nome: 'Mariana Costa Pereira', cliente_cpf: '987.654.321-00', grupo: 1235, cota: '0032-00', contrato: '2024-00124', data_venda: '22/03/2024', prazo_grupo: 200, taxa_adm: '18%', proximo_reajuste: '03/2027', parcelas_pagas: 27, soma_parcelas_pagas: 59400,  prazo_restante: 173, saldo_devedor: 142000 },
  { id: 'ademo-4', cliente_nome: 'Patrícia Duarte Melo', cliente_cpf: '456.789.123-00', grupo: 1253, cota: '0033-00', contrato: '2024-00313', data_venda: '05/06/2024', prazo_grupo: 220, taxa_adm: '18%', proximo_reajuste: '06/2027', parcelas_pagas: 24, soma_parcelas_pagas: 132000, prazo_restante: 196, saldo_devedor: 380000 },
];

module.exports = { COMISSOES, getProducaoDemo, REUNIOES, ACOMPANHAMENTO };
