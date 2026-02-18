import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Vendas from './pages/Vendas';
import Comissoes from './pages/Comissoes';
import Simulador from './pages/Simulador';

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
          <Route path="/" element={<Navigate to="/vendas" />} />
          <Route path="*" element={<Navigate to="/vendas" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
