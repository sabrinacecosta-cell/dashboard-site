// Dados dos grupos de consórcio

export const GRUPOS = {
  imovel: {
    id: 'imovel',
    nome: 'Imóvel',
    grupo: '1054',
    prazo: 240,
    taxaReduzida: {
      taxaAdm: 0.15,        // 15%
      fundoReserva: 0.037,  // 3,7%
      taxaMes: 0.00063,     // 0,063%
      tabela: [
        { credito: 200000, parcelaDesconto: 989, parcelaIntegral: 1048 },
        { credito: 220000, parcelaDesconto: 1088, parcelaIntegral: 1152 },
        { credito: 240000, parcelaDesconto: 1187, parcelaIntegral: 1257 },
        { credito: 260000, parcelaDesconto: 1286, parcelaIntegral: 1362 },
        { credito: 280000, parcelaDesconto: 1385, parcelaIntegral: 1467 },
        { credito: 300000, parcelaDesconto: 1484, parcelaIntegral: 1571 },
        { credito: 320000, parcelaDesconto: 1583, parcelaIntegral: 1676 },
        { credito: 340000, parcelaDesconto: 1682, parcelaIntegral: 1781 },
        { credito: 360000, parcelaDesconto: 1781, parcelaIntegral: 1886 },
        { credito: 380000, parcelaDesconto: 1879, parcelaIntegral: 1990 },
        { credito: 400000, parcelaDesconto: 1978, parcelaIntegral: 2095 },
      ]
    },
    parcelaReduzida: {
      taxaAdm: 0.18,        // 18%
      fundoReserva: 0.037,  // 3,7%
      taxaMes: 0.00075,     // 0,075%
      tabela: [
        { credito: 200000, redutor50: 507, parcelaIntegral: 1048 },
        { credito: 220000, redutor50: 558, parcelaIntegral: 1152 },
        { credito: 240000, redutor50: 609, parcelaIntegral: 1257 },
        { credito: 260000, redutor50: 659, parcelaIntegral: 1362 },
        { credito: 280000, redutor50: 710, parcelaIntegral: 1467 },
        { credito: 300000, redutor50: 761, parcelaIntegral: 1571 },
        { credito: 320000, redutor50: 811, parcelaIntegral: 1676 },
        { credito: 340000, redutor50: 862, parcelaIntegral: 1781 },
        { credito: 360000, redutor50: 913, parcelaIntegral: 1886 },
        { credito: 380000, redutor50: 963, parcelaIntegral: 1990 },
        { credito: 400000, redutor50: 1014, parcelaIntegral: 2095 },
      ]
    }
  },
  automovel: {
    id: 'automovel',
    nome: 'Automóvel',
    grupo: '2133',
    prazo: 78,
    taxaReduzida: {
      taxaAdm: 0.17,        // 17%
      fundoReserva: 0.03,   // 3%
      taxaMes: 0.00218,     // 0,218%
      tabela: [
        { credito: 50000, redutor50: 385, parcelaIntegral: 776 },
        { credito: 55000, redutor50: 423, parcelaIntegral: 853 },
        { credito: 60000, redutor50: 461, parcelaIntegral: 931 },
        { credito: 65000, redutor50: 500, parcelaIntegral: 1008 },
        { credito: 70000, redutor50: 538, parcelaIntegral: 1086 },
        { credito: 75000, redutor50: 577, parcelaIntegral: 1163 },
        { credito: 80000, redutor50: 615, parcelaIntegral: 1241 },
      ]
    },
    parcelaReduzida: {
      taxaAdm: 0.17,        // 17%
      fundoReserva: 0.03,   // 3%
      taxaMes: 0.00218,     // 0,218%
      tabela: [
        { credito: 50000, redutor50: 385, parcelaIntegral: 776 },
        { credito: 55000, redutor50: 423, parcelaIntegral: 853 },
        { credito: 60000, redutor50: 461, parcelaIntegral: 931 },
        { credito: 65000, redutor50: 500, parcelaIntegral: 1008 },
        { credito: 70000, redutor50: 538, parcelaIntegral: 1086 },
        { credito: 75000, redutor50: 577, parcelaIntegral: 1163 },
        { credito: 80000, redutor50: 615, parcelaIntegral: 1241 },
      ]
    }
  }
};

export const ESTRATEGIAS = [
  { id: 'lancamento', nome: 'Grupo lançamento', disponivel: true },
  { id: 'contemplacao', nome: 'Contemplação rápida', disponivel: false },
  { id: 'medio-prazo', nome: 'Médio prazo', disponivel: false },
];

export const OBSERVACOES_LEGAIS = {
  imovel: `Os valores apresentados são simulações baseadas nas condições atuais do grupo e estão sujeitos a alterações. O consórcio não garante contemplação em prazo determinado. Taxa de administração diluída ao longo do plano. Fundo de reserva restituível ao final do grupo, se não utilizado. Consulte o contrato de adesão para informações completas.`,
  automovel: `Os valores apresentados são simulações baseadas nas condições atuais do grupo e estão sujeitos a alterações. O consórcio não garante contemplação em prazo determinado. Taxa de administração diluída ao longo do plano. Fundo de reserva restituível ao final do grupo, se não utilizado. Consulte o contrato de adesão para informações completas.`
};
