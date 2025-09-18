import * as SecureStore from "expo-secure-store";
import { http } from "@/api/http";
import { ENV } from "@/config/env";

// LOGIN via COOKIE: POST /auth/login/ { email, password }
// Espera access no body (como no seu web)
export async function loginWithEmail({ email, password }) {
  const payload = {
    email: (email || "").trim().toLowerCase(),
    password,
  };
  const { data } = await http.post("auth/login/", payload);
  if (data?.access)
    await SecureStore.setItemAsync("access", String(data.access));
  if (data?.refresh)
    await SecureStore.setItemAsync("refresh", String(data.refresh));
  return data;
}

export async function logout() {
  try {
    await http.post("auth/logout/", null);
  } catch {}
  await SecureStore.deleteItemAsync("access");
  await SecureStore.deleteItemAsync("refresh");
}

export async function getMe() {
  const { data } = await http.get("users/me/");
  return data;
}

export async function passwordReset(email) {
  return http.post("auth/password-reset/", {
    email: (email || "").trim().toLowerCase(),
  });
}
