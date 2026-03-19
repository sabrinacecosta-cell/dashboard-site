import React from 'react';
import SimuladorComponent from '../components/Simulador';

function Simulador() {
  return (
    <div className="page-simulador">
      <div className="page-header">
        <h1>Simulador</h1>
        <p className="page-subtitle">Simule suas vendas e comissões</p>
      </div>
      <SimuladorComponent />
    </div>
  );
}

export default Simulador;
