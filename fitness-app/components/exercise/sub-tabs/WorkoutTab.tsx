// components/exercise/sub-tabs/WorkoutTab.tsx
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { newColors } from "@/config/theme";
import { typography } from "@/config/typography";

import { useExercises } from "@/hooks/useExercises";
import { useWorkouts } from "@/hooks/useWorkouts";
import type { Exercise, Workout } from "@/types/exercise";

import { AddWorkoutModal } from "@/components/exercise/sub-tabs/workout/AddWorkoutModal";
import { EditWorkoutModal } from "@/components/exercise/sub-tabs/workout/EditWorkoutModal";

import {
  DeleteWorkoutForUser,
  PostWorkoutForUser,
  UpdateWorkoutForUser,
} from "@/api/exercise/workout";
import { queryClient } from "@/config/queryClient";

import { WorkoutList } from "@/components/exercise/sub-tabs/workout/WorkoutList";
import { useUserSettings } from "@/context/UserSettingsProvider";
import { useWorkoutSession } from "@/context/workoutSessionContext";
import {
  isUserCreatedExercise,
  isUserCreatedWorkout,
} from "@/utils/exercise/isUserCreated";
import AddButton from "../AddButton";

type StartWorkoutPayload = {
  workoutProgramId: string; // "manual" fra WorkoutList
  workoutId: string;
  name: string;
  exercises: { exerciseId: string; name: string; muscle?: string | null }[];
};

export function WorkoutTab() {
  // ---------- STATE ----------
  const [openCreate, setOpenCreate] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);

  const { userSettings } = useUserSettings();

  // ---------- DATA ----------
  const {
    data: workoutData,
    isLoading: workoutsLoading,
    error: workoutsError,
  } = useWorkouts();

  const {
    data: exerciseData,
    isLoading: exercisesLoading,
    error: exercisesError,
  } = useExercises();

  const workouts = useMemo(() => {
    const all = (workoutData ?? []) as Workout[];
    if (!userSettings.showOnlyCustomTrainingContent) return all;
    return all.filter(isUserCreatedWorkout);
  }, [workoutData, userSettings.showOnlyCustomTrainingContent]);
  const exercises = useMemo(() => {
    const all = (exerciseData ?? []) as Exercise[];
    if (!userSettings.showOnlyCustomTrainingContent) return all;
    return all.filter(isUserCreatedExercise);
  }, [exerciseData, userSettings.showOnlyCustomTrainingContent]);

  // ---------- WORKOUT SESSION (OVERLAY) ----------
  const { openProgramSession } = useWorkoutSession();

  // ---------- HANDLERS ----------
  const handleCreateWorkout = async (data: {
    name: string;
    description?: string;
    dayLabel?: string;
  }) => {
    try {
      await PostWorkoutForUser({
        name: data.name,
        description: data.description,
        dayLabel: data.dayLabel,
        exerciseIds: [],
      });

      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      setOpenCreate(false);
    } catch (err) {
      console.log("Feil ved oppretting av økt", err);
    }
  };

  const handleEditSave = async (data: {
    name: string;
    dayLabel?: string;
    description?: string;
    exerciseIds: string[];
  }, options?: { closeModal?: boolean }) => {
    if (!editingWorkout) return;

    try {
      await UpdateWorkoutForUser(editingWorkout.id, {
        name: data.name,
        description: data.description,
        dayLabel: data.dayLabel,
        workoutProgramId: editingWorkout.workoutProgramId ?? null,
        exerciseIds: data.exerciseIds,
      });

      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      if (options?.closeModal !== false) {
        setEditingWorkout(null);
      }
    } catch (err) {
      console.log("Feil ved oppdatering av økt", err);
    }
  };

  const handleDelete = async () => {
    if (!editingWorkout) return;

    try {
      await DeleteWorkoutForUser(editingWorkout.id);
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      setEditingWorkout(null);
    } catch (err) {
      console.log("Feil ved sletting av økt", err);
    }
  };

  /**
   * ✅ Start workout and open WorkoutSessionOverlay.
   * We reuse the existing openProgramSession() API because it supports:
   * - name
   * - workoutId
   * - workoutProgramId (nullable)
   * - prefilled exercise list
   *
   * For "Mine økter" (manual workouts), we pass workoutProgramId = null.
   */
  const handleStartWorkout = (payload: StartWorkoutPayload) => {
    openProgramSession({
      name: payload.name,
      workoutId: payload.workoutId,
      workoutProgramId: null, // ✅ manual workouts are not tied to a program
      exercises: payload.exercises,
    });
  };

  // ---------- LOADING / ERROR ----------
  if (workoutsLoading || exercisesLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={[typography.body, { marginTop: 8 }]}>
          Laster økter og øvelser...
        </Text>
      </View>
    );
  }

  if (workoutsError) {
    return (
      <View style={styles.center}>
        <Text style={typography.body}>
          Klarte ikke å hente økter: {(workoutsError as Error).message}
        </Text>
      </View>
    );
  }

  if (exercisesError) {
    return (
      <View style={styles.center}>
        <Text style={typography.body}>
          Klarte ikke å hente øvelser: {(exercisesError as Error).message}
        </Text>
      </View>
    );
  }

  // ---------- RENDER ----------
  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER + PLUSS-KNAPP */}
        <View style={styles.headerRow}>
          <Text style={[typography.h2, styles.heading]}>Mine økter</Text>
          <AddButton open={openCreate} setOpen={setOpenCreate} />
        </View>

        {/* LISTE */}
        <WorkoutList
          workouts={workouts}
          exercises={exercises}
          onEdit={setEditingWorkout}
          onStart={handleStartWorkout} // ✅ payload signature
        />
      </ScrollView>

      {/* CREATE MODAL */}
      <AddWorkoutModal
        visible={openCreate}
        onClose={() => setOpenCreate(false)}
        onSubmit={handleCreateWorkout}
      />

      {/* EDIT MODAL */}
      {editingWorkout && (
        <EditWorkoutModal
          visible={!!editingWorkout}
          onClose={() => setEditingWorkout(null)}
          initialName={editingWorkout.name}
          initialDayLabel={editingWorkout.dayLabel}
          initialDescription={editingWorkout.description}
          initialExerciseIds={editingWorkout.exerciseIds ?? []}
          availableExercises={exercises}
          onSubmit={handleEditSave}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 14 },
  content: { paddingVertical: 16 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  heading: { color: newColors.text.primary },
});
