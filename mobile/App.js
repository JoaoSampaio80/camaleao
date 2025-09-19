import "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import HomeScreen from "@/screens/HomeScreen";
import DrawerContent from "@/components/SidebarDrawer";
import AppHeader from "@/components/AppHeader";
import LoginScreen from "@/screens/LoginScreen";
import { View, Text } from "react-native";

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

// Placeholder genérico (evita textos soltos e mantém o app navegável)
function Placeholder({ title }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 18 }}>{title}</Text>
    </View>
  );
}

function AppDrawer() {
  return (
    <Drawer.Navigator
      initialRouteName="Home"
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{ header: (props) => <AppHeader {...props} /> }}
    >
      <Drawer.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "Home" }}
      />

      {/* Rotas registradas com NAMES sem acento/espaço */}
      <Drawer.Screen name="ENCARREGADO" options={{ title: "Encarregado" }}>
        {() => <Placeholder title="Encarregado" />}
      </Drawer.Screen>

      <Drawer.Screen name="MONITORAMENTO" options={{ title: "Monitoramento" }}>
        {() => <Placeholder title="Monitoramento" />}
      </Drawer.Screen>

      <Drawer.Screen name="CHECKLIST" options={{ title: "Checklist" }}>
        {() => <Placeholder title="Checklist" />}
      </Drawer.Screen>

      <Drawer.Screen name="DOCUMENTOS" options={{ title: "Documentos" }}>
        {() => <Placeholder title="Documentos" />}
      </Drawer.Screen>

      <Drawer.Screen name="DASHBOARDS" options={{ title: "Dashboards" }}>
        {() => <Placeholder title="Dashboards" />}
      </Drawer.Screen>

      <Drawer.Screen
        name="INVENTARIO"
        options={{ title: "Inventário de Dados" }}
      >
        {() => <Placeholder title="Inventário de Dados" />}
      </Drawer.Screen>

      <Drawer.Screen name="MATRIZ_RISCO" options={{ title: "Matriz de Risco" }}>
        {() => <Placeholder title="Matriz de Risco" />}
      </Drawer.Screen>

      <Drawer.Screen name="RELATORIOS" options={{ title: "Relatórios" }}>
        {() => <Placeholder title="Relatórios" />}
      </Drawer.Screen>

      <Drawer.Screen name="NOTIFICACOES" options={{ title: "Notificação" }}>
        {() => <Placeholder title="Notificação" />}
      </Drawer.Screen>
    </Drawer.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

function RootSwitch() {
  const { user, loading } = useAuth();
  if (loading) return null; // aqui pode entrar um Splash/Lottie se quiser
  return user ? <AppDrawer /> : <AuthStack />;
}

export default function App() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <RootSwitch />
        </NavigationContainer>
      </SafeAreaProvider>
    </AuthProvider>
  );
}
