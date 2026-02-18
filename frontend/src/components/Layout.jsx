import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/vendas', icon: '📊', label: 'Vendas' },
    { path: '/comissoes', icon: '💰', label: 'Comissões' },
    { path: '/simulador', icon: '🧮', label: 'Simulador' },
  ];

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">◆</span>
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

      {/* Main Content */}
      <div className="main-wrapper">
        {/* Header */}
        <header className="header">
          <div className="header-title">
            {/* Título dinâmico pode ser adicionado aqui */}
          </div>
          <div className="header-actions">
            {user?.email === 'sabrina@jtdkinvest.com' && (
              <AdminButton />
            )}
            <div className="header-user">
              <span className="header-user-name">{user?.nome}</span>
              <span className="header-user-email">{user?.email}</span>
            </div>
            <button className="btn-logout" onClick={handleLogout}>
              Sair
            </button>
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

  return (
    <div style={{ position: 'relative' }}>
      <button className="btn-admin" onClick={handleImportar} disabled={importando}>
        {importando ? '...' : '🔄'}
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
