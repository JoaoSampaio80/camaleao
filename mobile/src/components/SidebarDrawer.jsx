// components/SidebarDrawer.jsx
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { Colors, Radius, Space } from "@/theme/tokens";

const items = [
  { label: "Encarregado", route: "Encarregado" },
  { label: "Monitoramento", route: "Monitoramento" },
  { label: "Checklist", route: "Checklist" },
  { label: "Documentos", route: "Documentos" },
  { label: "Dashboards", route: "Dashboards" },
  { label: "Inventário de Dados", route: "Inventário de Dados" },
  { label: "Matriz de Risco", route: "Matriz de Risco" },
  { label: "Relatórios", route: "Relatórios" },
  { label: "Notificação", route: "Notificação" },
];

export default function SidebarDrawer(props) {
  const { navigation } = props;
  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{ paddingTop: 0 }}
    >
      <View style={s.header}>
        <Text style={s.headerTitle}>Menu</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: Space.md }}>
        {items.map((it) => (
          <Pressable
            key={it.route}
            onPress={() => navigation.navigate(it.route)}
            style={s.link}
          >
            <Text style={s.linkTxt}>{it.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </DrawerContentScrollView>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: Colors.gradB,
    paddingHorizontal: Space.md,
    paddingVertical: 16,
  },
  headerTitle: { color: "white", fontSize: 16, fontWeight: "700" },
  link: {
    padding: 12,
    borderRadius: Radius.md,
    marginBottom: 6,
    backgroundColor: "#f2f6ff",
  },
  linkTxt: { color: Colors.ink, fontWeight: "600" },
});
