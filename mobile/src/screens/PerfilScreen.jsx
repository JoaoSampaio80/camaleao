// src/screens/PerfilScreen.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Radius, Space } from "@/theme/tokens";
import { http } from "@/api/http";
import { useAuth } from "@/context/AuthContext";
import { useNavigation } from "@react-navigation/native";

const MAX_AVATAR_MB = 5;
const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export default function PerfilScreen() {
  const { top, bottom } = useSafeAreaInsets();
  const nav = useNavigation();
  const { refreshUser, logout, authTokens } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [variant, setVariant] = useState(""); // success | danger | warning | info
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    email: "",
    role: "",
    current_password: "",
    password: "",
    password2: "",
    avatarUri: "", // preview/url
    avatarAsset: null, // arquivo selecionado (ImagePicker)
  });

  // guarda a última URI local para limpar depois (Android não precisa revoke)
  const lastLocalUri = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await http.get("users/me/");
        if (!mounted) return;
        setForm((f) => ({
          ...f,
          email: resp?.data?.email || "",
          role: resp?.data?.role || "",
          current_password: "",
          password: "",
          password2: "",
          avatarUri: resp?.data?.avatar || "",
          avatarAsset: null,
        }));
      } catch {
        if (!mounted) return;
        setVariant("danger");
        setMessage("Falha ao carregar seu perfil.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      lastLocalUri.current = null;
    };
  }, []);

  function setFlash(kind, msg, autoHideMs = 3000) {
    setVariant(kind);
    setMessage(msg);
    if (autoHideMs) {
      setTimeout(() => {
        setVariant("");
        setMessage("");
      }, autoHideMs);
    }
  }

  const validateClient = () => {
    const e = {};
    const wantsPasswordChange = !!(form.password || form.password2);
    if (wantsPasswordChange) {
      if (!form.current_password)
        e.current_password = "Informe sua senha atual.";
      if (!form.password) e.password = "Informe a nova senha.";
      if (!form.password2) e.password2 = "Confirme a nova senha.";
      if (form.password && form.password.length < 3)
        e.password = "A senha deve ter pelo menos 3 caracteres.";
      if (form.password !== form.password2)
        e.password2 = "As senhas não coincidem.";
    }
    return e;
  };

  const buildFormData = ({ removeAvatar = false } = {}) => {
    const fd = new FormData();

    const wantsPasswordChange = !!(form.password || form.password2);
    if (wantsPasswordChange) {
      fd.append("current_password", form.current_password);
      fd.append("password", form.password);
      const refresh = authTokens?.refresh;
      if (refresh) fd.append("refresh", refresh);
    }

    if (form.avatarAsset) {
      const asset = form.avatarAsset;
      const nameGuess =
        asset.fileName ||
        `avatar.${(asset.mimeType || "image/jpeg").split("/")[1] || "jpg"}`;
      fd.append("avatar", {
        uri: asset.uri,
        name: nameGuess,
        type: asset.mimeType || "image/jpeg",
      });
    } else if (removeAvatar) {
      fd.append("remove_avatar", "true");
    }

    return fd;
  };

  async function pickAvatar() {
    setErrors((e) => ({ ...e, avatar: undefined }));

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setFlash("warning", "Permita o acesso às fotos para escolher um avatar.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsMultipleSelection: false,
    });

    if (result.canceled) return;

    const asset = result.assets[0];

    // validação rápida: mimetype / tamanho (se disponível)
    const type = asset.mimeType || "";
    const okType =
      (type && ACCEPTED.includes(type)) ||
      // fallback por extensão na URI
      /\.(jpg|jpeg|png|webp)$/i.test(asset.uri || "");
    if (!okType) {
      setErrors((p) => ({
        ...p,
        avatar: "Formato inválido. Use jpeg/jpg/png/webp.",
      }));
      return;
    }
    if (asset.fileSize && asset.fileSize > MAX_AVATAR_MB * 1024 * 1024) {
      setErrors((p) => ({
        ...p,
        avatar: `Arquivo maior que ${MAX_AVATAR_MB}MB.`,
      }));
      return;
    }

    // mantém preview e o arquivo
    lastLocalUri.current = asset.uri;
    setForm((f) => ({ ...f, avatarUri: asset.uri, avatarAsset: asset }));
  }

  async function handleRemoveAvatar() {
    if (saving || !form.avatarUri) return;
    setErrors({});
    setFlash("", "");
    setSaving(true);
    try {
      const fd = buildFormData({ removeAvatar: true });
      const resp = await http.patch("users/me/", fd);

      setForm((f) => ({ ...f, avatarUri: "", avatarAsset: null }));
      await refreshUser();
      setFlash("success", "Foto removida com sucesso.");
    } catch (e) {
      const st = e?.response?.status;
      if (st === 413) {
        setFlash(
          "danger",
          `Arquivo muito grande. Tamanho máximo: ${MAX_AVATAR_MB}MB.`
        );
      } else {
        setFlash("danger", "Falha ao remover a foto. Tente novamente.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit() {
    if (saving) return;
    setErrors({});
    setFlash("", "");

    const clientErrs = validateClient();
    if (Object.keys(clientErrs).length) {
      setErrors(clientErrs);
      setFlash("danger", "Corrija os campos destacados.", 3000);
      return;
    }

    const fd = buildFormData();

    // nada a enviar?
    if (![...fd.keys()].length) {
      setFlash("warning", "Nenhuma alteração para salvar.", 2000);
      return;
    }

    setSaving(true);
    try {
      const resp = await http.patch("users/me/", fd);

      if (resp?.data?.reauth_required) {
        setFlash(
          "success",
          "Senha alterada com sucesso. Você será redirecionado para o login.",
          1200
        );
        setTimeout(() => {
          logout();
          nav.reset({ index: 0, routes: [{ name: "Login" }] });
        }, 1300);
        return;
      }

      setFlash("success", "Perfil atualizado com sucesso.");
      setForm((f) => ({
        ...f,
        current_password: "",
        password: "",
        password2: "",
        avatarAsset: null,
        avatarUri: resp?.data?.avatar || f.avatarUri,
      }));
      await refreshUser();
    } catch (err) {
      const st = err?.response?.status;
      const data = err?.response?.data;
      if (st === 400 && data && typeof data === "object") {
        const normalized = {};
        Object.entries(data).forEach(([k, v]) => {
          normalized[k] = Array.isArray(v) ? v.join(" ") : String(v);
        });
        setErrors(normalized);
        setFlash("danger", "Corrija os campos destacados.");
      } else if (st === 401) {
        setFlash("danger", "Sessão expirada. Faça login novamente.", 1200);
        setTimeout(() => {
          logout();
          nav.reset({ index: 0, routes: [{ name: "Login" }] });
        }, 1300);
      } else if (st === 413) {
        setFlash(
          "danger",
          `Arquivo muito grande. Tamanho máximo: ${MAX_AVATAR_MB}MB.`
        );
      } else {
        setFlash("danger", "Falha ao salvar. Tente novamente.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.bgPage }}
      contentContainerStyle={{ paddingBottom: bottom + 16 }}
    >
      {/* Título centralizado, seguindo padrão das outras páginas */}
      <Text style={[styles.pageTitle, { paddingTop: top + 8 }]}>
        Meu Perfil
      </Text>

      {/* Alerta/flash (mesmo bloco visual do cadastro) */}
      {!!message && (
        <View
          style={[
            styles.alert,
            variant === "danger" && { backgroundColor: "rgba(220,53,69,0.25)" },
            variant === "success" && {
              backgroundColor: "rgba(22,163,74,0.25)",
            },
            variant === "warning" && {
              backgroundColor: "rgba(255,193,7,0.25)",
            },
            variant === "info" && { backgroundColor: "rgba(255,255,255,0.18)" },
          ]}
        >
          <Text style={styles.alertTxt}>{message}</Text>
        </View>
      )}

      {/* Card gradiente “container-gradient” */}
      <LinearGradient
        colors={[Colors.gradA, Colors.gradB]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientCard}
      >
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : (
          <>
            {/* Email / Role (somente leitura) */}
            <View style={styles.row}>
              <View style={[styles.col, { marginRight: Space.sm }]}>
                <Text style={styles.label}>E-mail</Text>
                <TextInput
                  style={[styles.input, { opacity: 0.8 }]}
                  editable={false}
                  value={form.email}
                />
                <Text style={{ color: "rgba(255,255,255,0.85)", marginTop: 4 }}>
                  E-mail não pode ser alterado aqui.
                </Text>
              </View>
              <View style={[styles.col, { marginLeft: Space.sm }]}>
                <Text style={styles.label}>Função</Text>
                <TextInput
                  style={[styles.input, { opacity: 0.8 }]}
                  editable={false}
                  value={form.role}
                />
              </View>
            </View>

            {/* Troca de senha */}
            <View style={[styles.row, { marginTop: Space.md }]}>
              <View style={[styles.col, { marginRight: Space.sm }]}>
                <Text style={styles.label}>Senha atual</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.current_password && styles.inputErr,
                  ]}
                  secureTextEntry
                  value={form.current_password}
                  onChangeText={(v) =>
                    setForm((f) => ({ ...f, current_password: v }))
                  }
                  placeholder="Obrigatória ao trocar a senha"
                  placeholderTextColor="rgba(255,255,255,0.8)"
                  autoCapitalize="none"
                />
                {!!errors.current_password && (
                  <Text style={styles.errTxt}>{errors.current_password}</Text>
                )}
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Nova senha</Text>
                <TextInput
                  style={[styles.input, errors.password && styles.inputErr]}
                  secureTextEntry
                  value={form.password}
                  onChangeText={(v) => setForm((f) => ({ ...f, password: v }))}
                  placeholder="Deixe em branco para não alterar"
                  placeholderTextColor="rgba(255,255,255,0.8)"
                  autoCapitalize="none"
                />
                {!!errors.password && (
                  <Text style={styles.errTxt}>{errors.password}</Text>
                )}
              </View>
              <View style={[styles.col, { marginLeft: Space.sm }]}>
                <Text style={styles.label}>Confirmar nova senha</Text>
                <TextInput
                  style={[styles.input, errors.password2 && styles.inputErr]}
                  secureTextEntry
                  value={form.password2}
                  onChangeText={(v) => setForm((f) => ({ ...f, password2: v }))}
                  placeholder="Repita a senha"
                  placeholderTextColor="rgba(255,255,255,0.8)"
                  autoCapitalize="none"
                />
                {!!errors.password2 && (
                  <Text style={styles.errTxt}>{errors.password2}</Text>
                )}
              </View>
            </View>

            {/* Avatar */}
            <View
              style={[
                styles.row,
                { alignItems: "center", marginTop: Space.lg },
              ]}
            >
              <View style={{ marginRight: Space.md }}>
                {form.avatarUri ? (
                  <Image
                    source={{ uri: form.avatarUri }}
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 48,
                      backgroundColor: "#fff",
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 48,
                      backgroundColor: "#e9ecef",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: "#6c757d", fontSize: 12 }}>
                      sem foto
                    </Text>
                  </View>
                )}
              </View>

              <View style={[styles.col]}>
                <Text style={styles.label}>Foto de perfil</Text>

                <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                  <Pressable onPress={pickAvatar} style={styles.btnWhite}>
                    <Text style={styles.btnWhiteTxt}>Selecionar foto</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleRemoveAvatar}
                    style={[
                      styles.btnWhite,
                      { borderColor: "rgba(255,255,255,0.6)" },
                    ]}
                    disabled={saving || !form.avatarUri}
                  >
                    <Text style={styles.btnWhiteTxt}>Remover foto</Text>
                  </Pressable>
                </View>

                {!!errors.avatar && (
                  <Text style={styles.errTxt}>{errors.avatar}</Text>
                )}
                <Text style={{ color: "rgba(255,255,255,0.85)", marginTop: 6 }}>
                  JPG/PNG/WEBP, até {MAX_AVATAR_MB}MB.
                </Text>
              </View>
            </View>

            {/* Botão salvar */}
            <View style={[styles.actions, { marginTop: Space.lg }]}>
              <View />
              <Pressable
                onPress={onSubmit}
                style={styles.btnPrimary}
                disabled={saving}
              >
                <Text style={styles.btnPrimaryTxt}>
                  {saving ? "Salvando..." : "Salvar alterações"}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </LinearGradient>
    </ScrollView>
  );
}

/* === estilos (alinhados com as outras telas móveis) === */
const styles = StyleSheet.create({
  pageTitle: {
    color: Colors.ink,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    paddingHorizontal: Space.lg,
    marginBottom: 4,
  },
  alert: {
    marginHorizontal: Space.lg,
    borderRadius: Radius.md,
    padding: 10,
    marginBottom: Space.md,
  },
  alertTxt: { color: "#fff" },

  gradientCard: {
    marginHorizontal: Space.lg,
    padding: Space.lg,
    borderRadius: Radius.lg,
    shadowColor: "rgba(0,0,0,0.12)",
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 6,
  },

  label: { color: "rgba(255,255,255,0.9)", marginBottom: 6, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    borderRadius: Radius.md,
    padding: 12,
    color: Colors.white,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  inputErr: { borderColor: "#ffd1d6", backgroundColor: "rgba(255,0,0,0.06)" },
  errTxt: { color: "#ffd1d6", marginTop: 6 },

  row: { flexDirection: "row" },
  col: { flex: 1 },

  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  btnPrimary: {
    backgroundColor: Colors.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
  },
  btnPrimaryTxt: { color: Colors.ink, fontWeight: "800" },

  btnWhite: {
    borderWidth: 1,
    borderColor: Colors.white,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
  },
  btnWhiteTxt: { color: Colors.white, fontWeight: "700" },
});
