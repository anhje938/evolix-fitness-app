import { WorkoutSessionOverlay } from "@/components/exercise/sub-tabs/session-overlay/WorkoutSessionOverlay";
import { queryClient } from "@/config/queryClient";
import { AuthProvider } from "@/context/AuthProvider";
import { UserSettingsProvider } from "@/context/UserSettingsProvider";
import { WorkoutSessionProvider } from "@/context/workoutSessionContext";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore if splash was already handled (e.g. fast refresh).
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (!fontsLoaded) return;
    SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <WorkoutSessionProvider>
          <AuthProvider>
            <UserSettingsProvider>
              <Stack screenOptions={{ headerShown: false }} />
            </UserSettingsProvider>
          </AuthProvider>
          <WorkoutSessionOverlay />
        </WorkoutSessionProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
