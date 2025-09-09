import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

/**
 * Normaliza a base para sempre terminar com uma única barra.
 */
const ensureTrailingSlash = (url) => {
  if (!url) return '';
  // remove barras finais duplicadas e deixa só 1
  return url.replace(/\/+$/, '') + '/';
};

/**
 * Lê a URL base da API a partir das variáveis do Vite.
 * Prioriza VITE_API_URL; caso ausente, tenta VITE_API_BASE_URL.
 * Fallback seguro para dev.
 * Exemplos esperados:
 *  - http://127.0.0.1:8000/api/v1/
 *  - https://api.seusite.com.br/api/v1/
 */
const pickEnvBase = () => {
  const fromVite =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL);

  const fallback = 'http://localhost:8000/api/v1/';
  const chosen = fromVite || fallback;
  return ensureTrailingSlash(chosen);
};

const baseUrl = pickEnvBase();

if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
  console.debug('[Axios] API baseURL =', baseUrl);
}

// ===== Helpers de JWT =====
const TOKENS_KEY = 'authTokens';

const decodeSafe = (token) => {
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
};

const isExpired = (decoded) =>
  !decoded?.exp || decoded.exp <= Math.floor(Date.now() / 1000);

// ===== Instância principal =====
const AxiosInstance = axios.create({
  baseURL: baseUrl,
  timeout: 10000,
  headers: {
    accept: 'application/json',
  },
});

// ===== Interceptor de REQUISIÇÃO =====
AxiosInstance.interceptors.request.use(
  async (config) => {
    // --- AUTH HEADER ---
    const raw = localStorage.getItem(TOKENS_KEY);
    if (raw) {
      const tokens = JSON.parse(raw);
      const access = tokens?.access;
      const refresh = tokens?.refresh;

      if (access) {
        const decoded = decodeSafe(access);

        // Access expirado ou ilegível → tenta refresh antes da requisição
        if (!decoded || isExpired(decoded)) {
          if (refresh) {
            try {
              const resp = await axios.post(`${baseUrl}auth/token/refresh/`, {
                refresh,
              });
              const newTokens = { ...tokens, access: resp.data.access };
              localStorage.setItem(TOKENS_KEY, JSON.stringify(newTokens));
              config.headers.Authorization = `Bearer ${newTokens.access}`;
            } catch {
              // Refresh falhou → limpa tokens
              localStorage.removeItem(TOKENS_KEY);
            }
          }
        } else {
          // Access válido
          config.headers.Authorization = `Bearer ${access}`;
        }
      }
    }

    // --- CONTENT-TYPE DINÂMICO ---
    // Se for FormData, deixe o browser definir multipart/form-data (com boundary)
    const isFormData =
      typeof FormData !== 'undefined' && config.data instanceof FormData;

    if (isFormData) {
      if (config.headers && config.headers['Content-Type']) {
        delete config.headers['Content-Type'];
      }
    } else {
      // Se for objeto "puro", define application/json explicitamente
      const isPlainObject =
        config.data &&
        typeof config.data === 'object' &&
        !(config.data instanceof ArrayBuffer) &&
        !(config.data instanceof Blob) &&
        !(config.data instanceof FormData);
      if (isPlainObject) {
        config.headers['Content-Type'] = 'application/json';
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ===== Interceptor de RESPOSTA =====
// Se receber 401, tenta UMA vez fazer refresh e refazer a requisição original
AxiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error?.config;
    const status = error?.response?.status;

    if (status === 401 && original && !original._retry) {
      original._retry = true;

      try {
        const raw = localStorage.getItem(TOKENS_KEY);
        if (!raw) throw new Error('No tokens');

        const tokens = JSON.parse(raw);
        if (!tokens?.refresh) throw new Error('No refresh token');

        // Tenta refresh
        const resp = await axios.post(`${baseUrl}auth/token/refresh/`, {
          refresh: tokens.refresh,
        });

        const newTokens = { ...tokens, access: resp.data.access };
        localStorage.setItem(TOKENS_KEY, JSON.stringify(newTokens));

        // Atualiza header e repete a chamada original
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newTokens.access}`;

        return AxiosInstance(original);
      } catch {
        // Refresh falhou → limpa tokens e repassa o erro
        localStorage.removeItem(TOKENS_KEY);
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default AxiosInstance;