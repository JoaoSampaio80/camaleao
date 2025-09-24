// App.js
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useFonts } from "expo-font";
import { FontAwesome5 } from "@expo/vector-icons"; // use a família que você realmente usa

import { AuthProvider, useAuth } from "@/context/AuthContext";
import DrawerContent from "@/components/SidebarDrawer";
import AppHeader from "@/components/AppHeader";

// ✅ importa telas
import {
  HomeScreen,
  LoginScreen,
  EncarregadoScreen,
  PlaceholderScreen,
  CadastroUsuarioScreen,
} from "@/screens";
import PerfilScreen from "@/screens/PerfilScreen";

// ✅ habilita LayoutAnimation no Android (arquitetura antiga)
import { enableLayoutAnimationAndroid } from "@/utils/enableLayoutAnimationAndroid";
enableLayoutAnimationAndroid();

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

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
        component={PerfilScreen}
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
  if (loading) return null; // poderia exibir Splash aqui
  return user ? <AppDrawer /> : <AuthStack />;
}

export default function App() {
  // (opcional) pré-carrega a fonte de ícones pra evitar flicker
  const [fontsLoaded] = useFonts({
    ...FontAwesome5.font, // troque/adicione Ionicons.font, MaterialIcons.font, etc. se usar
  });
  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SafeAreaProvider>
          <NavigationContainer>
            <RootSwitch />
          </NavigationContainer>
        </SafeAreaProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
