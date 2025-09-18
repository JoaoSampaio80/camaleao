import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { ENV } from "@/config/env";

let isRefreshing = false;
let queue = [];

const resolveQueue = (err, token) => {
  queue.forEach((p) => (err ? p.reject(err) : p.resolve(token)));
  queue = [];
};

export const http = axios.create({
  baseURL: ENV.API_URL,
  timeout: 10000,
  // RN ignora withCredentials na maioria dos casos, mas não custa setar:
  withCredentials: ENV.COOKIE_MODE,
  headers: { accept: "application/json" },
});

// injeta Authorization com access salvo
http.interceptors.request.use(async (config) => {
  const access = await SecureStore.getItemAsync("access");
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

// refresh 401 → cookie ou jwt, conforme ENV
http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status;
    const original = error?.config;

    if (status === 401 && original && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        })
          .then((token) => {
            original.headers = original.headers || {};
            original.headers.Authorization = token
              ? `Bearer ${token}`
              : undefined;
            return http(original);
          })
          .catch(Promise.reject);
      }

      isRefreshing = true;
      try {
        let newAccess = null;

        if (ENV.COOKIE_MODE) {
          // → /auth/refresh/ (cookie) e espera { access } no body
          const { data } = await axios.post(
            `${ENV.API_URL}auth/refresh/`,
            null,
            {
              withCredentials: true,
              headers: { accept: "application/json" },
              timeout: 10000,
            }
          );
          newAccess = data?.access || null;
        } else {
          // → /auth/token/refresh/ (jwt)
          const refresh = await SecureStore.getItemAsync("refresh");
          if (!refresh) throw new Error("No refresh token");
          const { data } = await axios.post(
            `${ENV.API_URL}auth/token/refresh/`,
            { refresh }
          );
          newAccess = data?.access || null;
        }

        if (!newAccess) throw new Error("Invalid refresh response");
        await SecureStore.setItemAsync("access", String(newAccess));

        resolveQueue(null, newAccess);
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newAccess}`;
        return http(original);
      } catch (e) {
        resolveQueue(e, null);
        await SecureStore.deleteItemAsync("access");
        await SecureStore.deleteItemAsync("refresh");
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
