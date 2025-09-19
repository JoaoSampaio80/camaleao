import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Linking,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { http } from "@/api/http";
import { ENV } from "@/config/env";

/** === Cores e tokens “congelados” para bater 100% com o web === */
const COLORS = {
  gradA: "#003366",
  gradB: "#005b96",
  bgPage: "#f5f5f5",
  ink: "#071744",
  white: "#ffffff",
};
const RADIUS = { xl: 20, md: 12 };
const SPACE = { lg: 20, md: 14 };

/** === Helpers === */
function digitsOnly(s) {
  return (s || "").replace(/\D/g, "");
}
function maskPhoneBR(value) {
  const d = digitsOnly(value);
  if (!d) return "";
  const ddd = d.slice(0, 2);
  if (d.length <= 6) return `(${ddd}) ${d.slice(2)}`.trim();
  if (d.length <= 10) return `(${ddd}) ${d.slice(2, 6)}-${d.slice(6, 10)}`;
  return `(${ddd}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
}
function fmtBR(iso) {
  if (!iso) return "-";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(dt);
}
function buildAbsoluteUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const origin = ENV.API_URL.replace(/\/api\/v1\/?$/, "");
  const slash = path.startsWith("/") ? "" : "/";
  return `${origin}${slash}${path}`;
}

export default function EncarregadoScreen() {
  const { top, bottom } = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [dpo, setDpo] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await http.get("users/dpo/");
        const data = resp?.data || {};
        if (!mounted) return;

        const nome =
          [data.first_name, data.last_name].filter(Boolean).join(" ") ||
          data.email ||
          data.username ||
          "-";

        setDpo({
          nome,
          email: data.email || "-",
          telefone: data.phone_number || "-",
          dataNomeacao: data.appointment_date || null,
          validade: data.appointment_validity || null, // usa a da API
          avatar_url: data.avatar || "",
        });
        setErrorMsg("");
      } catch (err) {
        const st = err?.response?.status;
        const detail = err?.response?.data?.detail;
        setErrorMsg(
          st === 404
            ? "Nenhum DPO encontrado."
            : detail || "Não foi possível carregar os dados do DPO."
        );
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const safe = useMemo(
    () => ({
      avatarUrl: buildAbsoluteUrl(dpo?.avatar_url),
      nome: dpo?.nome || "-",
      email: dpo?.email || "-",
      telefone: dpo?.telefone || "-",
      dataNomeacao: dpo?.dataNomeacao || null,
      validade: dpo?.validade || null,
    }),
    [dpo]
  );

  const telDigits = digitsOnly(safe.telefone);
  const telMasked = maskPhoneBR(safe.telefone);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.bgPage }}
      contentContainerStyle={{ paddingBottom: bottom + 16 }}
    >
      {/* Título fora do gradiente (idêntico ao web) */}
      <Text style={[s.pageTitle, { paddingTop: top + 8 }]}>
        Encarregado de Proteção de Dados (DPO)
      </Text>

      {/* Bloco em gradiente (container-gradient do web) */}
      <LinearGradient
        colors={[COLORS.gradA, COLORS.gradB]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.gradientCard}
      >
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={COLORS.white} />
          </View>
        ) : errorMsg ? (
          <View style={s.alertBox}>
            <Text style={s.alertTxt}>{errorMsg}</Text>
          </View>
        ) : (
          <>
            {/* Cabeçalho: avatar + nome + badge DPO */}
            <View style={s.headerRow}>
              {safe.avatarUrl ? (
                <Image source={{ uri: safe.avatarUrl }} style={s.avatar} />
              ) : (
                <View style={[s.avatar, s.avatarFallback]}>
                  <Text style={s.avatarFallbackTxt}>sem foto</Text>
                </View>
              )}

              <View style={{ flex: 1 }}>
                <Text style={s.name}>
                  {safe.nome} <Text style={s.badge}>DPO</Text>
                </Text>
              </View>
            </View>

            <View style={s.hr} />

            {/* Coluna de dados (em RN ficam empilhados, como no web em duas colunas) */}
            <View style={s.infoBlock}>
              <Text style={s.label}>E-mail</Text>
              {safe.email !== "-" ? (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`mailto:${safe.email}`)}
                >
                  <Text style={s.valueLink}>{safe.email}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={s.value}>-</Text>
              )}
            </View>

            <View style={s.infoBlock}>
              <Text style={s.label}>Telefone</Text>
              {telDigits ? (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`tel:${telDigits}`)}
                >
                  <Text style={s.valueLink}>{telMasked}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={s.value}>-</Text>
              )}
            </View>

            <View style={s.infoBlock}>
              <Text style={s.label}>Data da nomeação</Text>
              <Text style={s.value}>
                {safe.dataNomeacao ? fmtBR(safe.dataNomeacao) : "-"}
              </Text>
            </View>

            <View style={s.infoBlock}>
              <Text style={s.label}>Validade</Text>
              <Text style={s.value}>
                {safe.validade ? fmtBR(safe.validade) : "-"}
              </Text>
            </View>
          </>
        )}
      </LinearGradient>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  pageTitle: {
    paddingHorizontal: SPACE.lg,
    paddingBottom: 8,
    color: COLORS.ink,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  gradientCard: {
    marginHorizontal: SPACE.lg,
    marginTop: SPACE.md,
    padding: SPACE.lg,
    borderRadius: RADIUS.xl,
    shadowColor: "rgba(0,0,0,0.12)",
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 6,
  },
  center: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  alertBox: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: RADIUS.md,
    padding: 12,
  },
  alertTxt: { color: COLORS.white },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  avatarFallbackTxt: { color: COLORS.white, fontSize: 12 },
  name: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  badge: {
    backgroundColor: COLORS.white,
    color: "#0a2450",
    borderRadius: 999,
    overflow: "hidden",
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontWeight: "800",
  },
  hr: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginVertical: 12,
  },
  infoBlock: { marginBottom: 12 },
  label: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginBottom: 2 },
  value: { color: COLORS.white, fontSize: 16 },
  valueLink: {
    color: COLORS.white,
    fontSize: 16,
    textDecorationLine: "underline",
    textDecorationColor: "rgba(255,255,255,0.9)",
  },
});
