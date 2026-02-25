import { useAuth } from "@/context/AuthProvider";
import { Redirect, Stack } from "expo-router";
import { View } from "react-native";

export default function RootLayout() {
  const { token, authReady } = useAuth();
  const shouldRedirectToTabs = !__DEV__ && !!token;

  if (!authReady) return <View style={{ flex: 1 }} />;
  if (shouldRedirectToTabs) return <Redirect href="/(tabs)/home" />;

  return <Stack screenOptions={{ headerShown: false }}></Stack>;
}
