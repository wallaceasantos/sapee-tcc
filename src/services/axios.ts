/**
 * API Client - Axios Instance
 * SAPEE DEWAS - Configuração do Axios para requisições HTTP
 */

import axios from 'axios';

// Criar instância do axios com configuração base
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sapee_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para lidar com erros de resposta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado, fazer logout
      localStorage.removeItem('sapee_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
