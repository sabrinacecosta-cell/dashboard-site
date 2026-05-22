import React, { useState } from 'react';

function Agenda() {
  const [loading, setLoading] = useState(true);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--header-height))', margin: '-1.5rem' }}>
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg-primary)', zIndex: 1,
        }}>
          <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}
      <iframe
        src="https://agenda-mesaconsorcio.up.railway.app"
        title="Agenda"
        style={{ flex: 1, width: '100%', border: 'none', display: 'block' }}
        onLoad={() => setLoading(false)}
        allow="fullscreen"
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default Agenda;
