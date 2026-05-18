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
import { PostWorkoutForUser } from "@/api/exercise/workout";
import { queryClient } from "@/config/queryClient";
import { newColors } from "@/config/theme";
import { typography } from "@/config/typography";
import { useSubscription } from "@/context/SubscriptionProvider";
import { useUserSettings } from "@/context/UserSettingsProvider";
import { useTranslation } from "@/i18n/translations";
import { useExercises } from "@/hooks/useExercises";
import { usePrograms } from "@/hooks/usePrograms";
import { useWorkouts } from "@/hooks/useWorkouts";
import { Exercise, Program, Workout } from "@/types/exercise";
import {
  isUserCreatedProgram,
  isUserCreatedWorkout,
} from "@/utils/exercise/isUserCreated";

import AddButton from "../AddButton";
import { LockedFeatureCard } from "@/components/subscription/LockedFeatureCard";
import { Paywall } from "@/components/subscription/Paywall";
import CreateProgramModal from "./program/CreateProgramModal";
import EditProgramModal from "./program/EditProgramModal";
import { ProgramList } from "./program/ProgramList";

export default function ProgramTab() {
  const [openCreate, setOpenCreate] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const { userSettings } = useUserSettings();
  const { isPremium, isLoading: isSubscriptionLoading } = useSubscription();
  const { t } = useTranslation();

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
  const { data: exercisesData = [] } = useExercises();

  const programs = useMemo(() => {
    const all = (programsData ?? []) as Program[];
    if (!userSettings.showOnlyCustomTrainingContent) return all;
    return all.filter(isUserCreatedProgram);
  }, [programsData, userSettings.showOnlyCustomTrainingContent]);
  const workouts = useMemo(() => {
    const all = (workoutsData ?? []) as Workout[];
    if (!userSettings.showOnlyCustomTrainingContent) return all;
    return all.filter(isUserCreatedWorkout);
  }, [workoutsData, userSettings.showOnlyCustomTrainingContent]);

  const isLoading = loadingPrograms || loadingWorkouts;
  const hasError = !!programsError || !!workoutsError;
  const shouldShowPremiumProgramTeaser =
    !isPremium && !programs.some((program) => program.isPremium === true);

  const refreshAll = async () => {
    setUiError(null);
    try {
      await Promise.all([refetchPrograms(), refetchWorkouts()]);
    } catch (e) {
      setUiError(
        e instanceof Error ? e.message : t("programRefreshError")
      );
    }
  };

  const handleCreate = async (name: string) => {
    setUiError(null);
    setBusy("create");
    try {
      await PostProgramForUser(name);
      await queryClient.invalidateQueries({ queryKey: ["programs"] });
      setOpenCreate(false);
    } catch (error) {
      setUiError(
        error instanceof Error ? error.message : t("programCreateError")
      );
    } finally {
      setBusy(null);
    }
  };

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
        error instanceof Error ? error.message : t("programSaveError")
      );
    } finally {
      setBusy(null);
    }
  };

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
        error instanceof Error ? error.message : t("programDeleteError")
      );
    } finally {
      setBusy(null);
    }
  };

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

  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>();
    for (const exercise of exercisesData as Exercise[]) {
      map.set(exercise.id, exercise);
    }
    return map;
  }, [exercisesData]);

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
          {t("programLoading")}
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
          {t("programFetchError")}
        </Text>

        {!!programsError && (
          <Text
            style={[
              typography.body,
              { color: newColors.text.secondary, opacity: 0.9 },
            ]}
          >
            {t("programProgramsLabel")}: {(programsError as Error).message}
          </Text>
        )}
        {!!workoutsError && (
          <Text
            style={[
              typography.body,
              { color: newColors.text.secondary, opacity: 0.9 },
            ]}
          >
            {t("programWorkoutsLabel")}: {(workoutsError as Error).message}
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
          {t("programRetry")}
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
      <View style={styles.headerRow}>
        <View>
          <Text style={[typography.h2, styles.heading]}>
            {t("programHeading")}
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

      {shouldShowPremiumProgramTeaser && (
        <LockedFeatureCard
          title={t("programPremiumTitle")}
          description={t("programPremiumDescription")}
          isLoading={isSubscriptionLoading}
          compact
          onPress={() => setPaywallVisible(true)}
        />
      )}

      <View style={{ marginTop: 15 }}>
        <ProgramList
          programs={programs}
          workoutsByProgramId={workoutsByProgramId}
          exerciseMap={exerciseMap}
          language={userSettings.language}
          onEdit={(programId) => {
            const p = programs.find((x) => x.id === programId);
            if (p) setEditingProgram(p);
          }}
        />
      </View>

      <Paywall
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        onUnlocked={() => setPaywallVisible(false)}
        source="premium-program-empty"
      />

      <CreateProgramModal
        onSubmit={handleCreate}
        visible={openCreate}
        onClose={() => setOpenCreate(false)}
      />

      {editingProgram && (
        <EditProgramModal
          visible={!!editingProgram}
          onClose={() => setEditingProgram(null)}
          initialName={editingProgram.name}
          initialWorkoutIds={editingInitialWorkoutIds}
          availableWorkouts={workouts}
          onSubmit={handleEditSave}
          onDelete={handleDelete}
          onCreateWorkout={async (data) => {
            if (!editingProgram) {
              throw new Error(t("programMissingSelected"));
            }

            const created = await PostWorkoutForUser({
              name: data.name,
              description: data.description,
              dayLabel: data.dayLabel,
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
