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
    const decodeSafe = (t) => { try { return jwtDecode(t); } catch { return null; } };
    const isExpired = (decoded) => !decoded?.exp || decoded.exp <= Math.floor(Date.now()/1000);

    // Busca o usuário no backend (fonte da verdade)
    const fetchMe = async () => {
        try {
            const resp = await AxiosInstance.get('users/me/');
            const u = resp?.data || {};
            setUser({
                email: (u.email || '').toLowerCase(),
                first_name: u.first_name || '',
                role: u.role || '',
            });
        } catch (e) {
        // se falhar, mantém o que veio do token
        // console.error('fetchMe falhou:', e);
        }
    };

    console.log('AuthContext inicializado. user:', user);
    
    useEffect(() => {
        let mounted = true;
        const loadAuthData = async () => {
            setLoading(true);
            try {
                const raw = localStorage.getItem(TOKENS_KEY);
                if (!raw) return;

                const tokens = JSON.parse(raw);
                const decoded = decodeSafe(tokens?.access);
                if (!decoded || isExpired(decoded)) {
                    localStorage.removeItem(TOKENS_KEY);
                    return;
                }

                if (!mounted) return;

                setAuthTokens(tokens);
                setUser({
                    email: (decoded.email || decoded.sub || '').toLowerCase(),
                    first_name: decoded.first_name || decoded.given_name || '',
                    role: decoded.role || '',
                });

                await fetchMe();

                    console.log("AuthContext: Tokens encontrados, usuário definido.");
                    
            } catch (error) {
                // console.error("AuthContext: Falha ao carregar tokens ou decodificar:", error);                
                localStorage.removeItem(TOKENS_KEY);
                if (mounted) setUser(null);
            } finally {
                if (mounted) setLoading(false);
                // console.log("AuthContext: Carregamento inicial finalizado.");
            }
        };
        loadAuthData();
        return () => { mounted = false; };
    }, []); // O array de dependências vazio garante que isso rode apenas uma vez

    useEffect(() => {
        const onStorage = async (e) => {
            if (e.key !== TOKENS_KEY) return;
            const raw = e.newValue;
            if (!raw) { setAuthTokens(null); setUser(null); return; }

            try {
                const tokens = JSON.parse(raw);
                const decoded = decodeSafe(tokens?.access);
                if (!decoded || isExpired(decoded)) { setAuthTokens(null); setUser(null); return; }
                setAuthTokens(tokens);
                setUser({
                    email: (decoded.email || decoded.sub || '').toLowerCase(),
                    first_name: decoded.first_name || decoded.given_name || '',
                    role: decoded.role || '',
                });
                // sincroniza com backend
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
        if (!data?.access) {
            console.error("Dados de login inválidos. Token não encontrado.");
            return;
        };
        
        const decoded = decodeSafe(data.access);
        if (!decoded || isExpired(decoded)) {
            console.error("Token inválido ou expirado.");
            localStorage.removeItem(TOKENS_KEY);
            setAuthTokens(null);
            setUser(null);
            return;
        }

        localStorage.setItem(TOKENS_KEY, JSON.stringify(data));
        setAuthTokens(data);
        setUser({
            email: (decoded.email || decoded.sub || '').toLowerCase(),
            first_name: decoded.first_name || decoded.given_name || '',
            role: decoded.role || '',
        });
        
        // busca dados atualizados do usuário
        await fetchMe();

        console.log("login: Estado do usuário definido após login.");

    };
    
    const logout = () => {
        localStorage.removeItem(TOKENS_KEY);
        setAuthTokens(null);
        setUser(null);
        
    };

    // expõe também um refresh manual (p/ Perfil.jsx após PATCH)
    const refreshUser = fetchMe;

    const value = useMemo(() => ({ user, authTokens, login, logout, refreshUser, loading }), [user, authTokens, loading]);

    return (
        <AuthContext.Provider value={ value }>
            {children}
        </AuthContext.Provider>
    );
};