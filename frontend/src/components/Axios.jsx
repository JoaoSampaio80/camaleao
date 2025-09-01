import axios from 'axios'
import { jwtDecode } from 'jwt-decode';

const ensureTrailingSlash = (url) => (url.endsWith('/') ? url : url + '/');

const envBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://127.0.0.1:8000/api/v1';

const baseUrl = ensureTrailingSlash(envBase);

const TOKENS_KEY = 'authTokens';
const decodeSafe = (t) => { try { return jwtDecode(t); } catch { return null; } };
const isExpired = (decoded) => !decoded?.exp || decoded.exp <= Math.floor(Date.now()/1000);

const AxiosInstance = axios.create({
    baseURL: baseUrl,
    timeout:10000,
    headers:{        
        accept: "application/json"
    }
})

// Adiciona um interceptor para incluir o token de autenticação em todas as requisições
AxiosInstance.interceptors.request.use(
  async (config) => {
    // ====== AUTH HEADER ======
    const raw = localStorage.getItem(TOKENS_KEY);
    if (raw) {
      const tokens = JSON.parse(raw);
      const access = tokens?.access;
      const refresh = tokens?.refresh;

      if (access) {
        const decoded = decodeSafe(access);
        if (!decoded || isExpired(decoded)) {
          if (refresh) {
            try {
              const resp = await axios.post(`${baseUrl}auth/token/refresh/`, { refresh });
              const newTokens = { ...tokens, access: resp.data.access };
              localStorage.setItem(TOKENS_KEY, JSON.stringify(newTokens));
              config.headers.Authorization = `Bearer ${newTokens.access}`;
            } catch {
              localStorage.removeItem(TOKENS_KEY);
            }
          }
        } else {
          config.headers.Authorization = `Bearer ${access}`;
        }
      }
    }

    // ====== CONTENT-TYPE DINÂMICO ======
    // Se for FormData, remova qualquer content-type (o browser colocará multipart/form-data com boundary)
    const isFormData = (typeof FormData !== 'undefined') && (config.data instanceof FormData);
    if (isFormData) {
      if (config.headers && config.headers['Content-Type']) {
        delete config.headers['Content-Type'];
      }
    } else {
      // Opcional: se estiver enviando JSON (objeto puro), garanta application/json
      // (Axios geralmente seta sozinho, mas deixar explícito não dói)
      const isPlainObject =
        config.data &&
        typeof config.data === 'object' &&
        !(config.data instanceof ArrayBuffer) &&
        !(config.data instanceof Blob);
      if (isPlainObject) {
        config.headers['Content-Type'] = 'application/json';
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

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