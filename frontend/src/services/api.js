import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar erros de autenticação.
// Só redireciona quando uma sessão existente expira (havia token) e o erro NÃO
// veio das rotas públicas de auth — senão a mensagem de erro do login/redefinição
// some por causa do reload da página.
const AUTH_ENDPOINTS = ['/login', '/esqueci-senha', '/redefinir-senha'];
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthEndpoint = AUTH_ENDPOINTS.some((p) => url.includes(p));
    if (error.response?.status === 401 && !isAuthEndpoint && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
