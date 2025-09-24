// src/screens/PerfilScreen.jsx
import React, { useEffect, useRef, useState } from "react";
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
import { Colors, Radius, Space } from "@/theme/tokens";
import { http } from "@/api/http";
import { useAuth } from "@/context/AuthContext";

const MAX_AVATAR_MB = 5;
const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// config para garantir multipart no RN + não transformar o body
const multipartCfg = {
  headers: { "Content-Type": "multipart/form-data" },
  transformRequest: (data) => data,
};

export default function PerfilScreen() {
  const { top, bottom } = useSafeAreaInsets();
  const { refreshUser, logout, authTokens } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [kind, setKind] = useState(""); // success | danger | warning
  const [errors, setErrors] = useState({});
  const [avatarError, setAvatarError] = useState(false);
  const [form, setForm] = useState({
    email: "",
    role: "",
    current_password: "",
    password: "",
    password2: "",
    avatar: null,
    avatar_url: "",
  });

  // (compat) usado no web para revogar blob URLs; aqui fica inócuo mas mantemos a estrutura
  const objectUrlRef = useRef(null);
  const revokeLocalPreview = () => {
    if (objectUrlRef.current) {
      try {
        URL.revokeObjectURL(objectUrlRef.current);
      } catch {}
      objectUrlRef.current = null;
    }
  };

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
          avatar: null,
          avatar_url: data?.avatar || "",
        }));
      } catch {
        if (!mounted) return;
        setKind("danger");
        setMessage("Falha ao carregar seu perfil.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => revokeLocalPreview();
  }, []);

  function setField(name, value) {
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
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

  function buildFormData({ removeAvatar = false } = {}) {
    const fd = new FormData();
    const wants = !!(form.password || form.password2);
    if (wants) {
      fd.append("current_password", form.current_password);
      fd.append("password", form.password);
      const refresh = authTokens?.refresh;
      if (refresh) fd.append("refresh", refresh);
    }
    if (form.avatar) {
      fd.append("avatar", form.avatar);
    } else if (removeAvatar) {
      fd.append("remove_avatar", "true");
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

    // tamanhos do ImagePicker podem vir em fileSize/size (varia por SO)
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
    revokeLocalPreview();
    setErrors((p) => ({ ...p, avatar: undefined }));
    setAvatarError(false);
    setForm((p) => ({
      ...p,
      avatar: {
        uri: a.uri,
        type: a.mimeType || "image/jpeg",
        name: a.fileName || "avatar.jpg",
      },
      avatar_url: a.uri,
    }));
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

    revokeLocalPreview();
    setErrors((p) => ({ ...p, avatar: undefined }));
    setAvatarError(false);
    setForm((p) => ({
      ...p,
      avatar: {
        uri: a.uri,
        type: a.mimeType || "image/jpeg",
        name: a.fileName || "avatar.jpg",
      },
      avatar_url: a.uri,
    }));
  }

  function choosePhoto() {
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

  async function handleRemoveAvatar() {
    if (saving) return;
    setMessage("");
    setKind("");
    setErrors({});
    setSaving(true);
    try {
      const fd = buildFormData({ removeAvatar: true });
      await http.patch("users/me/", fd, multipartCfg); // <- garante multipart
      setKind("success");
      setMessage("Foto removida com sucesso.");
      revokeLocalPreview();
      setAvatarError(false);
      setForm((p) => ({ ...p, avatar: null, avatar_url: "" }));
      await refreshUser();
      setTimeout(() => {
        setKind("");
        setMessage("");
      }, 2500);
    } catch (e) {
      const st = e?.response?.status;
      setKind("danger");
      setMessage(
        st === 413
          ? `Arquivo muito grande. Tamanho máximo: ${MAX_AVATAR_MB}MB.`
          : "Falha ao remover a foto. Tente novamente."
      );
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit() {
    if (saving) return;
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
    const hasAvatarUpload = !!form.avatar;
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
      const resp = await http.patch("users/me/", fd, multipartCfg); // <- garante multipart

      if (resp?.data?.reauth_required) {
        setKind("success");
        setMessage(
          "Senha alterada com sucesso. Você será redirecionado para o login."
        );
        setTimeout(() => logout(), 1500);
        return;
      }

      setKind("success");
      setMessage("Perfil atualizado com sucesso.");
      setForm((p) => ({
        ...p,
        current_password: "",
        password: "",
        password2: "",
        avatar: null,
        avatar_url: resp?.data?.avatar || p.avatar_url,
      }));
      revokeLocalPreview();
      await refreshUser();
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
        {/* Título */}
        <Text style={[styles.pageTitle, { paddingTop: top + 8 }]}>
          Meu Perfil
        </Text>

        {/* bloco em gradiente */}
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

          {/* Senha atual */}
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

          {/* Nova senha */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Nova senha</Text>
            <TextInput
              style={[styles.inputLight, errors.password && styles.inputErr]}
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

          {/* Confirmar nova senha */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Confirmar nova senha</Text>
            <TextInput
              style={[styles.inputLight, errors.password2 && styles.inputErr]}
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

          {/* Avatar + ações centralizadas */}
          <Text
            style={[styles.label, { marginTop: Space.md, textAlign: "center" }]}
          >
            Foto de perfil
          </Text>

          <View style={styles.avatarCenterBlock}>
            {form?.avatar_url && !avatarError ? (
              <Image
                source={{ uri: form.avatar_url }}
                style={styles.avatar}
                resizeMode="cover"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarPlaceholderText}>sem foto</Text>
              </View>
            )}

            <View style={styles.avatarButtonsRow}>
              <Pressable onPress={choosePhoto} style={styles.btnHollow}>
                <Text style={styles.btnHollowTxt}>Selecionar foto</Text>
              </Pressable>

              <Pressable
                onPress={handleRemoveAvatar}
                style={[styles.btnHollow, { borderColor: "#b91c1c" }]}
                disabled={saving || !form?.avatar_url}
              >
                <Text style={[styles.btnHollowTxt, { color: "#b91c1c" }]}>
                  Remover foto
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.helperTxt, { textAlign: "center" }]}>
              JPG/PNG/WEBP, até 5MB.
            </Text>
          </View>

          {/* Botão salvar centralizado */}
          <View style={{ alignItems: "center", marginTop: Space.md }}>
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

  fieldBlock: {
    marginBottom: Space.md,
  },

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
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#e9ecef",
    marginBottom: Space.sm,
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
  avatarButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 6,
  },

  btnHollow: {
    borderWidth: 1.5,
    borderColor: Colors.white,
    backgroundColor: "transparent",
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  btnHollowTxt: { color: Colors.white, fontWeight: "800" },

  btnPrimary: {
    backgroundColor: Colors.white,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: Radius.md,
  },
  btnPrimaryTxt: { color: Colors.ink, fontWeight: "800" },
});
