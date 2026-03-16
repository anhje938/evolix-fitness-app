import { DarkOceanBackground } from "@/components/DarkOceanBackground";
import NavButtons from "@/components/exercise/NavigationButtons";
import ExerciseTab from "@/components/exercise/sub-tabs/ExerciseTab";
import OverviewTab from "@/components/exercise/sub-tabs/OverviewTab";
import ProgramTab from "@/components/exercise/sub-tabs/ProgramTab";
import ProgressTab from "@/components/exercise/sub-tabs/ProgressTab";
import { WorkoutTab } from "@/components/exercise/sub-tabs/WorkoutTab";
import { TrainingTabsProvider } from "@/context/trainingTabsContext";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type PageKey =
  | "overview"
  | "programs"
  | "exercises"
  | "workouts"
  | "progression";

function ExerciseContent() {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState<PageKey>("overview");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null
  );
  const [showExerciseReturn, setShowExerciseReturn] = useState(false);
  const [keepExerciseTabMounted, setKeepExerciseTabMounted] = useState(false);

  const handleSetPage = useCallback((nextPage: PageKey) => {
    setPage(nextPage);

    if (nextPage !== "progression") {
      setShowExerciseReturn(false);
    }

    if (nextPage !== "exercises" && nextPage !== "progression") {
      setKeepExerciseTabMounted(false);
    }
  }, []);

  const goToProgressionWithExercise = useCallback((id: string) => {
    setSelectedExerciseId(id);
    setKeepExerciseTabMounted(true);
    setShowExerciseReturn(true);
    setPage("progression");
  }, []);

  const handleReturnToExercises = useCallback(() => {
    setShowExerciseReturn(false);
    setPage("exercises");
  }, []);

  const shouldRenderExerciseTab = page === "exercises" || keepExerciseTabMounted;

  return (
    <DarkOceanBackground style={[styles.container, { paddingTop: insets.top + 6 }]}>
      <NavButtons setPage={handleSetPage} page={page} />

      {page === "overview" && <OverviewTab />}

      {shouldRenderExerciseTab && (
        <View
          pointerEvents={page === "exercises" ? "auto" : "none"}
          style={[
            styles.pageWrap,
            page === "exercises" ? styles.pageVisible : styles.pageHidden,
          ]}
        >
          <ExerciseTab onPressExercise={goToProgressionWithExercise} />
        </View>
      )}

      {page === "progression" && (
        <>
          <ProgressTab
            selectedExerciseId={selectedExerciseId}
            onSelectExercise={setSelectedExerciseId}
          />
          {showExerciseReturn && (
            <Pressable
              onPress={handleReturnToExercises}
              style={styles.returnButton}
            >
              <Ionicons name="chevron-back" size={18} color="#ffffff" />
              <Text style={styles.returnLabel}>Til øvelser</Text>
            </Pressable>
          )}
        </>
      )}

      {page === "workouts" && <WorkoutTab />}
      {page === "programs" && <ProgramTab />}
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
