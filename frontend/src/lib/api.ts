import axios from 'axios';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: injeta o token JWT do Supabase automaticamente
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }

  return config;
});

// Interceptor: trata erros de autenticação
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado — tenta refresh
      const { data: { session } } = await supabase.auth.refreshSession();
      if (session) {
        // Retry com novo token
        error.config.headers.Authorization = `Bearer ${session.access_token}`;
        return api.request(error.config);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
