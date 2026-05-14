import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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

  const EMAILS_ACOMPANHAMENTO = ['sabrina@jtdkinvest.com', 'joaomatheus_heckler@outlook.com'];

  const menuItems = [
    { path: '/vendas', icon: '📊', label: 'Vendas' },
    { path: '/comissoes', icon: '💰', label: 'Comissões' },
    { path: '/simulador', icon: '🧮', label: 'Simulador' },
    { path: '/grupos', icon: '📈', label: 'Métricas' },
    ...(EMAILS_ACOMPANHAMENTO.includes(user?.email)
      ? [{ path: '/acompanhamento', icon: '📋', label: 'Acompanhamento' }]
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
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-badge">
            <div className="user-avatar">
              {user?.nome?.charAt(0).toUpperCase()}
            </div>
            <div className="user-info-sidebar">
              <span className="user-name">{user?.nome?.split(' ')[0]}</span>
            </div>
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
            {user?.email === 'sabrina@jtdkinvest.com' && (
              <AdminButton />
            )}
            <button
              className="btn-theme-toggle"
              onClick={toggleTheme}
              title="Alternar tema"
              aria-label="Alternar tema"
            >
              <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
              <span className="theme-label">{theme === 'dark' ? 'Modo escuro' : 'Modo claro'}</span>
            </button>
            <div className="header-user-dropdown" ref={dropdownRef}>
              <button className="header-user-btn" onClick={() => setDropdownOpen(o => !o)}>
                {user?.nome?.split(' ')[0]}
              </button>
              {dropdownOpen && (
                <div className="header-user-menu">
                  <span className="header-user-email">{user?.email}</span>
                  <button className="btn-logout" onClick={handleLogout}>Sair</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}

function AdminButton() {
  const [importando, setImportando] = React.useState(false);
  const [resetando, setResetando] = React.useState(false);
  const [result, setResult] = React.useState(null);

  const handleImportar = async () => {
    if (!confirm('Atualizar dados da planilha?')) return;
    setImportando(true);
    try {
      const api = (await import('../services/api')).default;
      const response = await api.post('/admin/importar');
      setResult({ success: true, msg: `${response.data.registrosImportados} registros` });
      setTimeout(() => setResult(null), 3000);
    } catch (err) {
      setResult({ success: false, msg: 'Erro' });
      setTimeout(() => setResult(null), 3000);
    } finally {
      setImportando(false);
    }
  };

  const handleResetarSenhas = async () => {
    if (!confirm('⚠️ ATENÇÃO: Isso vai resetar a senha de TODOS os usuários (incluindo a sua). Todos terão que criar nova senha no próximo login. Continuar?')) return;
    setResetando(true);
    try {
      const api = (await import('../services/api')).default;
      const response = await api.post('/admin/resetar-senhas');
      setResult({ success: true, msg: response.data.message });
      setTimeout(() => setResult(null), 4000);
    } catch (err) {
      setResult({ success: false, msg: 'Erro ao resetar' });
      setTimeout(() => setResult(null), 3000);
    } finally {
      setResetando(false);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
      <button className="btn-admin" onClick={handleImportar} disabled={importando} title="Atualizar dados">
        {importando ? '...' : '🔄'}
      </button>
      <button className="btn-admin" onClick={handleResetarSenhas} disabled={resetando} title="Resetar senhas">
        {resetando ? '...' : '🔑'}
      </button>
      {result && (
        <span className={`admin-toast ${result.success ? 'success' : 'error'}`}>
          {result.msg}
        </span>
      )}
    </div>
  );
}

export default Layout;
