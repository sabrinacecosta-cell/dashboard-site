// Lógica de cálculos do simulador

/**
 * Calcula o valor do lance em reais a partir do percentual
 * @param {number} credito - Valor do crédito
 * @param {number} percentual - Percentual do lance (0-100)
 * @returns {number} Valor do lance em reais
 */
export function calcularLanceValor(credito, percentual) {
  return credito * (percentual / 100);
}

/**
 * Calcula o lance total (recursos próprios + embutido)
 * @param {number} lanceProprioPercent - Percentual do lance recursos próprios
 * @param {number} lanceEmbutidoPercent - Percentual do lance embutido
 * @param {number} credito - Valor do crédito
 * @returns {object} Valores calculados dos lances
 */
export function calcularLances(credito, lanceProprioPercent, lanceEmbutidoPercent) {
  const lanceProprio = calcularLanceValor(credito, lanceProprioPercent);
  const lanceEmbutido = calcularLanceValor(credito, lanceEmbutidoPercent);
  const lanceTotal = lanceProprio + lanceEmbutido;
  const lanceTotalPercent = lanceProprioPercent + lanceEmbutidoPercent;
  
  return {
    lanceProprio,
    lanceEmbutido,
    lanceTotal,
    lanceTotalPercent
  };
}

/**
 * Calcula o crédito disponível após contemplação
 * @param {number} credito - Valor do crédito
 * @param {number} lanceEmbutido - Valor do lance embutido
 * @returns {number} Crédito disponível
 */
export function calcularCreditoDisponivel(credito, lanceEmbutido) {
  return credito - lanceEmbutido;
}

/**
 * Calcula o total da taxa de administração
 * @param {number} credito - Valor do crédito
 * @param {number} taxaAdm - Taxa de administração (decimal, ex: 0.15 para 15%)
 * @returns {number} Total da taxa de administração
 */
export function calcularTotalTaxaAdm(credito, taxaAdm) {
  return credito * taxaAdm;
}

/**
 * Calcula o total do fundo de reserva
 * @param {number} credito - Valor do crédito
 * @param {number} fundoReserva - Taxa do fundo de reserva (decimal)
 * @returns {number} Total do fundo de reserva
 */
export function calcularTotalFundoReserva(credito, fundoReserva) {
  return credito * fundoReserva;
}

/**
 * Calcula todos os custos e o saldo devedor
 * @param {number} credito - Valor do crédito
 * @param {number} taxaAdm - Taxa de administração (decimal)
 * @param {number} fundoReserva - Taxa do fundo de reserva (decimal)
 * @returns {object} Totais calculados
 */
export function calcularCustos(credito, taxaAdm, fundoReserva) {
  const totalTaxaAdm = calcularTotalTaxaAdm(credito, taxaAdm);
  const totalFundoReserva = calcularTotalFundoReserva(credito, fundoReserva);
  const totalTaxas = totalTaxaAdm + totalFundoReserva;
  const saldoDevedor = credito + totalTaxas;
  
  return {
    totalTaxaAdm,
    totalFundoReserva,
    totalTaxas,
    saldoDevedor
  };
}

/**
 * Realiza todos os cálculos da simulação
 * @param {object} params - Parâmetros da simulação
 * @returns {object} Resultado completo da simulação
 */
export function calcularSimulacao({
  credito,
  lanceProprioPercent,
  lanceEmbutidoPercent,
  taxaAdm,
  fundoReserva,
  parcelaInicial,
  parcelaIntegral
}) {
  const lances = calcularLances(credito, lanceProprioPercent, lanceEmbutidoPercent);
  const creditoDisponivel = calcularCreditoDisponivel(credito, lances.lanceEmbutido);
  const custos = calcularCustos(credito, taxaAdm, fundoReserva);
  
  return {
    credito,
    parcelaInicial,
    parcelaIntegral,
    creditoDisponivel,
    ...lances,
    ...custos
  };
}

/**
 * Formata valor em moeda brasileira
 * @param {number} valor - Valor a formatar
 * @returns {string} Valor formatado
 */
export function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  });
}

/**
 * Formata valor em moeda brasileira sem centavos
 * @param {number} valor - Valor a formatar
 * @returns {string} Valor formatado
 */
export function formatarMoedaInteiro(valor) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

/**
 * Formata percentual
 * @param {number} valor - Valor decimal (0.15 = 15%)
 * @returns {string} Valor formatado como percentual
 */
export function formatarPercentual(valor) {
  return `${(valor * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 3 })}%`;
}
