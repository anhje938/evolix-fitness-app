import { WorkoutSessionOverlay } from "@/components/exercise/sub-tabs/session-overlay/WorkoutSessionOverlay";
import { getTodayFocus } from "@/api/adaptive";
import {
  GLOBAL_IOS_KEYBOARD_ACCESSORY_ID,
  GlobalKeyboardAccessory,
} from "@/components/common/GlobalKeyboardAccessory";
import { getCompletedWorkouts } from "@/api/exercise/completedWorkouts";
import { getExercisesForUser } from "@/api/exercise/exercise";
import { GetProgramsForUser } from "@/api/exercise/program";
import { GetWorkouts } from "@/api/exercise/workout";
import { fetchMyUser } from "@/api/user";
import { queryClient, queryStaleTimes } from "@/config/queryClient";
import { RegistrationOnboardingModal } from "@/components/settings/RegistrationOnboardingModal";
import { AuthProvider, useAuth } from "@/context/AuthProvider";
import { SubscriptionProvider } from "@/context/SubscriptionProvider";
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
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import * as SecureStore from "expo-secure-store";
import { Stack } from "expo-router";
import { useEffect, useRef } from "react";
import { InteractionManager, Keyboard, Platform, TextInput } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { myUserQueryKey } from "@/hooks/useMyUser";

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

function AppDataPrefetcher() {
  const { authReady, token } = useAuth();
  const client = useQueryClient();

  useEffect(() => {
    if (!authReady || !token) return;

    const task = InteractionManager.runAfterInteractions(() => {
      void Promise.allSettled([
        client.prefetchQuery({
          queryKey: myUserQueryKey,
          queryFn: () => fetchMyUser(token),
          staleTime: queryStaleTimes.long,
        }),
        client.prefetchQuery({
          queryKey: ["completedWorkouts"],
          queryFn: getCompletedWorkouts,
          staleTime: queryStaleTimes.short,
        }),
        client.prefetchQuery({
          queryKey: ["exercises"],
          queryFn: getExercisesForUser,
          staleTime: queryStaleTimes.long,
        }),
        client.prefetchQuery({
          queryKey: ["workouts"],
          queryFn: GetWorkouts,
          staleTime: queryStaleTimes.long,
        }),
        client.prefetchQuery({
          queryKey: ["programs"],
          queryFn: GetProgramsForUser,
          staleTime: queryStaleTimes.long,
        }),
        client.prefetchQuery({
          queryKey: ["adaptive", "today"],
          queryFn: getTodayFocus,
          staleTime: queryStaleTimes.short,
        }),
      ]);
    });

    return () => {
      task.cancel();
    };
  }, [authReady, client, token]);

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
          <SubscriptionProvider>
            <WorkoutSessionProvider>
              <UserSettingsProvider>
                <AuthStateCleanup />
                <AppDataPrefetcher />
                <Stack screenOptions={{ headerShown: false }} />
                <WorkoutSessionOverlay />
                <RegistrationOnboardingModal />
                <GlobalKeyboardAccessory />
              </UserSettingsProvider>
            </WorkoutSessionProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
