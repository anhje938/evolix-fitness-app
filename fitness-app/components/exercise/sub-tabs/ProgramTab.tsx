// components/exercise/sub-tabs/ProgramTab.tsx
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  DeleteProgramForUser,
  PostProgramForUser,
  UpdateProgramForUser,
} from "@/api/exercise/program";
import { PostWorkoutForUser } from "@/api/exercise/workout"; // ✅ NEW
import { queryClient } from "@/config/queryClient";
import { newColors } from "@/config/theme";
import { typography } from "@/config/typography";
import { usePrograms } from "@/hooks/usePrograms";
import { useWorkouts } from "@/hooks/useWorkouts";
import { Program, Workout } from "@/types/exercise";

import AddButton from "../AddButton";
import CreateProgramModal from "./program/CreateProgramModal";
import EditProgramModal from "./program/EditProgramModal";
import { ProgramList } from "./program/ProgramList";

export default function ProgramTab() {
  const [openCreate, setOpenCreate] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);

  // UI states for mutations (bug-proof)
  const [busy, setBusy] = useState<"create" | "edit" | "delete" | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);

  const {
    data: programsData,
    isLoading: loadingPrograms,
    error: programsError,
    refetch: refetchPrograms,
  } = usePrograms();

  const {
    data: workoutsData,
    isLoading: loadingWorkouts,
    error: workoutsError,
    refetch: refetchWorkouts,
  } = useWorkouts();

  const programs = useMemo(
    () => (programsData ?? []) as Program[],
    [programsData]
  );
  const workouts = useMemo(
    () => (workoutsData ?? []) as Workout[],
    [workoutsData]
  );

  const isLoading = loadingPrograms || loadingWorkouts;
  const hasError = !!programsError || !!workoutsError;

  const refreshAll = async () => {
    setUiError(null);
    try {
      await Promise.all([refetchPrograms(), refetchWorkouts()]);
    } catch (e) {
      setUiError(
        e instanceof Error ? e.message : "Ukjent feil ved oppdatering."
      );
    }
  };

  // CREATE
  const handleCreate = async (name: string) => {
    setUiError(null);
    setBusy("create");
    try {
      await PostProgramForUser(name);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["programs"] }),
        queryClient.invalidateQueries({ queryKey: ["workouts"] }),
      ]);
      setOpenCreate(false);
    } catch (error) {
      setUiError(
        error instanceof Error ? error.message : "Kunne ikke opprette program."
      );
    } finally {
      setBusy(null);
    }
  };

  // EDIT SAVE
  const handleEditSave = async (payload: {
    name: string;
    workoutIds: string[];
  }) => {
    if (!editingProgram) return;
    setUiError(null);
    setBusy("edit");
    try {
      await UpdateProgramForUser(editingProgram.id, payload);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["programs"] }),
        queryClient.invalidateQueries({ queryKey: ["workouts"] }),
      ]);
      setEditingProgram(null);
    } catch (error) {
      setUiError(
        error instanceof Error ? error.message : "Kunne ikke lagre endringer."
      );
    } finally {
      setBusy(null);
    }
  };

  // DELETE
  const handleDelete = async () => {
    if (!editingProgram) return;
    setUiError(null);
    setBusy("delete");
    try {
      await DeleteProgramForUser(editingProgram.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["programs"] }),
        queryClient.invalidateQueries({ queryKey: ["workouts"] }),
      ]);
      setEditingProgram(null);
    } catch (error) {
      setUiError(
        error instanceof Error ? error.message : "Kunne ikke slette program."
      );
    } finally {
      setBusy(null);
    }
  };

  // Derived: workouts per program
  const workoutsByProgramId = useMemo(() => {
    const map = new Map<string, Workout[]>();
    for (const w of workouts) {
      if (!w.workoutProgramId) continue;
      const arr = map.get(w.workoutProgramId) ?? [];
      arr.push(w);
      map.set(w.workoutProgramId, arr);
    }
    return map;
  }, [workouts]);

  const editingInitialWorkoutIds = useMemo(() => {
    if (!editingProgram) return [];
    const sessions = workoutsByProgramId.get(editingProgram.id) ?? [];
    return sessions.map((w) => w.id);
  }, [editingProgram, workoutsByProgramId]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator />
        <Text
          style={[
            typography.body,
            { color: newColors.text.primary, marginTop: 10 },
          ]}
        >
          Laster programmer og økter...
        </Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text
          style={[
            typography.body,
            { color: newColors.text.primary, marginBottom: 8 },
          ]}
        >
          Klarte ikke å hente data
        </Text>

        {!!programsError && (
          <Text
            style={[
              typography.body,
              { color: newColors.text.secondary, opacity: 0.9 },
            ]}
          >
            Programmer: {(programsError as Error).message}
          </Text>
        )}
        {!!workoutsError && (
          <Text
            style={[
              typography.body,
              { color: newColors.text.secondary, opacity: 0.9 },
            ]}
          >
            Økter: {(workoutsError as Error).message}
          </Text>
        )}

        {!!uiError && (
          <Text
            style={[
              typography.body,
              { color: newColors.text.secondary, marginTop: 10 },
            ]}
          >
            {uiError}
          </Text>
        )}

        <Text
          onPress={refreshAll}
          style={[
            typography.body,
            { color: newColors.text.primary, marginTop: 14, opacity: 0.9 },
          ]}
        >
          Trykk for å prøve igjen
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[typography.h2, styles.heading]}>
            Treningsprogrammer
          </Text>
        </View>

        <AddButton open={openCreate} setOpen={setOpenCreate} />
      </View>

      {!!uiError && (
        <View style={styles.errorBox}>
          <Text
            style={[
              typography.body,
              { color: newColors.text.primary, opacity: 0.95 },
            ]}
          >
            {uiError}
          </Text>
        </View>
      )}

      {/* LISTE */}
      <ProgramList
        programs={programs}
        workoutsByProgramId={workoutsByProgramId}
        onEdit={(programId) => {
          const p = programs.find((x) => x.id === programId);
          if (p) setEditingProgram(p);
        }}
      />

      {/* CREATE MODAL */}
      <CreateProgramModal
        onSubmit={handleCreate}
        visible={openCreate}
        onClose={() => setOpenCreate(false)}
      />

      {/* EDIT MODAL */}
      {editingProgram && (
        <EditProgramModal
          visible={!!editingProgram}
          onClose={() => setEditingProgram(null)}
          initialName={editingProgram.name}
          initialWorkoutIds={editingInitialWorkoutIds}
          availableWorkouts={workouts}
          onSubmit={handleEditSave}
          onDelete={handleDelete}
          // ✅ NOW CREATES REAL WORKOUT + links it to this program + returns created workout
          onCreateWorkout={async (name) => {
            if (!editingProgram) {
              throw new Error("Ingen valgt program.");
            }

            const created = await PostWorkoutForUser({
              name,
              description: undefined,
              dayLabel: undefined,
              exerciseIds: [],
              workoutProgramId: editingProgram.id,
            });

            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ["workouts"] }),
              queryClient.invalidateQueries({ queryKey: ["programs"] }),
            ]);

            return created;
          }}
          isBusy={busy === "edit" || busy === "delete"}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0)",
  },
  content: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  heading: {
    color: newColors.text.primary,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  errorBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
    marginBottom: 12,
  },
});
