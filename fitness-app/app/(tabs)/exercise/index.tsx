import { DarkOceanBackground } from "@/components/DarkOceanBackground";
import NavButtons from "@/components/exercise/NavigationButtons";
import ExerciseTab from "@/components/exercise/sub-tabs/ExerciseTab";
import OverviewTab from "@/components/exercise/sub-tabs/OverviewTab";
import ProgramTab from "@/components/exercise/sub-tabs/ProgramTab";
import ProgressTab from "@/components/exercise/sub-tabs/ProgressTab";
import { WorkoutTab } from "@/components/exercise/sub-tabs/WorkoutTab";

import { TrainingTabsProvider } from "@/context/trainingTabsContext";
import React, { useCallback, useState } from "react";
import { StyleSheet } from "react-native";

type PageKey =
  | "overview"
  | "programs"
  | "exercises"
  | "workouts"
  | "progression";

function ExerciseContent() {
  const [page, setPage] = useState<PageKey>("overview");

  // ✅ holder valgt exercise
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null
  );

  // ✅ ENKEL: bytt tab + sett id
  const goToProgressionWithExercise = useCallback((id: string) => {
    setSelectedExerciseId(id);
    setPage("progression");
  }, []);

  return (
    <DarkOceanBackground style={styles.container}>
      <NavButtons setPage={setPage} page={page} />

      {page === "overview" && <OverviewTab />}

      {page === "progression" && (
        <ProgressTab
          selectedExerciseId={selectedExerciseId}
          onSelectExercise={setSelectedExerciseId}
        />
      )}

      {page === "exercises" && (
        <ExerciseTab onPressExercise={goToProgressionWithExercise} />
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
  container: { paddingTop: 60 },
});
