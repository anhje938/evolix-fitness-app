import { WorkoutSessionOverlay } from "@/components/exercise/sub-tabs/session-overlay/WorkoutSessionOverlay";
import {
  GLOBAL_IOS_KEYBOARD_ACCESSORY_ID,
  GlobalKeyboardAccessory,
} from "@/components/common/GlobalKeyboardAccessory";
import { queryClient } from "@/config/queryClient";
import { AuthProvider, useAuth } from "@/context/AuthProvider";
import { UserSettingsProvider } from "@/context/UserSettingsProvider";
import {
  WorkoutSessionProvider,
  useWorkoutSession,
} from "@/context/workoutSessionContext";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import * as SecureStore from "expo-secure-store";
import { Stack } from "expo-router";
import { useEffect, useRef } from "react";
import { Keyboard, Platform, TextInput } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore if splash was already handled (e.g. fast refresh).
});

function AuthStateCleanup() {
  const { token, authReady } = useAuth();
  const { closeSession } = useWorkoutSession();
  const previousTokenRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!authReady) return;

    const previousToken = previousTokenRef.current;
    previousTokenRef.current = token;

    if (!previousToken || token) return;

    closeSession();
    queryClient.clear();
    void SecureStore.deleteItemAsync("user_settings");
  }, [authReady, closeSession, token]);

  return null;
}

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

  useEffect(() => {
    if (Platform.OS !== "ios") return;

    const textInput = TextInput as typeof TextInput & {
      defaultProps?: Record<string, unknown>;
    };

    textInput.defaultProps = {
      ...(textInput.defaultProps ?? {}),
      inputAccessoryViewID: GLOBAL_IOS_KEYBOARD_ACCESSORY_ID,
      returnKeyType: "done",
      onSubmitEditing: () => Keyboard.dismiss(),
    };
  }, []);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <WorkoutSessionProvider>
            <UserSettingsProvider>
              <AuthStateCleanup />
              <Stack screenOptions={{ headerShown: false }} />
              <WorkoutSessionOverlay />
              <GlobalKeyboardAccessory />
            </UserSettingsProvider>
          </WorkoutSessionProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
