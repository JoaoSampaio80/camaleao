import { useEffect, useRef, useCallback } from "react";
import { AppState, Pressable } from "react-native";
import { useNavigationContainerRef } from "@react-navigation/native";
import { logout } from "@/api/auth";

const INACTIVITY_MS = 15 * 60 * 1000;
const BUMP_EVENTS_MS = 60 * 1000;

export default function InactivityProvider({ children, onExpire }) {
  const timerRef = useRef(null);
  const lastBumpRef = useRef(Date.now());

  const resetTimer = useCallback(() => {
    const now = Date.now();
    if (now - lastBumpRef.current < 250) return;
    lastBumpRef.current = now;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        await logout();
      } catch {}
      onExpire?.();
    }, INACTIVITY_MS);
  }, [onExpire]);

  // AppState: quando volta ao foreground, consideramos atividade
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") resetTimer();
    });
    resetTimer();
    return () => {
      sub.remove();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  // “Heartbeat” leve: se o usuário está usando (toques), renovamos
  useEffect(() => {
    const id = setInterval(resetTimer, BUMP_EVENTS_MS);
    return () => clearInterval(id);
  }, [resetTimer]);

  // Envolve toda a árvore com um Pressable para captar qualquer toque
  return (
    <Pressable style={{ flex: 1 }} onTouchStart={resetTimer}>
      {children}
    </Pressable>
  );
}
