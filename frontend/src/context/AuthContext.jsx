// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { jwtDecode } from 'jwt-decode';
import AxiosInstance from '../components/Axios';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const PUBLIC_ROUTES = ['/login', '/definir-senha', '/reset-password'];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authTokens, setAuthTokens] = useState(null);
  const [loading, setLoading] = useState(true);

  const TOKENS_KEY = 'authTokens';
  const isLocal = window.location.hostname === 'localhost';

  const decodeSafe = (t) => {
    try {
      return jwtDecode(t);
    } catch {
      return null;
    }
  };
  const isExpired = (decoded) =>
    !decoded?.exp || decoded.exp <= Math.floor(Date.now() / 1000);

  const getStoredTokens = () => {
    if (!isLocal) return null;
    try {
      const raw = localStorage.getItem(TOKENS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  // ============================================================
  // FETCH ME — CORRIGIDO (usa avatar_url verdadeiro)
  // ============================================================
  const fetchMe = async () => {
    try {
      const resp = await AxiosInstance.get('users/me/');
      const u = resp?.data || {};

      setUser({
        email: (u.email || '').toLowerCase(),
        first_name: u.first_name || '',
        role: u.role || '',
        avatar_url: u.avatar_url || null,
      });
    } catch (err) {
      const status = err?.response?.status;
      const path = window.location.pathname;

      if (status === 401 && PUBLIC_ROUTES.some((r) => path.startsWith(r))) return;

      if (status !== 401) {
        console.warn('fetchMe falhou:', err);
      }
    }
  };

  // ============================================================
  // LOAD INICIAL
  // ============================================================
  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        const tokens = getStoredTokens();

        if (tokens) {
          setAuthTokens(tokens);
          const decoded = decodeSafe(tokens.access);
          if (decoded && mounted) {
            setUser({
              email: (decoded.email || decoded.sub || '').toLowerCase(),
              first_name: decoded.first_name || decoded.given_name || '',
              role: decoded.role || '',
              avatar_url: null,
            });
          }
        }

        if (mounted) await fetchMe();
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => (mounted = false);
  }, []);

  // ============================================================
  // SINCRONIZAÇÃO ENTRE ABAS
  // ============================================================
  useEffect(() => {
    if (!isLocal) return;

    const onStorage = async (e) => {
      if (e.key !== TOKENS_KEY) return;

      const raw = e.newValue;
      if (!raw) {
        setAuthTokens(null);
        setUser(null);
        return;
      }

      try {
        const tokens = JSON.parse(raw);
        const decoded = decodeSafe(tokens?.access);

        if (decoded && !isExpired(decoded)) {
          setUser({
            email: (decoded.email || decoded.sub || '').toLowerCase(),
            first_name: decoded.first_name || decoded.given_name || '',
            role: decoded.role || '',
            avatar_url: null,
          });
        }

        await fetchMe();
      } catch {
        setAuthTokens(null);
        setUser(null);
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // ============================================================
  // LOGIN
  // ============================================================
  const login = async (data) => {
    if (isLocal && data?.access) {
      localStorage.setItem(TOKENS_KEY, JSON.stringify(data));
      setAuthTokens(data);
    }

    const decoded = decodeSafe(data?.access);
    if (decoded) {
      setUser({
        email: (decoded.email || decoded.sub || '').toLowerCase(),
        first_name: decoded.first_name || decoded.given_name || '',
        role: decoded.role || '',
        avatar_url: null,
      });
    }

    await fetchMe();
  };

  // ============================================================
  // LOGOUT
  // ============================================================
  const logout = async () => {
    try {
      await AxiosInstance.post('auth/logout/');
    } catch {}

    if (isLocal) localStorage.removeItem(TOKENS_KEY);

    setAuthTokens(null);
    setUser(null);
  };

  // ============================================================
  // EXPOSTO PARA O PERFIL (refreshUser)
  // ============================================================
  const refreshUser = fetchMe;

  const value = useMemo(
    () => ({
      user,
      authTokens,
      login,
      logout,
      refreshUser,
      loading,
    }),
    [user, authTokens, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
