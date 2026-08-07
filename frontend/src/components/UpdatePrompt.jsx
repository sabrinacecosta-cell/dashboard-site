import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

// Aviso de "nova versão disponível". No modo 'prompt' (vite.config), o service
// worker novo fica em espera quando há um build novo do frontend e dispara
// onNeedRefresh — então este toast só aparece quando houve uma atualização de
// código/layout que precisa de reload. Mudanças só de dados/backend não regeram
// o SW e não mostram nada. Clicar em "Atualizar" aplica a versão e recarrega.
function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      // Rechecagem periódica: procura versão nova a cada 30 min mesmo com a aba
      // aberta e parada, reduzindo a janela até o aviso aparecer.
      if (r) setInterval(() => r.update(), 30 * 60 * 1000);
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 20,
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        maxWidth: 'calc(100vw - 32px)',
        padding: '12px 16px',
        borderRadius: 12,
        background: '#111',
        color: '#fff',
        border: '1px solid rgba(245,192,0,0.5)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        fontSize: '0.9rem',
      }}
    >
      <span>Nova versão disponível.</span>
      <button
        type="button"
        onClick={() => updateServiceWorker(true)}
        style={{
          padding: '6px 14px',
          borderRadius: 8,
          border: 'none',
          background: '#F5C000',
          color: '#000',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Atualizar
      </button>
      <button
        type="button"
        onClick={() => setNeedRefresh(false)}
        aria-label="Dispensar"
        style={{
          padding: '6px 10px',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.25)',
          background: 'transparent',
          color: '#fff',
          cursor: 'pointer',
        }}
      >
        Depois
      </button>
    </div>
  );
}

export default UpdatePrompt;
