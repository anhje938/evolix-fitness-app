import { Paywall } from "@/components/subscription/Paywall";
import { useSubscription } from "@/context/SubscriptionProvider";
import { typography } from "@/config/typography";
import type { Exercise, Workout } from "@/types/exercise";
import type { AppLanguage } from "@/types/userSettings";
import { translate } from "@/i18n/translations";
import { getMuscleLabel } from "@/types/muscles";
import { getWorkoutDisplay } from "@/utils/exercise/localizedTraining";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo, useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const colors = {
  cardSolid: "rgba(7,22,52,0.97)",
  glassTop: "rgba(255,255,255,0.06)",
  glassMid: "rgba(255,255,255,0.022)",
  glassNone: "rgba(197, 7, 7, 0)",
  borderSoft: "rgba(96,165,250,0.20)",
  insetStroke: "rgba(255,255,255,0.045)",
  divider: "rgba(148,163,184,0.12)",
  text: "rgba(248,250,252,0.96)",
  muted: "rgba(191,219,254,0.80)",
  muted2: "rgba(148,163,184,0.76)",
  rowBg: "rgba(10,31,68,0.94)",
  rowStroke: "rgba(96,165,250,0.18)",
  rowIndexBg: "rgba(7,20,46,0.96)",
  rowIndexStroke: "rgba(96,165,250,0.24)",
  iconBg: "rgba(10,30,66,0.98)",
  iconStroke: "rgba(96,165,250,0.22)",
  pillBg: "rgba(255,255,255,0.055)",
  pillStroke: "rgba(255,255,255,0.09)",
  pillText: "rgba(226,232,240,0.82)",
  cyanDot: "#22d3ee",
  emeraldDot: "#2dd4bf",
  premiumBg: "rgba(251,191,36,0.12)",
  premiumBorder: "rgba(251,191,36,0.22)",
  premiumText: "#FDE68A",
  premiumCard: "rgba(44,34,18,0.94)",
  premiumGlow: "rgba(251,191,36,0.22)",
  premiumStroke: "rgba(251,191,36,0.34)",
  actionStroke: "rgba(96,165,250,0.18)",
  startStroke: "rgba(255,255,255,0.16)",
};

type StartWorkoutPayload = {
  workoutProgramId: string | null;
  workoutId: string;
  name: string;
  exercises: { exerciseId: string; name: string; muscle?: string | null }[];
};

type Props = {
  workouts: Workout[];
  exercises: Exercise[];
  language: AppLanguage;
  onEdit: (workout: Workout) => void;
  onStart: (payload: StartWorkoutPayload) => void;
};

function estimateWorkoutMinutes(exerciseCount: number) {
  if (exerciseCount <= 0) return 20;
  return Math.max(20, Math.min(90, exerciseCount * 10));
}

function getExerciseAccent(index: number) {
  const mod = index % 3;
  if (mod === 0) {
    return {
      bg: "rgba(37,99,235,0.10)",
      border: "rgba(96,165,250,0.18)",
    };
  }

  if (mod === 1) {
    return {
      bg: "rgba(34,211,238,0.08)",
      border: "rgba(34,211,238,0.16)",
    };
  }

  return {
    bg: "rgba(45,212,191,0.08)",
    border: "rgba(45,212,191,0.16)",
  };
}

function exerciseCountLabel(count: number, language: AppLanguage) {
  if (language === "en") return `${count} exercise${count === 1 ? "" : "s"}`;
  return `${count} øvelse${count === 1 ? "" : "r"}`;
}

export const WorkoutList = memo(function WorkoutList({
  workouts,
  exercises,
  language,
  onEdit,
  onStart,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const { isPremium } = useSubscription();

  const toggleExpanded = useCallback((workoutId: string) => {
    setExpandedId((prev) => (prev === workoutId ? null : workoutId));
  }, []);

  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>();
    exercises.forEach((exercise) => map.set(exercise.id, exercise));
    return map;
  }, [exercises]);

  if (workouts.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIcon}>
          <Ionicons name="barbell-outline" size={18} color={colors.text} />
        </View>

        <Text style={[typography.h2, styles.emptyTitle]}>
          {translate(language, "workoutEmptyTitle")}
        </Text>

        <Text style={[typography.body, styles.emptySub]}>
          {translate(language, "workoutEmptyBody")}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {workouts.map((workout) => {
        const exercisesInWorkout =
          workout.exerciseIds
            ?.map((id) => exerciseMap.get(id))
            ?.filter((item): item is Exercise => !!item) ?? [];

        const exerciseCount = exercisesInWorkout.length;
        const estimatedMinutes = estimateWorkoutMinutes(exerciseCount);
        const isExpanded = expandedId === workout.id;
        const requiresPremium =
          workout.isPremium === true ||
          workout.workoutProgramIsPremium === true;
        const isWorkoutLocked = requiresPremium && !isPremium;
        const display = getWorkoutDisplay(workout, language);

        const startPayload: StartWorkoutPayload = {
          workoutProgramId: workout.workoutProgramId ?? null,
          workoutId: workout.id,
          name: display.name,
          exercises: exercisesInWorkout.map((exercise) => ({
            exerciseId: exercise.id,
            name: exercise.name,
            muscle: exercise.muscle,
          })),
        };

        const handleToggle = () => {
          if (isWorkoutLocked) {
            setPaywallVisible(true);
            return;
          }

          toggleExpanded(workout.id);
        };

        return (
          <View
            key={workout.id}
            style={[styles.cardOuter, requiresPremium && styles.cardOuterPremium]}
          >
            <View
              pointerEvents="none"
              style={[styles.base, requiresPremium && styles.basePremium]}
            />

            <LinearGradient
              colors={[colors.glassTop, colors.glassMid, colors.glassNone]}
              start={{ x: 0.05, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            <LinearGradient
              colors={
                requiresPremium
                  ? [
                      "rgba(251,191,36,0.26)",
                      "rgba(245,158,11,0.12)",
                      "rgba(255,255,255,0.00)",
                    ]
                  : [
                      "rgba(59,130,246,0.24)",
                      "rgba(34,211,238,0.14)",
                      "rgba(255,255,255,0.00)",
                    ]
              }
              start={{ x: 1, y: 0 }}
              end={{ x: 0.2, y: 1 }}
              style={styles.accentSheen}
              pointerEvents="none"
            />

            <View
              pointerEvents="none"
              style={[styles.outerStroke, requiresPremium && styles.outerStrokePremium]}
            />
            <View pointerEvents="none" style={styles.innerInset} />

            <View style={styles.cardInner}>
              <View style={styles.topRow}>
                <Pressable
                  onPress={handleToggle}
                  style={({ pressed }) => [
                    styles.headerPress,
                    pressed && styles.headerPressed,
                  ]}
                  hitSlop={8}
                >
                  <View style={styles.headerMainRow}>
                    <View
                      style={[
                        styles.iconCircle,
                        requiresPremium && styles.iconCirclePremium,
                      ]}
                    >
                      <Ionicons
                        name="barbell-outline"
                        size={15}
                        color={requiresPremium ? colors.premiumText : colors.cyanDot}
                      />
                    </View>

                    <View style={styles.headerTextWrap}>
                      <View style={styles.titleRow}>
                        <Text
                          style={[typography.bodyBold, styles.title]}
                          numberOfLines={1}
                        >
                          {display.name}
                        </Text>

                        {requiresPremium ? (
                          <View style={styles.premiumBadge}>
                            <Ionicons
                              name="lock-closed"
                              size={10}
                              color={colors.premiumText}
                            />
                            <Text style={styles.premiumBadgeText}>Premium</Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.metaRow}>
                        <View style={styles.metaInline}>
                          <Ionicons
                            name="heart-outline"
                            size={12}
                            color={colors.muted2}
                          />
                          <Text style={styles.metaInlineText}>
                            {exerciseCountLabel(exerciseCount, language)}
                          </Text>
                        </View>

                        <View style={styles.metaDivider} />

                        <View style={styles.metaInline}>
                          <Ionicons
                            name="time-outline"
                            size={12}
                            color={colors.muted2}
                          />
                          <Text style={styles.metaInlineText}>
                            {estimatedMinutes} min
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </Pressable>

                <View style={styles.rightCol}>
                  <View
                    style={[
                      styles.statusDot,
                      isWorkoutLocked ? styles.statusDotLocked : null,
                    ]}
                  />

                  <View style={styles.actionButtonsRow}>
                    <Pressable
                      onPress={() => {
                        if (isWorkoutLocked) {
                          setPaywallVisible(true);
                          return;
                        }

                        onEdit(workout);
                      }}
                      style={({ pressed }) => [
                        styles.actionButton,
                        pressed && styles.iconPressed,
                      ]}
                      hitSlop={8}
                    >
                      <Ionicons
                        name="pencil-outline"
                        size={15}
                        color={colors.text}
                      />
                    </Pressable>

                    <Pressable
                      onPress={handleToggle}
                      style={({ pressed }) => [
                        styles.actionButton,
                        pressed && styles.iconPressed,
                      ]}
                      hitSlop={10}
                    >
                      <Ionicons
                        name={
                          isExpanded
                            ? "chevron-up-outline"
                            : "chevron-down-outline"
                        }
                        size={17}
                        color={colors.text}
                      />
                    </Pressable>
                  </View>
                </View>
              </View>

              {isExpanded ? (
                <View style={styles.dropdown}>
                  {exercisesInWorkout.length === 0 ? (
                    <Text style={[typography.body, styles.emptyText]}>
                      {translate(language, "workoutNoSelectedExercises")}
                    </Text>
                  ) : (
                    <View style={styles.exerciseList}>
                      {exercisesInWorkout.map((exercise, index) => {
                        const accent = getExerciseAccent(index);

                        return (
                          <View
                            key={exercise.id}
                            style={[
                              styles.exerciseRow,
                              {
                                backgroundColor: accent.bg,
                                borderColor: accent.border,
                              },
                            ]}
                          >
                            <View style={styles.dragDots}>
                              <Ionicons
                                name="reorder-two-outline"
                                size={14}
                                color="rgba(148,163,184,0.54)"
                              />
                            </View>

                            <View style={styles.exerciseIndex}>
                              <Text
                                style={[typography.bodyBlack, styles.indexText]}
                              >
                                {index + 1}
                              </Text>
                            </View>

                            <View style={styles.exerciseInfo}>
                              <Text
                                style={[
                                  typography.bodyBold,
                                  styles.exerciseName,
                                ]}
                                numberOfLines={1}
                              >
                                {exercise.name}
                              </Text>
                            </View>

                            <View style={styles.exerciseRightMeta}>
                              {!!exercise.muscle && (
                                <View style={styles.musclePill}>
                                  <Text
                                    style={[
                                      typography.bodyBlack,
                                      styles.musclePillText,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {getMuscleLabel(exercise.muscle, language)}
                                  </Text>
                                </View>
                              )}

                              <Ionicons
                                name="bar-chart-outline"
                                size={15}
                                color={colors.cyanDot}
                              />
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              ) : null}

              <View style={styles.actions}>
                <Pressable
                  onPress={() => {
                    if (isWorkoutLocked) {
                      setPaywallVisible(true);
                      return;
                    }

                    onStart(startPayload);
                  }}
                  style={({ pressed }) => [
                    styles.primaryWrap,
                    pressed && styles.startPressed,
                  ]}
                >
                  <LinearGradient
                    colors={
                      requiresPremium
                        ? ["rgba(180,83,9,0.98)", "rgba(251,191,36,0.92)"]
                        : ["rgba(99,102,241,0.96)", "rgba(6,182,212,0.92)"]
                    }
                    start={{ x: 0, y: 0.1 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primary}
                  >
                    <Ionicons
                      name={isWorkoutLocked ? "lock-closed" : "play"}
                      size={15}
                      color="white"
                    />
                    <Text style={[typography.bodyBold, styles.primaryText]}>
                      {isWorkoutLocked
                        ? language === "en"
                          ? "Unlock"
                          : "Lås opp"
                        : language === "en"
                          ? "Start workout"
                          : "Start økt"}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </View>
        );
      })}

      <Paywall
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        onUnlocked={() => setPaywallVisible(false)}
        source="premium-workout"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  list: {
    gap: 14,
  },
  emptyWrap: {
    paddingTop: 18,
    paddingHorizontal: 6,
    gap: 8,
  },
  emptyIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  emptyTitle: {
    color: colors.text,
  },
  emptySub: {
    color: colors.muted2,
    fontSize: 13,
  },
  inlinePlus: {
    color: colors.text,
  },
  cardOuter: {
    borderRadius: 22,
    overflow: "hidden",
  },
  cardOuterPremium: {
    shadowColor: colors.premiumGlow,
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.cardSolid,
  },
  basePremium: {
    backgroundColor: colors.premiumCard,
  },
  accentSheen: {
    position: "absolute",
    top: -44,
    right: -70,
    width: 240,
    height: 200,
    borderRadius: 999,
    opacity: 0.9,
  },
  outerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  outerStrokePremium: {
    borderColor: colors.premiumStroke,
  },
  innerInset: {
    position: "absolute",
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.insetStroke,
  },
  cardInner: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  headerPress: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
  },
  headerPressed: {
    opacity: 0.96,
  },
  headerMainRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.iconBg,
    borderWidth: 1,
    borderColor: colors.iconStroke,
  },
  iconCirclePremium: {
    backgroundColor: "rgba(120,83,18,0.42)",
    borderColor: "rgba(251,191,36,0.32)",
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
    paddingTop: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    letterSpacing: 0.08,
    flexShrink: 1,
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: "rgba(251,191,36,0.12)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.2)",
  },
  premiumBadgeText: {
    color: "#FDE68A",
    fontSize: 10,
    fontWeight: "900",
  },
  metaRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  metaInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaInlineText: {
    color: colors.muted2,
    fontSize: 12.5,
    fontWeight: "600",
  },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.40)",
  },
  rightCol: {
    alignItems: "flex-end",
    gap: 10,
    paddingTop: 4,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: colors.cyanDot,
  },
  statusDotLocked: {
    backgroundColor: colors.emeraldDot,
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.iconBg,
    borderWidth: 1,
    borderColor: colors.actionStroke,
  },
  iconPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  dropdown: {
    gap: 8,
  },
  emptyText: {
    color: colors.muted2,
    fontSize: 13,
    fontStyle: "italic",
    paddingTop: 2,
  },
  exerciseList: {
    gap: 6,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  dragDots: {
    width: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseIndex: {
    width: 24,
    height: 24,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.rowIndexBg,
    borderWidth: 1,
    borderColor: colors.rowIndexStroke,
  },
  indexText: {
    color: "rgba(226,232,240,0.88)",
    fontSize: 11,
    fontWeight: "900",
  },
  exerciseInfo: {
    flex: 1,
    minWidth: 0,
  },
  exerciseName: {
    color: colors.text,
    fontSize: 13,
  },
  exerciseRightMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 6,
  },
  musclePill: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.pillBg,
    borderWidth: 1,
    borderColor: colors.pillStroke,
    maxWidth: 94,
  },
  musclePillText: {
    color: colors.pillText,
    fontSize: 10,
    fontWeight: "800",
  },
  actions: {
    marginTop: 2,
  },
  primaryWrap: {
    width: "100%",
  },
  startPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  primary: {
    minHeight: 50,
    borderRadius: 999,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderColor: colors.startStroke,
  },
  primaryText: {
    color: "white",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.12,
  },
});
