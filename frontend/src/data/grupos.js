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
        { id: 50000, credito: 50000, redutor50: 385,    parcelaIntegral: 776    },
        { id: 55000, credito: 55000, redutor50: 423,    parcelaIntegral: 853    },
        { id: 60000, credito: 60000, redutor50: 461,    parcelaIntegral: 931    },
        { id: 65000, credito: 65000, redutor50: 500,    parcelaIntegral: 1008   },
        { id: 70000, credito: 70000, redutor50: 538,    parcelaIntegral: 1086   },
        { id: 75000, credito: 75000, redutor50: 577,    parcelaIntegral: 1163   },
        { id: 80000, credito: 80000, redutor50: 615,    parcelaIntegral: 1241   },
        { id: '50000_115', credito: 50000, redutor50: 366.99, parcelaIntegral: 733.97,  taxaAdm: 0.115 },
        { id: '55000_115', credito: 55000, redutor50: 403.69, parcelaIntegral: 807.37,  taxaAdm: 0.115 },
        { id: '60000_115', credito: 60000, redutor50: 440.39, parcelaIntegral: 880.77,  taxaAdm: 0.115 },
        { id: '65000_115', credito: 65000, redutor50: 477.09, parcelaIntegral: 954.17,  taxaAdm: 0.115 },
        { id: '70000_115', credito: 70000, redutor50: 513.78, parcelaIntegral: 1027.56, taxaAdm: 0.115 },
        { id: '75000_115', credito: 75000, redutor50: 550.48, parcelaIntegral: 1100.96, taxaAdm: 0.115 },
        { id: '80000_115', credito: 80000, redutor50: 587.18, parcelaIntegral: 1174.36, taxaAdm: 0.115 },
      ]
    },
    parcelaReduzida: {
      taxaAdm: 0.17,        // 17%
      fundoReserva: 0.03,   // 3%
      taxaMes: 0.00218,     // 0,218%
      tabela: [
        { id: 50000, credito: 50000, redutor50: 385,    parcelaIntegral: 776    },
        { id: 55000, credito: 55000, redutor50: 423,    parcelaIntegral: 853    },
        { id: 60000, credito: 60000, redutor50: 461,    parcelaIntegral: 931    },
        { id: 65000, credito: 65000, redutor50: 500,    parcelaIntegral: 1008   },
        { id: 70000, credito: 70000, redutor50: 538,    parcelaIntegral: 1086   },
        { id: 75000, credito: 75000, redutor50: 577,    parcelaIntegral: 1163   },
        { id: 80000, credito: 80000, redutor50: 615,    parcelaIntegral: 1241   },
        { id: '50000_115', credito: 50000, redutor50: 366.99, parcelaIntegral: 733.97,  taxaAdm: 0.115 },
        { id: '55000_115', credito: 55000, redutor50: 403.69, parcelaIntegral: 807.37,  taxaAdm: 0.115 },
        { id: '60000_115', credito: 60000, redutor50: 440.39, parcelaIntegral: 880.77,  taxaAdm: 0.115 },
        { id: '65000_115', credito: 65000, redutor50: 477.09, parcelaIntegral: 954.17,  taxaAdm: 0.115 },
        { id: '70000_115', credito: 70000, redutor50: 513.78, parcelaIntegral: 1027.56, taxaAdm: 0.115 },
        { id: '75000_115', credito: 75000, redutor50: 550.48, parcelaIntegral: 1100.96, taxaAdm: 0.115 },
        { id: '80000_115', credito: 80000, redutor50: 587.18, parcelaIntegral: 1174.36, taxaAdm: 0.115 },
      ]
    }
  }
};

export const GRUPOS_CONTEMPLACAO_IMOVEL = {
  1038: {
    numero: 1038,
    taxaAdm: 0.22,
    fundoReserva: 0.05,
    prazo: 200,
    prazoRestante: 119,
    lanceEmbutidoMax: 50,
    lanceTotalMax: 59,
    indice: 'INPC',
    tabela: [
      { carta: 560959.98, parcelaReduzida: 2993.36,  parcelaNormal: 5986.72  },
      { carta: 631079.96, parcelaReduzida: 3367.53,  parcelaNormal: 6735.06  },
      { carta: 701199.96, parcelaReduzida: 3741.70,  parcelaNormal: 7483.39  },
      { carta: 771319.96, parcelaReduzida: 4115.87,  parcelaNormal: 8231.73  },
      { carta: 841439.96, parcelaReduzida: 4490.04,  parcelaNormal: 8980.07  },
      { carta: 911559.95, parcelaReduzida: 4864.21,  parcelaNormal: 9728.41  },
      { carta: 981679.94, parcelaReduzida: 5238.38,  parcelaNormal: 10476.75 },
    ],
  },
};

export const GRUPOS_CONTEMPLACAO_AUTO = {
  2127: {
    numero: 2127,
    taxaAdm: 0.18,
    fundoReserva: 0.03,
    taxaMes: 0.00063,
    prazo: 80,
    prazoRestante: 50,
    lanceEmbutido: 50,
    indice: 'INPC',
    mesReajuste: 'Setembro',
    tabela: [
      { carta: 54698.62, parcelaReduzida: 661.85,  parcelaNormal: 1323.71 },
      { carta: 60168.49, parcelaReduzida: 728.04,  parcelaNormal: 1456.08 },
      { carta: 65638.35, parcelaReduzida: 794.22,  parcelaNormal: 1588.45 },
      { carta: 71108.21, parcelaReduzida: 860.41,  parcelaNormal: 1720.82 },
      { carta: 76578.07, parcelaReduzida: 926.59,  parcelaNormal: 1853.19 },
      { carta: 82047.94, parcelaReduzida: 992.78,  parcelaNormal: 1985.56 },
      { carta: 87517.80, parcelaReduzida: 1058.97, parcelaNormal: 2117.93 },
    ],
  },
  2128: {
    numero: 2128,
    taxaAdm: 0.18,
    fundoReserva: 0.03,
    taxaMes: 0.00063,
    prazo: 80,
    prazoRestante: 61,
    lanceEmbutido: 30,
    indice: 'INPC',
    mesReajuste: 'Agosto',
    tabela: [
      { carta: 52590.20, parcelaReduzida: 521.59, parcelaNormal: 1043.18 },
      { carta: 57849.22, parcelaReduzida: 573.75, parcelaNormal: 1147.50 },
      { carta: 63108.24, parcelaReduzida: 625.91, parcelaNormal: 1251.82 },
      { carta: 68367.26, parcelaReduzida: 678.07, parcelaNormal: 1356.14 },
      { carta: 73626.28, parcelaReduzida: 730.23, parcelaNormal: 1460.46 },
      { carta: 78885.30, parcelaReduzida: 782.39, parcelaNormal: 1564.78 },
      { carta: 84144.32, parcelaReduzida: 834.55, parcelaNormal: 1669.10 },
    ],
  },
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
