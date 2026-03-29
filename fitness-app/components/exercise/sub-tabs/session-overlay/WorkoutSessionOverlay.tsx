import type { CreateExercisePayload, WorkoutSession } from "@/types/exercise";
import { typography } from "@/config/typography";
import { useUserSettings } from "@/context/UserSettingsProvider";
import { useWorkoutSession } from "@/context/workoutSessionContext";
import { type ExerciseSessionSetsDto } from "@/api/exercise/exerchiseHistory";
import { useCreateExercise } from "@/hooks/useCreateExercise";
import { useAllExerciseSetsHistory } from "@/hooks/useAllExerciseSetsHistory";
import { useLiveDurationLabel } from "@/hooks/useLiveDurationLabel";
import { useExercises } from "@/hooks/useExercises";
import { isUserCreatedExercise } from "@/utils/exercise/isUserCreated";
import { estimate1RMFromTopSet } from "@/utils/exercise/oneRepMax";
import {
  buildWorkoutCoachRecommendation,
  type WorkoutCoachRecommendation,
} from "@/utils/exercise/workoutCoach";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TextInput as RNTextInput } from "react-native";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Divider, ExerciseBlock, IconBtn, Stat } from "./ExerciseBlocks";
import { DraggableMinimizedBar } from "./MinimizedWorkoutBar";
import {
  findInvalidCompletedSets,
  findSuspiciousWeightSets,
  normalizeTitle,
  validateSessionForSave,
} from "./overlayGuards";
import { AddExerciseModal } from "../exercise/AddExerciseModal";

const SUSPICIOUS_WEIGHT_THRESHOLD_KG = 500;

/**
 * Premium Dark Ocean colors
 */
const overlayColors = {
  backdrop: "rgba(0,0,0,0.70)",
  container: "rgba(15,23,42,0.98)",
  surface: "rgba(255,255,255,0.04)",
  input: "rgba(30,41,59,0.95)",
  text: "#E5ECFF",
  muted: "rgba(148,163,184,0.9)",
  muted2: "rgba(148,163,184,0.7)",
  border: "rgba(255,255,255,0.08)",
  borderSoft: "rgba(255,255,255,0.05)",
  accent: "#06b6d4",
  accentDim: "rgba(6,182,212,0.2)",
  accentBg: "rgba(6,182,212,0.08)",
  danger: "#ef4444",
  dangerBg: "rgba(239,68,68,0.12)",
  dangerBorder: "rgba(239,68,68,0.25)",
  success: "#34d399",
  successBg: "#0f172a",
  successBorder: "#1f8a70",
};

type SavePreviewExercise = {
  id: string;
  exerciseId: string;
  name: string;
  bestEstimatedOneRmKg: number;
  setsCount: number;
  totalReps: number;
  bestWeightKg: number | null;
  totalVolumeKg: number | null;
  sets: SavePreviewSet[];
};

type SavePreviewSet = {
  id: string;
  setNumber: number;
  reps: number;
  weightKg: number | null;
  estimatedOneRmKg: number | null;
  isPr: boolean;
};

type SavePreview = {
  title: string;
  durationLabel: string;
  exercisesCount: number;
  completedSetsCount: number;
  totalReps: number;
  totalVolumeKg: number | null;
  bestWeightKg: number | null;
  skippedSetsCount: number;
  skippedExercisesCount: number;
  exercises: SavePreviewExercise[];
};

function buildCompletedSessionEditSnapshot(
  session: WorkoutSession,
  titleOverride?: string
) {
  const normalizedTitle = normalizeTitle(titleOverride ?? session.name);

  return JSON.stringify({
    id: session.id ?? null,
    mode: session.mode,
    name: normalizedTitle || session.name,
    workoutProgramId: session.workoutProgramId ?? null,
    workoutId: session.workoutId ?? null,
    startedAtUtc: session.startedAtUtc ?? null,
    finishedAtUtc: session.finishedAtUtc ?? null,
    exercises: session.exercises
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((exercise) => ({
        id: exercise.id,
        exerciseId: exercise.exerciseId,
        name: exercise.name,
        muscle: exercise.muscle ?? null,
        order: exercise.order,
        sets: exercise.sets.map((set) => ({
          id: set.id,
          reps: set.reps ?? null,
          weight: set.weight ?? null,
          completed: !!set.completed,
        })),
      })),
  });
}

function formatNumber(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(1).replace(".", ",");
}

function formatKg(value: number | null | undefined) {
  if (value == null) return null;
  return `${formatNumber(value)} kg`;
}

function formatEstimatedOneRmValue(value: number | null) {
  if (value == null) return null;
  return formatNumber(value);
}

function formatSetSummary(reps: number, weightKg: number | null) {
  if (weightKg == null) return `${reps} reps`;
  return `${reps} reps • ${formatKg(weightKg)}`;
}

function estimateSetOneRm(weightKg: number | null, reps: number | null) {
  const estimated = estimate1RMFromTopSet(
    weightKg,
    reps,
    { roundTo: 1, conservative: true, allowHighRep: true },
    "ensemble"
  ).oneRm;

  return estimated > 0 ? estimated : null;
}

function getSessionBestOneRm(session: ExerciseSessionSetsDto) {
  let best = 0;

  for (const set of session.sets ?? []) {
    const oneRm = estimateSetOneRm(set.weightKg, set.reps) ?? 0;
    if (oneRm > best) best = oneRm;
  }

  return best;
}

function buildSavePreview(
  session: WorkoutSession,
  title: string,
  durationLabel: string
): SavePreview {
  let completedSetsCount = 0;
  let totalReps = 0;
  let totalVolumeKg = 0;
  let bestWeightKg: number | null = null;
  let skippedSetsCount = 0;

  const exercises = session.exercises
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((exercise) => {
      const sets = exercise.sets
        .map((set, index) => {
          const reps = set.reps ?? 0;
          if (!set.completed || reps <= 0) return null;

          const weightKg =
            typeof set.weight === "number" && Number.isFinite(set.weight)
              ? set.weight
              : null;
          const estimatedOneRmKg = estimateSetOneRm(weightKg, reps);

          completedSetsCount += 1;
          totalReps += reps;

          if (weightKg != null) {
            bestWeightKg =
              bestWeightKg == null ? weightKg : Math.max(bestWeightKg, weightKg);
            if (weightKg > 0) {
              totalVolumeKg += weightKg * reps;
            }
          }

          return {
            id: set.id,
            setNumber: index + 1,
            reps,
            weightKg,
            estimatedOneRmKg,
            isPr: false,
          };
        })
        .filter((set): set is SavePreviewSet => set !== null);

      skippedSetsCount += exercise.sets.length - sets.length;

      if (sets.length === 0) {
        return null;
      }

      const setsCount = sets.length;
      const exerciseTotalReps = sets.reduce((sum, set) => sum + set.reps, 0);
      const exerciseBestWeightKg = sets.reduce<number | null>((best, set) => {
        if (set.weightKg == null) return best;
        return best == null ? set.weightKg : Math.max(best, set.weightKg);
      }, null);
      const exerciseTotalVolumeKg = sets.reduce(
        (sum, set) => sum + (set.weightKg ?? 0) * set.reps,
        0
      );

      return {
        id: exercise.id,
        exerciseId: exercise.exerciseId,
        name: exercise.name,
        bestEstimatedOneRmKg: sets.reduce(
          (best, set) => Math.max(best, set.estimatedOneRmKg ?? 0),
          0
        ),
        setsCount,
        totalReps: exerciseTotalReps,
        bestWeightKg: exerciseBestWeightKg,
        totalVolumeKg: exerciseTotalVolumeKg > 0 ? exerciseTotalVolumeKg : null,
        sets,
      };
    })
    .filter((exercise): exercise is SavePreviewExercise => exercise !== null);

  return {
    title,
    durationLabel,
    exercisesCount: exercises.length,
    completedSetsCount,
    totalReps,
    totalVolumeKg: totalVolumeKg > 0 ? totalVolumeKg : null,
    bestWeightKg,
    skippedSetsCount,
    skippedExercisesCount: session.exercises.length - exercises.length,
    exercises,
  };
}

const LiveDurationStat = React.memo(function LiveDurationStat({
  startedAtUtc,
  finishedAtUtc,
}: {
  startedAtUtc?: string | null;
  finishedAtUtc?: string | null;
}) {
  const durationLabel = useLiveDurationLabel(startedAtUtc, finishedAtUtc);

  return <Stat icon="time-outline" label="Varighet" value={durationLabel} />;
});

export function WorkoutSessionOverlay() {
  const insets = useSafeAreaInsets();
  const {
    isOpen,
    isMinimized,
    isSaving,
    session,
    toggleMinimized,
    closeSession,
    addExercise,
    addSet,
    applySetTemplate,
    updateSet,
    removeSet,
    finishAndSave,
    renameSession,
    deleteSession,
  } = useWorkoutSession();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [isSaveSummaryOpen, setIsSaveSummaryOpen] = useState(false);
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
  const [isCreateExerciseOpen, setIsCreateExerciseOpen] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [pickerToastMessage, setPickerToastMessage] = useState("");
  const [saveSuccessMessage, setSaveSuccessMessage] = useState("");
  const [keyboardInsetHeight, setKeyboardInsetHeight] = useState(0);
  const titleInputRef = useRef<RNTextInput | null>(null);
  const contentScrollRef = useRef<ScrollView | null>(null);
  const pendingConfirmSaveActionRef = useRef<(() => Promise<void>) | null>(
    null
  );
  const focusedSessionInputRef = useRef<RNTextInput | null>(null);
  const contentScrollOffsetYRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const initialCompletedSessionSnapshotRef = useRef<string | null>(null);
  const initialCompletedSessionIdRef = useRef<string | null>(null);
  const pickerToastAnim = useRef(new Animated.Value(0)).current;
  const saveSuccessAnim = useRef(new Animated.Value(0)).current;
  const pickerToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const overlayReveal = useRef(new Animated.Value(0)).current;
  const minimizeInFlightRef = useRef(false);
  const { userSettings } = useUserSettings();
  const { data: exerciseData = [], isLoading: isLoadingExercises } =
    useExercises();
  const createExerciseMutation = useCreateExercise();
  const sessionId = session?.id;
  const sessionName = session?.name ?? "";
  const sessionStartedAtUtc = session?.startedAtUtc;
  const sessionFinishedAtUtc = session?.finishedAtUtc ?? null;
  const visibleExercises = useMemo(
    () => session?.exercises ?? [],
    [session?.exercises]
  );

  // Reset state when session changes
  useEffect(() => {
    if (!isOpen || !sessionId) return;
    setTitleDraft(sessionName);
    setIsEditingTitle(false);
    setIsSaveSummaryOpen(false);
    setSaveSuccessMessage("");
    setKeyboardInsetHeight(0);
    pendingConfirmSaveActionRef.current = null;
    focusedSessionInputRef.current = null;
    keyboardHeightRef.current = 0;
    contentScrollOffsetYRef.current = 0;
    saveSuccessAnim.stopAnimation();
    saveSuccessAnim.setValue(0);
  }, [isOpen, saveSuccessAnim, sessionId, sessionName]);

  useEffect(() => {
    if (isExercisePickerOpen || isCreateExerciseOpen) return;
    setExerciseSearch("");
    setPickerToastMessage("");
    if (pickerToastTimeoutRef.current) {
      clearTimeout(pickerToastTimeoutRef.current);
      pickerToastTimeoutRef.current = null;
    }
    pickerToastAnim.stopAnimation();
    pickerToastAnim.setValue(0);
  }, [isCreateExerciseOpen, isExercisePickerOpen, pickerToastAnim]);

  useEffect(() => {
    return () => {
      if (pickerToastTimeoutRef.current) {
        clearTimeout(pickerToastTimeoutRef.current);
      }
      saveSuccessAnim.stopAnimation();
    };
  }, [saveSuccessAnim]);

  useEffect(() => {
    if (!isOpen || !sessionStartedAtUtc || isMinimized) return;

    minimizeInFlightRef.current = false;
    overlayReveal.stopAnimation();
    overlayReveal.setValue(0);

    Animated.timing(overlayReveal, {
      toValue: 1,
      duration: 210,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isMinimized, isOpen, overlayReveal, sessionStartedAtUtc]);

  const isQuick = session?.mode === "quick";

  const startEditingTitle = () => {
    if (!isQuick) return;
    setIsEditingTitle(true);
    requestAnimationFrame(() => titleInputRef.current?.focus());
  };

  const commitTitle = () => {
    const next = normalizeTitle(titleDraft);
    if (!next) {
      setTitleDraft(session?.name ?? "Fri økt");
      return;
    }
    if (next !== session?.name) renameSession(next);
  };

  const titleForSave = useMemo(() => {
    const next = normalizeTitle(titleDraft);
    if (next) return next;
    return session?.name ?? "Fri økt";
  }, [session?.name, titleDraft]);

  const isEditingCompletedSession = !!session?.id && !!session?.finishedAtUtc;
  const canDeleteCompleted = isEditingCompletedSession;
  const hasCompletedSessionChanges = useMemo(() => {
    if (!isEditingCompletedSession || !session) return false;

    const initialSnapshot = initialCompletedSessionSnapshotRef.current;
    if (!initialSnapshot) return false;

    return (
      buildCompletedSessionEditSnapshot(session, titleForSave) !==
      initialSnapshot
    );
  }, [isEditingCompletedSession, session, titleForSave]);

  useEffect(() => {
    if (!isOpen || !sessionId || !isEditingCompletedSession || !session) {
      initialCompletedSessionSnapshotRef.current = null;
      initialCompletedSessionIdRef.current = null;
      return;
    }

    if (initialCompletedSessionIdRef.current === sessionId) return;

    initialCompletedSessionSnapshotRef.current =
      buildCompletedSessionEditSnapshot(session);
    initialCompletedSessionIdRef.current = sessionId;
  }, [isEditingCompletedSession, isOpen, session, sessionId]);

  const handleDeleteSession = () => {
    if (!canDeleteCompleted) return;

    Alert.alert(
      "Slette økten?",
      "Dette kan ikke angres. Hele økten og alle sett slettes.",
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Slett",
          style: "destructive",
          onPress: async () => {
            await deleteSession();
          },
        },
      ]
    );
  };

  const sortedExercises = useMemo(() => {
    return visibleExercises.slice().sort((a, b) => a.order - b.order);
  }, [visibleExercises]);

  const durationLabel = useLiveDurationLabel(
    sessionStartedAtUtc,
    sessionFinishedAtUtc,
    isMinimized
  );

  const totals = useMemo(() => {
    let sets = 0;
    let completed = 0;
    for (const ex of visibleExercises) {
      sets += ex.sets.length;
      for (const s of ex.sets) if (s.completed) completed++;
    }
    return { sets, completed, exercises: visibleExercises.length };
  }, [visibleExercises]);

  const sessionExerciseIds = useMemo(
    () =>
      userSettings.useWorkoutCoach
        ? Array.from(
        new Set(
          visibleExercises
            .map((exercise) => exercise.exerciseId)
            .filter((exerciseId): exerciseId is string => !!exerciseId)
        )
          )
        : [],
    [userSettings.useWorkoutCoach, visibleExercises]
  );

  const { queries: exerciseHistoryQueries, data: exerciseHistoryMap } =
    useAllExerciseSetsHistory(sessionExerciseIds);

  const coachRecommendationsByLocalExerciseId = useMemo(() => {
    const next: Record<string, WorkoutCoachRecommendation> = {};

    if (sessionFinishedAtUtc || !userSettings.useWorkoutCoach) return next;

    for (const exercise of visibleExercises) {
      const history = (exerciseHistoryMap[exercise.exerciseId] ?? []).filter(
        (historySession) => historySession.sessionId !== session?.id
      );
      const recommendation = buildWorkoutCoachRecommendation(history);

      if (recommendation) {
        next[exercise.id] = recommendation;
      }
    }

    return next;
  }, [
    exerciseHistoryMap,
    session?.id,
    sessionFinishedAtUtc,
    userSettings.useWorkoutCoach,
    visibleExercises,
  ]);

  const handleApplyCoachRecommendation = useCallback(
    (sessionExerciseId: string, recommendation: WorkoutCoachRecommendation) => {
      applySetTemplate(
        sessionExerciseId,
        recommendation.plan.map((set) => ({
          reps: set.reps,
          weight: set.weightKg,
        }))
      );
    },
    [applySetTemplate]
  );

  const savePreview = useMemo(() => {
    if (!session) return null;
    return buildSavePreview(session, titleForSave, durationLabel);
  }, [durationLabel, session, titleForSave]);

  const savePreviewWithPr = useMemo(() => {
    if (!savePreview) return null;

    return {
      ...savePreview,
      exercises: savePreview.exercises.map((exercise) => {
        const historyIndex = sessionExerciseIds.indexOf(exercise.exerciseId);
        const historyQuery =
          historyIndex >= 0 ? exerciseHistoryQueries[historyIndex] : undefined;
        const canEvaluatePr = historyQuery?.status === "success";
        const historySessions = canEvaluatePr
          ? (exerciseHistoryMap[exercise.exerciseId] ?? []).filter(
              (historySession) => historySession.sessionId !== session?.id
            )
          : [];
        const historicalBestOneRm = historySessions.reduce(
          (best, historySession) =>
            Math.max(best, getSessionBestOneRm(historySession)),
          0
        );
        const didHitPr =
          canEvaluatePr &&
          exercise.bestEstimatedOneRmKg > 0 &&
          exercise.bestEstimatedOneRmKg > historicalBestOneRm;
        let prSetAssigned = false;

        return {
          ...exercise,
          sets: exercise.sets.map((set) => {
            const isPr =
              didHitPr &&
              !prSetAssigned &&
              (set.estimatedOneRmKg ?? 0) === exercise.bestEstimatedOneRmKg;

            if (isPr) {
              prSetAssigned = true;
            }

            return {
              ...set,
              isPr,
            };
          }),
        };
      }),
    };
  }, [
    exerciseHistoryMap,
    exerciseHistoryQueries,
    savePreview,
    session?.id,
    sessionExerciseIds,
  ]);

  const searchableExercises = useMemo(() => {
    return userSettings.showOnlyCustomTrainingContent
      ? exerciseData.filter(isUserCreatedExercise)
      : exerciseData;
  }, [exerciseData, userSettings.showOnlyCustomTrainingContent]);

  const pickerExercises = useMemo(() => {
    const existingExerciseIds = new Set(
      visibleExercises.map((exercise) => exercise.exerciseId)
    );

    return searchableExercises.filter(
      (exercise) => !existingExerciseIds.has(exercise.id)
    );
  }, [searchableExercises, visibleExercises]);

  const filteredPickerExercises = useMemo(() => {
    const normalizedSearch = exerciseSearch.trim().toLowerCase();
    if (!normalizedSearch) return pickerExercises;

    return pickerExercises.filter((exercise) => {
      const name = exercise.name.toLowerCase();
      const muscle = (exercise.muscle ?? "").toLowerCase();
      const equipment = (exercise.equipment ?? "").toLowerCase();
      return (
        name.includes(normalizedSearch) ||
        muscle.includes(normalizedSearch) ||
        equipment.includes(normalizedSearch)
      );
    });
  }, [exerciseSearch, pickerExercises]);

  const trimmedExerciseSearch = exerciseSearch.trim();
  const canCreateExerciseFromSearch = false;

  const handleOpenCreateExerciseModal = (_initialName?: string) => {
    Keyboard.dismiss();
    setIsExercisePickerOpen(false);
    setIsCreateExerciseOpen(true);
  };

  const handleCloseCreateExerciseModal = () => {
    setIsCreateExerciseOpen(false);
  };

  const showPickerToast = (message: string) => {
    if (pickerToastTimeoutRef.current) {
      clearTimeout(pickerToastTimeoutRef.current);
      pickerToastTimeoutRef.current = null;
    }

    setPickerToastMessage(message);
    pickerToastAnim.stopAnimation();
    pickerToastAnim.setValue(0);

    Animated.timing(pickerToastAnim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    pickerToastTimeoutRef.current = setTimeout(() => {
      pickerToastTimeoutRef.current = null;

      Animated.timing(pickerToastAnim, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setPickerToastMessage("");
      });
    }, 1400);
  };

  const showSaveSuccessToast = useCallback(() => {
    const message = isEditingCompletedSession
      ? "Endringer lagret"
      : "Økt lagret";

    setSaveSuccessMessage(message);
    saveSuccessAnim.stopAnimation();
    saveSuccessAnim.setValue(0);

    Animated.sequence([
      Animated.timing(saveSuccessAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(850),
      Animated.timing(saveSuccessAnim, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setSaveSuccessMessage("");
      }
    });
  }, [isEditingCompletedSession, saveSuccessAnim]);

  const ensureFocusedInputVisible = useCallback(
    (input: RNTextInput | null, keyboardHeight = keyboardHeightRef.current) => {
      if (!input || !contentScrollRef.current || keyboardHeight <= 0) return;

      requestAnimationFrame(() => {
        input.measureInWindow((_, y, __, height) => {
          const keyboardTop = Dimensions.get("window").height - keyboardHeight;
          const desiredBottom = keyboardTop - 12;
          const inputBottom = y + height;
          const overlap = inputBottom - desiredBottom;

          if (overlap <= 0) return;

          contentScrollRef.current?.scrollTo({
            y: Math.max(0, contentScrollOffsetYRef.current + overlap),
            animated: true,
          });
        });
      });
    },
    []
  );

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      const nextKeyboardHeight = event.endCoordinates?.height ?? 0;
      keyboardHeightRef.current = nextKeyboardHeight;
      setKeyboardInsetHeight(nextKeyboardHeight);
      ensureFocusedInputVisible(
        focusedSessionInputRef.current,
        nextKeyboardHeight
      );
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardHeightRef.current = 0;
      focusedSessionInputRef.current = null;
      setKeyboardInsetHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [ensureFocusedInputVisible]);

  const handleSessionInputFocus = useCallback(
    (input: RNTextInput | null) => {
      focusedSessionInputRef.current = input;
      ensureFocusedInputVisible(input);
    },
    [ensureFocusedInputVisible]
  );

  const handleAddExerciseToSession = (exercise: {
    id: string;
    name: string;
    muscle?: string | null;
  }, successMessage?: string) => {
    addExercise({
      exerciseId: exercise.id,
      name: exercise.name,
      muscle: exercise.muscle ?? null,
    });
    showPickerToast(successMessage ?? `${exercise.name} lagt til`);
  };

  const handleCreateExerciseFromPicker = async (
    payload: CreateExercisePayload
  ) => {
    try {
      const createdExercise = await createExerciseMutation.mutateAsync(payload);

      handleAddExerciseToSession(
        {
          id: createdExercise.id,
          name: createdExercise.name,
          muscle: createdExercise.muscle ?? null,
        },
        `${createdExercise.name} opprettet og lagt til`
      );
      setIsCreateExerciseOpen(false);
      setExerciseSearch("");
    } catch (error) {
      Alert.alert(
        "Kunne ikke opprette øvelse",
        error instanceof Error ? error.message : "Ukjent feil ved oppretting."
      );
    }
  };

  const handleClose = () => {
    if (isSaving) return;

    if (isEditingCompletedSession) {
      if (!hasCompletedSessionChanges) {
        closeSession();
        return;
      }

      Alert.alert(
        "Forkaste endringer?",
        "Endringer du har gjort i økten blir ikke lagret.",
        [
          { text: "Fortsett redigering", style: "cancel" },
          { text: "Forkast", style: "destructive", onPress: closeSession },
        ]
      );
      return;
    }

    if (totals.completed <= 0) {
      closeSession();
      return;
    }
    Alert.alert(
      "Avbryt økt?",
      `Du har fullført ${totals.completed} sett. Vil du avbryte økten?`,
      [
        { text: "Fortsett", style: "cancel" },
        { text: "Avbryt", style: "destructive", onPress: closeSession },
      ]
    );
  };

  const handleAbortClose = () => {
    if (isSaving) return;

    if (isEditingCompletedSession) {
      handleClose();
      return;
    }

    if (totals.exercises <= 0) {
      closeSession();
      return;
    }

    const message =
      totals.completed > 0
        ? `Du har fullført ${totals.completed} sett. Vil du avbryte økten?`
        : totals.sets > 0
        ? "Du har lagt til øvelser eller sett som ikke er lagret. Vil du avbryte økten?"
        : "Vil du avbryte økten?";

    Alert.alert("Avbryt økt?", message, [
      { text: "Fortsett", style: "cancel" },
      { text: "Avbryt", style: "destructive", onPress: closeSession },
    ]);
  };

  const handleFinish = async () => {
    if (!session) return;
    if (isSaving) return;
    const nameOverride = titleForSave;
    commitTitle();

    const beforeSaveAction = isEditingCompletedSession
      ? "lagrer endringene"
      : "fullfører";

    const issues = findInvalidCompletedSets(session.exercises);
    if (issues.length > 0) {
      const first = issues[0];
      Alert.alert(
        "Ugyldige sett",
        issues.length > 1
          ? `Du har ${issues.length} ferdig-markerte sett med ugyldige verdier.\n\nEksempel:\n${first.exerciseName} - sett ${first.setIndex}: ${first.reason}\n\nRett opp før du ${beforeSaveAction}.`
          : `Du har et ferdig-markert sett med ugyldige verdier:\n\n${first.exerciseName} - sett ${first.setIndex}: ${first.reason}\n\nRett opp før du ${beforeSaveAction}.`,
        [{ text: "OK" }]
      );
      return;
    }

    const res = validateSessionForSave(session.exercises);
    if (!res.ok) {
      Alert.alert(
        isEditingCompletedSession
          ? "Kan ikke lagre endringer"
          : "Kan ikke fullføre",
        res.message
      );
      return;
    }

    const suspiciousWeights = findSuspiciousWeightSets(
      session.exercises,
      SUSPICIOUS_WEIGHT_THRESHOLD_KG
    );
    if (suspiciousWeights.length > 0) {
      const first = suspiciousWeights[0];
      const shouldContinue = await new Promise<boolean>((resolve) => {
        Alert.alert(
          "Uvanlig høy vekt",
          suspiciousWeights.length > 1
            ? `Vi fant ${suspiciousWeights.length} sett med minst ${SUSPICIOUS_WEIGHT_THRESHOLD_KG} kg.\n\nEksempel:\n${first.exerciseName} - sett ${first.setIndex}: ${first.weight} kg\n\nEr du sikker på at dette stemmer?`
            : `Dette settet er registrert med ${first.weight} kg:\n\n${first.exerciseName} - sett ${first.setIndex}\n\nEr du sikker på at dette stemmer?`,
          [
            {
              text: "Gå tilbake",
              style: "cancel",
              onPress: () => resolve(false),
            },
            { text: "Ja, lagre", onPress: () => resolve(true) },
          ]
        );
      });

      if (!shouldContinue) {
        return;
      }
    }

    const saveAction = async () => {
      Keyboard.dismiss();
      await finishAndSave({
        nameOverride,
        onSuccess: showSaveSuccessToast,
      });
    };

    Keyboard.dismiss();
    pendingConfirmSaveActionRef.current = saveAction;
    setIsSaveSummaryOpen(true);
  };

  const handleCloseSaveSummary = () => {
    if (isSaving) return;
    setIsSaveSummaryOpen(false);
    pendingConfirmSaveActionRef.current = null;
  };

  const handleConfirmSave = async () => {
    if (isSaving) return;

    const saveAction = pendingConfirmSaveActionRef.current;
    setIsSaveSummaryOpen(false);
    pendingConfirmSaveActionRef.current = null;
    if (!saveAction) return;
    await saveAction();
  };

  const handleMinimize = () => {
    if (isSaving) return;
    if (isEditingCompletedSession) return;
    if (minimizeInFlightRef.current) return;

    minimizeInFlightRef.current = true;
    Keyboard.dismiss();
    overlayReveal.stopAnimation();

    Animated.timing(overlayReveal, {
      toValue: 0,
      duration: 170,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      minimizeInFlightRef.current = false;
      if (finished) toggleMinimized();
    });
  };

  const saveSuccessToastOverlay = !!saveSuccessMessage ? (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <View pointerEvents="box-none" style={styles.saveSuccessModalRoot}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.saveSuccessToast,
            {
              top: Math.max(insets.top + 10, 18),
              opacity: saveSuccessAnim,
              transform: [
                {
                  translateY: saveSuccessAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-8, 0],
                  }),
                },
                {
                  scale: saveSuccessAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.96, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={["#0f172a", "#132b24", "#14253d"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Ionicons
            name="checkmark-circle"
            size={15}
            color={overlayColors.success}
          />
          <Text
            style={[typography.body, styles.saveSuccessToastText]}
            numberOfLines={1}
          >
            {saveSuccessMessage}
          </Text>
        </Animated.View>
      </View>
    </Modal>
  ) : null;

  if (!isOpen || !session) return <>{saveSuccessToastOverlay}</>;

  if (isMinimized) {
    return (
      <DraggableMinimizedBar
        title={session.name}
        subtitle={`${durationLabel} · ${totals.exercises} øvelser · ${totals.sets} sett`}
        onExpand={toggleMinimized}
      />
    );
  }

  const modeLabel = session.mode === "quick" ? "Fri økt" : "Planlagt økt";
  const closeButtonLabel = isEditingCompletedSession ? "Lukk" : "Avbryt økt";
  const finishButtonLabel = isEditingCompletedSession
    ? "Lagre endringer"
    : "Fullfør økt";
  const saveSummaryConfirmLabel = isEditingCompletedSession
    ? "Lagre endringer"
    : "Lagre økt";
  const summaryPrimaryMetricLabel =
    savePreview?.totalVolumeKg != null ? "Volum" : "Reps";
  const summaryPrimaryMetricValue =
    savePreview?.totalVolumeKg != null
      ? formatKg(savePreview.totalVolumeKg)
      : `${savePreview?.totalReps ?? 0}`;
  const skippedSetsMessage =
    savePreview && savePreview.skippedSetsCount > 0
      ? savePreview.skippedExercisesCount > 0
        ? `${savePreview.skippedSetsCount} uferdige sett og ${savePreview.skippedExercisesCount} øvelser uten ferdige sett blir ikke lagret.`
        : `${savePreview.skippedSetsCount} uferdige sett blir ikke lagret.`
      : "Kun ferdig-markerte sett blir lagret.";

  const sheetTranslateY = overlayReveal.interpolate({
    inputRange: [0, 1],
    outputRange: [28, 0],
  });
  const sheetScale = overlayReveal.interpolate({
    inputRange: [0, 1],
    outputRange: [0.975, 1],
  });

  return (
    <>
      <Modal visible={isOpen} animationType="none" transparent>
        <View style={styles.modalRoot}>
        <Animated.View
          pointerEvents="box-none"
          style={[styles.backdropLayer, { opacity: overlayReveal }]}
        >
          <Pressable style={styles.backdrop} onPress={Keyboard.dismiss} />
        </Animated.View>
        <View style={styles.sheetWrap} pointerEvents="box-none">
          <TouchableWithoutFeedback
            accessible={false}
            onPress={Keyboard.dismiss}
          >
            <Animated.View
              style={[
                styles.sheet,
                {
                  opacity: overlayReveal,
                  transform: [
                    { translateY: sheetTranslateY },
                    { scale: sheetScale },
                  ],
                },
              ]}
            >
            {/* Glass overlay */}
            <LinearGradient
              colors={[
                "rgba(255,255,255,0.06)",
                "rgba(255,255,255,0.02)",
                "rgba(255,255,255,0.00)",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            {/* HEADER */}
            <View style={styles.headerRow}>
              <IconBtn
                icon="close-outline"
                onPress={handleAbortClose}
                label={closeButtonLabel}
                tone="danger"
              />

              <View style={styles.headerCenter}>
                <View style={styles.headerIcon}>
                  <Ionicons
                    name="barbell"
                    size={18}
                    color={overlayColors.accent}
                  />
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  {isQuick ? (
                    isEditingTitle ? (
                      <View style={styles.titleEditWrap}>
                        <TextInput
                          ref={(el) => {
                            titleInputRef.current = el;
                          }}
                          value={titleDraft}
                          onChangeText={setTitleDraft}
                          onBlur={() => {
                            commitTitle();
                            setIsEditingTitle(false);
                          }}
                          onSubmitEditing={() => {
                            commitTitle();
                            setIsEditingTitle(false);
                            Keyboard.dismiss();
                          }}
                          returnKeyType="done"
                          placeholder="Navn på økt"
                          placeholderTextColor={overlayColors.muted2}
                          style={[typography.bodyBold, styles.headerTitleInput]}
                          maxLength={50}
                        />

                        <Pressable
                          onPress={() => {
                            commitTitle();
                            setIsEditingTitle(false);
                            Keyboard.dismiss();
                          }}
                          hitSlop={8}
                          style={styles.editPencil}
                        >
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color={overlayColors.accent}
                          />
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        onPress={startEditingTitle}
                        hitSlop={10}
                        style={{ maxWidth: "100%" }}
                      >
                        <Text
                          style={[typography.bodyBold, styles.headerTitle]}
                          numberOfLines={1}
                        >
                          {session.name}
                        </Text>
                      </Pressable>
                    )
                  ) : (
                    <Text
                      style={[typography.bodyBold, styles.headerTitle]}
                      numberOfLines={1}
                    >
                      {session.name}
                    </Text>
                  )}

                  <Text style={[typography.body, styles.headerSubtitle]}>
                    {modeLabel}
                  </Text>
                </View>
              </View>

              {!isEditingCompletedSession ? (
                <IconBtn
                  icon="remove-outline"
                  onPress={handleMinimize}
                  label="Minimer"
                />
              ) : (
                <View style={styles.headerActionSpacer} />
              )}
            </View>

            {/* STATS */}
            <View style={styles.statsRow}>
              <LiveDurationStat
                startedAtUtc={sessionStartedAtUtc}
                finishedAtUtc={sessionFinishedAtUtc}
              />
              <Divider />
              <Stat
                icon="barbell-outline"
                label="Øvelser"
                value={`${totals.exercises}`}
              />
              <Divider />
              <Stat icon="list-outline" label="Sett" value={`${totals.sets}`} />
            </View>

            {/* TOP ACTIONS (kun for utførte økter) */}
            <View style={styles.topActions}>
              <Pressable
                onPress={() => setIsExercisePickerOpen(true)}
                style={({ pressed }) => [
                  styles.addExerciseTopBtn,
                  pressed && { opacity: 0.92 },
                ]}
              >
                <View style={styles.addExerciseTopInner}>
                  <Ionicons
                    name="add-outline"
                    size={16}
                    color={overlayColors.accent}
                  />
                  <Text style={[typography.body, styles.addExerciseTopText]}>
                    Legg til øvelse
                  </Text>
                </View>
              </Pressable>

              {canDeleteCompleted && (
                <Pressable
                  onPress={handleDeleteSession}
                  style={({ pressed }) => [
                    styles.deleteTopBtn,
                    pressed && { opacity: 0.92 },
                  ]}
                >
                  <View style={styles.deleteTopInner}>
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color={overlayColors.danger}
                    />
                    <Text style={[typography.body, styles.deleteTopText]}>
                      Slett økt
                    </Text>
                  </View>
                </Pressable>
              )}
            </View>

            {/* CONTENT */}
            <View style={[styles.pickerQuickActions, { display: "none" }]}>
              <TouchableOpacity
                onPress={() => handleOpenCreateExerciseModal()}
                activeOpacity={0.84}
                accessibilityRole="button"
                style={styles.pickerCreateRow}
              >
                <View style={styles.pickerCreateIcon}>
                  <Ionicons
                    name="add-circle-outline"
                    size={18}
                    color={overlayColors.accent}
                  />
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={[typography.bodyBold, styles.pickerCreateTitle]}
                    numberOfLines={1}
                  >
                    Opprett ny øvelse
                  </Text>
                  <Text
                    style={[typography.body, styles.pickerCreateSubtitle]}
                    numberOfLines={1}
                  >
                    Lag en ny øvelse og legg den til i økten
                  </Text>
                </View>
              </TouchableOpacity>

              {false && canCreateExerciseFromSearch && (
                <TouchableOpacity
                  onPress={() =>
                    handleOpenCreateExerciseModal(trimmedExerciseSearch)
                  }
                  activeOpacity={0.84}
                  accessibilityRole="button"
                  style={styles.pickerCreateRow}
                >
                  <View style={styles.pickerCreateIcon}>
                    <Ionicons
                      name="sparkles-outline"
                      size={18}
                      color={overlayColors.accent}
                    />
                  </View>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[typography.bodyBold, styles.pickerCreateTitle]}
                      numberOfLines={1}
                    >
                      {`Opprett "${trimmedExerciseSearch}"`}
                    </Text>
                    <Text
                      style={[typography.body, styles.pickerCreateSubtitle]}
                      numberOfLines={1}
                    >
                      Bruk søket ditt som navn på øvelsen
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              ref={contentScrollRef}
              style={styles.content}
              contentContainerStyle={[
                styles.contentContainer,
                {
                  paddingBottom: Math.max(18, keyboardInsetHeight + 18),
                },
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === "ios" ? "interactive" : "on-drag"
              }
              showsVerticalScrollIndicator={false}
              onScroll={(event) => {
                contentScrollOffsetYRef.current =
                  event.nativeEvent.contentOffset.y;
              }}
              scrollEventThrottle={16}
            >
              {sortedExercises.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}>
                    <Ionicons
                      name="barbell-outline"
                      size={32}
                      color={overlayColors.muted2}
                    />
                  </View>
                  <Text style={[typography.body, styles.emptyTitle]}>
                    Ingen øvelser lagt til
                  </Text>
                  <Text style={[typography.body, styles.emptySubtitle]}>
                    Legg til øvelser for å starte økten
                  </Text>
                  <Pressable
                    onPress={() => setIsExercisePickerOpen(true)}
                    style={({ pressed }) => [
                      styles.emptyActionBtn,
                      pressed && { opacity: 0.92 },
                    ]}
                  >
                    <Ionicons
                      name="add-outline"
                      size={16}
                      color={overlayColors.accent}
                    />
                    <Text style={[typography.body, styles.emptyActionText]}>
                      Velg første øvelse
                    </Text>
                  </Pressable>
                </View>
              ) : (
                sortedExercises.map((ex) => (
                  <ExerciseBlock
                    key={ex.id}
                    exercise={ex}
                    coachRecommendation={
                      coachRecommendationsByLocalExerciseId[ex.id] ?? null
                    }
                    onAddSet={() => addSet(ex.id)}
                    onApplyCoachRecommendation={() => {
                      const recommendation =
                        coachRecommendationsByLocalExerciseId[ex.id];
                      if (!recommendation) return;
                      handleApplyCoachRecommendation(ex.id, recommendation);
                    }}
                    onInputFocus={handleSessionInputFocus}
                    onUpdateSet={(setId, partial) =>
                      updateSet(ex.id, setId, partial)
                    }
                    onRemoveSet={(setId) => removeSet(ex.id, setId)}
                  />
                ))
              )}
            </ScrollView>

            {/* FOOTER */}
            <View
              style={[
                styles.footer,
                { paddingBottom: Math.max(insets.bottom + 10, 16) },
              ]}
            >
              <Pressable
                onPress={handleFinish}
                disabled={isSaving}
                style={({ pressed }) => [
                  styles.finishWrap,
                  isSaving && styles.finishWrapDisabled,
                  pressed && { opacity: 0.96 },
                ]}
              >
                <View style={styles.finishButton}>
                  <Ionicons name="checkmark-done" size={18} color="white" />
                  <Text style={[typography.body, styles.finishText]}>
                    {isSaving ? "Lagrer..." : finishButtonLabel}
                  </Text>
                </View>
              </Pressable>
            </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
        {isSaveSummaryOpen && savePreviewWithPr && (
          <View style={styles.saveSummaryOverlay}>
            <Pressable
              style={styles.saveSummaryBackdrop}
              onPress={handleCloseSaveSummary}
            />

            <View style={styles.saveSummaryWrap} pointerEvents="box-none">
              <View style={styles.saveSummaryCard}>
                <LinearGradient
                  colors={[
                    "rgba(255,255,255,0.06)",
                    "rgba(255,255,255,0.02)",
                    "rgba(255,255,255,0.00)",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                  pointerEvents="none"
                />

                <View style={styles.saveSummaryHeader}>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[
                        typography.bodyBold,
                        styles.saveSummaryDisplayTitle,
                      ]}
                    >
                      Lagre trening
                    </Text>
                    <Text
                      style={[typography.bodyBold, styles.saveSummaryTitle]}
                    >
                      Sammendrag av økt
                    </Text>
                    <Text style={[typography.body, styles.saveSummarySubtitle]}>
                      Se over dette før du lagrer.
                    </Text>
                  </View>

                  <Pressable
                    onPress={handleCloseSaveSummary}
                    hitSlop={10}
                    style={styles.saveSummaryCloseBtn}
                  >
                    <Ionicons
                      name="close"
                      size={18}
                      color={overlayColors.text}
                    />
                  </Pressable>
                </View>

                <ScrollView
                  style={styles.saveSummaryContent}
                  contentContainerStyle={styles.saveSummaryContentContainer}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.saveSummarySection}>
                    {savePreviewWithPr.exercises.map((exercise) => (
                      <View
                        key={exercise.id}
                        style={styles.saveSummaryExerciseCard}
                      >
                        <View style={styles.saveSummaryExerciseHeader}>
                          <Text
                            style={[
                              typography.bodyBold,
                              styles.saveSummaryExerciseName,
                            ]}
                            numberOfLines={1}
                          >
                            {exercise.name}
                          </Text>
                        </View>

                        <View style={styles.saveSummarySetList}>
                          {exercise.sets.map((set) => (
                            <View key={set.id} style={styles.saveSummarySetRow}>
                              <Text
                                style={[
                                  typography.bodyBold,
                                  styles.saveSummarySetNumber,
                                ]}
                              >
                                {set.setNumber}
                              </Text>

                              <Text
                                style={[
                                  typography.body,
                                  styles.saveSummarySetDetails,
                                ]}
                                numberOfLines={1}
                              >
                                {formatSetSummary(set.reps, set.weightKg)}
                              </Text>

                              {set.isPr && (
                                <View
                                  style={[
                                    styles.saveSummaryPrWrap,
                                    styles.saveSummarySetPrWrap,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      typography.body,
                                      styles.saveSummaryPrLabel,
                                    ]}
                                  >
                                    PR
                                  </Text>
                                  <Ionicons
                                    name="trophy"
                                    size={13}
                                    color="#facc15"
                                  />
                                </View>
                              )}

                              <View style={styles.saveSummarySetMeta}>
                                {set.estimatedOneRmKg == null ? (
                                  <Text
                                    style={[
                                      typography.body,
                                      styles.saveSummarySetOneRmEmpty,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    Ingen 1RM
                                  </Text>
                                ) : (
                                  <Text
                                    style={[
                                      typography.body,
                                      styles.saveSummarySetOneRm,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    <Text style={styles.saveSummarySetOneRmValue}>
                                      {formatEstimatedOneRmValue(
                                        set.estimatedOneRmKg
                                      )}
                                    </Text>
                                    <Text style={styles.saveSummarySetOneRmUnit}>
                                      {" "}
                                      kg
                                    </Text>
                                    <Text style={styles.saveSummarySetOneRmLabel}>
                                      {" "}
                                      1RM
                                    </Text>
                                  </Text>
                                )}
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                  <View style={{ display: "none" }}>
                  <View style={styles.saveSummaryHero}>
                    <Text
                      style={[typography.bodyBold, styles.saveSummaryHeroTitle]}
                      numberOfLines={2}
                    >
                      {savePreviewWithPr.title}
                    </Text>

                    <View style={styles.saveSummaryStatsGrid}>
                      <View style={styles.saveSummaryStatCard}>
                        <Text
                          style={[
                            typography.body,
                            styles.saveSummaryStatLabel,
                          ]}
                        >
                          Varighet
                        </Text>
                        <Text
                          style={[
                            typography.bodyBold,
                            styles.saveSummaryStatValue,
                          ]}
                        >
                          {savePreviewWithPr.durationLabel}
                        </Text>
                      </View>

                      <View style={styles.saveSummaryStatCard}>
                        <Text
                          style={[
                            typography.body,
                            styles.saveSummaryStatLabel,
                          ]}
                        >
                          Øvelser
                        </Text>
                        <Text
                          style={[
                            typography.bodyBold,
                            styles.saveSummaryStatValue,
                          ]}
                        >
                          {savePreviewWithPr.exercisesCount}
                        </Text>
                      </View>

                      <View style={styles.saveSummaryStatCard}>
                        <Text
                          style={[
                            typography.body,
                            styles.saveSummaryStatLabel,
                          ]}
                        >
                          Ferdige sett
                        </Text>
                        <Text
                          style={[
                            typography.bodyBold,
                            styles.saveSummaryStatValue,
                          ]}
                        >
                          {savePreviewWithPr.completedSetsCount}
                        </Text>
                      </View>

                      <View style={styles.saveSummaryStatCard}>
                        <Text
                          style={[
                            typography.body,
                            styles.saveSummaryStatLabel,
                          ]}
                        >
                          {summaryPrimaryMetricLabel}
                        </Text>
                        <Text
                          style={[
                            typography.bodyBold,
                            styles.saveSummaryStatValue,
                          ]}
                          numberOfLines={1}
                        >
                          {summaryPrimaryMetricValue}
                        </Text>
                      </View>
                    </View>

                    {!!savePreviewWithPr.bestWeightKg && (
                      <View style={styles.saveSummaryHighlight}>
                        <Ionicons
                          name="barbell-outline"
                          size={15}
                          color={overlayColors.accent}
                        />
                        <Text
                          style={[
                            typography.body,
                            styles.saveSummaryHighlightText,
                          ]}
                        >
                          Tyngste registrerte sett:{" "}
                          {formatKg(savePreviewWithPr.bestWeightKg)}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.saveSummaryNotice}>
                    <Ionicons
                      name="information-circle-outline"
                      size={16}
                      color={overlayColors.accent}
                    />
                    <Text style={[typography.body, styles.saveSummaryNoticeText]}>
                      {skippedSetsMessage}
                    </Text>
                  </View>

                  <View style={styles.saveSummarySection}>
                    <Text
                      style={[typography.bodyBold, styles.saveSummarySectionTitle]}
                    >
                      Øvelser som lagres
                    </Text>

                    {savePreviewWithPr.exercises.map((exercise) => (
                      <View
                        key={exercise.id}
                        style={styles.saveSummaryExerciseRow}
                      >
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            style={[
                              typography.bodyBold,
                              styles.saveSummaryExerciseName,
                            ]}
                            numberOfLines={1}
                          >
                            {exercise.name}
                          </Text>
                          <Text
                            style={[
                              typography.body,
                              styles.saveSummaryExerciseMeta,
                            ]}
                            numberOfLines={2}
                          >
                            {`${exercise.setsCount} sett • ${exercise.totalReps} reps`}
                            {exercise.bestWeightKg != null
                              ? ` • Toppvekt ${formatKg(exercise.bestWeightKg)}`
                              : ""}
                          </Text>
                        </View>

                        {!!exercise.totalVolumeKg && (
                          <Text
                            style={[
                              typography.bodyBold,
                              styles.saveSummaryExerciseVolume,
                            ]}
                          >
                            {formatKg(exercise.totalVolumeKg)}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                  </View>
                </ScrollView>

                <View style={styles.saveSummaryFooter}>
                  <Pressable
                    onPress={handleCloseSaveSummary}
                    disabled={isSaving}
                    style={({ pressed }) => [
                      styles.saveSummarySecondaryBtn,
                      isSaving && styles.saveSummaryBtnDisabled,
                      pressed && { opacity: 0.92 },
                    ]}
                  >
                    <Text
                      style={[
                        typography.body,
                        styles.saveSummarySecondaryBtnText,
                      ]}
                    >
                      Avbryt
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleConfirmSave}
                    disabled={isSaving}
                    style={({ pressed }) => [
                      styles.saveSummaryPrimaryBtn,
                      isSaving && styles.saveSummaryBtnDisabled,
                      pressed && { opacity: 0.96 },
                    ]}
                  >
                    <Ionicons name="checkmark-done" size={17} color="white" />
                    <Text
                      style={[
                        typography.body,
                        styles.saveSummaryPrimaryBtnText,
                      ]}
                    >
                      {isSaving ? "Lagrer..." : saveSummaryConfirmLabel}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>

      <Modal
        visible={isExercisePickerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsExercisePickerOpen(false)}
      >
        <View
          style={[
            styles.pickerRoot,
            {
              paddingTop: Math.max(insets.top + 12, 24),
              paddingBottom: Math.max(insets.bottom + 14, 16),
            },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsExercisePickerOpen(false)}
          />

          <View style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[typography.bodyBold, styles.pickerTitle]}>
                  Legg til øvelse
                </Text>
                <Text style={[typography.body, styles.pickerSubtitle]}>
                  Velg fra øvelsesbiblioteket ditt
                </Text>
              </View>

              <Pressable
                onPress={() => setIsExercisePickerOpen(false)}
                hitSlop={10}
                style={styles.pickerCloseBtn}
              >
                <Ionicons name="close" size={18} color={overlayColors.text} />
              </Pressable>
            </View>

            {!!pickerToastMessage && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.pickerToast,
                  {
                    opacity: pickerToastAnim,
                    transform: [
                      {
                        translateY: pickerToastAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [8, 0],
                        }),
                      },
                      {
                        scale: pickerToastAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.98, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={["#0f172a", "#132b24", "#14253d"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <Ionicons
                  name="checkmark-circle"
                  size={15}
                  color={overlayColors.success}
                />
                <Text style={[typography.body, styles.pickerToastText]}>
                  {pickerToastMessage}
                </Text>
              </Animated.View>
            )}

            <View style={styles.pickerSearchWrap}>
              <Ionicons
                name="search-outline"
                size={16}
                color={overlayColors.muted2}
              />
              <TextInput
                value={exerciseSearch}
                onChangeText={setExerciseSearch}
                placeholder="Søk etter øvelse..."
                placeholderTextColor={overlayColors.muted2}
                style={styles.pickerSearchInput}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
              />
            </View>

            <View style={styles.pickerQuickActions}>
              <TouchableOpacity
                onPress={() => handleOpenCreateExerciseModal()}
                activeOpacity={0.84}
                accessibilityRole="button"
                style={styles.pickerCreateRow}
              >
                <View style={styles.pickerCreateIcon}>
                  <Ionicons
                    name="add-circle-outline"
                    size={18}
                    color={overlayColors.accent}
                  />
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={[typography.bodyBold, styles.pickerCreateTitle]}
                    numberOfLines={1}
                  >
                    Opprett ny øvelse
                  </Text>
                  <Text
                    style={[typography.body, styles.pickerCreateSubtitle]}
                    numberOfLines={1}
                  >
                    Lag en ny øvelse og legg den til i økten
                  </Text>
                </View>
              </TouchableOpacity>

              {false && canCreateExerciseFromSearch && (
                <TouchableOpacity
                  onPress={() =>
                    handleOpenCreateExerciseModal(trimmedExerciseSearch)
                  }
                  activeOpacity={0.84}
                  accessibilityRole="button"
                  style={styles.pickerCreateRow}
                >
                  <View style={styles.pickerCreateIcon}>
                    <Ionicons
                      name="sparkles-outline"
                      size={18}
                      color={overlayColors.accent}
                    />
                  </View>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[typography.bodyBold, styles.pickerCreateTitle]}
                      numberOfLines={1}
                    >
                      {`Opprett "${trimmedExerciseSearch}"`}
                    </Text>
                    <Text
                      style={[typography.body, styles.pickerCreateSubtitle]}
                      numberOfLines={1}
                    >
                      Bruk søket ditt som navn på øvelsen
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              style={styles.pickerList}
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}
            >
              {false && canCreateExerciseFromSearch && (
                <Pressable
                  onPress={() => setIsCreateExerciseOpen(true)}
                  style={({ pressed }) => [
                    styles.pickerCreateRow,
                    pressed && { opacity: 0.94 },
                  ]}
                >
                  <View style={styles.pickerCreateIcon}>
                    <Ionicons
                      name="add-circle-outline"
                      size={18}
                      color={overlayColors.accent}
                    />
                  </View>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[typography.bodyBold, styles.pickerCreateTitle]}
                      numberOfLines={1}
                    >
                      {`Opprett "${trimmedExerciseSearch}"`}
                    </Text>
                    <Text
                      style={[typography.body, styles.pickerCreateSubtitle]}
                      numberOfLines={1}
                    >
                      Ny øvelse legges rett inn i økten
                    </Text>
                  </View>
                </Pressable>
              )}
              {isLoadingExercises ? (
                <Text style={[typography.body, styles.pickerEmptyText]}>
                  Laster øvelser...
                </Text>
              ) : filteredPickerExercises.length === 0 ? (
                <Text style={[typography.body, styles.pickerEmptyText]}>
                  Ingen flere øvelser tilgjengelig for denne økten.
                </Text>
              ) : (
                filteredPickerExercises.map((exercise) => (
                  <Pressable
                    key={exercise.id}
                    onPress={() =>
                      handleAddExerciseToSession({
                        id: exercise.id,
                        name: exercise.name,
                        muscle: exercise.muscle ?? null,
                      })
                    }
                    style={({ pressed }) => [
                      styles.pickerRow,
                      pressed && { opacity: 0.92 },
                    ]}
                  >
                    <View style={styles.pickerRowIcon}>
                      <Ionicons
                        name="barbell-outline"
                        size={14}
                        color={overlayColors.text}
                      />
                    </View>

                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={[typography.bodyBold, styles.pickerRowTitle]}
                        numberOfLines={1}
                      >
                        {exercise.name}
                      </Text>
                      {!!exercise.muscle && (
                        <Text
                          style={[typography.body, styles.pickerRowSubtitle]}
                          numberOfLines={1}
                        >
                          {exercise.muscle}
                        </Text>
                      )}
                    </View>

                    <Ionicons
                      name="add-circle-outline"
                      size={18}
                      color={overlayColors.accent}
                    />
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      {saveSuccessToastOverlay}
      <AddExerciseModal
        visible={isCreateExerciseOpen}
        onClose={handleCloseCreateExerciseModal}
        onSubmit={handleCreateExerciseFromPicker}
        initialName={exerciseSearch.trim() || undefined}
        isSubmitting={createExerciseMutation.isPending}
        useModal={false}
      />
      </Modal>
    </>
  );
}

/**
 * ============================================================
 * STYLES
 * ============================================================
 */

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },

  saveSuccessModalRoot: {
    flex: 1,
  },

  backdropLayer: {
    ...StyleSheet.absoluteFillObject,
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: overlayColors.backdrop,
  },

  sheetWrap: {
    flex: 1,
    justifyContent: "flex-start",
    paddingTop: 36,
  },

  sheet: {
    flex: 1,
    marginHorizontal: 14,
    borderRadius: 22,
    backgroundColor: overlayColors.container,
    borderWidth: 1,
    borderColor: overlayColors.border,
    overflow: "hidden",
  },

  saveSuccessToast: {
    position: "absolute",
    top: 14,
    alignSelf: "center",
    zIndex: 6,
    maxWidth: "72%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: overlayColors.successBorder,
    backgroundColor: overlayColors.successBg,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },

  saveSuccessToastText: {
    color: overlayColors.text,
    fontSize: 12.5,
    fontWeight: "700",
  },

  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },

  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    gap: 10,
  },

  headerActionSpacer: {
    width: 38,
    height: 38,
    flexShrink: 0,
  },

  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: overlayColors.accentBg,
    borderWidth: 1,
    borderColor: overlayColors.accentDim,
  },

  headerTitle: {
    color: overlayColors.text,
    fontSize: 16,
    letterSpacing: 0.1,
  },

  headerSubtitle: {
    color: overlayColors.muted2,
    marginTop: 2,
    fontSize: 11,
    letterSpacing: 0.1,
  },

  titleEditWrap: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "100%",
    gap: 8,
  },

  headerTitleInput: {
    color: overlayColors.text,
    fontSize: 16,
    paddingVertical: 0,
    paddingHorizontal: 0,
    maxWidth: 240,
  },

  editPencil: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: overlayColors.accentBg,
    borderWidth: 1,
    borderColor: overlayColors.accentDim,
  },

  // Stats
  statsRow: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: overlayColors.surface,
    borderWidth: 1,
    borderColor: overlayColors.border,
    flexDirection: "row",
    paddingVertical: 5,
  },

  // Top actions
  topActions: {
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 10,
  },

  addExerciseTopBtn: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: overlayColors.accentDim,
    backgroundColor: overlayColors.accentBg,
  },

  addExerciseTopInner: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  addExerciseTopText: {
    color: overlayColors.accent,
    fontSize: 13,
    fontWeight: "700",
  },

  deleteTopBtn: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: overlayColors.dangerBorder,
    backgroundColor: overlayColors.dangerBg,
  },

  deleteTopInner: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  deleteTopText: {
    color: overlayColors.danger,
    fontSize: 13,
    fontWeight: "700",
  },

  // Content
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },

  contentContainer: {
    flexGrow: 1,
    paddingBottom: 18,
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 50,
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: overlayColors.surface,
    borderWidth: 1,
    borderColor: overlayColors.borderSoft,
    marginBottom: 16,
  },

  emptyTitle: {
    color: overlayColors.muted,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },

  emptySubtitle: {
    color: overlayColors.muted2,
    fontSize: 13,
  },

  emptyActionBtn: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: overlayColors.accentBg,
    borderWidth: 1,
    borderColor: overlayColors.accentDim,
  },

  emptyActionText: {
    color: overlayColors.accent,
    fontSize: 13,
    fontWeight: "700",
  },

  // Footer
  footer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: overlayColors.border,
    backgroundColor: overlayColors.container,
  },

  finishWrap: {
    borderRadius: 14,
    overflow: "hidden",
  },

  finishWrapDisabled: {
    opacity: 0.72,
  },

  finishButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    backgroundColor: overlayColors.accent,
    borderWidth: 1,
    borderColor: overlayColors.accentDim,
  },

  finishText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  saveSummaryOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },

  saveSummaryBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2,6,23,0.74)",
  },

  saveSummaryWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 28,
  },

  saveSummaryCard: {
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: overlayColors.container,
    borderWidth: 1,
    borderColor: overlayColors.border,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 6,
    maxHeight: "84%",
  },

  saveSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: overlayColors.borderSoft,
  },

  saveSummaryHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: overlayColors.accentBg,
    borderWidth: 1,
    borderColor: overlayColors.accentDim,
  },

  saveSummaryTitle: {
    display: "none",
    color: "transparent",
    fontSize: 0,
  },

  saveSummaryDisplayTitle: {
    color: overlayColors.text,
    fontSize: 16,
  },

  saveSummarySubtitle: {
    display: "none",
    color: "transparent",
    fontSize: 0,
    marginTop: 0,
  },

  saveSummaryCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: overlayColors.surface,
    borderWidth: 1,
    borderColor: overlayColors.borderSoft,
  },

  saveSummaryContent: {
    maxHeight: 460,
  },

  saveSummaryContentContainer: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
    gap: 18,
  },

  saveSummaryHero: {
    borderRadius: 18,
    backgroundColor: overlayColors.surface,
    borderWidth: 1,
    borderColor: overlayColors.borderSoft,
    padding: 14,
    gap: 14,
  },

  saveSummaryHeroTitle: {
    color: overlayColors.text,
    fontSize: 18,
  },

  saveSummaryStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  saveSummaryStatCard: {
    minWidth: "47%",
    flex: 1,
    borderRadius: 14,
    backgroundColor: overlayColors.input,
    borderWidth: 1,
    borderColor: overlayColors.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 4,
  },

  saveSummaryStatLabel: {
    color: overlayColors.muted2,
    fontSize: 11,
  },

  saveSummaryStatValue: {
    color: overlayColors.text,
    fontSize: 15,
  },

  saveSummaryHighlight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    backgroundColor: overlayColors.accentBg,
    borderWidth: 1,
    borderColor: overlayColors.accentDim,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  saveSummaryHighlightText: {
    flex: 1,
    color: overlayColors.text,
    fontSize: 12,
  },

  saveSummaryNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 14,
    backgroundColor: "rgba(14,165,233,0.08)",
    borderWidth: 1,
    borderColor: "rgba(14,165,233,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  saveSummaryNoticeText: {
    flex: 1,
    color: overlayColors.muted,
    fontSize: 12,
  },

  saveSummarySection: {
    gap: 18,
  },

  saveSummarySectionTitle: {
    color: overlayColors.text,
    fontSize: 14,
  },

  saveSummaryExerciseCard: {
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: overlayColors.borderSoft,
  },

  saveSummaryExerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 2,
    paddingBottom: 10,
  },

  saveSummaryPrWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  saveSummaryPrLabel: {
    color: "#facc15",
    fontSize: 11,
    fontWeight: "700",
  },

  saveSummarySetList: {
    paddingVertical: 2,
    gap: 8,
  },

  saveSummarySetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 2,
    paddingVertical: 6,
  },

  saveSummarySetMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
    marginLeft: "auto",
  },

  saveSummarySetNumber: {
    width: 28,
    color: overlayColors.muted2,
    fontSize: 12,
  },

  saveSummarySetDetails: {
    flex: 1,
    minWidth: 0,
    color: overlayColors.muted2,
    fontSize: 12.5,
  },

  saveSummarySetPrWrap: {
    flexShrink: 0,
  },

  saveSummarySetOneRm: {
    fontSize: 11.5,
    flexShrink: 0,
    minWidth: 78,
    textAlign: "right",
  },

  saveSummarySetOneRmValue: {
    color: overlayColors.accent,
    fontSize: 11.5,
    fontWeight: "600",
  },

  saveSummarySetOneRmUnit: {
    color: overlayColors.muted2,
    fontSize: 10.5,
    fontWeight: "500",
  },

  saveSummarySetOneRmLabel: {
    color: overlayColors.muted2,
    fontSize: 10.5,
    letterSpacing: 0.2,
    fontWeight: "500",
  },

  saveSummarySetOneRmEmpty: {
    color: overlayColors.muted2,
    fontSize: 11,
    flexShrink: 0,
    minWidth: 78,
    textAlign: "right",
  },

  saveSummaryExerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    backgroundColor: overlayColors.surface,
    borderWidth: 1,
    borderColor: overlayColors.borderSoft,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  saveSummaryExerciseName: {
    color: overlayColors.text,
    fontSize: 13,
  },

  saveSummaryExerciseMeta: {
    color: overlayColors.muted2,
    fontSize: 11.5,
    marginTop: 3,
  },

  saveSummaryExerciseVolume: {
    color: overlayColors.accent,
    fontSize: 12,
  },

  saveSummaryFooter: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: overlayColors.borderSoft,
  },

  saveSummarySecondaryBtn: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: overlayColors.surface,
    borderWidth: 1,
    borderColor: overlayColors.border,
    paddingHorizontal: 12,
  },

  saveSummarySecondaryBtnText: {
    color: overlayColors.text,
    fontSize: 13,
    fontWeight: "600",
  },

  saveSummaryPrimaryBtn: {
    flex: 1.2,
    minHeight: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: overlayColors.accent,
    borderWidth: 1,
    borderColor: overlayColors.accentDim,
    paddingHorizontal: 12,
  },

  saveSummaryPrimaryBtnText: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
  },

  saveSummaryBtnDisabled: {
    opacity: 0.72,
  },

  pickerRoot: {
    flex: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 14,
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  pickerCard: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: overlayColors.container,
    borderWidth: 1,
    borderColor: overlayColors.border,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },

  pickerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  pickerTitle: {
    color: overlayColors.text,
    fontSize: 16,
  },

  pickerSubtitle: {
    marginTop: 4,
    color: overlayColors.muted2,
    fontSize: 12,
  },

  pickerCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: overlayColors.surface,
    borderWidth: 1,
    borderColor: overlayColors.borderSoft,
  },

  pickerSearchWrap: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    backgroundColor: overlayColors.input,
    borderWidth: 1,
    borderColor: overlayColors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  pickerSearchInput: {
    flex: 1,
    color: overlayColors.text,
    fontSize: 14,
    paddingVertical: 0,
  },

  pickerList: {
    marginTop: 14,
    flex: 1,
  },

  pickerQuickActions: {
    marginTop: 12,
    gap: 10,
  },

  pickerEmptyText: {
    color: overlayColors.muted2,
    fontSize: 13,
    paddingVertical: 12,
  },

  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    backgroundColor: overlayColors.surface,
    borderWidth: 1,
    borderColor: overlayColors.borderSoft,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 10,
  },

  pickerCreateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    backgroundColor: overlayColors.accentBg,
    borderWidth: 1,
    borderColor: overlayColors.accentDim,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },

  pickerCreateIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: overlayColors.accentDim,
  },

  pickerCreateTitle: {
    color: overlayColors.text,
    fontSize: 13,
  },

  pickerCreateSubtitle: {
    color: overlayColors.accent,
    fontSize: 11,
    marginTop: 2,
  },

  pickerRowIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: overlayColors.accentBg,
    borderWidth: 1,
    borderColor: overlayColors.accentDim,
  },

  pickerRowTitle: {
    color: overlayColors.text,
    fontSize: 13,
  },

  pickerRowSubtitle: {
    color: overlayColors.muted2,
    fontSize: 11,
    marginTop: 2,
  },

  pickerToast: {
    position: "absolute",
    top: 35,
    left: 16,
    right: 16,
    zIndex: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: overlayColors.successBorder,
    backgroundColor: overlayColors.successBg,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },

  pickerToastText: {
    flex: 1,
    color: overlayColors.text,
    fontSize: 12.5,
    fontWeight: "600",
  },
});
