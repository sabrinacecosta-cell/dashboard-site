import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PopupAgenda from './PopupAgenda';
import FaqModal from './FaqModal';
import NavIcon from './NavIcons';

function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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

  // null | 'faq' (público) | 'log' | 'gerenciar' (admin, abertos pelo menu do usuário)
  const [faqView, setFaqView] = useState(null);

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
  const EMAILS_ADMIN = ['sabrina@jtdkinvest.com', 'joel@jtdkinvest.com', 'joel@wflowinvest.com'];
  const isDemo = user?.is_demo === true;

  // Ícones diretos no rail (ordem atual: Simulador, depois Métricas).
  const railItems = [
    { path: '/simulador', icon: 'simulador', label: 'Simulador' },
    { path: '/grupos', icon: 'metricas', label: 'Métricas' },
  ];

  // Itens do flyout "Gestão" — mesma lógica de permissão de antes, só reorganizada.
  const gestaoItems = [
    { path: '/vendas', icon: 'vendas', label: 'Vendas' },
    { path: '/comissoes', icon: 'comissoes', label: 'Comissões' },
    { path: '/agenda', icon: 'agenda', label: 'Chat - agenda' },
    ...(isDemo || EMAILS_ADMIN.includes(user?.email)
      ? [{ path: '/reunioes', icon: 'comercial', label: 'Comercial' }]
      : []),
    ...(isDemo || EMAILS_ACOMPANHAMENTO.includes(user?.email)
      ? [{ path: '/acompanhamento', icon: 'acompanhamento', label: 'Acompanhamento' }]
      : []),
    ...(isDemo || EMAILS_ADMIN.includes(user?.email)
      ? [{ path: '/admin', icon: 'admin', label: 'Administração' }]
      : []),
  ];

  // Gestão só aparece se houver ao menos um item permitido para o usuário.
  const showGestao = gestaoItems.length > 0;
  const gestaoActive = gestaoItems.some(i => location.pathname.startsWith(i.path));

  const [gestaoOpen, setGestaoOpen] = useState(false);
  const gestaoRef = useRef(null);

  // Fecha o flyout ao clicar fora ou pressionar Esc.
  useEffect(() => {
    if (!gestaoOpen) return;
    const onClickOutside = (e) => {
      if (gestaoRef.current && !gestaoRef.current.contains(e.target)) setGestaoOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setGestaoOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [gestaoOpen]);

  return (
    <div className="layout">
      {/* Sidebar — rail estreito só de ícones */}
      <aside className={`sidebar sidebar-rail${sidebarOpen ? '' : ' sidebar-hidden'}`}>
        <div className="sidebar-logo">
          <span className="sidebar-logo-text" aria-label="Dashboard">
            <span className="sidebar-logo-initial">D</span>
            <span className="sidebar-logo-rest">ashboard</span>
          </span>
        </div>

        <nav className="sidebar-nav">
          {railItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              data-label={item.label}
              className={({ isActive }) => `nav-rail-item${isActive ? ' active' : ''}`}
              aria-label={item.label}
            >
              <span className="nav-rail-ico"><NavIcon name={item.icon} /></span>
              <span className="nav-rail-label">{item.label}</span>
            </NavLink>
          ))}

          {showGestao && (
            <div className="rail-gestao" ref={gestaoRef}>
              <button
                type="button"
                data-label="Gestão"
                className={`nav-rail-item${gestaoActive ? ' active' : ''}${gestaoOpen ? ' flyout-open' : ''}`}
                aria-label="Gestão"
                aria-haspopup="true"
                aria-expanded={gestaoOpen}
                onClick={() => setGestaoOpen(o => !o)}
              >
                <span className="nav-rail-ico"><NavIcon name="gestao" /></span>
                <span className="nav-rail-label">Gestão</span>
              </button>

              {gestaoOpen && (
                <div className="rail-flyout" role="menu">
                  <span className="rail-flyout-title">Gestão</span>
                  {gestaoItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      role="menuitem"
                      className={({ isActive }) => `rail-flyout-item${isActive ? ' active' : ''}`}
                      onClick={() => setGestaoOpen(false)}
                    >
                      <span className="rail-flyout-icon"><NavIcon name={item.icon} size={18} /></span>
                      <span className="rail-flyout-label">{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}
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
                    <button className="dropdown-btn" onClick={() => { setDropdownOpen(false); setFaqView('log'); }}>
                      💬 FAQ · Perguntas feitas
                    </button>
                    <button className="dropdown-btn" onClick={() => { setDropdownOpen(false); setFaqView('gerenciar'); }}>
                      ✎ FAQ · Gerenciar entradas
                    </button>
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
              onClick={() => setFaqView('faq')}
              title="FAQ — Regras das administradoras"
              aria-label="Abrir FAQ"
              style={{ color: 'var(--primary)', border: '1px solid var(--primary)' }}
            >
              <span className="theme-label" style={{ color: 'var(--primary)' }}>FAQ</span>
            </button>
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

      {/* Modal FAQ de regras das administradoras (todos os usuários; views admin pelo menu) */}
      {faqView && <FaqModal user={user} view={faqView} onClose={() => setFaqView(null)} />}

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
