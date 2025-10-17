// App.js
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import React, { useRef } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useFonts } from "expo-font";
import { FontAwesome5 } from "@expo/vector-icons";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import useAuthReauthRedirectMobile from "@/hooks/useAuthReauthRedirectMobile";
import DrawerContent from "@/components/SidebarDrawer";
import AppHeader from "@/components/AppHeader";

import {
  HomeScreen,
  LoginScreen,
  PerfilScreen,
  EncarregadoScreen,
  PlaceholderScreen,
  CadastroUsuarioScreen,
  DocumentosScreen,
  ChecklistScreen,
} from "@/screens";

import { enableLayoutAnimationAndroid } from "@/utils/enableLayoutAnimationAndroid";
enableLayoutAnimationAndroid();

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

/* ===============================================
   Navegação principal (Drawer)
   =============================================== */
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
        component={ChecklistScreen}
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
        component={DocumentosScreen}
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

/* ===============================================
   Stack para login e autenticação
   =============================================== */
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LoginScreen" component={LoginScreen} />
    </Stack.Navigator>
  );
}

/* ===============================================
   RootSwitch — controla se mostra login ou app
   =============================================== */
function RootSwitch() {
  const { user, loading } = useAuth();

  // ✅ hook agora é chamado aqui, dentro do Provider e com ref global
  useAuthReauthRedirectMobile(15);

  if (loading) return null; // poderia exibir Splash futuramente
  return user ? <AppDrawer /> : <AuthStack />;
}

/* ===============================================
   App principal
   =============================================== */
export default function App() {
  const navigationRef = useRef(null);
  const [fontsLoaded] = useFonts({ ...FontAwesome5.font });
  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationContainer>
            <RootSwitch />
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
