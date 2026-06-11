import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Vendas from './pages/Vendas';
import Comissoes from './pages/Comissoes';
import Simulador from './pages/Simulador';
import Grupos from './pages/Grupos';
import Acompanhamento from './pages/Acompanhamento';
import Admin from './pages/Admin';
import Agenda from './pages/Agenda';
import Reunioes from './pages/Reunioes';
import RedefinirSenha from './pages/RedefinirSenha';

const ADMIN_EMAILS = ['sabrina@jtdkinvest.com', 'joel@jtdkinvest.com', 'joel@wflowinvest.com'];

function PrivateRoute({ children }) {
  const { signed, loading } = useAuth();

  if (loading) {
    return <div className="app-loading">Carregando...</div>;
  }

  if (!signed) {
    return <Navigate to="/login" />;
  }

  return <Layout>{children}</Layout>;
}

function AdminRoute({ children }) {
  const { signed, loading, user } = useAuth();

  if (loading) {
    return <div className="app-loading">Carregando...</div>;
  }

  if (!signed) {
    return <Navigate to="/login" />;
  }

  if (!user?.is_demo && !ADMIN_EMAILS.includes(user?.email)) {
    return <Navigate to="/vendas" />;
  }

  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }) {
  const { signed, loading } = useAuth();

  if (loading) {
    return <div className="app-loading">Carregando...</div>;
  }

  if (signed) {
    return <Navigate to="/vendas" />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />
          <Route 
            path="/vendas" 
            element={
              <PrivateRoute>
                <Vendas />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/comissoes" 
            element={
              <PrivateRoute>
                <Comissoes />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/simulador" 
            element={
              <PrivateRoute>
                <Simulador />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/grupos" 
            element={
              <PrivateRoute>
                <Grupos />
              </PrivateRoute>
            } 
          />
          <Route
            path="/agenda"
            element={
              <PrivateRoute>
                <Agenda />
              </PrivateRoute>
            }
          />
          <Route
            path="/reunioes"
            element={
              <AdminRoute>
                <Reunioes />
              </AdminRoute>
            }
          />
          <Route
            path="/acompanhamento"
            element={
              <PrivateRoute>
                <Acompanhamento />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <PrivateRoute>
                <Admin />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/vendas" />} />
          <Route path="*" element={<Navigate to="/vendas" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
