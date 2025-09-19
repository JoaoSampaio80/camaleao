import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome5 } from "@expo/vector-icons";
import { Colors, Radius, Space, CardSize } from "@/theme/tokens";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "@/context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CARDS = [
  { key: "Encarregado", icon: "user-shield", route: "ENCARREGADO" },
  { key: "Monitoramento", icon: "user-secret", route: "MONITORAMENTO" },
  { key: "Checklist", icon: "clipboard-check", route: "CHECKLIST" },
  { key: "Documentos", icon: "file-alt", route: "DOCUMENTOS" },
  { key: "Dashboards", icon: "tachometer-alt", route: "DASHBOARDS" },
  { key: "Inventário de Dados", icon: "database", route: "INVENTARIO" },
  {
    key: "Matriz de Risco",
    icon: "exclamation-triangle",
    route: "MATRIZ_RISCO",
  },
  { key: "Relatórios", icon: "chart-line", route: "RELATORIOS" },
  { key: "Notificação", icon: "bell", route: "NOTIFICACOES" },
];

export default function HomeScreen() {
  const nav = useNavigation();
  const { user } = useAuth();
  const { bottom } = useSafeAreaInsets();

  return (
    <View style={s.root}>
      {/* faixa de título igual ao web (o header com menu/avtar já vem do AppHeader) */}
      <LinearGradient
        colors={[Colors.gradA, Colors.gradB]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.hero}
      >
        <Text style={s.heroTitle}>Gestão de Documentos LGPD</Text>
      </LinearGradient>

      <FlatList
        contentContainerStyle={{
          padding: Space.lg,
          paddingBottom: bottom + 12,
          rowGap: Space.md,
        }}
        data={CARDS}
        keyExtractor={(it) => it.key}
        numColumns={2} // <— fixa DUAS colunas
        columnWrapperStyle={{ justifyContent: "center", gap: Space.md }}
        ListFooterComponent={
          <Text style={[s.greet, { marginTop: Space.md }]}>
            Olá, {user?.first_name || user?.email || "usuário"}!
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={s.cardWrap}
            onPress={() => nav.navigate(item.route)}
          >
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
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgPage },
  hero: {
    paddingHorizontal: Space.lg,
    paddingVertical: 16,
    alignItems: "center",
  },
  heroTitle: {
    color: "white",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },

  cardWrap: {
    width: CardSize.base,
    height: CardSize.base,
    alignSelf: "center",
  },
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
  greet: { textAlign: "center", color: Colors.text, fontWeight: "700" },
});
