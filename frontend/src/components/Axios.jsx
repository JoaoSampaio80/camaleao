import axios from 'axios'
import { jwtDecode } from 'jwt-decode';

const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://127.0.0.1:800/api/v1/';

const TOKENS_KEY = 'authTokens';
const decodeSafe = (t) => { try { return jwtDecode(t); } catch { return null; } };
const isExpired = (decoded) => !decoded?.exp || decoded.exp <= Math.floor(Date.now()/1000);

const AxiosInstance = axios.create({
    baseURL: baseUrl,
    timeout:10000,
    headers:{
        "Content-Type": "application/json",
        accept: "application/json"
    }
})

// Adiciona um interceptor para incluir o token de autenticação em todas as requisições
AxiosInstance.interceptors.request.use( async (config) => {
        // Pega o token de acesso do localStorage
    const raw = localStorage.getItem(TOKENS_KEY);
    if (!raw) return config;
        
    const tokens = JSON.parse(raw);
    const access = tokens?.access;
    const refresh = tokens?.refresh;

    if (!access) return config;

    const decoded = decodeSafe(access);

    if (!decoded || isExpired(decoded)) {
    if (refresh) {
      try {
        const resp = await axios.post(`${baseUrl}auth/token/refresh/`, { refresh });
        const newTokens = { ...tokens, access: resp.data.access };
        localStorage.setItem(TOKENS_KEY, JSON.stringify(newTokens));
        config.headers.Authorization = `Bearer ${newTokens.access}`;
        return config;
      } catch (e) {
        // refresh falhou -> limpa e segue sem Authorization
        localStorage.removeItem(TOKENS_KEY);
        return config;
      }
    } else {
      // sem refresh -> segue sem Authorization
      return config;
    }
  }
  // access válido -> adiciona normalmente
  config.headers.Authorization = `Bearer ${access}`;
  return config;
}, (error) => Promise.reject(error));

// --- INTERCEPTOR DE RESPOSTA: se tomar 401, tenta 1x o refresh e repete a requisição
AxiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error?.response?.status;

    if (status === 401 && !original?._retry) {
      original._retry = true;

      try {
        const raw = localStorage.getItem(TOKENS_KEY);
        if (!raw) throw new Error('No tokens');

        const tokens = JSON.parse(raw);
        if (!tokens?.refresh) throw new Error('No refresh token');

        // tenta refresh
        const resp = await axios.post(`${baseUrl}auth/token/refresh/`, { refresh: tokens.refresh });
        const newTokens = { ...tokens, access: resp.data.access };
        localStorage.setItem(TOKENS_KEY, JSON.stringify(newTokens));

        // atualiza header e repete a chamada original
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newTokens.access}`;
        return AxiosInstance(original);
      } catch (e) {
        // refresh falhou: limpa e propaga erro
        localStorage.removeItem(TOKENS_KEY);
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default AxiosInstance