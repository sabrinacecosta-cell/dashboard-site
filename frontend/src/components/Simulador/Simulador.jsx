import React, { useState, useMemo, useRef, useEffect } from 'react';
import { GRUPOS, ESTRATEGIAS, OBSERVACOES_LEGAIS } from '../../data/grupos';
import { calcularSimulacao, formatarMoeda, formatarMoedaInteiro, formatarPercentual } from '../../business/calculos';
import './Simulador.css';

// Etapa 1 - Seleção de Modalidade
function EtapaModalidade({ onSelect }) {
  return (
    <div className="sim-etapa sim-etapa-modalidade">
      <h2 className="sim-titulo-secao">Escolha a modalidade que deseja simular</h2>
      <div className="sim-cards-grid">
        <button className="sim-card-modalidade" onClick={() => onSelect('imovel')}>
          <span className="sim-card-icon">🏠</span>
          <span className="sim-card-nome">Imóvel</span>
        </button>
        <button className="sim-card-modalidade" onClick={() => onSelect('automovel')}>
          <span className="sim-card-icon">🚗</span>
          <span className="sim-card-nome">Automóvel</span>
        </button>
      </div>
    </div>
  );
}

// Etapa 2 - Seleção de Estratégia
function EtapaEstrategia({ onSelect, onVoltar }) {
  return (
    <div className="sim-etapa sim-etapa-estrategia">
      <button className="sim-btn-voltar" onClick={onVoltar}>← Voltar</button>
      <h2 className="sim-titulo-secao">Escolha a estratégia</h2>
      <div className="sim-cards-grid sim-cards-estrategia">
        {ESTRATEGIAS.map((est) => (
          <button
            key={est.id}
            className={`sim-card-estrategia ${!est.disponivel ? 'sim-card-disabled' : ''}`}
            onClick={() => est.disponivel && onSelect(est.id)}
            disabled={!est.disponivel}
          >
            <span className="sim-card-nome">{est.nome}</span>
            {!est.disponivel && <span className="sim-card-badge">Em breve</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// Dropdown customizado
function CustomDropdown({ options, value, onChange, formatLabel }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.credito === value);

  return (
    <div className="sim-dropdown" ref={dropdownRef}>
      <button 
        className="sim-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span>{formatLabel ? formatLabel(selectedOption) : formatarMoedaInteiro(value)}</span>
        <span className="sim-dropdown-arrow">▼</span>
      </button>
      {isOpen && (
        <div className="sim-dropdown-menu">
          {options.map((opt) => (
            <button
              key={opt.credito}
              className={`sim-dropdown-item ${opt.credito === value ? 'active' : ''}`}
              onClick={() => {
                onChange(opt.credito);
                setIsOpen(false);
              }}
              type="button"
            >
              {formatLabel ? formatLabel(opt) : formatarMoedaInteiro(opt.credito)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Pills Toggle
function PillsToggle({ options, value, onChange }) {
  return (
    <div className="sim-pills">
      {options.map((opt, idx) => (
        <button
          key={opt.value}
          className={`sim-pill ${value === opt.value ? 'active' : ''} ${idx === 0 ? 'pill-left' : 'pill-right'}`}
          onClick={() => onChange(opt.value)}
          type="button"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// Tabela de Parcelas
function TabelaParcelas({ tabela, plano, creditoSelecionado, onSelectCredito }) {
  const isTaxaReduzida = plano === 'taxaReduzida';
  const isImovelTaxaReduzida = isTaxaReduzida && tabela[0]?.parcelaDesconto !== undefined;

  return (
    <div className="sim-tabela-container">
      <table className="sim-tabela">
        <thead>
          <tr>
            <th>Crédito</th>
            {isImovelTaxaReduzida ? (
              <>
                <th>Parcela c/ desconto</th>
                <th>Parcela integral</th>
              </>
            ) : (
              <>
                <th>Redutor 50%</th>
                <th>Parcela integral</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {tabela.map((row) => {
            const isSelected = row.credito === creditoSelecionado;
            return (
              <tr
                key={row.credito}
                className={isSelected ? 'selected' : ''}
                onClick={() => onSelectCredito(row.credito)}
              >
                <td>{formatarMoedaInteiro(row.credito)}</td>
                {isImovelTaxaReduzida ? (
                  <>
                    <td className="valor-destaque">{formatarMoeda(row.parcelaDesconto)}</td>
                    <td className="valor-riscado">{formatarMoeda(row.parcelaIntegral)}</td>
                  </>
                ) : (
                  <>
                    <td className="valor-destaque">{formatarMoeda(row.redutor50)}</td>
                    <td className="valor-riscado">{formatarMoeda(row.parcelaIntegral)}</td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Resumo da Proposta
function ResumoProposta({ simulacao }) {
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

// Etapa 3 - Simulação
function EtapaSimulacao({ modalidade, onVoltar }) {
  const grupo = GRUPOS[modalidade];
  const [plano, setPlano] = useState('taxaReduzida');
  const [lanceProprioPercent, setLanceProprioPercent] = useState(30);
  const [lanceEmbutidoPercent, setLanceEmbutidoPercent] = useState(30);
  
  const dadosPlano = grupo[plano];
  const tabela = dadosPlano.tabela;
  const [creditoSelecionado, setCreditoSelecionado] = useState(tabela[0].credito);

  // Atualiza crédito quando muda o plano
  useEffect(() => {
    const novaTabela = grupo[plano].tabela;
    if (!novaTabela.find(r => r.credito === creditoSelecionado)) {
      setCreditoSelecionado(novaTabela[0].credito);
    }
  }, [plano, grupo, creditoSelecionado]);

  const linhaSelecionada = tabela.find(r => r.credito === creditoSelecionado);
  
  // Determina a parcela inicial baseada no plano
  const parcelaInicial = useMemo(() => {
    if (!linhaSelecionada) return 0;
    if (plano === 'taxaReduzida' && linhaSelecionada.parcelaDesconto) {
      return linhaSelecionada.parcelaDesconto;
    }
    return linhaSelecionada.redutor50 || linhaSelecionada.parcelaDesconto || 0;
  }, [linhaSelecionada, plano]);

  const simulacao = useMemo(() => {
    return calcularSimulacao({
      credito: creditoSelecionado,
      lanceProprioPercent,
      lanceEmbutidoPercent,
      taxaAdm: dadosPlano.taxaAdm,
      fundoReserva: dadosPlano.fundoReserva,
      parcelaInicial,
      parcelaIntegral: linhaSelecionada?.parcelaIntegral || 0
    });
  }, [creditoSelecionado, lanceProprioPercent, lanceEmbutidoPercent, dadosPlano, parcelaInicial, linhaSelecionada]);

  const gerarPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    const margin = 20;
    let y = margin;
    
    // Título
    doc.setFontSize(18);
    doc.setTextColor(200, 113, 74); // Cobre
    doc.text('Proposta de Consórcio', margin, y);
    y += 15;
    
    // Subtítulo
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`${grupo.nome} - Grupo ${grupo.grupo} - ${grupo.prazo} meses`, margin, y);
    y += 10;
    doc.text(`Plano: ${plano === 'taxaReduzida' ? 'Taxa Reduzida' : 'Parcela Reduzida'}`, margin, y);
    y += 15;
    
    // Crédito e Parcelas
    doc.setFontSize(11);
    doc.setTextColor(50);
    doc.text('CRÉDITO E PARCELAS', margin, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Carta de crédito: ${formatarMoedaInteiro(simulacao.credito)}`, margin, y);
    y += 6;
    doc.text(`Parcela inicial: ${formatarMoeda(simulacao.parcelaInicial)}`, margin, y);
    y += 6;
    doc.text(`Crédito disponível pós contemplação: ${formatarMoedaInteiro(simulacao.creditoDisponivel)}`, margin, y);
    y += 12;
    
    // Lance
    doc.setFontSize(11);
    doc.setTextColor(50);
    doc.text('LANCE', margin, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Lance recursos próprios (${lanceProprioPercent}%): ${formatarMoedaInteiro(simulacao.lanceProprio)}`, margin, y);
    y += 6;
    doc.text(`Lance embutido (${lanceEmbutidoPercent}%): ${formatarMoedaInteiro(simulacao.lanceEmbutido)}`, margin, y);
    y += 6;
    doc.setTextColor(200, 113, 74);
    doc.text(`Lance total: ${formatarMoedaInteiro(simulacao.lanceTotal)}`, margin, y);
    y += 12;
    
    // Custos
    doc.setFontSize(11);
    doc.setTextColor(50);
    doc.text('CUSTOS', margin, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Taxa de administração (${formatarPercentual(dadosPlano.taxaAdm)}): ${formatarMoedaInteiro(simulacao.totalTaxaAdm)}`, margin, y);
    y += 6;
    doc.text(`Fundo de reserva (${formatarPercentual(dadosPlano.fundoReserva)}): ${formatarMoedaInteiro(simulacao.totalFundoReserva)}`, margin, y);
    y += 6;
    doc.text(`Total taxas: ${formatarMoedaInteiro(simulacao.totalTaxas)}`, margin, y);
    y += 6;
    doc.text(`Saldo devedor inicial: ${formatarMoedaInteiro(simulacao.saldoDevedor)}`, margin, y);
    y += 15;
    
    // Observações
    doc.setFontSize(8);
    doc.setTextColor(120);
    const observacao = OBSERVACOES_LEGAIS[modalidade];
    const linhasObs = doc.splitTextToSize(observacao, 170);
    doc.text(linhasObs, margin, y);
    
    // Data
    y = 280;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, margin, y);
    
    doc.save(`proposta-consorcio-${modalidade}-${creditoSelecionado}.pdf`);
  };

  return (
    <div className="sim-etapa sim-etapa-simulacao">
      <button className="sim-btn-voltar" onClick={onVoltar}>← Voltar</button>
      
      {/* Filtros */}
      <div className="sim-filtros">
        <div className="sim-filtro-grupo">
          <span className="sim-filtro-label">Carta de crédito</span>
          <CustomDropdown
            options={tabela}
            value={creditoSelecionado}
            onChange={setCreditoSelecionado}
          />
        </div>
        <PillsToggle
          options={[
            { value: 'taxaReduzida', label: 'Taxa reduzida' },
            { value: 'parcelaReduzida', label: 'Parcela reduzida' }
          ]}
          value={plano}
          onChange={setPlano}
        />
      </div>

      {/* Layout duas colunas */}
      <div className="sim-colunas">
        {/* Coluna Esquerda - Parâmetros */}
        <div className="sim-col-esquerda">
          <div className="sim-painel">
            <div className="sim-info-bar">
              <div className="sim-info-item">
                <span className="sim-info-label">Taxa adm</span>
                <span className="sim-info-valor">{formatarPercentual(dadosPlano.taxaAdm)}</span>
              </div>
              <div className="sim-info-item">
                <span className="sim-info-label">Taxa/mês</span>
                <span className="sim-info-valor">{formatarPercentual(dadosPlano.taxaMes)}</span>
              </div>
              <div className="sim-info-item">
                <span className="sim-info-label">Fundo reserva</span>
                <span className="sim-info-valor">{formatarPercentual(dadosPlano.fundoReserva)}</span>
              </div>
              <div className="sim-info-item">
                <span className="sim-info-label">Lance embutido</span>
                <span className="sim-info-valor">30%</span>
              </div>
              <div className="sim-info-item">
                <span className="sim-info-label">Lance fixo</span>
                <span className="sim-info-valor">30%</span>
              </div>
              <div className="sim-info-item">
                <span className="sim-info-label">Prazo</span>
                <span className="sim-info-valor">{grupo.prazo} meses</span>
              </div>
            </div>

            <div className="sim-inputs">
              <div className="sim-input-grupo">
                <label>Lance recursos próprios (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={lanceProprioPercent}
                  onChange={(e) => setLanceProprioPercent(Number(e.target.value))}
                />
              </div>
              <div className="sim-input-grupo">
                <label>Lance embutido (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={lanceEmbutidoPercent}
                  onChange={(e) => setLanceEmbutidoPercent(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="sim-reajuste">
              Reajuste anual → <strong>Pré-fixado 5%</strong>
            </div>

            <div className="sim-resultados">
              <div className="sim-resultado-item">
                <span className="sim-resultado-label">Lance próprio</span>
                <span className="sim-resultado-valor">{formatarMoedaInteiro(simulacao.lanceProprio)}</span>
              </div>
              <div className="sim-resultado-item">
                <span className="sim-resultado-label">Lance embutido</span>
                <span className="sim-resultado-valor">{formatarMoedaInteiro(simulacao.lanceEmbutido)}</span>
              </div>
              <div className="sim-resultado-item">
                <span className="sim-resultado-label">Lance total</span>
                <span className="sim-resultado-valor valor-cobre">{formatarMoedaInteiro(simulacao.lanceTotal)}</span>
              </div>
              <div className="sim-resultado-item">
                <span className="sim-resultado-label">Crédito disponível pós contemplação</span>
                <span className="sim-resultado-valor">{formatarMoedaInteiro(simulacao.creditoDisponivel)}</span>
              </div>
            </div>

            <button className="sim-btn-pdf" onClick={gerarPDF}>
              Gerar PDF da proposta
            </button>

            <p className="sim-observacao">
              {OBSERVACOES_LEGAIS[modalidade]}
            </p>
          </div>
        </div>

        {/* Coluna Direita - Tabela */}
        <div className="sim-col-direita">
          <div className="sim-painel">
            <TabelaParcelas
              tabela={tabela}
              plano={plano}
              creditoSelecionado={creditoSelecionado}
              onSelectCredito={setCreditoSelecionado}
            />
          </div>
        </div>
      </div>

      {/* Resumo Full Width */}
      <div className="sim-painel sim-painel-resumo">
        <h3 className="sim-titulo-secao">Resumo da proposta</h3>
        <ResumoProposta simulacao={simulacao} />
      </div>
    </div>
  );
}

// Componente Principal
function Simulador() {
  const [etapa, setEtapa] = useState(1);
  const [modalidade, setModalidade] = useState(null);
  const [estrategia, setEstrategia] = useState(null);

  const handleSelectModalidade = (mod) => {
    setModalidade(mod);
    setEtapa(2);
  };

  const handleSelectEstrategia = (est) => {
    setEstrategia(est);
    setEtapa(3);
  };

  const handleVoltar = () => {
    if (etapa === 2) {
      setModalidade(null);
      setEtapa(1);
    } else if (etapa === 3) {
      setEstrategia(null);
      setEtapa(2);
    }
  };

  return (
    <div className="sim-container">
      {etapa === 1 && <EtapaModalidade onSelect={handleSelectModalidade} />}
      {etapa === 2 && <EtapaEstrategia onSelect={handleSelectEstrategia} onVoltar={handleVoltar} />}
      {etapa === 3 && <EtapaSimulacao modalidade={modalidade} onVoltar={handleVoltar} />}
    </div>
  );
}

export default Simulador;
