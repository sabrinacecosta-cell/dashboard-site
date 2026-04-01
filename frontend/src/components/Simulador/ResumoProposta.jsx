import React from 'react';
import { formatarMoeda, formatarMoedaInteiro } from '../../business/calculos';

export function ResumoProposta({ simulacao }) {
  return (
    <div className="sim-resumo">
      <div className="sim-resumo-secao">
        <h3 className="sim-resumo-titulo">Crédito e parcelas</h3>
        <div className="sim-resumo-linha">
          <span className="sim-resumo-label">Carta de crédito</span>
          <span className="sim-resumo-valor">{formatarMoedaInteiro(simulacao.credito)}</span>
        </div>
        <div className="sim-resumo-linha">
          <span className="sim-resumo-label">Parcela inicial</span>
          <span className="sim-resumo-valor">{formatarMoeda(simulacao.parcelaInicial)}</span>
        </div>
        {simulacao.parcelaPosContemplacao !== undefined && (
          <div className="sim-resumo-linha">
            <span className="sim-resumo-label">Parcela pós contemplação</span>
            <span className="sim-resumo-valor">{formatarMoeda(simulacao.parcelaPosContemplacao)}</span>
          </div>
        )}
        <div className="sim-resumo-linha">
          <span className="sim-resumo-label">Crédito disponível pós contemplação</span>
          <span className="sim-resumo-valor">{formatarMoedaInteiro(simulacao.creditoDisponivel)}</span>
        </div>
      </div>

      <div className="sim-resumo-secao">
        <h3 className="sim-resumo-titulo">Lance</h3>
        <div className="sim-resumo-linha">
          <span className="sim-resumo-label">Lance recursos próprios</span>
          <span className="sim-resumo-valor">{formatarMoedaInteiro(simulacao.lanceProprio)}</span>
        </div>
        <div className="sim-resumo-linha">
          <span className="sim-resumo-label">Lance embutido</span>
          <span className="sim-resumo-valor">{formatarMoedaInteiro(simulacao.lanceEmbutido)}</span>
        </div>
        <div className="sim-resumo-linha">
          <span className="sim-resumo-label">Lance total</span>
          <span className="sim-resumo-valor valor-cobre">{formatarMoedaInteiro(simulacao.lanceTotal)}</span>
        </div>
      </div>

      <div className="sim-resumo-secao">
        <h3 className="sim-resumo-titulo">Custos</h3>
        <div className="sim-resumo-linha">
          <span className="sim-resumo-label">Total fundo de reserva (FR)</span>
          <span className="sim-resumo-valor">{formatarMoedaInteiro(simulacao.totalFundoReserva)}</span>
        </div>
        <div className="sim-resumo-linha">
          <span className="sim-resumo-label">Total taxas (TA + FR)</span>
          <span className="sim-resumo-valor">{formatarMoedaInteiro(simulacao.totalTaxas)}</span>
        </div>
        <div className="sim-resumo-linha">
          <span className="sim-resumo-label">Saldo devedor inicial</span>
          <span className="sim-resumo-valor">{formatarMoedaInteiro(simulacao.saldoDevedor)}</span>
        </div>
      </div>
    </div>
  );
}
