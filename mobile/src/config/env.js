import { API_URL, APP_ENV, JWT_COOKIE } from "@env";

// Log apenas no modo de desenvolvimento (para confirmar a URL do túnel)
if (__DEV__) {
  console.log("[ENV] API_URL carregada:", API_URL);
  console.log("[ENV] APP_ENV:", APP_ENV);
}

// Validação mais resiliente — sem travar o app em builds de produção
if (!API_URL) {
  console.warn(
    "⚠️ API_URL não definido no .env — verifique o script de ambiente ou arquivo .env."
  );
}

export const ENV = {
  // Garante barra final e previne undefined
  API_URL: API_URL
    ? API_URL.endsWith("/")
      ? API_URL
      : `${API_URL}/`
    : "http://127.0.0.1:8000/api/v1/", // fallback seguro
  APP_ENV: APP_ENV || "development",
  COOKIE_MODE: String(JWT_COOKIE || "").toLowerCase() === "true",
};
