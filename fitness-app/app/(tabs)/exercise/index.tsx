import { getCompletedWorkouts } from "@/api/exercise/completedWorkouts";
import { getExercisesForUser } from "@/api/exercise/exercise";
import {
  getExerciseHistory,
  getExerciseSetsHistory,
} from "@/api/exercise/exerchiseHistory";
import { GetProgramsForUser } from "@/api/exercise/program";
import { GetWorkouts } from "@/api/exercise/workout";
import { DarkOceanBackground } from "@/components/DarkOceanBackground";
import NavButtons from "@/components/exercise/NavigationButtons";
import ExerciseTab from "@/components/exercise/sub-tabs/ExerciseTab";
import OverviewTab from "@/components/exercise/sub-tabs/OverviewTab";
import ProgramTab from "@/components/exercise/sub-tabs/ProgramTab";
import ProgressTab from "@/components/exercise/sub-tabs/ProgressTab";
import { WorkoutTab } from "@/components/exercise/sub-tabs/WorkoutTab";
import { useAuth } from "@/context/AuthProvider";
import { TrainingTabsProvider } from "@/context/trainingTabsContext";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  InteractionManager,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type PageKey =
  | "overview"
  | "programs"
  | "exercises"
  | "workouts"
  | "progression";

function ExerciseContent() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { authReady, token } = useAuth();
  const [page, setPage] = useState<PageKey>("overview");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null
  );
  const [showExerciseReturn, setShowExerciseReturn] = useState(false);
  const [mountedPages, setMountedPages] = useState<PageKey[]>(["overview"]);

  const keepPageMounted = useCallback((nextPage: PageKey) => {
    setMountedPages((prev) =>
      prev.includes(nextPage) ? prev : [...prev, nextPage]
    );
  }, []);

  const handleSetPage = useCallback(
    (nextPage: PageKey) => {
      keepPageMounted(nextPage);
      setPage(nextPage);

      if (nextPage !== "progression") {
        setShowExerciseReturn(false);
      }
    },
    [keepPageMounted]
  );

  const goToProgressionWithExercise = useCallback(
    (id: string) => {
      keepPageMounted("exercises");
      keepPageMounted("progression");
      setSelectedExerciseId(id);
      setShowExerciseReturn(true);
      setPage("progression");

      void queryClient.prefetchQuery({
        queryKey: ["exerciseHistory", id],
        queryFn: () => getExerciseHistory(id),
        staleTime: 1000 * 60 * 5,
      });
      void queryClient.prefetchQuery({
        queryKey: ["exerciseSetsHistory", id],
        queryFn: () => getExerciseSetsHistory(id),
        staleTime: 1000 * 60 * 5,
      });
    },
    [keepPageMounted, queryClient]
  );

  const handleReturnToExercises = useCallback(() => {
    keepPageMounted("exercises");
    setShowExerciseReturn(false);
    setPage("exercises");
  }, [keepPageMounted]);

  useEffect(() => {
    if (!authReady || !token) return;

    const task = InteractionManager.runAfterInteractions(() => {
      void Promise.allSettled([
        queryClient.prefetchQuery({
          queryKey: ["completedWorkouts"],
          queryFn: getCompletedWorkouts,
          staleTime: 1000 * 60 * 2,
        }),
        queryClient.prefetchQuery({
          queryKey: ["exercises"],
          queryFn: getExercisesForUser,
          staleTime: 1000 * 60 * 10,
        }),
        queryClient.prefetchQuery({
          queryKey: ["workouts"],
          queryFn: GetWorkouts,
          staleTime: 1000 * 60 * 10,
        }),
        queryClient.prefetchQuery({
          queryKey: ["programs"],
          queryFn: GetProgramsForUser,
          staleTime: 1000 * 60 * 10,
        }),
      ]);
    });

    return () => {
      task.cancel();
    };
  }, [authReady, queryClient, token]);

  const isPageMounted = useCallback(
    (pageKey: PageKey) => mountedPages.includes(pageKey),
    [mountedPages]
  );

  const getPageStyle = useCallback(
    (pageKey: PageKey) => [
      styles.pageWrap,
      page === pageKey ? styles.pageVisible : styles.pageHidden,
    ],
    [page]
  );

  const progressionPageStyle = useMemo(
    () => [styles.pageWrap, styles.pageVisible],
    []
  );

  return (
    <DarkOceanBackground
      style={[styles.container, { paddingTop: insets.top + 6 }]}
    >
      <NavButtons setPage={handleSetPage} page={page} />

      {isPageMounted("overview") && (
        <View
          pointerEvents={page === "overview" ? "auto" : "none"}
          style={getPageStyle("overview")}
        >
          <OverviewTab />
        </View>
      )}

      {isPageMounted("exercises") && (
        <View
          pointerEvents={page === "exercises" ? "auto" : "none"}
          style={getPageStyle("exercises")}
        >
          <ExerciseTab onPressExercise={goToProgressionWithExercise} />
        </View>
      )}

      {isPageMounted("progression") && (
        <View
          pointerEvents={page === "progression" ? "auto" : "none"}
          style={page === "progression" ? progressionPageStyle : styles.pageHidden}
        >
          <ProgressTab
            selectedExerciseId={selectedExerciseId}
            onSelectExercise={setSelectedExerciseId}
          />
          {page === "progression" && showExerciseReturn && (
            <Pressable
              onPress={handleReturnToExercises}
              style={styles.returnButton}
            >
              <Ionicons name="chevron-back" size={18} color="#ffffff" />
              <Text style={styles.returnLabel}>Til ovelser</Text>
            </Pressable>
          )}
        </View>
      )}

      {isPageMounted("workouts") && (
        <View
          pointerEvents={page === "workouts" ? "auto" : "none"}
          style={getPageStyle("workouts")}
        >
          <WorkoutTab />
        </View>
      )}

      {isPageMounted("programs") && (
        <View
          pointerEvents={page === "programs" ? "auto" : "none"}
          style={getPageStyle("programs")}
        >
          <ProgramTab />
        </View>
      )}
    </DarkOceanBackground>
  );
}

export default function TrainingPage() {
  return (
    <TrainingTabsProvider>
      <ExerciseContent />
    </TrainingTabsProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageWrap: {
    flex: 1,
  },
  pageVisible: {
    display: "flex",
  },
  pageHidden: {
    display: "none",
  },
  returnButton: {
    position: "absolute",
    top: "50%",
    left: 10,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    transform: [{ translateY: -22 }],
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(7, 18, 34, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  returnLabel: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
});
