import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  FlatList,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome5 } from "@expo/vector-icons";
import { Colors, Radius, Space, CardSize } from "@/theme/tokens";
import { getMe, logout } from "@/api/auth";

const CARDS = [
  { key: "Encarregado", icon: "user-shield", route: "ENCARREGADO" },
  { key: "Monitoramento", icon: "user-secret", route: "MONITORAMENTO" },
  { key: "Checklist", icon: "clipboard-check", route: "CHECKLIST" },
  { key: "Documentos", icon: "file-alt", route: "DOCUMENTOS" },
  { key: "Dashboards", icon: "tachometer-alt", route: "DASHBOARD" },
  { key: "Inventário de Dados", icon: "database", route: "INVENTARIO" },
  {
    key: "Matriz de Risco",
    icon: "exclamation-triangle",
    route: "MATRIZ_RISCO",
  },
  { key: "Relatórios", icon: "chart-line", route: "RELATORIOS" },
  { key: "Notificação", icon: "bell", route: "NOTIFICACOES" },
];

export default function HomeScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const [me, setMe] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setMe(await getMe());
      } catch {}
    })();
  }, []);

  const numColumns = useMemo(() => {
    if (width <= 520) return 1;
    if (width <= 992) return 2;
    return 3;
  }, [width]);

  async function onLogout() {
    await logout();
    navigation.replace("Login");
  }

  return (
    <View style={s.root}>
      <LinearGradient
        colors={[Colors.gradA, Colors.gradB]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.navbar}
      >
        <Text style={s.navTitle}>Dashboard</Text>
        <Pressable onPress={onLogout} style={s.outBtn}>
          <Text style={s.outTxt}>Sair</Text>
        </Pressable>
      </LinearGradient>

      <View style={s.content}>
        <View style={s.center}>
          <FlatList
            data={CARDS}
            keyExtractor={(it) => it.key}
            numColumns={numColumns}
            columnWrapperStyle={
              numColumns > 1
                ? { justifyContent: "center", gap: Space.md }
                : undefined
            }
            contentContainerStyle={{ gap: Space.md }}
            renderItem={({ item }) => (
              <Pressable style={s.cardWrap}>
                <LinearGradient
                  colors={[Colors.gradA, Colors.gradB]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.card}
                >
                  <FontAwesome5
                    name={item.icon}
                    size={20}
                    color={Colors.white}
                    style={{ marginBottom: 8 }}
                  />
                  <Text style={s.cardTitle}>{item.key}</Text>
                </LinearGradient>
              </Pressable>
            )}
          />
        </View>
        <Text style={s.greet}>
          {me
            ? `Olá, ${
                me?.first_name || me?.username || me?.email || "usuário"
              }!`
            : "Carregando..."}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgPage },
  navbar: {
    paddingTop: 54,
    paddingBottom: 16,
    paddingHorizontal: Space.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navTitle: { color: Colors.white, fontSize: 20, fontWeight: "700" },
  outBtn: {
    backgroundColor: Colors.danger,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.sm,
  },
  outTxt: { color: Colors.white, fontWeight: "600" },

  content: { flex: 1, padding: Space.lg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  cardWrap: { width: CardSize.base, height: CardSize.base },
  card: {
    flex: 1,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(0,0,0,0.18)",
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 5,
  },
  cardTitle: {
    color: Colors.white,
    textAlign: "center",
    maxWidth: "95%",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 16,
  },
  greet: { textAlign: "center", color: Colors.text, marginTop: Space.md },
});
