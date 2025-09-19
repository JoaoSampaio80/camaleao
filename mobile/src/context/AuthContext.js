// src/context/AuthContext.js
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as SecureStore from "expo-secure-store";
import jwtDecode from "jwt-decode";
import { http } from "@/api/http";
import { loginWithEmail as apiLogin, logout as apiLogout } from "@/api/auth";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const TOKENS = { ACCESS: "access", REFRESH: "refresh" };

const decodeSafe = (t) => {
  try {
    return jwtDecode(t);
  } catch {
    return null;
  }
};
const isExpired = (d) => !d?.exp || d.exp <= Math.floor(Date.now() / 1000);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authTokens, setAuthTokens] = useState(null); // {access, refresh?}
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    try {
      const { data } = await http.get("users/me/");
      const u = data || {};
      setUser({
        email: (u.email || "").toLowerCase(),
        first_name: u.first_name || "",
        role: u.role || "",
        avatar: u.avatar || null,
      });
    } catch {
      // mantém o que veio do token
    }
  };

  // bootstrap: lê tokens do SecureStore, pré-preenche com JWT e sincroniza com /users/me/
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const access = await SecureStore.getItemAsync(TOKENS.ACCESS);
        const refresh = await SecureStore.getItemAsync(TOKENS.REFRESH);
        if (!access && !refresh) return;

        setAuthTokens({ access: access || null, refresh: refresh || null });

        const decoded = access ? decodeSafe(access) : null;
        if (decoded && !isExpired(decoded)) {
          if (!mounted) return;
          setUser({
            email: (decoded.email || decoded.sub || "").toLowerCase(),
            first_name: decoded.first_name || decoded.given_name || "",
            role: decoded.role || "",
            avatar: null,
          });
        }

        if (!mounted) return;
        await fetchMe();
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const login = async ({ email, password }) => {
    const data = await apiLogin({ email, password });
    const access =
      data?.access || (await SecureStore.getItemAsync(TOKENS.ACCESS));
    const refresh =
      data?.refresh || (await SecureStore.getItemAsync(TOKENS.REFRESH));
    setAuthTokens({ access: access || null, refresh: refresh || null });

    const decoded = access ? decodeSafe(access) : null;
    if (decoded) {
      setUser({
        email: (decoded.email || decoded.sub || "").toLowerCase(),
        first_name: decoded.first_name || decoded.given_name || "",
        role: decoded.role || "",
        avatar: null,
      });
    } else {
      setUser({ email: "", first_name: "", role: "", avatar: null });
    }

    try {
      await fetchMe();
    } catch {}
    return data;
  };

  const logout = async () => {
    try {
      await apiLogout();
    } finally {
      await SecureStore.deleteItemAsync(TOKENS.ACCESS);
      await SecureStore.deleteItemAsync(TOKENS.REFRESH);
      setAuthTokens(null);
      setUser(null);
    }
  };

  const refreshUser = fetchMe;

  const value = useMemo(
    () => ({ user, authTokens, login, logout, refreshUser, loading }),
    [user, authTokens, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
