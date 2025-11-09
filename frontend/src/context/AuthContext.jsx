// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { jwtDecode } from 'jwt-decode';
import AxiosInstance from '../components/Axios';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

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
    if (!isLocal) return null; // ✅ Em produção, ignora localStorage
    const raw = localStorage.getItem(TOKENS_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const fetchMe = async () => {
    try {
      const resp = await AxiosInstance.get('users/me/');
      const u = resp?.data || {};
      setUser({
        email: (u.email || '').toLowerCase(),
        first_name: u.first_name || '',
        role: u.role || '',
        avatar: u.avatar || null,
      });
    } catch (err) {
      // 👇 só ignora se for 401 (usuário não logado)
      if (err?.response?.status !== 401) {
        console.warn('fetchMe falhou:', err);
      }
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        // ✅ Em produção, tokens vêm do cookie; localStorage é apenas fallback local
        const tokens = getStoredTokens();
        if (tokens) {
          setAuthTokens(tokens);
          const decoded = decodeSafe(tokens.access);
          if (decoded && mounted) {
            setUser({
              email: (decoded.email || decoded.sub || '').toLowerCase(),
              first_name: decoded.first_name || decoded.given_name || '',
              role: decoded.role || '',
              avatar: null,
            });
          }
        }

        if (mounted) await fetchMe(); // ✅ sempre consulta backend, que é fonte da verdade
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLocal) return; // ✅ não precisa sincronizar storage em produção
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
            avatar: null,
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

  const login = async (data) => {
    // ✅ Em produção, o cookie httpOnly é criado pelo backend; não precisamos salvar nada
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
        avatar: null,
      });
    } else {
      setUser({ email: '', first_name: '', role: '', avatar: null });
    }

    try {
      await fetchMe();
    } catch {}
  };

  const logout = async () => {
    try {
      await AxiosInstance.post('auth/logout/'); // ✅ backend apaga cookies httpOnly
    } catch {}
    if (isLocal) localStorage.removeItem(TOKENS_KEY);
    setAuthTokens(null);
    setUser(null);
  };

  const refreshUser = fetchMe;

  const value = useMemo(
    () => ({ user, authTokens, login, logout, refreshUser, loading }),
    [user, authTokens, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
