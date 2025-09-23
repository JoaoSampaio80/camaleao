import useAuthReauthRedirect from '../hooks/useAuthReauthRedirect';

export default function ReauthListener() {
  useAuthReauthRedirect();
  return null;
}
