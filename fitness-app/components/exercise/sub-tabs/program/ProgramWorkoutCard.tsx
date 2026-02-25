// components/exercise/sub-tabs/program/ProgramWorkoutCard.tsx
import { typography } from "@/config/typography";
import type { Exercise, Workout } from "@/types/exercise";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const colors = {
  // Card base (higher contrast than ProgramList card)
  cardSolid: "rgba(10,16,30,0.92)",
  glassTop: "rgba(255,255,255,0.055)",
  glassMid: "rgba(255,255,255,0.020)",
  glassNone: "rgba(255,255,255,0.00)",

  // Strokes
  borderSoft: "rgba(255,255,255,0.08)",
  insetStroke: "rgba(255,255,255,0.05)",

  // Text
  text: "rgba(255,255,255,0.94)",
  muted: "rgba(148,163,184,0.92)",
  muted2: "rgba(148,163,184,0.74)",

  // Subtle neon tints
  indigoBg: "rgba(99,102,241,0.10)",
  indigoStroke: "rgba(99,102,241,0.22)",
  cyanBg: "rgba(34,211,238,0.085)",
  cyanStroke: "rgba(34,211,238,0.20)",
  emeraldBg: "rgba(16,185,129,0.080)",
  emeraldStroke: "rgba(16,185,129,0.18)",

  // Chips (base)
  chipBg: "rgba(255,255,255,0.042)",
  chipStroke: "rgba(255,255,255,0.10)",

  // Count pill
  countBg: "rgba(255,255,255,0.060)",
  countStroke: "rgba(255,255,255,0.12)",

  // Button
  btnStroke: "rgba(255,255,255,0.18)",
};

type Props = {
  workout: Workout;
  programId: string;
  exerciseMap: Map<string, Exercise>;
  onStart: (payload: {
    workoutProgramId: string;
    workoutId: string;
    name: string;
    exercises: { exerciseId: string; name: string; muscle?: string | null }[];
  }) => void;
};

export const ProgramWorkoutCard = memo(function ProgramWorkoutCard({
  workout,
  programId,
  exerciseMap,
  onStart,
}: Props) {
  const exercisesForWorkout = useMemo(() => {
    return (workout.exerciseIds ?? [])
      .map((id) => exerciseMap.get(id))
      .filter((ex): ex is Exercise => !!ex)
      .map((ex) => ({
        exerciseId: ex.id,
        name: ex.name,
        muscle: ex.muscle,
      }));
  }, [workout.exerciseIds, exerciseMap]);

  const chipExercises = useMemo(() => {
    const names = (workout.exerciseIds ?? [])
      .map((id) => exerciseMap.get(id))
      .filter((ex): ex is Exercise => !!ex)
      .map((ex) => ex.name);

    const visible = names.slice(0, 5);
    const remaining = Math.max(0, names.length - visible.length);

    return { visible, remaining, total: names.length };
  }, [workout.exerciseIds, exerciseMap]);

  const subtitle = workout.dayLabel || workout.description || "";

  return (
    <View style={styles.cardOuter}>
      <View pointerEvents="none" style={styles.base} />

      <LinearGradient
        colors={[colors.glassTop, colors.glassMid, colors.glassNone]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <LinearGradient
        colors={[
          "rgba(99,102,241,0.12)",
          "rgba(34,211,238,0.08)",
          "rgba(255,255,255,0.00)",
        ]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.25, y: 1 }}
        style={styles.accentSheen}
        pointerEvents="none"
      />

      <View pointerEvents="none" style={styles.outerStroke} />
      <View pointerEvents="none" style={styles.innerInset} />

      <View style={styles.inner}>
        <View style={styles.topRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="barbell-outline" size={14} color={colors.muted} />
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.titleRow}>
              <Text
                style={[typography.bodyBold, styles.title]}
                numberOfLines={1}
              >
                {workout.name}
              </Text>

              {chipExercises.total > 0 && (
                <View style={styles.countPill}>
                  <Text style={[typography.bodyBlack, styles.countText]}>
                    {chipExercises.total}
                  </Text>
                  <Text style={[typography.bodyBlack, styles.countTextMuted]}>
                    {" "}
                    øv
                  </Text>
                </View>
              )}
            </View>

            {!!subtitle && (
              <Text
                style={[typography.body, styles.subtitle]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            )}

            {chipExercises.total > 0 && (
              <View style={styles.chipsRow}>
                {chipExercises.visible.map((name, idx) => {
                  // Rotate gentle neon accents; keep readable
                  const mod = idx % 3;
                  const tintStyle =
                    mod === 0
                      ? styles.chipIndigo
                      : mod === 1
                      ? styles.chipCyan
                      : styles.chipEmerald;

                  return (
                    <View
                      key={`${workout.id}-${name}`}
                      style={[styles.chip, tintStyle]}
                    >
                      <Text
                        style={[typography.bodyBlack, styles.chipText]}
                        numberOfLines={1}
                      >
                        {name}
                      </Text>
                    </View>
                  );
                })}

                {chipExercises.remaining > 0 && (
                  <View style={[styles.chip, styles.moreChip]}>
                    <Text style={[typography.bodyBlack, styles.moreChipText]}>
                      +{chipExercises.remaining}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <Pressable
            onPress={() =>
              onStart({
                workoutProgramId: programId,
                workoutId: workout.id,
                name: workout.name,
                exercises: exercisesForWorkout,
              })
            }
            hitSlop={10}
            style={({ pressed }) => [
              styles.startBtn,
              pressed && styles.startBtnPressed,
            ]}
          >
            <LinearGradient
              colors={["rgba(99,102,241,0.94)", "rgba(34,211,238,0.78)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.startBtnInner}
            >
              <Ionicons name="play" size={14} color="white" />
              <Text
                style={[typography.bodyBold, styles.startText]}
                numberOfLines={1}
              >
                Start
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  cardOuter: {
    borderRadius: 18,
    overflow: "hidden",
  },
  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.cardSolid,
  },

  accentSheen: {
    position: "absolute",
    top: -30,
    right: -55,
    width: 200,
    height: 160,
    borderRadius: 999,
    opacity: 0.9,
  },

  outerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  innerInset: {
    position: "absolute",
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.insetStroke,
  },

  inner: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    color: colors.text,
    fontSize: 14.5,
    fontWeight: "600",
    letterSpacing: 0.1,
    flexShrink: 1,
  },
  subtitle: {
    color: colors.muted2,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
    fontWeight: "500",
  },

  countPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.countBg,
    borderWidth: 1,
    borderColor: colors.countStroke,
  },
  countText: {
    color: "rgba(226,232,240,0.90)",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.12,
  },
  countTextMuted: {
    color: "rgba(226,232,240,0.76)",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.12,
  },

  chipsRow: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  chip: {
    maxWidth: "100%",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },

  // Base + neon tint variants (premium contrast)
  chipIndigo: {
    backgroundColor: colors.indigoBg,
    borderColor: colors.indigoStroke,
  },
  chipCyan: {
    backgroundColor: colors.cyanBg,
    borderColor: colors.cyanStroke,
  },
  chipEmerald: {
    backgroundColor: colors.emeraldBg,
    borderColor: colors.emeraldStroke,
  },

  chipText: {
    color: "rgba(226,232,240,0.86)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.1,
  },

  moreChip: {
    backgroundColor: "rgba(34,211,238,0.16)",
    borderColor: "rgba(34,211,238,0.28)",
  },
  moreChipText: {
    color: "rgba(226,232,240,0.94)",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.12,
  },

  startBtn: {
    alignSelf: "flex-start",
    marginLeft: 6,
  },
  startBtnInner: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: colors.btnStroke,
  },
  startBtnPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  startText: {
    color: "white",
    fontSize: 12.5,
    fontWeight: "600",
    letterSpacing: 0.12,
  },
});
