import {
  NavigationContainer,
  useNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "@/screens/LoginScreen.jsx";
import HomeScreen from "@/screens/HomeScreen.jsx";
import InactivityProvider from "@/reauth/InactivityProvider.jsx";

const Stack = createNativeStackNavigator();

export default function App() {
  const navRef = useNavigationContainerRef();

  const handleExpire = () => {
    // redireciona para Login com mensagem (mantendo padrão do seu web)
    if (navRef.isReady()) {
      navRef.reset({
        index: 0,
        routes: [
          {
            name: "Login",
            params: {
              reauthMsg:
                "Suas credenciais expiraram por inatividade. Faça login novamente.",
            },
          },
        ],
      });
    }
  };

  return (
    <NavigationContainer ref={navRef}>
      <InactivityProvider onExpire={handleExpire}>
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: "Início" }}
          />
        </Stack.Navigator>
      </InactivityProvider>
    </NavigationContainer>
  );
}
