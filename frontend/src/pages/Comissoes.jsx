import React from 'react';

function Comissoes() {
  return (
    <div className="page-comissoes">
      <div className="page-header">
        <h1>Comissões</h1>
        <p className="page-subtitle">Acompanhe seus ganhos</p>
      </div>

      <div className="card">
        <div className="empty-state">
          <span className="empty-icon">💰</span>
          <h3>Em breve</h3>
          <p>O módulo de comissões está sendo desenvolvido.</p>
        </div>
      </div>
    </div>
  );
}

export default Comissoes;
