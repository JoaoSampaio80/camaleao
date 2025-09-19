// src/screens/placeholder/PlaceholderScreen.jsx
import { View, Text } from "react-native";

export default function PlaceholderScreen({ route }) {
  const title = route?.name ?? "Em breve";
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 18 }}>{title}</Text>
    </View>
  );
}
