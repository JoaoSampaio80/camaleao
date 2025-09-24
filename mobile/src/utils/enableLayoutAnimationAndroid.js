import { Platform, UIManager } from "react-native";

export function enableLayoutAnimationAndroid() {
  // Em Android (bridge antigo) precisa habilitar; em Fabric vira no-op
  if (
    Platform.OS === "android" &&
    UIManager.setLayoutAnimationEnabledExperimental
  ) {
    try {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    } catch {}
  }
}
