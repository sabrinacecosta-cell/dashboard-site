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
    grupo: '1038',
    prazo: 200,
    prazoRestante: 119,
    lanceEmbutidoMax: 50,
    lanceTotalMax: 59,
    comReductor: {
      taxaAdm: 0.22,
      fundoReserva: 0.05,
      taxaMes: 0.0011,   // 22% / 200 meses
      tabela: [
        { credito: 560959.98, redutor50: 2993.36,  parcelaIntegral: 5986.72  },
        { credito: 631079.96, redutor50: 3367.53,  parcelaIntegral: 6735.06  },
        { credito: 701199.96, redutor50: 3741.70,  parcelaIntegral: 7483.39  },
        { credito: 771319.96, redutor50: 4115.87,  parcelaIntegral: 8231.73  },
        { credito: 841439.96, redutor50: 4490.04,  parcelaIntegral: 8980.07  },
        { credito: 911559.95, redutor50: 4864.21,  parcelaIntegral: 9728.41  },
        { credito: 981679.94, redutor50: 5238.38,  parcelaIntegral: 10476.75 },
      ],
    },
    semReductor: {
      taxaAdm: 0.22,
      fundoReserva: 0.05,
      taxaMes: 0.0011,
      tabela: [
        { credito: 560959.98, redutor50: null, parcelaIntegral: 5986.72  },
        { credito: 631079.96, redutor50: null, parcelaIntegral: 6735.06  },
        { credito: 701199.96, redutor50: null, parcelaIntegral: 7483.39  },
        { credito: 771319.96, redutor50: null, parcelaIntegral: 8231.73  },
        { credito: 841439.96, redutor50: null, parcelaIntegral: 8980.07  },
        { credito: 911559.95, redutor50: null, parcelaIntegral: 9728.41  },
        { credito: 981679.94, redutor50: null, parcelaIntegral: 10476.75 },
      ],
    },
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

export const GRUPOS_MEDIO_PRAZO = {
  1047: {
    numero: 1047,
    prazoTotal: 200,
    prazoRestante: 181,
    taxaAdm: 0.22,
    fundoReserva: 0.037,
    lanceEmbutidoMax: 30,
    lanceTotalMax: 59,
    tabela: [
      { bemReferencia: 150000, cota: 157692.00, parcelaCheia: 1095.13, parcelaReduzida:  547.57 },
      { bemReferencia: 160000, cota: 168204.80, parcelaCheia: 1168.14, parcelaReduzida:  584.07 },
      { bemReferencia: 170000, cota: 178717.60, parcelaCheia: 1241.15, parcelaReduzida:  620.57 },
      { bemReferencia: 180000, cota: 189230.40, parcelaCheia: 1314.16, parcelaReduzida:  657.08 },
      { bemReferencia: 190000, cota: 199743.20, parcelaCheia: 1387.17, parcelaReduzida:  693.58 },
      { bemReferencia: 200000, cota: 210256.00, parcelaCheia: 1460.18, parcelaReduzida:  730.09 },
      { bemReferencia: 210000, cota: 220768.80, parcelaCheia: 1533.18, parcelaReduzida:  766.59 },
      { bemReferencia: 220000, cota: 231281.60, parcelaCheia: 1606.19, parcelaReduzida:  803.10 },
      { bemReferencia: 230000, cota: 241794.40, parcelaCheia: 1679.20, parcelaReduzida:  839.60 },
      { bemReferencia: 240000, cota: 252307.20, parcelaCheia: 1752.21, parcelaReduzida:  876.11 },
      { bemReferencia: 250000, cota: 262820.00, parcelaCheia: 1825.22, parcelaReduzida:  912.61 },
      { bemReferencia: 260000, cota: 273332.80, parcelaCheia: 1898.23, parcelaReduzida:  949.11 },
      { bemReferencia: 270000, cota: 283845.60, parcelaCheia: 1971.24, parcelaReduzida:  985.62 },
      { bemReferencia: 280000, cota: 294358.40, parcelaCheia: 2044.25, parcelaReduzida: 1022.12 },
      { bemReferencia: 290000, cota: 304871.20, parcelaCheia: 2117.25, parcelaReduzida: 1058.63 },
      { bemReferencia: 300000, cota: 315384.00, parcelaCheia: 2190.26, parcelaReduzida: 1095.13 },
    ],
  },
  1048: {
    numero: 1048,
    prazoTotal: 200,
    prazoRestante: 185,
    taxaAdm: 0.22,
    fundoReserva: 0.037,
    lanceEmbutidoMax: 30,
    lanceTotalMax: 59,
    tabela: [
      { bemReferencia: 150000, cota: 156266.70, parcelaCheia: 1061.77, parcelaReduzida:  530.88 },
      { bemReferencia: 160000, cota: 166684.48, parcelaCheia: 1132.55, parcelaReduzida:  566.28 },
      { bemReferencia: 170000, cota: 177102.26, parcelaCheia: 1203.34, parcelaReduzida:  601.67 },
      { bemReferencia: 180000, cota: 187520.04, parcelaCheia: 1274.12, parcelaReduzida:  637.06 },
      { bemReferencia: 190000, cota: 197937.82, parcelaCheia: 1344.91, parcelaReduzida:  672.45 },
      { bemReferencia: 200000, cota: 208355.60, parcelaCheia: 1415.69, parcelaReduzida:  707.85 },
      { bemReferencia: 210000, cota: 218773.38, parcelaCheia: 1486.48, parcelaReduzida:  743.24 },
      { bemReferencia: 220000, cota: 229191.16, parcelaCheia: 1557.26, parcelaReduzida:  778.63 },
      { bemReferencia: 230000, cota: 239608.94, parcelaCheia: 1628.05, parcelaReduzida:  814.02 },
      { bemReferencia: 240000, cota: 250026.72, parcelaCheia: 1698.83, parcelaReduzida:  849.42 },
      { bemReferencia: 250000, cota: 260444.50, parcelaCheia: 1769.61, parcelaReduzida:  884.81 },
      { bemReferencia: 260000, cota: 270862.28, parcelaCheia: 1840.40, parcelaReduzida:  920.20 },
      { bemReferencia: 270000, cota: 281280.06, parcelaCheia: 1911.18, parcelaReduzida:  955.59 },
      { bemReferencia: 280000, cota: 291697.84, parcelaCheia: 1981.97, parcelaReduzida:  990.98 },
      { bemReferencia: 290000, cota: 302115.62, parcelaCheia: 2052.75, parcelaReduzida: 1026.38 },
      { bemReferencia: 300000, cota: 312533.40, parcelaCheia: 2123.54, parcelaReduzida: 1061.77 },
    ],
  },
  1049: {
    numero: 1049,
    prazoTotal: 200,
    prazoRestante: 186,
    taxaAdm: 0.22,
    fundoReserva: 0.037,
    lanceEmbutidoMax: 30,
    lanceTotalMax: 59,
    tabela: [
      { bemReferencia: 150000, cota: 155846.85, parcelaCheia: 1053.22, parcelaReduzida:  526.61 },
      { bemReferencia: 160000, cota: 166236.64, parcelaCheia: 1123.44, parcelaReduzida:  561.72 },
      { bemReferencia: 170000, cota: 176626.43, parcelaCheia: 1193.65, parcelaReduzida:  596.83 },
      { bemReferencia: 180000, cota: 187016.22, parcelaCheia: 1263.87, parcelaReduzida:  631.93 },
      { bemReferencia: 190000, cota: 197406.01, parcelaCheia: 1334.08, parcelaReduzida:  667.04 },
      { bemReferencia: 200000, cota: 207795.80, parcelaCheia: 1404.30, parcelaReduzida:  702.15 },
      { bemReferencia: 210000, cota: 218185.59, parcelaCheia: 1474.51, parcelaReduzida:  737.26 },
      { bemReferencia: 220000, cota: 228575.38, parcelaCheia: 1544.73, parcelaReduzida:  772.36 },
      { bemReferencia: 230000, cota: 238965.17, parcelaCheia: 1614.94, parcelaReduzida:  807.47 },
      { bemReferencia: 240000, cota: 249354.96, parcelaCheia: 1685.16, parcelaReduzida:  842.58 },
      { bemReferencia: 250000, cota: 259744.75, parcelaCheia: 1755.37, parcelaReduzida:  877.69 },
      { bemReferencia: 260000, cota: 270134.54, parcelaCheia: 1825.59, parcelaReduzida:  912.79 },
      { bemReferencia: 270000, cota: 280524.33, parcelaCheia: 1895.80, parcelaReduzida:  947.90 },
      { bemReferencia: 280000, cota: 290914.12, parcelaCheia: 1966.02, parcelaReduzida:  983.01 },
      { bemReferencia: 290000, cota: 301303.91, parcelaCheia: 2036.23, parcelaReduzida: 1018.12 },
      { bemReferencia: 300000, cota: 311693.70, parcelaCheia: 2106.45, parcelaReduzida: 1053.22 },
    ],
  },
};

export const ESTRATEGIAS = [
  { id: 'lancamento',  nome: 'Grupo lançamento',    disponivel: true  },
  { id: 'contemplacao', nome: 'Curto prazo', disponivel: false },
  { id: 'medio-prazo', nome: 'Médio prazo',          disponivel: false },
];

export const OBSERVACOES_LEGAIS = {
  imovel: `Os valores apresentados são simulações baseadas nas condições atuais do grupo e estão sujeitos a alterações. O consórcio não garante contemplação em prazo determinado. Taxa de administração diluída ao longo do plano. Fundo de reserva restituível ao final do grupo, se não utilizado. Consulte o contrato de adesão para informações completas.`,
  automovel: `Os valores apresentados são simulações baseadas nas condições atuais do grupo e estão sujeitos a alterações. O consórcio não garante contemplação em prazo determinado. Taxa de administração diluída ao longo do plano. Fundo de reserva restituível ao final do grupo, se não utilizado. Consulte o contrato de adesão para informações completas.`
};
