// components/exercise/sub-tabs/program/ProgramList.tsx
import { generalStyles } from "@/config/styles";
import { typography } from "@/config/typography";
import { useWorkoutSession } from "@/context/workoutSessionContext";
import { useExercises } from "@/hooks/useExercises";
import type { Exercise, Program, Workout } from "@/types/exercise";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo, useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ProgramWorkoutCard } from "./ProgramWorkoutCard";

/**
 * Premium style aligned with the rest of your app:
 * - calmer glass surface (readable in large quantities)
 * - clearer hierarchy + thinner typography
 * - subtle blue/purple accent (not neon)
 * - more “list-like” with compact rows + dividers
 */
const colors = {
  // Surfaces
  card: "rgba(2,6,23,0.18)", // app-like glass
  cardSolid: "#0B1220",
  surface: "rgba(255,255,255,0.035)",
  surface2: "rgba(255,255,255,0.060)",

  // Strokes
  border: "rgba(255,255,255,0.08)",
  borderSoft: "rgba(255,255,255,0.06)",
  divider: "rgba(255,255,255,0.07)",

  // Text
  text: "rgba(255,255,255,0.92)",
  muted: "rgba(148,163,184,0.92)",
  muted2: "rgba(148,163,184,0.72)",

  // Accent (blue/purple hint)
  accent: "rgba(99,102,241,0.95)",
  accent2: "rgba(34,211,238,0.90)",

  // Pills (more premium contrast)
  pillBg: "rgba(255,255,255,0.050)",
  pillBgStrong: "rgba(255,255,255,0.082)",
  pillStroke: "rgba(255,255,255,0.09)",
  pillStrokeStrong: "rgba(255,255,255,0.14)",

  // Chips (with subtle neon tints)
  chipBg: "rgba(255,255,255,0.040)",
  chipStroke: "rgba(255,255,255,0.10)",

  chipIndigoBg: "rgba(99,102,241,0.090)",
  chipIndigoStroke: "rgba(99,102,241,0.22)",

  chipCyanBg: "rgba(34,211,238,0.075)",
  chipCyanStroke: "rgba(34,211,238,0.20)",

  chipEmeraldBg: "rgba(16,185,129,0.070)",
  chipEmeraldStroke: "rgba(16,185,129,0.18)",

  moreBg: "rgba(34,211,238,0.14)",
  moreStroke: "rgba(34,211,238,0.26)",
};

type Props = {
  programs: Program[];
  workoutsByProgramId: Map<string, Workout[]>;
  onEdit?: (programId: string) => void;
};

export const ProgramList = memo(function ProgramList({
  programs,
  workoutsByProgramId,
  onEdit,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpanded = useCallback((programId: string) => {
    setExpandedId((prev) => (prev === programId ? null : programId));
  }, []);

  if (programs.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIcon}>
          <Ionicons name="albums-outline" size={18} color={colors.text} />
        </View>

        <Text style={[typography.h2, styles.emptyTitle]}>
          Ingen programmer enda
        </Text>

        <Text style={[typography.body, styles.emptySub]}>
          Trykk på <Text style={styles.inlinePlus}>+</Text> for å lage ditt
          første program.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {programs.map((program) => (
        <ProgramListItem
          key={program.id}
          program={program}
          sessions={workoutsByProgramId.get(program.id) ?? []}
          expanded={expandedId === program.id}
          onToggle={() => toggleExpanded(program.id)}
          onEdit={onEdit}
        />
      ))}
    </View>
  );
});

type ItemProps = {
  program: Program;
  sessions: Workout[];
  expanded: boolean;
  onToggle: () => void;
  onEdit?: (programId: string) => void;
};

const ProgramListItem = memo(function ProgramListItem({
  program,
  sessions,
  expanded,
  onToggle,
  onEdit,
}: ItemProps) {
  const { openProgramSession } = useWorkoutSession();
  const { data: allExercises = [] } = useExercises();

  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>();
    (allExercises as Exercise[]).forEach((ex) => map.set(ex.id, ex));
    return map;
  }, [allExercises]);

  const workoutCount = sessions.length;

  return (
    <View style={[generalStyles.newCard, styles.cardOuter]}>
      {/* Glass base */}
      <LinearGradient
        colors={[
          "rgba(255,255,255,0.06)",
          "rgba(255,255,255,0.025)",
          "rgba(255,255,255,0.00)",
        ]}
        start={{ x: 0.05, y: 0.0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Accent sheen */}
      <LinearGradient
        colors={[
          "rgba(99,102,241,0.16)",
          "rgba(34,211,238,0.12)",
          "rgba(255,255,255,0.00)",
        ]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.25, y: 0.85 }}
        style={styles.accentGlow}
        pointerEvents="none"
      />

      <View pointerEvents="none" style={styles.innerStroke} />

      <View style={styles.cardInner}>
        <Pressable
          onPress={onToggle}
          hitSlop={8}
          style={({ pressed }) => [
            styles.pressableRow,
            pressed && styles.pressedRow,
          ]}
        >
          {/* LEFT */}
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.titleRow}>
              <Text
                style={[typography.bodyBold, styles.title]}
                numberOfLines={1}
              >
                {program.name}
              </Text>

              <View
                style={[
                  styles.expandPip,
                  expanded ? styles.expandPipOn : styles.expandPipOff,
                ]}
              />
            </View>

            {!!program.goal && (
              <Text
                style={[typography.body, styles.description]}
                numberOfLines={2}
              >
                {program.goal}
              </Text>
            )}

            {/* META */}
            <View style={styles.metaRow}>
              <View style={styles.metaPill}>
                <Ionicons
                  name="fitness-outline"
                  size={12}
                  color="rgba(226,232,240,0.78)"
                />
                <Text style={[typography.bodyBlack, styles.metaText]}>
                  {workoutCount} økt{workoutCount === 1 ? "" : "er"}
                </Text>
              </View>
            </View>

            {/* CHIPS */}
            {sessions.length > 0 && (
              <View style={styles.chips}>
                {sessions.slice(0, 6).map((w, idx) => {
                  // Premium: subtle neon rotation (indigo/cyan/emerald)
                  const mod = idx % 3;
                  const chipStyle =
                    mod === 0
                      ? styles.chipIndigo
                      : mod === 1
                      ? styles.chipCyan
                      : styles.chipEmerald;

                  return (
                    <View key={w.id} style={[styles.chip, chipStyle]}>
                      <Text
                        style={[typography.bodyBlack, styles.chipText]}
                        numberOfLines={1}
                      >
                        {w.name}
                      </Text>
                    </View>
                  );
                })}

                {sessions.length > 6 && (
                  <View style={[styles.chip, styles.moreChip]}>
                    <Text style={[typography.bodyBlack, styles.moreChipText]}>
                      +{sessions.length - 6}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* RIGHT */}
          <View style={styles.rightCol}>
            <Pressable
              onPress={() => onEdit?.(program.id)}
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && styles.iconPressed,
              ]}
              hitSlop={10}
            >
              <View style={styles.iconBtnInner}>
                <Ionicons
                  name="pencil-outline"
                  size={16}
                  color="rgba(255,255,255,0.90)"
                />
              </View>
            </Pressable>

            <View style={styles.chevBtn}>
              <View style={styles.iconBtnInner}>
                <Ionicons
                  name={
                    expanded ? "chevron-up-outline" : "chevron-down-outline"
                  }
                  size={18}
                  color="rgba(255,255,255,0.88)"
                />
              </View>
            </View>
          </View>
        </Pressable>

        {/* EXPANDED */}
        {expanded && (
          <View style={styles.dropdown}>
            <View style={styles.dropdownHeader}>
              <Text style={[typography.body, styles.sectionTitle]}>Økter</Text>
              <View style={styles.dropdownDivider} />
            </View>

            {sessions.length === 0 ? (
              <Text style={[typography.body, styles.emptyText]}>
                Ingen økter koblet til dette programmet ennå.
              </Text>
            ) : (
              <View style={{ gap: 10 }}>
                {sessions.map((session) => (
                  <ProgramWorkoutCard
                    key={session.id}
                    workout={session}
                    programId={program.id}
                    exerciseMap={exerciseMap}
                    onStart={(payload) => openProgramSession(payload)}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  list: { gap: 12 },

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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  emptyTitle: { color: colors.text },
  emptySub: { color: colors.muted2, fontSize: 13 },
  inlinePlus: { color: colors.text },

  cardOuter: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.card,
  },
  innerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  accentGlow: {
    position: "absolute",
    top: -44,
    right: -70,
    width: 220,
    height: 180,
    borderRadius: 999,
    opacity: 0.9,
  },

  cardInner: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },

  pressableRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 2,
    borderRadius: 16,
  },
  pressedRow: {
    backgroundColor: "rgba(255,255,255,0.028)",
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    letterSpacing: 0.15,
    fontWeight: "600",
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
    backgroundColor: "rgba(255,255,255,0.14)",
  },

  description: {
    color: colors.muted2,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    fontWeight: "500",
  },

  metaRow: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.pillBgStrong,
    borderWidth: 1,
    borderColor: colors.pillStrokeStrong,
  },
  metaText: {
    color: "rgba(226,232,240,0.80)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.12,
  },

  rightCol: {
    alignItems: "flex-end",
    alignSelf: "stretch",
    justifyContent: "flex-start",
    paddingLeft: 4,
  },

  iconBtn: { alignSelf: "flex-start" },
  iconBtnInner: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  iconPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.985 }],
  },
  chevBtn: {
    marginTop: "auto",
    alignSelf: "flex-start",
  },

  chips: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    maxWidth: "100%",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },

  chipIndigo: {
    backgroundColor: colors.chipIndigoBg,
    borderColor: colors.chipIndigoStroke,
  },
  chipCyan: {
    backgroundColor: colors.chipCyanBg,
    borderColor: colors.chipCyanStroke,
  },
  chipEmerald: {
    backgroundColor: colors.chipEmeraldBg,
    borderColor: colors.chipEmeraldStroke,
  },

  moreChip: {
    backgroundColor: colors.moreBg,
    borderColor: colors.moreStroke,
  },
  chipText: {
    color: "rgba(226,232,240,0.84)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.12,
  },
  moreChipText: {
    color: "rgba(226,232,240,0.92)",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.12,
  },

  dropdown: {
    marginTop: 8,
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
});
