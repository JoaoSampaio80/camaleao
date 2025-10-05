import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

/** =========================
 *  Base URL
 *  ========================= */
const ensureTrailingSlash = (url) => {
  if (!url) return '';
  return url.replace(/\/+$/, '') + '/';
};

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

/** =========================
 *  Modo cookie httpOnly?
 *  ========================= */
const COOKIE_MODE =
  String(import.meta?.env?.VITE_JWT_COOKIE || '').toLowerCase() === 'true';

const ENDPOINTS = COOKIE_MODE
  ? {
      login: 'auth/login/', // CookieTokenObtainPairView (sua view cookie)
      refresh: 'auth/refresh/', // CookieTokenRefreshView (sua view cookie)
      logout: 'auth/logout/', // CookieTokenLogoutView (opcional)
    }
  : {
      login: 'auth/token/', // padrão SimpleJWT
      refresh: 'auth/token/refresh/', // padrão SimpleJWT
      logout: 'auth/logout/', // opcional (se você criou)
    };

if (import.meta?.env?.DEV) {
  console.debug('[Axios] COOKIE_MODE =', COOKIE_MODE, 'ENDPOINTS =', ENDPOINTS);
}

/** =========================
 *  JWT helpers + storage
 *  ========================= */
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

const getTokens = () => {
  try {
    const raw = localStorage.getItem(TOKENS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const setTokens = (tokens) => {
  try {
    if (!tokens) {
      localStorage.removeItem(TOKENS_KEY);
      return;
    }
    localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
  } catch {}
};

/** =========================
 *  Inatividade (15min) + evento global
 *  ========================= */
const INACTIVITY_MAX_MS = 15 * 60_000;
const ACTIVITY_RECENT_MS = 60_000;
const HEARTBEAT_INTERVAL_MS = 4 * 60_000;

let lastActivity = Date.now();
let listenersAttached = false;

const FORCE_REAUTH_KEY = 'authForceReauth';
const REAUTH_MSG_KEY = 'authReauthMsg';

const setForceReauth = (msg) => {
  try {
    localStorage.setItem(FORCE_REAUTH_KEY, '1');
    if (msg) sessionStorage.setItem(REAUTH_MSG_KEY, msg);
  } catch {}
};
const clearForceReauth = () => {
  try {
    localStorage.removeItem(FORCE_REAUTH_KEY);
    sessionStorage.removeItem(REAUTH_MSG_KEY);
  } catch {}
};
const hasForceReauth = () => {
  try {
    return localStorage.getItem(FORCE_REAUTH_KEY) === '1';
  } catch {
    return false;
  }
};
export const readReauthMessage = () => {
  try {
    return sessionStorage.getItem(REAUTH_MSG_KEY) || '';
  } catch {
    return '';
  }
};

const emitAuthEvent = (type, detail) => {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent(type, { detail }));
    } catch {}
  }
};

let lastEventAt = Date.now();
const bumpActivity = () => {
  const now = Date.now();
  const gap = now - lastActivity;
  lastEventAt = now;

  if (gap >= INACTIVITY_MAX_MS && !hasForceReauth()) {
    setForceReauth('Suas credenciais expiraram por inatividade. Faça login novamente.');
    setTokens(null);
    emitAuthEvent('auth:reauth', { reason: 'inactivity' });
    // fallback duro
    if (!/\/login\/?$/.test(window.location.pathname)) {
      setTimeout(() => window.location.replace('/login'), 0);
    }
  }
  lastActivity = now;
};

const attachActivityListeners = () => {
  if (listenersAttached || typeof window === 'undefined') return;
  listenersAttached = true;

  ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'].forEach((evt) =>
    window.addEventListener(evt, bumpActivity, { passive: true })
  );
  window.addEventListener('focus', bumpActivity);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) bumpActivity();
  });
};

attachActivityListeners();

const isActiveRecently = () => Date.now() - lastEventAt <= ACTIVITY_RECENT_MS;

/** =========================
 *  Axios instances
 *  ========================= */
const raw = axios.create({
  baseURL: baseUrl,
  timeout: 10000,
  withCredentials: COOKIE_MODE,
  headers: { accept: 'application/json' },
});

const AxiosInstance = axios.create({
  baseURL: baseUrl,
  timeout: 10000,
  withCredentials: COOKIE_MODE,
  headers: { accept: 'application/json' },
});

/** =========================
 *  Refresh centralizado
 *  ========================= */
let isRefreshing = false;
let refreshQueue = [];

const drainRefreshQueue = (err, token) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (err) reject(err);
    else resolve(token);
  });
  refreshQueue = [];
};

const doLegacyRefresh = async () => {
  const tokens = getTokens();
  if (!tokens?.refresh) throw new Error('No refresh token');

  const resp = await raw.post(ENDPOINTS.refresh, { refresh: tokens.refresh });
  const access = resp?.data?.access;
  if (!access) throw new Error('Invalid refresh response');

  const newTokens = { ...tokens, access };
  setTokens(newTokens);
  return access;
};

const doCookieRefresh = async () => {
  const resp = await raw.post(ENDPOINTS.refresh, null);
  const access = resp?.data?.access;
  if (!access) throw new Error('Invalid cookie refresh response');

  const tokens = getTokens();
  if (tokens) {
    setTokens({ ...tokens, access });
  }
  return access;
};

const refreshAccess = async () => {
  if (hasForceReauth()) throw new Error('Reauth required');

  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      refreshQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;
  try {
    const access = COOKIE_MODE ? await doCookieRefresh() : await doLegacyRefresh();
    isRefreshing = false;
    drainRefreshQueue(null, access);
    return access;
  } catch (err) {
    isRefreshing = false;
    drainRefreshQueue(err, null);
    setTokens(null);
    setForceReauth('Sua sessão expirou. Faça login novamente.');
    emitAuthEvent('auth:reauth', { reason: 'token_invalid' });
    // fallback duro
    if (!/\/login\/?$/.test(window.location.pathname)) {
      setTimeout(() => window.location.replace('/login'), 0);
    }
    throw err;
  }
};

const performRefreshIfActive = async () => {
  if (hasForceReauth()) throw new Error('Reauth required');
  if (!isActiveRecently()) throw new Error('Inativo (sem atividade recente)');
  return refreshAccess();
};

/** =========================
 *  Interceptor de REQUISIÇÃO
 *  ========================= */
AxiosInstance.interceptors.request.use(
  async (config) => {
    if (hasForceReauth()) {
      const err = new axios.Cancel('Reauth required');
      err.isAuthReauth = true;
      throw err;
    }

    const tokens = getTokens();
    const access = tokens?.access;
    if (access) {
      const decoded = decodeSafe(access);
      if (decoded && !isExpired(decoded)) {
        config.headers.Authorization = `Bearer ${access}`;
      } else {
        try {
          const newAccess = await performRefreshIfActive();
          config.headers.Authorization = `Bearer ${newAccess}`;
        } catch {
          // deixa seguir; 401 será tratado no response interceptor
        }
      }
    }

    const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;
    if (isFormData) {
      if (config.headers && config.headers['Content-Type']) {
        delete config.headers['Content-Type'];
      }
    } else {
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

/** =========================
 *  Interceptor de RESPOSTA
 *  ========================= */
AxiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isCancel?.(error) && error?.isAuthReauth) {
      return Promise.reject(error);
    }

    const original = error?.config;
    const status = error?.response?.status;
    const detail = error?.response?.data?.detail || '';

    const unauthLike =
      status === 401 ||
      (status === 403 && /credenciais|credentials/i.test(String(detail)));

    // helper p/ forçar reauth + fallback hard redirect
    const triggerReauth = (
      reason = 'unauthorized',
      msg = 'Sua sessão expirou. Faça login novamente.'
    ) => {
      try {
        setTokens(null);
        setForceReauth(msg);
        emitAuthEvent('auth:reauth', { reason });
      } catch {}
      // Fallback: se por qualquer motivo o listener não navegar, faz replace hard
      setTimeout(() => {
        try {
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.replace('/login');
          }
        } catch {}
      }, 300);
    };

    if (unauthLike && original && !original._retry) {
      // já estamos em força de reauth → só dispara evento/fallback
      if (hasForceReauth()) {
        triggerReauth('forced', 'Sua sessão expirou. Faça login novamente.');
        return Promise.reject(error);
      }

      original._retry = true;
      try {
        const newAccess = await performRefreshIfActive();
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newAccess}`;
        return AxiosInstance(original);
      } catch (e) {
        // refresh falhou → força reauth
        triggerReauth('token_invalid', 'Sua sessão expirou. Faça login novamente.');
        return Promise.reject(error);
      }
    }

    // Outros 401/403 similares (sem _retry) → força reauth também
    if (unauthLike) {
      triggerReauth(
        'unauthorized',
        'Suas credenciais de acesso não foram fornecidas ou expiraram.'
      );
    }

    return Promise.reject(error);
  }
);

/** =========================
 *  Heartbeat (opcional)
 *  ========================= */
if (typeof window !== 'undefined') {
  setInterval(async () => {
    try {
      if (hasForceReauth()) return;
      if (!isActiveRecently()) return;

      const tokens = getTokens();
      const access = tokens?.access;
      if (!access && COOKIE_MODE) return;

      if (access) {
        const decoded = decodeSafe(access);
        if (!decoded) return;
        const now = Math.floor(Date.now() / 1000);
        const secsLeft = decoded.exp - now;
        if (secsLeft <= 90) {
          await performRefreshIfActive();
        }
      }
    } catch {
      // silencioso; qualquer 401 será tratado no interceptor
    }
  }, HEARTBEAT_INTERVAL_MS);
}

/** =========================
 *  API pública
 *  ========================= */
export const auth = {
  async login({ email, password }) {
    clearForceReauth();
    setTokens(null);

    const resp = await raw.post(ENDPOINTS.login, { email, password });
    const data = resp.data || {};

    if (!COOKIE_MODE) {
      if (data.access || data.refresh) {
        setTokens({ access: data.access || '', refresh: data.refresh || '' });
      }
    } else {
      if (data.access) {
        const tokens = getTokens();
        setTokens({ ...(tokens || {}), access: data.access });
      } else {
        setTokens(null);
      }
    }
    return data;
  },

  async logout() {
    try {
      if (ENDPOINTS.logout) {
        await raw.post(ENDPOINTS.logout, null);
      }
    } catch {
      // ignore
    } finally {
      setTokens(null);
      clearForceReauth();
    }
  },

  getAccess() {
    const t = getTokens();
    return t?.access || '';
  },
};

export default AxiosInstance;
