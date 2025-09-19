// components/SidebarDrawer.jsx
import { View, Text, Pressable, StyleSheet } from "react-native";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { useNavigationState } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome5 } from "@expo/vector-icons";
import { Colors, Radius, Space } from "@/theme/tokens";
import { useAuth } from "@/context/AuthContext";

/** label do papel igual web */
const ROLE_LABEL = {
  admin: "Administrador",
  dpo: "DPO",
  gerente: "Gerente",
};

const NAV_ITEMS = [
  { label: "Dashboards", icon: "tachometer-alt", route: "DASHBOARDS" },
  { label: "Relatórios", icon: "chart-line", route: "RELATORIOS" },
  { label: "Checklist", icon: "clipboard-check", route: "CHECKLIST" },
  { label: "Notificação", icon: "bell", route: "NOTIFICACOES" },
  { label: "Encarregado", icon: "user-shield", route: "ENCARREGADO" },
  { label: "Monitoramento", icon: "user-secret", route: "MONITORAMENTO" },
  { label: "Documentos", icon: "file-alt", route: "DOCUMENTOS" },
  {
    label: "Inventário de Dados",
    icon: "database",
    route: "INVENTARIO",
  },
  { label: "Lista Inventários", icon: "list", route: "LISTA_INVENTARIO" },
  {
    label: "Matriz de Risco",
    icon: "exclamation-triangle",
    route: "MATRIZ_RISCO",
  },
  {
    label: "Cadastro de Usuário",
    icon: "user-plus",
    route: "CADASTRO_USUARIO",
    adminOnly: true,
  },
  { label: "Meu Perfil", icon: "user", route: "PERFIL" },
];

export default function SidebarDrawer(props) {
  const { navigation } = props;
  const { user, loading } = useAuth();
  const { top } = useSafeAreaInsets();

  const isAdmin = !!user && user.role === "admin";
  const filtered = NAV_ITEMS.filter(
    (it) => !it.adminOnly || (!loading && isAdmin)
  );

  // rota ativa (nome da screen atual no Drawer)
  const drawerState = useNavigationState((state) => state);
  const activeRouteName =
    drawerState?.routeNames?.[drawerState?.index ?? 0] || "Home";

  const userName = loading ? "Carregando..." : user?.first_name || "-";
  const userEmail = loading ? "carregando..." : user?.email || "-";
  const userRoleLabel = loading ? "" : ROLE_LABEL[user?.role] || "";

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{ paddingTop: 0 }}
    >
      {/* Safe area no cabeçalho */}
      <View style={[s.header, { paddingTop: top + 8 }]}>
        <Text style={s.headerBrand}>Gestão de Documentos</Text>

        {!loading && (
          <View style={s.userBox}>
            <Text style={s.userName}>
              {userName}
              {!!userRoleLabel && (
                <Text style={s.rolePill}> {userRoleLabel}</Text>
              )}
            </Text>
            <Text style={s.userEmail}>{userEmail}</Text>
          </View>
        )}
      </View>

      {/* Links */}
      <View style={{ padding: Space.md }}>
        {filtered.map((item) => {
          const active = activeRouteName === item.route;
          return (
            <Pressable
              key={item.route}
              onPress={() => {
                navigation.navigate(item.route);
                navigation.closeDrawer();
              }}
              style={({ pressed }) => [
                s.link,
                active && s.linkActive,
                pressed &&
                  !active && { opacity: 0.9, transform: [{ scale: 0.997 }] },
              ]}
            >
              <FontAwesome5
                name={item.icon}
                size={16}
                color={active ? Colors.white : Colors.ink}
                style={{ marginRight: 10 }}
              />
              <Text
                style={[s.linkTxt, active && s.linkTxtActive]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </DrawerContentScrollView>
  );
}

const s = StyleSheet.create({
  header: {
    paddingBottom: 12,
    paddingHorizontal: Space.md,
    backgroundColor: Colors.gradB,
  },
  headerBrand: {
    color: "white",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  userBox: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  userName: { color: "white", fontWeight: "700", marginBottom: 2 },
  rolePill: {
    color: "#0a2450",
    backgroundColor: "#fff",
    borderRadius: 999,
    overflow: "hidden",
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  userEmail: { color: "white", opacity: 0.9, fontSize: 12 },

  link: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    marginBottom: 6,
    backgroundColor: "#f2f6ff",
  },
  linkActive: {
    backgroundColor: Colors.gradA,
  },
  linkTxt: { color: Colors.ink, fontWeight: "600" },
  linkTxtActive: { color: Colors.white, fontWeight: "700" },
});
