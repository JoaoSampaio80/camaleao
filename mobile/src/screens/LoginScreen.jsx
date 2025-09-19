import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  UIManager,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Radius, Space } from "@/theme/tokens";
import { passwordReset } from "@/api/auth";
import { useAuth } from "@/context/AuthContext";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function LoginScreen({ navigation, route }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();

  // mensagem de reautenticação (vinda do reset por inatividade)
  const reauthMsg = route?.params?.reauthMsg;
  useEffect(() => {
    if (reauthMsg) {
      setError(reauthMsg);
      if (navigation?.setParams) navigation.setParams({ reauthMsg: undefined });
    }
  }, [reauthMsg, navigation]);

  async function onSubmit() {
    if (submitting) return;
    setError("");
    setSubmitting(true);
    Keyboard.dismiss();

    try {
      await login({
        email: (email || "").trim().toLowerCase(),
        password: pass,
      });
    } catch (e) {
      const st = e?.response?.status;
      const detail =
        e?.response?.data?.detail ||
        e?.response?.data?.error ||
        e?.response?.data?.non_field_errors?.[0] ||
        e?.message ||
        "";

      if (st === 400 || st === 401) {
        setError("Credenciais inválidas. Verifique seu e-mail e senha.");
      } else if (!e?.response) {
        setError(
          "Não foi possível conectar ao servidor. Confira sua rede e a API_URL (porta 8000)."
        );
      } else if (st >= 500) {
        setError(
          "Servidor indisponível no momento. Tente novamente em instantes."
        );
      } else {
        setError(detail || "Tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function onReset() {
    setResetMsg("");
    if (!resetEmail?.trim()) {
      setResetMsg("Informe um e-mail.");
      return;
    }
    setResetBusy(true);
    try {
      await passwordReset(resetEmail);
      setResetMsg("Se o e-mail existir, enviaremos instruções de redefinição.");
    } catch {
      setResetMsg("Se o e-mail existir, enviaremos instruções de redefinição.");
    } finally {
      setResetBusy(false);
    }
  }

  function toggleReset() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setResetOpen((v) => !v);
    setResetMsg("");
  }

  return (
    <LinearGradient
      colors={[Colors.gradA, Colors.gradB]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient
            colors={[Colors.gradA, Colors.gradB]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.brand}
          >
            <Text style={s.brandTitle}>Bem-vindo(a)!</Text>
            <Text style={s.brandText}>
              Preencha as informações abaixo para acessar a sua conta.
            </Text>
          </LinearGradient>

          <View style={s.card}>
            <Text style={s.title}>Login</Text>

            {Boolean(error) && <Text style={s.alertDanger}>{error}</Text>}

            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              placeholder="Digite seu email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />

            <Text style={[s.label, { marginTop: Space.sm }]}>Senha</Text>
            <TextInput
              style={s.input}
              placeholder="Digite sua senha"
              secureTextEntry
              value={pass}
              onChangeText={setPass}
            />

            <Pressable
              onPress={onSubmit}
              disabled={submitting}
              style={[s.btnPrimary, submitting && { opacity: 0.7 }]}
            >
              <Text style={s.btnPrimaryTxt}>
                {submitting ? "Entrando..." : "Entrar"}
              </Text>
            </Pressable>

            <Pressable onPress={toggleReset} style={s.linkBtn}>
              <Text style={s.linkTxt}>Esqueceu a senha?</Text>
            </Pressable>

            {resetOpen && (
              <View style={s.resetBox}>
                <Text style={s.resetTitle}>Recuperar senha</Text>
                {Boolean(resetMsg) && (
                  <Text style={s.alertInfo}>{resetMsg}</Text>
                )}
                <TextInput
                  style={s.input}
                  placeholder="Informe seu e-mail"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={resetEmail}
                  onChangeText={setResetEmail}
                />
                <Pressable
                  onPress={onReset}
                  style={[s.btnOutline, resetBusy && { opacity: 0.7 }]}
                  disabled={resetBusy}
                >
                  <Text style={s.btnOutlineTxt}>
                    {resetBusy ? "Enviando..." : "Enviar link"}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ink },
  scroll: { flexGrow: 1 },
  brand: {
    paddingHorizontal: Space.lg,
    paddingVertical: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 6,
  },
  brandText: {
    color: Colors.white,
    opacity: 0.9,
    textAlign: "center",
    maxWidth: 450,
  },
  card: {
    backgroundColor: Colors.white,
    margin: Space.lg,
    borderRadius: Radius.xl,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "rgba(0,0,0,0.08)",
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.ink,
    textAlign: "center",
    marginBottom: Space.md,
  },
  label: { color: "#6b7280", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: 12,
    backgroundColor: Colors.white,
  },
  btnPrimary: {
    marginTop: Space.lg,
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnPrimaryTxt: { color: Colors.white, fontWeight: "700" },
  linkBtn: { marginTop: Space.md, alignSelf: "center" },
  linkTxt: { color: Colors.ink, textDecorationLine: "underline" },
  resetBox: {
    marginTop: Space.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Space.md,
    gap: 10,
  },
  resetTitle: {
    textAlign: "center",
    fontWeight: "600",
    marginBottom: 4,
    color: Colors.text,
  },
  alertDanger: {
    color: Colors.white,
    backgroundColor: "#dc3545",
    padding: 10,
    borderRadius: 8,
    textAlign: "center",
    marginBottom: Space.md,
  },
  alertInfo: {
    color: Colors.ink,
    backgroundColor: "#e6f0ff",
    padding: 10,
    borderRadius: 8,
    textAlign: "center",
    marginBottom: Space.sm,
  },
});
