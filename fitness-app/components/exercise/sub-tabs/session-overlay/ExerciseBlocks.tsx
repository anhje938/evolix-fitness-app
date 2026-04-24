import { typography } from "@/config/typography";
import type { SessionExercise, SessionSet } from "@/types/exercise";
import {
  getWorkoutCoachPlanSummaryParts,
  type WorkoutCoachRecommendation,
} from "@/utils/exercise/workoutCoach";
import { parseNullableFloat } from "@/utils/session-overlay/parseNullableFloat";
import { parseNullableInt } from "@/utils/session-overlay/parseNullableInt";
import { Ionicons } from "@expo/vector-icons";
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import type { TextInput as RNTextInput } from "react-native";
import {
  Alert,
  Animated,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  State as GestureState,
  PanGestureHandler,
} from "react-native-gesture-handler";
import { clamp, isNonNegativeNumber, isPositiveInt } from "./overlayGuards";

/**
 * Premium Dark Ocean colors
 */
const overlayColors = {
  container: "#0F172A",
  surface: "rgba(30,58,138,0.22)",
  input: "rgba(15,23,42,0.82)",
  text: "#E5ECFF",
  muted: "rgba(148,163,184,0.9)",
  muted2: "rgba(148,163,184,0.7)",
  border: "rgba(6,182,212,0.16)",
  borderSoft: "rgba(148,163,184,0.12)",
  accent: "#06b6d4",
  accentDim: "rgba(6,182,212,0.34)",
  accentBg: "rgba(6,182,212,0.12)",
  green: "rgba(34,197,94,0.9)",
  greenBg: "rgba(34,197,94,0.12)",
  greenBorder: "rgba(34,197,94,0.25)",
  amber: "rgba(251,191,36,0.96)",
  amberBg: "rgba(251,191,36,0.12)",
  amberBorder: "rgba(251,191,36,0.25)",
  violet: "rgba(167,139,250,0.96)",
  violetBg: "rgba(167,139,250,0.12)",
  violetBorder: "rgba(167,139,250,0.25)",
  danger: "#ef4444",
};

const ROW_METRICS = {
  indexW: 22,
  doneW: 44,
  inputSideGap: 4,
  doneLeftGap: 6,
  rightBuffer: 8,
};

const WEIGHT_ADJUST_STEP = 0.5;

function formatWeightInputValue(weight: number | null | undefined) {
  if (weight == null) return "";
  return String(weight).replace(".", ",");
}

/**
 * ============================================================
 * SMALL UI COMPONENTS
 * ============================================================
 */

export const IconBtn = memo(function IconBtn({
  icon,
  onPress,
  label,
  showLabel = false,
  tone = "default",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label: string;
  showLabel?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.iconBtn,
        showLabel && styles.iconBtnWithLabel,
        tone === "danger" && styles.iconBtnDanger,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Ionicons
        name={icon}
        size={18}
        color={tone === "danger" ? overlayColors.danger : overlayColors.text}
      />
      {showLabel && (
        <Text
          style={[
            typography.bodyBold,
            styles.iconBtnLabel,
            tone === "danger" && styles.iconBtnLabelDanger,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
});

export const Stat = memo(function Stat({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={13} color={overlayColors.muted2} />
      <Text style={[typography.body, styles.statLabel]}>{label}</Text>
      <Text style={[typography.body, styles.statValue]}>{value}</Text>
    </View>
  );
});

export const Divider = memo(function Divider() {
  return <View style={styles.statsDivider} />;
});

const AdjustValueButton = memo(function AdjustValueButton({
  icon,
  label,
  onPress,
}: {
  icon: "add" | "remove";
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.adjustValueButton,
        pressed && { opacity: 0.88 },
      ]}
    >
      <Ionicons name={icon} size={13} color={overlayColors.text} />
    </Pressable>
  );
});

/**
 * ============================================================
 * EXERCISE BLOCK
 * ============================================================
 */

type ExerciseBlockProps = {
  exercise: SessionExercise;
  coachRecommendation?: WorkoutCoachRecommendation | null;
  onAddSet: () => void;
  onApplyCoachRecommendation?: () => void;
  onUpdateSet: (setId: string, partial: Partial<SessionSet>) => void;
  onRemoveSet: (setId: string) => void;
  onInputFocus?: (input: RNTextInput | null) => void;
};

const coachToneMap: Record<
  WorkoutCoachRecommendation["status"],
  {
    icon: keyof typeof Ionicons.glyphMap;
    tint: string;
    bg: string;
    border: string;
  }
> = {
  increase: {
    icon: "trending-up-outline",
    tint: overlayColors.green,
    bg: overlayColors.greenBg,
    border: overlayColors.greenBorder,
  },
  hold: {
    icon: "pause-circle-outline",
    tint: overlayColors.accent,
    bg: overlayColors.accentBg,
    border: overlayColors.accentDim,
  },
  decrease: {
    icon: "arrow-down-circle-outline",
    tint: overlayColors.amber,
    bg: overlayColors.amberBg,
    border: overlayColors.amberBorder,
  },
  plateau: {
    icon: "analytics-outline",
    tint: overlayColors.violet,
    bg: overlayColors.violetBg,
    border: overlayColors.violetBorder,
  },
  reentry: {
    icon: "refresh-circle-outline",
    tint: overlayColors.amber,
    bg: overlayColors.amberBg,
    border: overlayColors.amberBorder,
  },
};

const WorkoutCoachToggle = memo(function WorkoutCoachToggle({
  recommendation,
  isVisible,
  onPress,
}: {
  recommendation: WorkoutCoachRecommendation;
  isVisible: boolean;
  onPress: () => void;
}) {
  const tone = coachToneMap[recommendation.status];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.coachToggleButton,
        {
          borderColor: tone.border,
          backgroundColor: "rgba(255,255,255,0.03)",
        },
        pressed && { opacity: 0.94 },
      ]}
    >
      <View style={styles.coachToggleLeft}>
        <View
          style={[
            styles.coachToggleIconWrap,
            {
              backgroundColor: tone.bg,
              borderColor: tone.border,
            },
          ]}
        >
          <Ionicons name={tone.icon} size={15} color={tone.tint} />
        </View>

        <Text style={[typography.body, styles.coachToggleLabel]}>Coach</Text>
      </View>

      <View
        style={[
          styles.coachToggleActionWrap,
          {
            backgroundColor: "rgba(2,6,23,0.48)",
            borderColor: tone.border,
          },
        ]}
      >
        <Text style={[styles.coachToggleAction, { color: tone.tint }]}>
          {isVisible ? "Skjul" : "Vis"}
        </Text>
        <Ionicons
          name={isVisible ? "chevron-up" : "chevron-down"}
          size={16}
          color={tone.tint}
        />
      </View>
    </Pressable>
  );
});

const WorkoutCoachCard = memo(function WorkoutCoachCard({
  recommendation,
  canApply,
  onApply,
}: {
  recommendation: WorkoutCoachRecommendation;
  canApply: boolean;
  onApply?: () => void;
}) {
  const tone = coachToneMap[recommendation.status];
  const planSummary = getWorkoutCoachPlanSummaryParts(recommendation);
  const daysSinceLabel =
    recommendation.daysSinceLastSession === 0
      ? "Trent i dag"
      : recommendation.daysSinceLastSession === 1
      ? "1 dag siden"
      : `${recommendation.daysSinceLastSession} dager siden`;
  const applyLabel =
    recommendation.status === "increase"
      ? "Bruk neste steg"
      : recommendation.status === "hold"
      ? "Bruk oppsett"
      : recommendation.status === "reentry"
      ? "Bruk rolig start"
      : "Bruk forslag";

  return (
    <View
      style={[
        styles.coachCard,
        {
          backgroundColor: tone.bg,
          borderColor: tone.border,
        },
      ]}
    >
      <View style={styles.coachCardHeader}>
        <View style={styles.coachCardTitleWrap}>
          <View
            style={[
              styles.coachCardIconWrap,
              {
                backgroundColor: "rgba(2,6,23,0.28)",
                borderColor: tone.border,
              },
            ]}
          >
            <Ionicons name={tone.icon} size={15} color={tone.tint} />
          </View>

          <View style={styles.coachCardTitleCopy}>
            <Text style={[typography.body, styles.coachSectionLabel]}>
              Coach
            </Text>
            <Text style={[typography.bodyBold, styles.coachCardHeadline]}>
              {recommendation.headline}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.coachSectionBlock}>
        <Text style={[typography.body, styles.coachSectionLabel]}>
          Anbefalt sett
        </Text>
        <View style={styles.coachSummaryRow}>
          <Text style={[typography.body, styles.coachSummaryValue]}>
            {planSummary.setLabel}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={12}
            color={overlayColors.muted2}
            style={styles.coachSummaryArrow}
          />
          <Text style={[typography.body, styles.coachSummaryValue]}>
            {planSummary.detailLabel}
          </Text>
        </View>

        <Text style={[typography.body, styles.coachReason]}>
          {recommendation.reason}
        </Text>
      </View>

      <View style={styles.coachHistoryPill}>
        <View style={styles.coachHistoryHeader}>
          <View style={styles.coachHistoryTitleWrap}>
            <Ionicons
              name="time-outline"
              size={13}
              color={overlayColors.muted2}
            />
            <Text style={styles.coachHistoryLabel}>Sist logget</Text>
          </View>
          <View style={styles.coachHistoryTimeBadge}>
            <Text style={styles.coachHistoryTimeText}>{daysSinceLabel}</Text>
          </View>
        </View>

        <View style={styles.coachHistorySummaryRow}>
          <Text style={styles.coachHistoryValue}>
            {recommendation.lastSessionSetLabel}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={12}
            color={overlayColors.muted2}
          />
          <Text style={styles.coachHistoryValue}>
            {recommendation.lastSessionDetailLabel}
          </Text>
        </View>
      </View>

      {canApply && onApply ? (
        <Pressable
          onPress={onApply}
          style={({ pressed }) => [
            styles.coachApplyButton,
            {
              backgroundColor: "rgba(2,6,23,0.48)",
              borderColor: tone.border,
            },
            pressed && { opacity: 0.92 },
          ]}
        >
          <Ionicons name="sparkles-outline" size={14} color={tone.tint} />
          <Text style={[styles.coachApplyText, { color: tone.tint }]}>
            {applyLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
});

export const ExerciseBlock = memo(function ExerciseBlock({
  exercise,
  coachRecommendation,
  onAddSet,
  onApplyCoachRecommendation,
  onUpdateSet,
  onRemoveSet,
  onInputFocus,
}: ExerciseBlockProps) {
  const repsRefs = useRef<(RNTextInput | null)[]>([]);
  const weightRefs = useRef<(RNTextInput | null)[]>([]);
  const [focusedWeightSetId, setFocusedWeightSetId] = useState<string | null>(
    null
  );
  const [weightDrafts, setWeightDrafts] = useState<Record<string, string>>({});
  const [isCoachVisible, setIsCoachVisible] = useState(false);

  const ensuredForIdRef = useRef<string | null>(null);
  const didEnsureRef = useRef(false);
  if (ensuredForIdRef.current !== exercise.id) {
    ensuredForIdRef.current = exercise.id;
    didEnsureRef.current = false;
  }

  useEffect(() => {
    if (didEnsureRef.current) return;
    if (exercise.sets.length > 0) {
      didEnsureRef.current = true;
      return;
    }
    didEnsureRef.current = true;
    onAddSet();
  }, [exercise.sets.length, onAddSet]);

  useEffect(() => {
    setIsCoachVisible(false);
  }, [exercise.id]);

  useEffect(() => {
    setWeightDrafts((prev) => {
      const next: Record<string, string> = {};
      for (const set of exercise.sets) {
        if (prev[set.id] != null) next[set.id] = prev[set.id];
      }
      return next;
    });

    if (
      focusedWeightSetId &&
      !exercise.sets.some((set) => set.id === focusedWeightSetId)
    ) {
      setFocusedWeightSetId(null);
    }
  }, [exercise.sets, focusedWeightSetId]);

  const applyWeightValue = (setId: string, nextWeight: number | null) => {
    const normalizedWeight =
      nextWeight == null || !Number.isFinite(nextWeight) || nextWeight <= 0
        ? null
        : Math.round(nextWeight * 100) / 100;

    setWeightDrafts((prev) => {
      if (focusedWeightSetId !== setId && prev[setId] == null) {
        return prev;
      }

      return {
        ...prev,
        [setId]: formatWeightInputValue(normalizedWeight),
      };
    });

    onUpdateSet(setId, { weight: normalizedWeight });
  };

  const adjustReps = (set: SessionSet, delta: -1 | 1) => {
    const currentReps =
      set.reps != null && Number.isFinite(set.reps) ? set.reps : null;

    if (delta < 0) {
      if (currentReps == null) return;
      if (currentReps <= 1) {
        onUpdateSet(set.id, { reps: null });
        return;
      }
    }

    const nextReps = Math.max(1, (currentReps ?? 0) + delta);
    onUpdateSet(set.id, { reps: nextReps });
  };

  const adjustWeight = (set: SessionSet, delta: -1 | 1) => {
    const currentWeight =
      set.weight != null && Number.isFinite(set.weight) ? set.weight : null;

    if (delta < 0 && currentWeight == null) return;

    const nextWeight = Math.round(
      (((currentWeight ?? 0) + delta * WEIGHT_ADJUST_STEP) /
        WEIGHT_ADJUST_STEP) *
        WEIGHT_ADJUST_STEP *
        100
    ) / 100;

    if (nextWeight <= 0) {
      applyWeightValue(set.id, null);
      return;
    }

    applyWeightValue(set.id, nextWeight);
  };

  const toggleCompletedGuarded = (set: SessionSet, setIndex: number) => {
    const nextCompleted = !set.completed;

    if (nextCompleted) {
      if (!isPositiveInt(set.reps)) {
        Alert.alert("Mangler reps");
        return;
      }
      if (set.weight != null && !isNonNegativeNumber(set.weight)) {
        Alert.alert("Ugyldig vekt");
        return;
      }
    }

    onUpdateSet(set.id, { completed: nextCompleted });
  };

  const canCompleteSet = (set: SessionSet, setIndex: number) => {
    if (!isPositiveInt(set.reps)) {
      Alert.alert("Mangler reps");
      return false;
    }
    if (set.weight != null && !isNonNegativeNumber(set.weight)) {
      Alert.alert(
        "Ugyldig vekt",
        `${exercise.name} - sett ${setIndex}: vekt kan ikke være negativ`
      );
      return false;
    }

    return true;
  };

  const canApplyCoachRecommendation =
    !!coachRecommendation &&
    exercise.sets.every(
      (set) => !set.completed && set.reps == null && set.weight == null
    );

  const completeSetFromKeyboard = (set: SessionSet, setIndex: number) => {
    if (!set.completed) {
      if (!canCompleteSet(set, setIndex)) {
        return;
      }

      onUpdateSet(set.id, { completed: true });
    }

    Keyboard.dismiss();
  };

  return (
    <View style={styles.exerciseCard}>
      <View style={styles.exerciseHeaderRow}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={[typography.body, styles.exerciseTitle]}>
            {exercise.name}
          </Text>
          {!!exercise.muscle && (
            <Text style={[typography.body, styles.exerciseSubtitle]}>
              {exercise.muscle}
            </Text>
          )}
        </View>

        <Pressable
          onPress={onAddSet}
          hitSlop={8}
          style={({ pressed }) => [
            styles.addSetAction,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="add" size={16} color={overlayColors.accent} />
          <Text style={[typography.body, styles.addSetText]}>
            Legg til sett
          </Text>
        </Pressable>
      </View>

      {coachRecommendation ? (
        <>
          <WorkoutCoachToggle
            recommendation={coachRecommendation}
            isVisible={isCoachVisible}
            onPress={() => setIsCoachVisible((current) => !current)}
          />
          {isCoachVisible ? (
            <WorkoutCoachCard
              recommendation={coachRecommendation}
              canApply={canApplyCoachRecommendation}
              onApply={onApplyCoachRecommendation}
            />
          ) : null}
        </>
      ) : null}

      <View style={styles.setHeaderRow}>
        <Text style={[typography.body, styles.setHeaderIndex]}>#</Text>

        <View style={styles.headerCellWrap}>
          <Text style={[typography.body, styles.setHeaderCellText]}>Reps</Text>
        </View>

        <View style={styles.headerCellWrap}>
          <Text style={[typography.body, styles.setHeaderCellText]}>Kg</Text>
        </View>

        <View style={styles.headerDoneWrap}>
          <Text style={[typography.body, styles.setHeaderCellText]}>
            Ferdig
          </Text>
        </View>

        <View style={{ width: ROW_METRICS.rightBuffer }} />
      </View>

      {exercise.sets.map((set, idx) => (
        <SwipeToDeleteRow
          key={set.id}
          onDelete={() => onRemoveSet(set.id)}
          height={40}
          snapOpenThreshold={0.2}
        >
          <View style={styles.setRow}>
            <Text style={[typography.body, styles.setIndex]}>{idx + 1}</Text>

            <View style={styles.setControlWrap}>
              <AdjustValueButton
                icon="remove"
                label={`Reduser reps for sett ${idx + 1}`}
                onPress={() => adjustReps(set, -1)}
              />
              <TextInput
                ref={(el) => {
                  repsRefs.current[idx] = el;
                }}
                style={[typography.body, styles.setInput]}
                keyboardType="numeric"
                placeholder="-"
                placeholderTextColor={overlayColors.muted2}
                value={set.reps ?? set.reps === 0 ? String(set.reps) : ""}
                returnKeyType="next"
                submitBehavior="submit"
                onFocus={() => onInputFocus?.(repsRefs.current[idx])}
                onSubmitEditing={() => weightRefs.current[idx]?.focus()}
                onChangeText={(txt) =>
                  onUpdateSet(set.id, { reps: parseNullableInt(txt) })
                }
              />
              <AdjustValueButton
                icon="add"
                label={`Øk reps for sett ${idx + 1}`}
                onPress={() => adjustReps(set, 1)}
              />
            </View>

            <View style={styles.setControlWrap}>
              <AdjustValueButton
                icon="remove"
                label={`Reduser vekt for sett ${idx + 1}`}
                onPress={() => adjustWeight(set, -1)}
              />
              <TextInput
                ref={(el) => {
                  weightRefs.current[idx] = el;
                }}
                style={[typography.body, styles.setInput]}
                keyboardType="numeric"
                placeholder="-"
                placeholderTextColor={overlayColors.muted2}
                value={
                  focusedWeightSetId === set.id
                    ? weightDrafts[set.id] ?? formatWeightInputValue(set.weight)
                    : formatWeightInputValue(set.weight)
                }
                returnKeyType="done"
                submitBehavior="blurAndSubmit"
                onFocus={() => {
                  onInputFocus?.(weightRefs.current[idx]);
                  setFocusedWeightSetId(set.id);
                  setWeightDrafts((prev) => ({
                    ...prev,
                    [set.id]: prev[set.id] ?? formatWeightInputValue(set.weight),
                  }));
                }}
                onBlur={() => {
                  setFocusedWeightSetId((prev) =>
                    prev === set.id ? null : prev
                  );
                  setWeightDrafts((prev) => {
                    const next = { ...prev };
                    delete next[set.id];
                    return next;
                  });
                }}
                onSubmitEditing={() => completeSetFromKeyboard(set, idx + 1)}
                onChangeText={(txt) => {
                  setWeightDrafts((prev) => ({
                    ...prev,
                    [set.id]: txt,
                  }));

                  const normalized = txt.replace(",", ".");
                  onUpdateSet(set.id, {
                    weight: parseNullableFloat(normalized),
                  });
                }}
              />
              <AdjustValueButton
                icon="add"
                label={`Øk vekt for sett ${idx + 1}`}
                onPress={() => adjustWeight(set, 1)}
              />
            </View>

            <Pressable
              onPress={() => toggleCompletedGuarded(set, idx + 1)}
              hitSlop={10}
              style={({ pressed }) => [
                styles.doneBtn,
                set.completed && styles.doneBtnActive,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Ionicons
                name={
                  set.completed
                    ? "checkmark-circle"
                    : "checkmark-circle-outline"
                }
                size={18}
                color={set.completed ? overlayColors.green : overlayColors.text}
              />
            </Pressable>

            <View
              style={{ width: ROW_METRICS.rightBuffer }}
              pointerEvents="none"
            />
          </View>
        </SwipeToDeleteRow>
      ))}
    </View>
  );
});

/**
 * ============================================================
 * SWIPE TO DELETE ROW
 * ============================================================
 */

const SwipeToDeleteRow = memo(function SwipeToDeleteRow({
  children,
  onDelete,
  height,
  snapOpenThreshold = 0.2,
}: {
  children: React.ReactNode;
  onDelete: () => void;
  height: number;
  snapOpenThreshold?: number;
}) {
  const ACTION_W = 56;
  const GAP = ROW_METRICS.rightBuffer;
  const OPEN = ACTION_W + GAP;

  const baseX = useRef(new Animated.Value(0)).current;
  const dragX = useRef(new Animated.Value(0)).current;

  const baseNumRef = useRef(0);
  const dragNumRef = useRef(0);

  useEffect(() => {
    const sub = dragX.addListener(({ value }) => {
      dragNumRef.current = value;
    });
    return () => dragX.removeListener(sub);
  }, [dragX]);

  const translateX = useMemo(() => {
    return Animated.add(baseX, dragX).interpolate({
      inputRange: [-OPEN, 0],
      outputRange: [-OPEN, 0],
      extrapolate: "clamp",
    });
  }, [baseX, dragX, OPEN]);

  const setBaseTo = (v: number) => {
    baseNumRef.current = v;
    baseX.setValue(v);
  };

  const springBaseTo = (toValue: number) => {
    Animated.spring(baseX, {
      toValue,
      useNativeDriver: true,
      speed: 20,
      bounciness: 0,
    }).start(() => {
      baseNumRef.current = toValue;
    });
  };

  const close = () => {
    dragX.setValue(0);
    springBaseTo(0);
  };

  const actionTranslateX = useMemo(() => {
    return translateX.interpolate({
      inputRange: [-OPEN, 0],
      outputRange: [0, OPEN],
      extrapolate: "clamp",
    });
  }, [translateX, OPEN]);

  const actionOpacity = useMemo(() => {
    return translateX.interpolate({
      inputRange: [-OPEN, -10, 0],
      outputRange: [1, 1, 0],
      extrapolate: "clamp",
    });
  }, [translateX, OPEN]);

  const onGestureEvent = useMemo(
    () =>
      Animated.event([{ nativeEvent: { translationX: dragX } }], {
        useNativeDriver: true,
      }),
    [dragX]
  );

  const onHandlerStateChange = (evt: any) => {
    const state: GestureState = evt.nativeEvent.state;
    if (state !== GestureState.END && state !== GestureState.CANCELLED) return;

    const vx: number = evt.nativeEvent.velocityX ?? 0;

    const raw = baseNumRef.current + dragNumRef.current;
    const pos = clamp(raw, -OPEN, 0);

    setBaseTo(pos);
    dragX.setValue(0);

    const visibleFraction = Math.abs(pos) / OPEN;

    const shouldOpen =
      visibleFraction >= snapOpenThreshold || vx < -0.18 || pos < -OPEN * 0.18;

    springBaseTo(shouldOpen ? -OPEN : 0);
  };

  return (
    <View style={[styles.swipeRowWrap, { height }]}>
      <PanGestureHandler
        activeOffsetX={[-10, 10]}
        failOffsetY={[-12, 12]}
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View style={styles.swipeHandlerWrap}>
          <View style={styles.swipeUnderlay} pointerEvents="box-none">
            <Animated.View
              style={[
                styles.deleteActionFollow,
                {
                  width: ACTION_W,
                  height,
                  marginRight: GAP,
                  transform: [{ translateX: actionTranslateX }],
                  opacity: actionOpacity,
                },
              ]}
            >
              <Pressable
                onPress={() => {
                  close();
                  onDelete();
                }}
                style={styles.deleteActionPress}
              >
                <Ionicons name="trash-outline" size={20} color="white" />
              </Pressable>
            </Animated.View>
          </View>

          <Animated.View
            style={[styles.swipeForeground, { transform: [{ translateX }] }]}
          >
            {children}
          </Animated.View>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
});

/**
 * ============================================================
 * STYLES
 * ============================================================
 */

const styles = StyleSheet.create({
  // Small UI components
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: overlayColors.surface,
    borderWidth: 1,
    borderColor: overlayColors.borderSoft,
  },
  iconBtnWithLabel: {
    width: "auto",
    minWidth: 38,
    paddingHorizontal: 12,
    flexDirection: "row",
    gap: 8,
  },
  iconBtnDanger: {
    backgroundColor: "rgba(239,68,68,0.10)",
    borderColor: "rgba(239,68,68,0.24)",
  },
  iconBtnLabel: {
    color: overlayColors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  iconBtnLabelDanger: {
    color: overlayColors.danger,
  },

  stat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },

  statLabel: {
    color: overlayColors.muted2,
    fontSize: 9.5,
    fontWeight: "600",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },

  statValue: {
    color: overlayColors.text,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.1,
  },

  statsDivider: {
    width: 1,
    backgroundColor: overlayColors.borderSoft,
    marginVertical: 4,
  },

  // Exercise card
  exerciseCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: overlayColors.border,
    backgroundColor: overlayColors.surface,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },

  exerciseHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 10,
  },

  exerciseTitle: {
    color: overlayColors.text,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.1,
  },

  exerciseSubtitle: {
    color: overlayColors.muted2,
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.1,
  },

  addSetAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: overlayColors.accentBg,
    borderWidth: 1,
    borderColor: overlayColors.accentDim,
  },

  addSetText: {
    color: overlayColors.accent,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.1,
  },

  coachToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },

  coachToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
    flexWrap: "wrap",
  },

  coachToggleIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  coachToggleLabel: {
    color: overlayColors.text,
    fontSize: 12.5,
    fontWeight: "500",
    letterSpacing: 0.1,
  },

  coachToggleStatusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  coachToggleStatusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.15,
    textTransform: "uppercase",
  },

  coachToggleActionWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  coachToggleAction: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.1,
  },

  coachCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 10,
  },

  coachCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },

  coachCardTitleWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },

  coachCardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  coachCardTitleCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },

  coachCardHeadline: {
    color: overlayColors.text,
    fontSize: 13,
    lineHeight: 18,
  },

  coachCardStatusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },

  coachCardStatusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.15,
    textTransform: "uppercase",
  },

  coachSectionBlock: {
    gap: 8,
  },

  coachSectionLabel: {
    color: overlayColors.muted2,
    fontSize: 10.5,
    textTransform: "uppercase",
    letterSpacing: 0.35,
    fontWeight: "500",
  },

  coachSummary: {
    color: overlayColors.text,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "600",
  },

  coachSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    columnGap: 6,
    rowGap: 4,
  },

  coachSummaryValue: {
    color: overlayColors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
  },

  coachSummaryArrow: {
    marginTop: 1,
  },

  coachReason: {
    color: overlayColors.muted,
    fontSize: 12,
    lineHeight: 18,
  },

  coachHistoryPill: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(2,6,23,0.28)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },

  coachHistoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  coachHistoryTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },

  coachHistoryLabel: {
    color: overlayColors.muted2,
    fontSize: 11.5,
    fontWeight: "500",
  },

  coachHistoryTimeBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  coachHistoryTimeText: {
    color: overlayColors.text,
    fontSize: 10.5,
    fontWeight: "500",
  },

  coachHistorySummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    columnGap: 6,
    rowGap: 4,
  },

  coachHistoryValue: {
    color: overlayColors.text,
    fontSize: 12,
    fontWeight: "500",
  },

  coachApplyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 2,
  },

  coachApplyText: {
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: 0.1,
  },

  // Set rows
  setHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 2,
    paddingBottom: 8,
    opacity: 0.9,
  },

  setHeaderIndex: {
    width: ROW_METRICS.indexW,
    textAlign: "center",
    color: overlayColors.muted2,
    fontSize: 11,
    fontWeight: "700",
  },

  headerCellWrap: {
    flex: 1,
    marginHorizontal: ROW_METRICS.inputSideGap,
    alignItems: "center",
  },

  headerDoneWrap: {
    width: ROW_METRICS.doneW,
    marginLeft: ROW_METRICS.doneLeftGap,
    alignItems: "center",
    justifyContent: "center",
  },

  setHeaderCellText: {
    color: overlayColors.muted2,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },

  setRow: { flexDirection: "row", alignItems: "center", height: 40 },

  setIndex: {
    width: ROW_METRICS.indexW,
    textAlign: "center",
    color: overlayColors.muted2,
    fontSize: 12,
    fontWeight: "700",
  },

  setControlWrap: {
    flex: 1,
    backgroundColor: overlayColors.input,
    borderRadius: 12,
    paddingHorizontal: 4,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: ROW_METRICS.inputSideGap,
    borderWidth: 1,
    borderColor: "rgba(6,182,212,0.14)",
  },

  adjustValueButton: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(6,182,212,0.08)",
    borderWidth: 1,
    borderColor: "rgba(6,182,212,0.14)",
  },

  setInput: {
    flex: 1,
    color: overlayColors.text,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 0,
    paddingHorizontal: 8,
    minWidth: 0,
  },

  doneBtn: {
    width: ROW_METRICS.doneW,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: overlayColors.surface,
    borderWidth: 1,
    borderColor: overlayColors.borderSoft,
    marginLeft: ROW_METRICS.doneLeftGap,
  },

  doneBtnActive: {
    borderColor: overlayColors.greenBorder,
    backgroundColor: overlayColors.greenBg,
  },

  // Swipe to delete
  swipeRowWrap: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
    backgroundColor: "transparent",
  },

  swipeHandlerWrap: { width: "100%", height: "100%" },

  swipeUnderlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "flex-end",
  },

  swipeForeground: { width: "100%", height: "100%", justifyContent: "center" },

  deleteActionFollow: {
    borderRadius: 10,
    backgroundColor: overlayColors.danger,
    overflow: "hidden",
  },

  deleteActionPress: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
