import { API_URL, APP_ENV, JWT_COOKIE } from "@env";

if (!API_URL) throw new Error("API_URL não definido no .env");

export const ENV = {
  API_URL: API_URL.endsWith("/") ? API_URL : API_URL + "/",
  APP_ENV: APP_ENV ?? "development",
  COOKIE_MODE: String(JWT_COOKIE || "").toLowerCase() === "true",
};
