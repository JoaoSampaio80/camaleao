import { useState, useMemo } from "react";
import { View, Text, Pressable, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Radius, Space } from "@/theme/tokens";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useNavigation } from "@react-navigation/native"; // <— ADD
import { ENV } from "@/config/env";

function buildAbsoluteUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const origin = ENV.API_URL.replace(/\/api\/v1\/?$/, "");
  const slash = path.startsWith("/") ? "" : "/";
  return `${origin}${slash}${path}`;
}

export default function AppHeader({ route, options }) {
  const { top } = useSafeAreaInsets();
  const nav = useNavigation(); // <— ADD
  const title = options?.title ?? route?.name ?? "Home"; // <— default “Home”
  const { user, logout } = useAuth();
  const [openMenu, setOpenMenu] = useState(false);

  const initial = (
    user?.first_name?.[0] ||
    user?.email?.[0] ||
    "U"
  ).toUpperCase();
  const avatarUrl = useMemo(
    () => buildAbsoluteUrl(user?.avatar),
    [user?.avatar]
  );

  return (
    <LinearGradient
      colors={[Colors.gradA, Colors.gradB]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[s.wrap, { paddingTop: top + 8 }]}
    >
      <View style={s.left}>
        <Pressable onPress={() => nav.toggleDrawer()} style={s.iconBtn}>
          {/* <— FIX */}
          <Text style={s.iconTxt}>≡</Text>
        </Pressable>
        <Text style={s.title}>{title === "Home" ? "Home" : title}</Text>
        {/* <— mostra “Home” */}
      </View>

      <View style={s.right}>
        <Pressable onPress={() => setOpenMenu((v) => !v)} style={s.avatarTouch}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, s.avatarFallback]}>
              <Text style={s.avatarIni}>{initial}</Text>
            </View>
          )}
        </Pressable>

        {openMenu && (
          <View style={s.menu}>
            <Text style={s.menuName}>{user?.first_name || "Usuário"}</Text>
            {!!user?.email && <Text style={s.menuEmail}>{user.email}</Text>}
            {!!user?.role && <Text style={s.menuRole}>{user.role}</Text>}
            <Pressable onPress={logout} style={s.menuLogout}>
              <Text style={s.menuLogoutTxt}>Sair</Text>
            </Pressable>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  wrap: {
    paddingHorizontal: Space.md,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.md,
  },
  iconTxt: { color: "white", fontSize: 18, fontWeight: "700" },
  title: { color: "white", fontSize: 22, fontWeight: "800" },

  right: { position: "relative", flexDirection: "row", alignItems: "center" },
  avatarTouch: { padding: 4, borderRadius: 9999 },
  avatar: { width: 36, height: 36, borderRadius: 18, marginLeft: 6 },
  avatarFallback: {
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarIni: { color: "white", fontWeight: "800" },

  menu: {
    position: "absolute",
    top: 44,
    right: 0,
    minWidth: 220,
    backgroundColor: "white",
    borderRadius: Radius.lg,
    padding: 12,
    shadowColor: "rgba(0,0,0,0.2)",
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
    zIndex: 100,
  },
  menuName: { fontWeight: "700", marginBottom: 2, color: Colors.ink },
  menuEmail: { color: Colors.text, opacity: 0.85, marginBottom: 2 },
  menuRole: { color: Colors.text, opacity: 0.85, marginBottom: 10 },
  menuLogout: {
    alignSelf: "flex-start",
    backgroundColor: "#df1f4b",
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuLogoutTxt: { color: "white", fontWeight: "700" },
});
