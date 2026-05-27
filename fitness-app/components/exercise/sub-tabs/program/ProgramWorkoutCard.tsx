import { Paywall } from "@/components/subscription/Paywall";
import { typography } from "@/config/typography";
import { useSubscription } from "@/context/SubscriptionProvider";
import type { Exercise, Workout } from "@/types/exercise";
import type { AppLanguage } from "@/types/userSettings";
import { getMuscleLabel } from "@/types/muscles";
import { getWorkoutDisplay } from "@/utils/exercise/localizedTraining";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const colors = {
  cardSolid: "rgba(6,20,46,0.97)",
  glassTop: "rgba(255,255,255,0.055)",
  glassMid: "rgba(255,255,255,0.02)",
  glassNone: "rgba(255,255,255,0)",
  borderSoft: "rgba(96,165,250,0.18)",
  insetStroke: "rgba(255,255,255,0.045)",
  divider: "rgba(148,163,184,0.12)",
  text: "rgba(248,250,252,0.96)",
  muted: "rgba(191,219,254,0.78)",
  muted2: "rgba(148,163,184,0.76)",
  iconBg: "rgba(10,30,66,0.98)",
  iconStroke: "rgba(96,165,250,0.2)",
  pillBg: "rgba(255,255,255,0.055)",
  pillStroke: "rgba(255,255,255,0.09)",
  pillText: "rgba(226,232,240,0.82)",
  cyan: "#22d3ee",
  premiumBg: "rgba(251,191,36,0.12)",
  premiumBorder: "rgba(251,191,36,0.2)",
  premiumText: "#FDE68A",
  premiumCard: "rgba(44,34,18,0.94)",
  premiumGlow: "rgba(251,191,36,0.22)",
  premiumStroke: "rgba(251,191,36,0.34)",
  startStroke: "rgba(255,255,255,0.16)",
};

type Props = {
  workout: Workout;
  programId: string;
  exerciseMap: Map<string, Exercise>;
  language: AppLanguage;
  onStart: (payload: {
    workoutProgramId: string;
    workoutId: string;
    name: string;
    exercises: { exerciseId: string; name: string; muscle?: string | null }[];
  }) => void;
};

function estimateWorkoutMinutes(exerciseCount: number) {
  if (exerciseCount <= 0) return 20;
  return Math.max(20, Math.min(90, exerciseCount * 10));
}

export const ProgramWorkoutCard = memo(function ProgramWorkoutCard({
  workout,
  programId,
  exerciseMap,
  language,
  onStart,
}: Props) {
  const { isPremium } = useSubscription();
  const [paywallVisible, setPaywallVisible] = useState(false);

  const exercisesForWorkout = useMemo(() => {
    return (workout.exerciseIds ?? [])
      .map((id) => exerciseMap.get(id))
      .filter((exercise): exercise is Exercise => !!exercise)
      .map((exercise) => ({
        exerciseId: exercise.id,
        name: exercise.name,
        muscle: exercise.muscle,
      }));
  }, [workout.exerciseIds, exerciseMap]);

  const display = getWorkoutDisplay(workout, language);

  const subtitle = useMemo(() => {
    const muscleNames = (workout.exerciseIds ?? [])
      .map((id) => exerciseMap.get(id)?.muscle)
      .filter((value): value is string => !!value)
      .map((value) => value.trim())
      .filter(Boolean);

    const uniqueMuscles = [...new Set(muscleNames)];
    if (uniqueMuscles.length > 0) {
      return uniqueMuscles
        .slice(0, 3)
        .map((muscle) => getMuscleLabel(muscle, language))
        .join(", ");
    }

    return display.dayLabel || display.description || "";
  }, [display.dayLabel, display.description, workout.exerciseIds, exerciseMap, language]);

  const exerciseCount = exercisesForWorkout.length;
  const estimatedMinutes = estimateWorkoutMinutes(exerciseCount);
  const requiresPremium =
    workout.isPremium === true || workout.workoutProgramIsPremium === true;
  const isWorkoutLocked = requiresPremium && !isPremium;

  return (
    <View style={[styles.cardOuter, requiresPremium && styles.cardOuterPremium]}>
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
                "rgba(251,191,36,0.25)",
                "rgba(245,158,11,0.12)",
                "rgba(255,255,255,0)",
              ]
            : [
                "rgba(59,130,246,0.18)",
                "rgba(34,211,238,0.1)",
                "rgba(255,255,255,0)",
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
              color={requiresPremium ? colors.premiumText : colors.cyan}
            />
          </View>

          <View style={styles.headerTextWrap}>
            <View style={styles.titleRow}>
              <Text style={[typography.bodyBold, styles.title]} numberOfLines={1}>
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
                  {language === "en"
                    ? `${exerciseCount} exercise${exerciseCount === 1 ? "" : "s"}`
                    : `${exerciseCount} øvelse${exerciseCount === 1 ? "" : "r"}`}
                </Text>
              </View>

              <View style={styles.metaDivider} />

              <View style={styles.metaInline}>
                <Ionicons
                  name="time-outline"
                  size={12}
                  color={colors.muted2}
                />
                <Text style={styles.metaInlineText}>{estimatedMinutes} min</Text>
              </View>
            </View>

            {!!subtitle ? (
              <View style={styles.subtitlePill}>
                <Text
                  style={[typography.bodyBlack, styles.subtitleText]}
                  numberOfLines={1}
                >
                  {subtitle}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => {
              if (isWorkoutLocked) {
                setPaywallVisible(true);
                return;
              }

              onStart({
                workoutProgramId: programId,
                workoutId: workout.id,
                name: display.name,
                exercises: exercisesForWorkout,
              });
            }}
            hitSlop={10}
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
  cardOuter: {
    borderRadius: 22,
    overflow: "hidden",
  },
  cardOuterPremium: {
    shadowColor: colors.premiumGlow,
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
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
    width: 220,
    height: 180,
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
    fontSize: 17,
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
    backgroundColor: colors.premiumBg,
    borderWidth: 1,
    borderColor: colors.premiumBorder,
  },
  premiumBadgeText: {
    color: colors.premiumText,
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
    backgroundColor: "rgba(148,163,184,0.4)",
  },
  subtitlePill: {
    marginTop: 9,
    alignSelf: "flex-start",
    maxWidth: "100%",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.pillBg,
    borderWidth: 1,
    borderColor: colors.pillStroke,
  },
  subtitleText: {
    color: colors.pillText,
    fontSize: 10.5,
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
