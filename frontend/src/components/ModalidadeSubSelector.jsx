import React from 'react';

// Sub-seletor de modalidade da Embracon. Só faz sentido quando a administradora
// é EMBRACON (o componente pai decide quando renderizar, mas guardamos aqui
// também). Reaproveita o padrão de pills .toggle-group / .toggle-btn.
const MODALIDADES = [
  { valor: 'lance_livre', label: 'Lance Livre' },
  { valor: 'lance_fixo_50', label: 'Lance Fixo 50%' },
  { valor: 'segundo_lance_fixo_25', label: '2º Lance Fixo 25%' },
];

function ModalidadeSubSelector({ administradora, value, onChange }) {
  if (administradora !== 'EMBRACON') return null;

  return (
    <div className="toggle-group" role="tablist" aria-label="Modalidade Embracon">
      {MODALIDADES.map((m) => (
        <button
          key={m.valor}
          type="button"
          role="tab"
          aria-selected={value === m.valor}
          className={`toggle-btn ${value === m.valor ? 'active' : ''}`}
          onClick={() => value !== m.valor && onChange(m.valor)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

export default ModalidadeSubSelector;
