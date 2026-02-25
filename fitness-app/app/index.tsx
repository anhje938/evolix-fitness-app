import { useAuth } from "@/context/AuthProvider";
import { Redirect } from "expo-router";
import { View } from "react-native";

export default function Index() {
  const { token, authReady } = useAuth();
  const shouldAutoLogin = !__DEV__ && !!token;

  if (!authReady) return <View style={{ flex: 1 }} />;

  return <Redirect href={shouldAutoLogin ? "/(tabs)/home" : "/(auth)/sign-in"} />;
}
