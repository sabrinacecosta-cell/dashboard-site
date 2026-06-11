import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PopupAgenda from './PopupAgenda';

function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return localStorage.getItem('sidebarOpen') !== 'false';
  });

  const toggleSidebar = () => {
    setSidebarOpen(prev => {
      const next = !prev;
      localStorage.setItem('sidebarOpen', String(next));
      return next;
    });
  };

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [resetModal, setResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetando, setResetando] = useState(false);
  const [adminResult, setAdminResult] = useState(null);

  const showResult = (success, msg) => {
    setAdminResult({ success, msg });
    setTimeout(() => setAdminResult(null), 4000);
  };

  const handleResetarTodos = async () => {
    if (!confirm('⚠️ ATENÇÃO: Isso vai resetar a senha de TODOS os usuários (incluindo a sua). Todos terão que criar nova senha no próximo login. Continuar?')) return;
    setResetando(true);
    try {
      const api = (await import('../services/api')).default;
      const response = await api.post('/admin/resetar-senhas');
      setResetModal(false);
      showResult(true, response.data.message);
    } catch {
      showResult(false, 'Erro ao resetar');
    } finally {
      setResetando(false);
    }
  };

  const handleResetarUsuario = async () => {
    if (!resetEmail.trim()) return;
    setResetando(true);
    try {
      const api = (await import('../services/api')).default;
      const response = await api.post('/admin/resetar-senha-usuario', { email: resetEmail.trim() });
      setResetModal(false);
      setResetEmail('');
      showResult(true, response.data.message);
    } catch (err) {
      showResult(false, err.response?.data?.error || 'Erro ao resetar');
    } finally {
      setResetando(false);
    }
  };

  const EMAILS_ACOMPANHAMENTO = ['sabrina@jtdkinvest.com', 'joaomatheus_heckler@outlook.com'];
  const isDemo = user?.is_demo === true;

  const menuItems = [
    { path: '/vendas', icon: '', label: 'Vendas' },
    { path: '/comissoes', icon: '', label: 'Comissões' },
    { path: '/simulador', icon: '', label: 'Simulador' },
    { path: '/grupos', icon: '', label: 'Métricas' },
    { path: '/agenda', icon: '', label: 'Chat - agenda' },
    ...(isDemo || ['sabrina@jtdkinvest.com', 'joel@jtdkinvest.com', 'joel@wflowinvest.com'].includes(user?.email)
      ? [{ path: '/reunioes', icon: '', label: 'Reuniões' }]
      : []),
    ...(isDemo || EMAILS_ACOMPANHAMENTO.includes(user?.email)
      ? [{ path: '/acompanhamento', icon: '', label: 'Acompanhamento' }]
      : []),
    ...(isDemo || ['sabrina@jtdkinvest.com', 'joel@jtdkinvest.com', 'joel@wflowinvest.com'].includes(user?.email)
      ? [{ path: '/admin', icon: '', label: 'Administração' }]
      : []),
  ];

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className={`sidebar${sidebarOpen ? '' : ' sidebar-hidden'}`}>
        <div className="sidebar-logo">
          <span className="logo-text">Dashboard</span>
        </div>
        
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              {item.icon && <span className="nav-icon">{item.icon}</span>}
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-dropdown" ref={dropdownRef}>
            <button className="user-badge" onClick={() => setDropdownOpen(o => !o)}>
              <div className="user-avatar">{user?.nome?.charAt(0).toUpperCase()}</div>
              <span className="user-name">{user?.nome?.split(' ')[0]}</span>
            </button>
            {dropdownOpen && (
              <div className="sidebar-user-menu">
                <span className="header-user-email">{user?.email}</span>
                {!isDemo && ['sabrina@jtdkinvest.com', 'joel@jtdkinvest.com', 'joel@wflowinvest.com'].includes(user?.email) && (
                  <>
                    <hr className="dropdown-divider" />
                    <button className="dropdown-btn" onClick={() => setResetModal(true)}>
                      🔑 Resetar senha
                    </button>
                  </>
                )}
                <hr className="dropdown-divider" />
                <button className="btn-logout" onClick={handleLogout}>Sair</button>
                {adminResult && (
                  <span className={`admin-toast-inline ${adminResult.success ? 'success' : 'error'}`}>
                    {adminResult.msg}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Toggle button */}
      <button
        className={`sidebar-toggle${sidebarOpen ? '' : ' sidebar-toggle-closed'}`}
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? 'Ocultar sidebar' : 'Mostrar sidebar'}
        title={sidebarOpen ? 'Ocultar sidebar' : 'Mostrar sidebar'}
      >
        {sidebarOpen ? '‹' : '›'}
      </button>

      {/* Main Content */}
      <div className={`main-wrapper${sidebarOpen ? '' : ' sidebar-hidden'}`}>
        {/* Header */}
        <header className="header">
          <div className="header-title">
            {/* Título dinâmico pode ser adicionado aqui */}
          </div>
          <div className="header-actions">
            <button
              className="btn-theme-toggle"
              onClick={toggleTheme}
              title="Alternar tema"
              aria-label="Alternar tema"
            >
              <span>{theme === 'dark' ? '🌙' : '☀️'}</span>
              <span className="theme-label">{theme === 'dark' ? 'Modo escuro' : 'Modo claro'}</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="main-content">
          {children}
        </main>
      </div>

      {/* Popup de agenda/retornos para admins (não aparece no demo) */}
      {!isDemo && ['sabrina@jtdkinvest.com', 'joel@jtdkinvest.com', 'joel@wflowinvest.com'].includes(user?.email) && (
        <PopupAgenda userEmail={user.email} onNavigate={navigate} />
      )}

      {/* Modal Resetar Senha */}
      {resetModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '420px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.1rem' }}>Resetar senha</h3>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Resetar todos os usuários</p>
              <button className="btn-admin-action" onClick={handleResetarTodos} disabled={resetando} style={{ width: '100%' }}>
                {resetando ? '...' : 'Todos os usuários'}
              </button>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 0 1.5rem' }} />

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Resetar usuário específico</p>
              <input
                type="email"
                placeholder="Email do usuário"
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleResetarUsuario()}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: '0.75rem', boxSizing: 'border-box' }}
              />
              <button className="btn-admin-action" onClick={handleResetarUsuario} disabled={resetando || !resetEmail.trim()} style={{ width: '100%' }}>
                {resetando ? '...' : 'Resetar usuário específico'}
              </button>
            </div>

            <button onClick={() => { setResetModal(false); setResetEmail(''); }} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Layout;
