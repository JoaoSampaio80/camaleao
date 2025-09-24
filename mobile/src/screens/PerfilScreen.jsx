// src/screens/PerfilScreen.jsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Radius, Space } from "@/theme/tokens";
import { http } from "@/api/http";
import { useAuth } from "@/context/AuthContext";

const MAX_AVATAR_MB = 5;
const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const multipartCfg = {
  headers: { "Content-Type": "multipart/form-data" },
  transformRequest: (data) => data,
};

export default function PerfilScreen() {
  const { top, bottom } = useSafeAreaInsets();
  const { refreshUser, logout, authTokens } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [message, setMessage] = useState("");
  const [kind, setKind] = useState(""); // success | danger | warning
  const [errors, setErrors] = useState({});
  const [avatarError, setAvatarError] = useState(false);

  // estado “servidor”: valores efetivos atuais
  const [form, setForm] = useState({
    email: "",
    role: "",
    current_password: "",
    password: "",
    password2: "",
    avatar_url: "", // URL atual vinda do servidor
  });

  // estado “temporário de edição”: pré-visualização e arquivo para envio
  const [tempAvatarUri, setTempAvatarUri] = useState(null);
  const [tempAvatarFile, setTempAvatarFile] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await http.get("users/me/");
        if (!mounted) return;
        setForm((f) => ({
          ...f,
          email: data?.email || "",
          role: data?.role || "",
          current_password: "",
          password: "",
          password2: "",
          avatar_url: data?.avatar || "",
        }));
        setAvatarError(false);
      } catch {
        if (!mounted) return;
        setKind("danger");
        setMessage("Falha ao carregar seu perfil.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {};
  }, []);

  function setField(name, value) {
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  }

  function enterEdit() {
    setKind("");
    setMessage("");
    setErrors({});
    setAvatarError(false);
    setEditing(true);
  }

  function cancelEdit() {
    // descarta qualquer avatar temporário e erros
    setTempAvatarUri(null);
    setTempAvatarFile(null);
    setAvatarError(false);
    setErrors({});
    setKind("");
    setMessage("");
    // limpa campos de senha temporários
    setForm((p) => ({
      ...p,
      current_password: "",
      password: "",
      password2: "",
    }));
    setEditing(false);
  }

  function validate() {
    const e = {};
    const wants = !!(form.password || form.password2);
    if (wants) {
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
  }

  function buildFormData() {
    const fd = new FormData();
    const wants = !!(form.password || form.password2);
    if (wants) {
      fd.append("current_password", form.current_password);
      fd.append("password", form.password);
      const refresh = authTokens?.refresh;
      if (refresh) fd.append("refresh", refresh);
    }
    if (tempAvatarFile) {
      fd.append("avatar", tempAvatarFile);
    }
    return fd;
  }

  async function pickFromLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permissão",
        "Conceda acesso às fotos para escolher um avatar."
      );
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (res.canceled) return;
    const a = res.assets?.[0];
    if (!a) return;

    const size = a.fileSize ?? a.size;
    if (size && size > MAX_AVATAR_MB * 1024 * 1024) {
      setErrors((p) => ({
        ...p,
        avatar: `Arquivo maior que ${MAX_AVATAR_MB}MB.`,
      }));
      return;
    }
    if (a.mimeType && !ACCEPTED.includes(a.mimeType)) {
      setErrors((p) => ({
        ...p,
        avatar: "Formato inválido. Use jpeg/jpg/png/webp.",
      }));
      return;
    }

    // apenas pré-visualização durante edição
    setErrors((p) => ({ ...p, avatar: undefined }));
    setAvatarError(false);
    setTempAvatarUri(a.uri);
    setTempAvatarFile({
      uri: a.uri,
      type: a.mimeType || "image/jpeg",
      name: a.fileName || "avatar.jpg",
    });
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão", "Conceda acesso à câmera para tirar a foto.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (res.canceled) return;
    const a = res.assets?.[0];
    if (!a) return;

    // apenas pré-visualização durante edição
    setErrors((p) => ({ ...p, avatar: undefined }));
    setAvatarError(false);
    setTempAvatarUri(a.uri);
    setTempAvatarFile({
      uri: a.uri,
      type: a.mimeType || "image/jpeg",
      name: a.fileName || "avatar.jpg",
    });
  }

  function choosePhoto() {
    if (!editing) return;
    if (Platform.OS === "ios") {
      import("react-native").then(({ ActionSheetIOS }) => {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ["Cancelar", "Galeria", "Câmera"],
            cancelButtonIndex: 0,
          },
          (i) => {
            if (i === 1) pickFromLibrary();
            if (i === 2) takePhoto();
          }
        );
      });
    } else {
      Alert.alert("Foto de perfil", "Escolha a origem da foto", [
        { text: "Galeria", onPress: pickFromLibrary },
        { text: "Câmera", onPress: takePhoto },
        { text: "Cancelar", style: "cancel" },
      ]);
    }
  }

  async function onSubmit() {
    if (!editing || saving) return;
    setMessage("");
    setKind("");
    setErrors({});

    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      setKind("danger");
      setMessage("Corrija os campos destacados.");
      return;
    }

    const wantsPasswordChange = !!(form.password || form.password2);
    const hasAvatarUpload = !!tempAvatarFile;
    if (!wantsPasswordChange && !hasAvatarUpload) {
      setKind("warning");
      setMessage("Nenhuma alteração para salvar.");
      setTimeout(() => {
        setKind("");
        setMessage("");
      }, 2000);
      return;
    }

    const fd = buildFormData();
    setSaving(true);
    try {
      const resp = await http.patch("users/me/", fd, multipartCfg);

      if (resp?.data?.reauth_required) {
        setKind("success");
        setMessage(
          "Senha alterada com sucesso. Você será redirecionado para o login."
        );
        setTimeout(() => logout(), 1500);
        return;
      }

      // aplica definitivamente o avatar retornado
      setKind("success");
      setMessage("Perfil atualizado com sucesso.");
      setForm((p) => ({
        ...p,
        current_password: "",
        password: "",
        password2: "",
        avatar_url: resp?.data?.avatar || p.avatar_url,
      }));
      // limpa estados temporários
      setTempAvatarUri(null);
      setTempAvatarFile(null);
      setAvatarError(false);

      await refreshUser();
      setEditing(false);

      setTimeout(() => {
        setKind("");
        setMessage("");
      }, 2500);
    } catch (err) {
      const st = err?.response?.status;
      const data = err?.response?.data;
      if (st === 400 && data && typeof data === "object") {
        const normalized = {};
        Object.entries(data).forEach(([k, v]) => {
          normalized[k] = Array.isArray(v) ? v.join(" ") : String(v);
        });
        setErrors(normalized);
        setKind("danger");
        setMessage("Corrija os campos destacados.");
      } else if (st === 401) {
        setKind("danger");
        setMessage("Sessão expirada. Faça login novamente.");
        setTimeout(() => logout(), 1500);
      } else if (st === 413) {
        setKind("danger");
        setMessage(`Arquivo muito grande. Tamanho máximo: ${MAX_AVATAR_MB}MB.`);
      } else {
        setKind("danger");
        setMessage("Falha ao salvar. Tente novamente.");
      }
    } finally {
      setSaving(false);
    }
  }

  // fonte da imagem: se estiver editando e houver preview, usa o temporário; senão, usa o atual
  const effectiveAvatarUri =
    editing && tempAvatarUri ? tempAvatarUri : form.avatar_url;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bgPage }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottom + 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.pageTitle, { paddingTop: top + 8 }]}>
          Meu Perfil
        </Text>

        <LinearGradient
          colors={[Colors.gradA, Colors.gradB]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {!!message && (
            <View
              style={[
                styles.alert,
                kind === "danger" && {
                  backgroundColor: "rgba(220,53,69,0.22)",
                },
                kind === "success" && {
                  backgroundColor: "rgba(22,163,74,0.22)",
                },
                kind === "warning" && {
                  backgroundColor: "rgba(255,255,255,0.18)",
                },
              ]}
            >
              <Text style={styles.alertTxt}>{message}</Text>
            </View>
          )}

          {/* Avatar */}
          <Text
            style={[styles.label, { marginTop: Space.xs, textAlign: "center" }]}
          >
            Foto de perfil
          </Text>

          <View style={styles.avatarCenterBlock}>
            <Pressable
              onPress={choosePhoto}
              disabled={!editing}
              style={styles.avatarWrapper}
            >
              {effectiveAvatarUri && !avatarError ? (
                <Image
                  source={{ uri: effectiveAvatarUri }}
                  style={styles.avatar}
                  resizeMode="cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarPlaceholderText}>sem foto</Text>
                </View>
              )}

              {editing && (
                <View style={styles.camBadge}>
                  <Ionicons name="camera-outline" size={18} color="#fff" />
                </View>
              )}
            </Pressable>

            {editing && (
              <Text style={[styles.helperTxt, { textAlign: "center" }]}>
                Toque para escolher da Galeria ou Câmera. JPG/PNG/WEBP, até 5MB.
              </Text>
            )}

            {!!errors.avatar && (
              <Text style={[styles.errTxt, { textAlign: "center" }]}>
                {errors.avatar}
              </Text>
            )}
          </View>

          {/* E-mail */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>E-mail</Text>
            <View style={styles.readonlyBox}>
              <Text style={styles.readonlyTxt} numberOfLines={2}>
                {form.email || "-"}
              </Text>
            </View>
            <Text style={styles.helperTxt}>
              E-mail não pode ser alterado aqui.
            </Text>
          </View>

          {/* Função */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Função</Text>
            <View style={styles.readonlyBox}>
              <Text style={styles.readonlyTxt}>{form.role || "-"}</Text>
            </View>
          </View>

          {/* Senhas (apenas edição) */}
          {editing && (
            <>
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Senha atual</Text>
                <TextInput
                  style={[
                    styles.inputLight,
                    errors.current_password && styles.inputErr,
                  ]}
                  placeholder="Obrigatória ao trocar a senha"
                  placeholderTextColor="#6b7280"
                  secureTextEntry
                  value={form.current_password}
                  onChangeText={(v) => setField("current_password", v)}
                  autoCapitalize="none"
                />
                {!!errors.current_password && (
                  <Text style={styles.errTxt}>{errors.current_password}</Text>
                )}
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Nova senha</Text>
                <TextInput
                  style={[
                    styles.inputLight,
                    errors.password && styles.inputErr,
                  ]}
                  placeholder="Deixe em branco para não alterar"
                  placeholderTextColor="#6b7280"
                  secureTextEntry
                  value={form.password}
                  onChangeText={(v) => setField("password", v)}
                  autoCapitalize="none"
                />
                {!!errors.password && (
                  <Text style={styles.errTxt}>{errors.password}</Text>
                )}
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Confirmar nova senha</Text>
                <TextInput
                  style={[
                    styles.inputLight,
                    errors.password2 && styles.inputErr,
                  ]}
                  placeholder="Repita a senha"
                  placeholderTextColor="#6b7280"
                  secureTextEntry
                  value={form.password2}
                  onChangeText={(v) => setField("password2", v)}
                  autoCapitalize="none"
                />
                {!!errors.password2 && (
                  <Text style={styles.errTxt}>{errors.password2}</Text>
                )}
              </View>
            </>
          )}

          {/* Botões centralizados */}
          <View style={styles.buttonsRowCenter}>
            {editing ? (
              <>
                <Pressable
                  onPress={onSubmit}
                  style={[styles.btnPrimary, { minWidth: 180 }]}
                  disabled={saving}
                >
                  <Text style={styles.btnPrimaryTxt}>
                    {saving ? "Salvando..." : "Salvar alterações"}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={cancelEdit}
                  style={[styles.btnHollow, { minWidth: 140 }]}
                  disabled={saving}
                >
                  <Text style={styles.btnHollowTxt}>Cancelar</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                onPress={enterEdit}
                style={[styles.btnPrimary, { minWidth: 140 }]}
                disabled={loading}
              >
                <Text style={styles.btnPrimaryTxt}>Editar</Text>
              </Pressable>
            )}
          </View>
        </LinearGradient>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    color: Colors.ink,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: Space.sm,
  },
  card: {
    marginHorizontal: Space.lg,
    marginTop: Space.md,
    padding: Space.lg,
    borderRadius: Radius.xl || 20,
    shadowColor: "rgba(0,0,0,0.12)",
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 6,
  },
  alert: {
    borderRadius: Radius.md,
    padding: 10,
    marginBottom: Space.md,
  },
  alertTxt: { color: Colors.white },

  fieldBlock: { marginBottom: Space.md },

  label: {
    color: "white",
    fontWeight: "800",
    marginBottom: 6,
    fontSize: 16,
  },

  inputLight: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.75)",
    backgroundColor: "rgba(255,255,255,0.96)",
    color: Colors.ink,
    padding: 12,
    borderRadius: Radius.md,
  },
  inputErr: { borderColor: "#ffd1d6" },
  errTxt: { color: "#ffd1d6", marginTop: 6 },

  readonlyBox: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.75)",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 48,
    justifyContent: "center",
  },
  readonlyTxt: { color: Colors.ink },

  helperTxt: { color: "rgba(255,255,255,0.9)", marginTop: 6 },

  avatarCenterBlock: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: Space.xs,
    marginBottom: Space.sm,
  },
  avatarWrapper: { position: "relative" },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "#e9ecef",
    marginBottom: Space.xs,
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPlaceholderText: {
    color: "#6c757d",
    fontSize: 12,
    fontWeight: "600",
  },
  camBadge: {
    position: "absolute",
    right: 6,
    bottom: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },

  buttonsRowCenter: {
    marginTop: Space.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    flexWrap: "wrap",
  },

  btnHollow: {
    borderWidth: 1.5,
    borderColor: Colors.white,
    backgroundColor: "transparent",
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  btnHollowTxt: {
    color: Colors.white,
    fontWeight: "800",
    textAlign: "center",
  },

  btnPrimary: {
    backgroundColor: Colors.white,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: Radius.md,
    alignItems: "center",
  },
  btnPrimaryTxt: { color: Colors.ink, fontWeight: "800", textAlign: "center" },
});
