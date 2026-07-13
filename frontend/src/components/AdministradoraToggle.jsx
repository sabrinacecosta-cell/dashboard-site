import React from 'react';

// Toggle entre administradoras (CNP / Embracon). Reaproveita o mesmo padrão de
// switch segmentado (.toggle-group / .toggle-btn) já usado no projeto.
const OPCOES = [
  { valor: 'CNP', label: 'CNP' },
  { valor: 'EMBRACON', label: 'Embracon' },
];

function AdministradoraToggle({ value, onChange }) {
  return (
    <div className="toggle-group" role="tablist" aria-label="Administradora">
      {OPCOES.map((op) => (
        <button
          key={op.valor}
          type="button"
          role="tab"
          aria-selected={value === op.valor}
          className={`toggle-btn ${value === op.valor ? 'active' : ''}`}
          onClick={() => value !== op.valor && onChange(op.valor)}
        >
          {op.label}
        </button>
      ))}
    </div>
  );
}

export default AdministradoraToggle;
