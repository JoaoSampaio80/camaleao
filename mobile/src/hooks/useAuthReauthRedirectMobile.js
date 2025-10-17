// hooks/useAuthReauthRedirectMobile.js
import { useEffect, useRef } from "react";
import { AppState, TouchableWithoutFeedback } from "react-native";
import * as SecureStore from "expo-secure-store";
import { ENV } from "@/config/env";
import { useAuth } from "@/context/AuthContext";

export default function useAuthReauthRedirectMobile(timeoutMinutes = 15) {
  let authSafe = null;
  try {
    authSafe = useAuth();
  } catch (err) {
    console.log("⚠️ [Reauth] AuthContext ainda não disponível:", err.message);
    return null; // evita crash inicial
  }

  const { user, logout } = authSafe || {};
  if (!logout) {
    console.log("⚠️ [Reauth] Logout ainda não disponível, saindo do hook.");
    return null;
  }

  const appState = useRef(AppState.currentState);
  const timerRef = useRef(null);
  const timeoutMs = timeoutMinutes * 60 * 1000;

  const handleReauth = async (reason = "unknown") => {
    console.log(`🔒 [Reauth] Sessão expirada (motivo: ${reason})`);
    try {
      await SecureStore.deleteItemAsync("access");
      await SecureStore.deleteItemAsync("refresh");
      console.log("🧹 [Reauth] Tokens removidos com sucesso");

      if (ENV.COOKIE_MODE) {
        try {
          await fetch(`${ENV.API_URL}auth/logout/`, { method: "POST" });
          console.log("✅ [Reauth] Logout backend concluído");
        } catch (err) {
          console.log(
            "⚠️ [Reauth] Falha ao chamar logout backend:",
            err.message
          );
        }
      }
    } catch (err) {
      console.log("⚠️ [Reauth] Erro ao remover tokens:", err.message);
    }

    console.log(
      "➡️ [Reauth] Redirecionando via logout global do AuthContext..."
    );
    logout(); // ✅ força renderização do AuthStack
  };

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => handleReauth("inactivity"), timeoutMs);
    console.log(
      "⏱️ [Reauth] Timer reiniciado, expira em",
      timeoutMinutes,
      "minutos"
    );
  };

  useEffect(() => {
    if (!user) {
      console.log("[Reauth] Usuário não logado, inatividade desativada.");
      return;
    }

    console.log("🚀 [Reauth] Hook iniciado");
    resetTimer();

    const appSub = AppState.addEventListener("change", (next) => {
      if (appState.current.match(/inactive|background/) && next === "active") {
        resetTimer();
      }
      appState.current = next;
    });

    const original = TouchableWithoutFeedback.prototype.onPressIn;
    TouchableWithoutFeedback.prototype.onPressIn = function (...args) {
      resetTimer();
      if (original) original.apply(this, args);
    };

    return () => {
      console.log("🧩 [Reauth] Hook desmontado, limpando timers e listeners");
      if (timerRef.current) clearTimeout(timerRef.current);
      appSub.remove();
      TouchableWithoutFeedback.prototype.onPressIn = original;
    };
  }, [user]);

  return null;
}
