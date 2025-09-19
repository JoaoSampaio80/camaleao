// App.js
import "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import DrawerContent from "@/components/SidebarDrawer";
import AppHeader from "@/components/AppHeader";

// ✅ importa tudo de um único lugar (barrel)
import {
  HomeScreen,
  LoginScreen,
  EncarregadoScreen,
  PlaceholderScreen,
  CadastroUsuarioScreen,
} from "@/screens";

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

function AppDrawer() {
  return (
    <Drawer.Navigator
      initialRouteName="Home"
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{ header: (props) => <AppHeader {...props} /> }}
    >
      {/* Home (grid principal) */}
      <Drawer.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "Home" }}
      />

      {/* ====== ROTAS ALINHADAS COM SidebarDrawer.jsx ====== */}
      {/* Use PlaceholderScreen até criar as telas reais, trocando o component depois */}

      <Drawer.Screen
        name="DASHBOARDS"
        component={PlaceholderScreen}
        options={{ title: "Dashboards" }}
      />
      <Drawer.Screen
        name="RELATORIOS"
        component={PlaceholderScreen}
        options={{ title: "Relatórios" }}
      />
      <Drawer.Screen
        name="CHECKLIST"
        component={PlaceholderScreen}
        options={{ title: "Checklist" }}
      />
      <Drawer.Screen
        name="NOTIFICACOES"
        component={PlaceholderScreen}
        options={{ title: "Notificação" }}
      />

      {/* Encarregado = tela real já implementada */}
      <Drawer.Screen
        name="ENCARREGADO"
        component={EncarregadoScreen}
        options={{ title: "Encarregado" }}
      />

      <Drawer.Screen
        name="MONITORAMENTO"
        component={PlaceholderScreen}
        options={{ title: "Monitoramento" }}
      />
      <Drawer.Screen
        name="DOCUMENTOS"
        component={PlaceholderScreen}
        options={{ title: "Documentos" }}
      />
      <Drawer.Screen
        name="INVENTARIO"
        component={PlaceholderScreen}
        options={{ title: "Inventário de Dados" }}
      />
      <Drawer.Screen
        name="LISTA_INVENTARIO"
        component={PlaceholderScreen}
        options={{ title: "Lista Inventários" }}
      />
      <Drawer.Screen
        name="MATRIZ_RISCO"
        component={PlaceholderScreen}
        options={{ title: "Matriz de Risco" }}
      />
      <Drawer.Screen
        name="CADASTRO"
        component={CadastroUsuarioScreen}
        options={{ title: "Cadastro de Usuário" }}
      />
      <Drawer.Screen
        name="PERFIL"
        component={PlaceholderScreen}
        options={{ title: "Perfil" }}
      />
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
  if (loading) return null; // pode exibir um Splash aqui
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
