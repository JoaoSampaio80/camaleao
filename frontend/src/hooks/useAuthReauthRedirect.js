import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { readReauthMessage } from '../components/Axios';

export default function useAuthReauthRedirect() {
  const nav = useNavigate();
  const loc = useLocation();
  const lastHandledRef = useRef(0);
  const DEBOUNCE_MS = 1000;

  useEffect(() => {
    const handler = (ev) => {
      const now = Date.now();
      if (now - lastHandledRef.current < DEBOUNCE_MS) return;
      lastHandledRef.current = now;

      const reason = ev?.detail?.reason || 'unknown';
      const from = `${loc.pathname}${loc.search || ''}${loc.hash || ''}`;
      const msg =
        readReauthMessage() ||
        (reason === 'inactivity'
          ? 'Suas credenciais expiraram por inatividade. Faça login novamente.'
          : 'Sua sessão expirou. Faça login novamente.');

      // Se já estamos no /login, apenas atualiza o state (para mostrar a msg)
      if (loc.pathname === '/login') {
        nav('/login', { replace: true, state: { from, reauthMsg: msg, reason } });
      } else {
        nav('/login', { replace: true, state: { from, reauthMsg: msg, reason } });
      }

      // Fallback hard caso, por qualquer motivo, não navegue
      setTimeout(() => {
        try {
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.replace('/login');
          }
        } catch {}
      }, 400);
    };

    window.addEventListener('auth:reauth', handler);
    return () => window.removeEventListener('auth:reauth', handler);
  }, [nav, loc]);
}
