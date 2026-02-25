// components/exercise/sub-tabs/workout/WorkoutList.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo, useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { generalStyles } from "@/config/styles";
import { typography } from "@/config/typography";

import type { Exercise, Workout } from "@/types/exercise";

// 🎨 Premium (samme språk som ProgramWorkoutCard)
const colors = {
  // Card base
  cardSolid: "rgba(10,16,30,0.92)",
  glassTop: "rgba(255,255,255,0.055)",
  glassMid: "rgba(255,255,255,0.020)",
  glassNone: "rgba(255,255,255,0.00)",

  // Strokes
  borderSoft: "rgba(255,255,255,0.08)",
  insetStroke: "rgba(255,255,255,0.05)",
  divider: "rgba(255,255,255,0.08)",

  // Text
  text: "rgba(255,255,255,0.94)",
  muted: "rgba(148,163,184,0.92)",
  muted2: "rgba(148,163,184,0.74)",

  // Pills / chips (subtle neon tints)
  pillBg: "rgba(255,255,255,0.060)",
  pillStroke: "rgba(255,255,255,0.12)",

  indigoBg: "rgba(99,102,241,0.10)",
  indigoStroke: "rgba(99,102,241,0.22)",
  cyanBg: "rgba(34,211,238,0.085)",
  cyanStroke: "rgba(34,211,238,0.20)",
  emeraldBg: "rgba(16,185,129,0.080)",
  emeraldStroke: "rgba(16,185,129,0.18)",

  moreBg: "rgba(34,211,238,0.16)",
  moreStroke: "rgba(34,211,238,0.28)",

  // Icon buttons
  iconBg: "rgba(255,255,255,0.05)",
  iconStroke: "rgba(255,255,255,0.10)",

  // Start button
  startStroke: "rgba(255,255,255,0.18)",
};

type StartWorkoutPayload = {
  workoutProgramId: string; // for "workouts" (ikke program) sender vi "manual"
  workoutId: string;
  name: string;
  exercises: { exerciseId: string; name: string; muscle?: string | null }[];
};

type Props = {
  workouts: Workout[];
  exercises: Exercise[];
  onEdit: (workout: Workout) => void;

  /**
   * ✅ SAME as ProgramWorkoutCard:
   * Parent bruker denne til å åpne WorkoutSessionOverlay.
   */
  onStart: (payload: StartWorkoutPayload) => void;
};

export const WorkoutList = memo(function WorkoutList({
  workouts,
  exercises,
  onEdit,
  onStart,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpanded = useCallback((workoutId: string) => {
    setExpandedId((prev) => (prev === workoutId ? null : workoutId));
  }, []);

  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>();
    exercises.forEach((ex) => map.set(ex.id, ex));
    return map;
  }, [exercises]);

  if (workouts.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIcon}>
          <Ionicons name="barbell-outline" size={18} color={colors.text} />
        </View>

        <Text style={[typography.h2, styles.emptyTitle]}>Ingen økter enda</Text>

        <Text style={[typography.body, styles.emptySub]}>
          Trykk på <Text style={styles.inlinePlus}>+</Text> for å lage din
          første økt.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {workouts.map((workout) => {
        const exercisesInWorkout: Exercise[] =
          workout.exerciseIds
            ?.map((id) => exerciseMap.get(id))
            ?.filter((x): x is Exercise => !!x) ?? [];

        const exerciseCount = exercisesInWorkout.length;

        const startPayload: StartWorkoutPayload = {
          workoutProgramId: "manual",
          workoutId: workout.id,
          name: workout.name,
          exercises: exercisesInWorkout.map((ex) => ({
            exerciseId: ex.id,
            name: ex.name,
            muscle: ex.muscle,
          })),
        };

        const isExpanded = expandedId === workout.id;

        return (
          <View
            key={workout.id}
            style={[generalStyles.newCard, styles.cardOuter]}
          >
            {/* Base */}
            <View pointerEvents="none" style={styles.base} />

            {/* Glass overlay */}
            <LinearGradient
              colors={[colors.glassTop, colors.glassMid, colors.glassNone]}
              start={{ x: 0.05, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            {/* Accent sheen */}
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

            {/* Strokes */}
            <View pointerEvents="none" style={styles.outerStroke} />
            <View pointerEvents="none" style={styles.innerInset} />

            <View style={styles.cardInner}>
              {/* HEADER ROW */}
              <View style={styles.topRow}>
                <Pressable
                  onPress={() => toggleExpanded(workout.id)}
                  style={({ pressed }) => [
                    styles.headerPress,
                    pressed && styles.headerPressed,
                  ]}
                  hitSlop={6}
                >
                  <View style={styles.headerTopLine}>
                    <View style={styles.iconCircle}>
                      <Ionicons
                        name="barbell-outline"
                        size={14}
                        color={colors.muted}
                      />
                    </View>

                    <Text
                      style={[typography.bodyBold, styles.title]}
                      numberOfLines={1}
                    >
                      {workout.name}
                    </Text>

                    <View style={styles.expandPipWrap}>
                      <View
                        style={[
                          styles.expandPip,
                          isExpanded ? styles.expandPipOn : styles.expandPipOff,
                        ]}
                      />
                    </View>
                  </View>

                  {!!workout.description && (
                    <Text
                      style={[typography.body, styles.description]}
                      numberOfLines={2}
                    >
                      {workout.description}
                    </Text>
                  )}

                  {/* META PILLS */}
                  <View style={styles.metaRow}>
                    {!!workout.dayLabel && (
                      <View style={[styles.metaPill, styles.pillIndigo]}>
                        <Ionicons
                          name="calendar-outline"
                          size={12}
                          color="rgba(226,232,240,0.82)"
                        />
                        <Text
                          style={[typography.bodyBlack, styles.metaText]}
                          numberOfLines={1}
                        >
                          {workout.dayLabel}
                        </Text>
                      </View>
                    )}

                    <View style={[styles.metaPill, styles.pillCyan]}>
                      <Ionicons
                        name="fitness-outline"
                        size={12}
                        color="rgba(226,232,240,0.82)"
                      />
                      <Text style={[typography.bodyBlack, styles.metaText]}>
                        {exerciseCount} øvelse{exerciseCount === 1 ? "" : "r"}
                      </Text>
                    </View>
                  </View>
                </Pressable>

                {/* RIGHT CONTROLS */}
                <View style={styles.rightCol}>
                  <Pressable
                    onPress={() => onEdit(workout)}
                    style={({ pressed }) => [
                      styles.iconBtn,
                      pressed && styles.iconPressed,
                    ]}
                    hitSlop={8}
                  >
                    <View style={styles.iconBtnInner}>
                      <Ionicons
                        name="pencil-outline"
                        size={16}
                        color={colors.text}
                      />
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => toggleExpanded(workout.id)}
                    style={({ pressed }) => [
                      styles.chevBtn,
                      pressed && styles.iconPressed,
                    ]}
                    hitSlop={10}
                  >
                    <View style={styles.iconBtnInner}>
                      <Ionicons
                        name={
                          isExpanded
                            ? "chevron-up-outline"
                            : "chevron-down-outline"
                        }
                        size={18}
                        color={colors.text}
                      />
                    </View>
                  </Pressable>
                </View>
              </View>

              {/* DROPDOWN */}
              {isExpanded && (
                <View style={styles.dropdown}>
                  <View style={styles.dropdownHeader}>
                    <Text style={[typography.body, styles.sectionTitle]}>
                      Øvelser
                    </Text>
                    <View style={styles.dropdownDivider} />
                  </View>

                  {exercisesInWorkout.length === 0 ? (
                    <Text style={[typography.body, styles.emptyText]}>
                      Ingen øvelser lagt til ennå.
                    </Text>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {exercisesInWorkout.map((ex, idx) => {
                        const mod = idx % 3;
                        const tint =
                          mod === 0
                            ? styles.rowIndigo
                            : mod === 1
                            ? styles.rowCyan
                            : styles.rowEmerald;

                        return (
                          <View key={ex.id} style={[styles.exerciseRow, tint]}>
                            <View style={styles.exerciseIndex}>
                              <Text
                                style={[typography.bodyBlack, styles.indexText]}
                              >
                                {idx + 1}
                              </Text>
                            </View>

                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text
                                style={[
                                  typography.bodyBold,
                                  styles.exerciseName,
                                ]}
                                numberOfLines={1}
                              >
                                {ex.name}
                              </Text>

                              {!!ex.muscle && (
                                <Text
                                  style={[
                                    typography.body,
                                    styles.exerciseMuscle,
                                  ]}
                                  numberOfLines={1}
                                >
                                  {ex.muscle}
                                </Text>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* ACTIONS */}
              <View style={styles.actions}>
                <Pressable
                  onPress={() => onStart(startPayload)}
                  style={({ pressed }) => [
                    styles.primaryWrap,
                    pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
                  ]}
                >
                  <LinearGradient
                    colors={["rgba(99,102,241,0.94)", "rgba(34,211,238,0.78)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primary}
                  >
                    <Ionicons name="play" size={16} color="white" />
                    <Text style={[typography.bodyBold, styles.primaryText]}>
                      Start økt
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  list: { gap: 14 },

  // EMPTY
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
  emptyTitle: { color: colors.text },
  emptySub: { color: colors.muted2, fontSize: 13 },
  inlinePlus: { color: colors.text },

  // CARD
  cardOuter: {
    borderRadius: 22,
    overflow: "hidden",
  },
  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.cardSolid,
  },
  accentSheen: {
    position: "absolute",
    top: -36,
    right: -64,
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
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },

  // HEADER
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  headerPress: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    paddingVertical: 2,
  },
  headerPressed: {
    backgroundColor: "rgba(255,255,255,0.025)",
  },

  headerTopLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },

  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.iconBg,
    borderWidth: 1,
    borderColor: colors.iconStroke,
  },

  title: {
    color: colors.text,
    fontSize: 16,
    letterSpacing: 0.12,
    flexShrink: 1,
  },

  expandPipWrap: {
    marginLeft: "auto",
    paddingLeft: 6,
  },
  expandPip: {
    width: 10,
    height: 6,
    borderRadius: 99,
    marginTop: 2,
  },
  expandPipOn: {
    backgroundColor: "rgba(34,211,238,0.90)",
    opacity: 0.95,
  },
  expandPipOff: {
    backgroundColor: "rgba(255,255,255,0.16)",
  },

  description: {
    color: colors.muted2,
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 6,
    fontWeight: "500",
  },

  // META PILLS
  metaRow: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  metaText: {
    color: "rgba(226,232,240,0.88)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.12,
  },
  pillIndigo: {
    backgroundColor: colors.indigoBg,
    borderColor: colors.indigoStroke,
  },
  pillCyan: {
    backgroundColor: colors.cyanBg,
    borderColor: colors.cyanStroke,
  },

  // RIGHT CONTROLS
  rightCol: {
    alignItems: "flex-end",
    alignSelf: "stretch",
    justifyContent: "flex-start",
  },
  iconBtn: {
    alignSelf: "flex-start",
  },
  chevBtn: {
    marginTop: "auto",
    alignSelf: "flex-start",
  },
  iconBtnInner: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.iconBg,
    borderWidth: 1,
    borderColor: colors.iconStroke,
  },
  iconPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },

  // DROPDOWN
  dropdown: {
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: 12,
  },
  dropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dropdownDivider: {
    height: 1,
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginTop: 2,
  },
  sectionTitle: {
    color: colors.muted2,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  emptyText: {
    color: colors.muted2,
    fontSize: 13,
    fontStyle: "italic",
    paddingVertical: 4,
  },

  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.035)",
    borderColor: "rgba(255,255,255,0.09)",
  },
  rowIndigo: {
    backgroundColor: colors.indigoBg,
    borderColor: colors.indigoStroke,
  },
  rowCyan: {
    backgroundColor: colors.cyanBg,
    borderColor: colors.cyanStroke,
  },
  rowEmerald: {
    backgroundColor: colors.emeraldBg,
    borderColor: colors.emeraldStroke,
  },

  exerciseIndex: {
    width: 26,
    height: 26,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.pillBg,
    borderWidth: 1,
    borderColor: colors.pillStroke,
  },
  indexText: {
    color: "rgba(226,232,240,0.86)",
    fontSize: 12,
    fontWeight: "900",
  },
  exerciseName: {
    color: colors.text,
    fontSize: 13,
  },
  exerciseMuscle: {
    color: colors.muted2,
    fontSize: 12,
    marginTop: 1,
  },

  // ACTIONS
  actions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  primaryWrap: { flex: 1 },
  primary: {
    paddingVertical: 13,
    borderRadius: 999,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.startStroke,
  },
  primaryText: {
    color: "white",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.12,
  },
});
