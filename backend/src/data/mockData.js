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
const PRODUCAO = [
  { nome: 'Ana Lima',       email: 'demo@jtdkinvest.com',        mes: mes(0),  vendas: 4, valor_total: 790000 },
  { nome: 'Carlos Mendes',  email: 'carlos.mendes@demo.com',     mes: mes(0),  vendas: 2, valor_total: 560000 },
  { nome: 'Fernanda Souza', email: 'fernanda.souza@demo.com',    mes: mes(0),  vendas: 1, valor_total: 140000 },
  { nome: 'Ana Lima',       email: 'demo@jtdkinvest.com',        mes: mes(-1), vendas: 3, valor_total: 620000 },
  { nome: 'Carlos Mendes',  email: 'carlos.mendes@demo.com',     mes: mes(-1), vendas: 2, valor_total: 340000 },
  { nome: 'Fernanda Souza', email: 'fernanda.souza@demo.com',    mes: mes(-1), vendas: 1, valor_total: 180000 },
  { nome: 'Ana Lima',       email: 'demo@jtdkinvest.com',        mes: mes(-2), vendas: 2, valor_total: 300000 },
  { nome: 'Carlos Mendes',  email: 'carlos.mendes@demo.com',     mes: mes(-2), vendas: 3, valor_total: 480000 },
];

// ── Reuniões ─────────────────────────────────────────────────
const REUNIOES = [
  {
    id: 'rdemo-1', titulo: 'Apresentação portfólio — Roberto Silva', data_reuniao: dia(-5) + 'T14:00:00Z', data_fim: dia(-5) + 'T15:00:00Z',
    participantes: JSON.stringify(['demo@jtdkinvest.com', 'roberto.silva@email.com']),
    status: 'retorno', motivo_retorno: 'Quer pensar sobre os valores', ata_original: 'Reunião realizada com Roberto Silva. Apresentamos simulação de portfólio de R$250k. Cliente demonstrou interesse mas pediu prazo para avaliar com a família.', resumo_ia: 'Apresentação de portfólio de R$250k. Cliente interessado, solicitou prazo de 1 semana para decisão com a família. Próximo passo: follow-up na sexta-feira.', assessor_email: 'demo@jtdkinvest.com', tarefas: [{ id: 'tdemo-1', descricao: 'Enviar simulação por e-mail', concluida: true }, { id: 'tdemo-2', descricao: 'Ligar sexta-feira para follow-up', concluida: false }],
  },
  {
    id: 'rdemo-2', titulo: 'Reunião Mariana Costa — Imóvel', data_reuniao: dia(-12) + 'T10:00:00Z', data_fim: dia(-12) + 'T11:00:00Z',
    participantes: JSON.stringify(['demo@jtdkinvest.com', 'mariana.costa@email.com']),
    status: 'fechou', ata_original: 'Reunião com Mariana Costa para fechar consórcio de imóvel R$180k. Cliente assinou proposta ao final da reunião.', resumo_ia: 'Fechamento de consórcio imóvel R$180k. Cliente assinou proposta. Grupo 1235, cota 0032.', assessor_email: 'demo@jtdkinvest.com', tarefas: [{ id: 'tdemo-3', descricao: 'Enviar documentação para a administradora', concluida: true }],
  },
  {
    id: 'rdemo-3', titulo: 'Prospecção — Empresa Construtora ABC', data_reuniao: dia(-2) + 'T16:00:00Z', data_fim: dia(-2) + 'T17:00:00Z',
    participantes: JSON.stringify(['demo@jtdkinvest.com', 'diretoria@construtorabc.com.br']),
    status: 'em_andamento', ata_original: null, resumo_ia: null, assessor_email: 'demo@jtdkinvest.com', tarefas: [],
  },
  {
    id: 'rdemo-4', titulo: 'Revisão carteira — Fernando Machado', data_reuniao: dia(2) + 'T09:00:00Z', data_fim: dia(2) + 'T09:30:00Z',
    participantes: JSON.stringify(['demo@jtdkinvest.com', 'fernando.machado@email.com']),
    status: 'em_andamento', ata_original: null, resumo_ia: null, assessor_email: 'demo@jtdkinvest.com', tarefas: [],
  },
];

// ── Acompanhamento ───────────────────────────────────────────
const ACOMPANHAMENTO = [
  { id: 'ademo-1', cliente_nome: 'Roberto Alves Silva',    grupo: 1234, cota: 56,  tipo: 'imovel', valor_carta: 120000, parcela_atual: 1800,  lance_ofertado: 25, status_contemplacao: 'aguardando', proxima_assembleia: dia(10), observacoes: 'Prefere contemplação por lance' },
  { id: 'ademo-2', cliente_nome: 'Mariana Costa Pereira',  grupo: 1235, cota: 32,  tipo: 'imovel', valor_carta: 180000, parcela_atual: 2200,  lance_ofertado: 30, status_contemplacao: 'contemplado', proxima_assembleia: null, observacoes: 'Contemplada em 04/2026' },
  { id: 'ademo-3', cliente_nome: 'Fernando Machado Jr.',   grupo: 1240, cota: 10,  tipo: 'imovel', valor_carta: 250000, parcela_atual: 3100,  lance_ofertado: 0,  status_contemplacao: 'aguardando', proxima_assembleia: dia(15), observacoes: '' },
  { id: 'ademo-4', cliente_nome: 'Thiago Ramos Fontes',    grupo: 1250, cota: 41,  tipo: 'imovel', valor_carta: 210000, parcela_atual: 2800,  lance_ofertado: 28, status_contemplacao: 'aguardando', proxima_assembleia: dia(8),  observacoes: 'Quer tentar lance na próxima assembleia' },
  { id: 'ademo-5', cliente_nome: 'Patrícia Duarte Melo',   grupo: 1253, cota: 33,  tipo: 'imovel', valor_carta: 450000, parcela_atual: 5500,  lance_ofertado: 35, status_contemplacao: 'aguardando', proxima_assembleia: dia(20), observacoes: 'Cliente VIP — acompanhar de perto' },
];

module.exports = { COMISSOES, PRODUCAO, REUNIOES, ACOMPANHAMENTO };
