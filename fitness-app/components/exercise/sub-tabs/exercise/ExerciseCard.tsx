import { generalStyles } from "@/config/styles";
import { newColors } from "@/config/theme";
import { typography } from "@/config/typography";
import type { ExerciseSessionSetsDto } from "@/api/exercise/exerchiseHistory";
import { Exercise } from "@/types/exercise";
import { ADVANCED_MUSCLE_FILTERS } from "@/types/muscles";
import { sessionBest1RmFromSets } from "@/utils/exercise/sessionBest1RmFromSets";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { EditExerciseModal } from "./EditExerciseModal";
import { MiniExerciseChart } from "./MiniExerciseChart";

type MiniHistoryPoint = {
  performedAt: string;
  topSetWeight: number;
};

const ui = {
  cardBg: "rgba(10, 36, 88, 0.98)",
  cardStroke: "rgba(2, 13, 27, 0.08)",
  cardStrokeInner: "rgba(255,255,255,0.02)",
  divider: "rgba(148,163,184,0.14)",
  text: "rgba(241,245,249,0.97)",
  muted: "rgba(148,163,184,0.82)",
  muted2: "rgba(148,163,184,0.68)",
  iconBg: "rgba(3,12,30,0.995)",
  iconStroke: "rgba(96,165,250,0.10)",
  sheenA: "rgba(30,64,175,0.09)",
  sheenB: "rgba(8,145,178,0.05)",
  pillCyanBg: "rgba(34,211,238,0.12)",
  pillCyanStroke: "rgba(34,211,238,0.18)",
  pillIndigoBg: "rgba(59,130,246,0.12)",
  pillIndigoStroke: "rgba(96,165,250,0.18)",
};

function formatKg(v: number | null) {
  return v != null ? `${v} kg` : "--";
}

function parseSpecificGroups(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof input === "string") {
    return input
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeSpecificToKnownAdvanced(values: string[]) {
  const known = new Set<string>(
    ADVANCED_MUSCLE_FILTERS.map((x) => x.value as string)
  );

  return Array.from(
    new Set(
      (values ?? [])
        .map((x) => x.trim())
        .filter(Boolean)
        .filter((x) => x !== "ALL")
        .filter((x) => known.has(x))
    )
  );
}

export default function ExerciseCard({
  exercise,
  sessions,
  isAdmin = false,
  onPress,
}: {
  exercise: Exercise;
  sessions: ExerciseSessionSetsDto[];
  isAdmin?: boolean;
  onPress: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);

  const isGlobal = exercise.userId == null;
  const canEdit = isAdmin || !isGlobal;

  const displayTagChips = useMemo(() => {
    const fromDb = normalizeSpecificToKnownAdvanced(
      parseSpecificGroups(exercise.specificMuscleGroups)
    );
    if (fromDb.length > 0) return fromDb.slice(0, 2);

    const base = (exercise.muscle ?? "").trim();
    return base ? [base] : [];
  }, [exercise]);

  const vm = useMemo(() => {
    const sortedSessions = [...(sessions ?? [])].sort(
      (a, b) =>
        new Date(a.performedAtUtc).getTime() -
        new Date(b.performedAtUtc).getTime()
    );

    const points = sortedSessions
      .map((s) => {
        const oneRm = sessionBest1RmFromSets(s.sets ?? []);
        return { performedAt: s.performedAtUtc, oneRm };
      })
      .filter((p) => p.oneRm > 0);

    const oneRms = points.map((p) => p.oneRm);
    const last1Rm = oneRms.at(-1) ?? null;
    const first1Rm = oneRms.at(0) ?? null;
    const pr1Rm = oneRms.length ? Math.max(...oneRms) : null;

    let progress: number | null = null;
    if (first1Rm != null && last1Rm != null && oneRms.length >= 2) {
      progress = Number((last1Rm - first1Rm).toFixed(1));
    }

    const miniHistory: MiniHistoryPoint[] = points.map((p) => ({
      performedAt: p.performedAt,
      topSetWeight: p.oneRm,
    }));

    return {
      sortedSessionsCount: sortedSessions.length,
      last1Rm,
      pr1Rm,
      progress,
      miniHistory,
    };
  }, [sessions]);

  const progressColor =
    vm.progress != null && vm.progress !== 0
      ? vm.progress > 0
        ? "#4ade80"
        : "#f87171"
      : ui.text;

  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.cardOuter,
          generalStyles.newCard,
          pressed && styles.cardPressed,
        ]}
      >
        <View style={styles.topHighlight} />
        {/* LIST ITEM STYLE */}
        <LinearGradient
          colors={[
            "rgba(144, 151, 253, 0.1)",
            "rgba(8, 122, 167, 0.11)",
            "rgba(255,255,255,0.00)",
          ]}
          start={{ x: 0.06, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        {/* BUBBLE */}
        <LinearGradient
          colors={[ui.sheenA, ui.sheenB, "rgba(67, 120, 235, 0.1)"]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.25, y: 1 }}
          style={styles.accentGlow}
          pointerEvents="none"
        />
        <View pointerEvents="none" style={styles.innerStroke} />

        <View style={styles.topRow}>
          <View style={styles.leftCluster}>
            <View style={styles.handleCol}>
              <Ionicons
                name="ellipsis-vertical"
                size={12}
                color="rgba(148,163,184,0.42)"
              />
            </View>

            <View style={styles.exerciseIconWrap}>
              <Ionicons
                name="barbell-outline"
                size={16}
                color={newColors.primary.extraLight}
              />
            </View>

            <View style={styles.titleWrap}>
              <View style={styles.titleRow}>
                <Text
                  style={[typography.bodyBold, styles.title]}
                  numberOfLines={1}
                >
                  {exercise.name}
                </Text>

                {canEdit && (
                  <Pressable
                    hitSlop={12}
                    onPress={(e: any) => {
                      e?.stopPropagation?.();
                      setEditOpen(true);
                    }}
                    style={({ pressed }) => [
                      styles.iconBtn,
                      pressed && styles.iconPressed,
                    ]}
                  >
                    <View style={styles.iconBtnInner}>
                      <Ionicons
                        name="pencil-outline"
                        size={11}
                        color={ui.text}
                      />
                    </View>
                  </Pressable>
                )}
              </View>

              {displayTagChips.length > 0 && (
                <View style={styles.chipsWrap}>
                  {displayTagChips.map((muscle, idx) => {
                    const variant = idx % 2 === 0 ? "indigo" : "cyan";
                    return (
                      <View
                        key={`m-${muscle}`}
                        style={[
                          styles.pill,
                          variant === "indigo"
                            ? styles.pillIndigo
                            : styles.pillCyan,
                        ]}
                      >
                        <Text
                          style={[typography.bodyBlack, styles.pillText]}
                          numberOfLines={1}
                        >
                          {muscle}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>

          <View style={styles.rightCluster}>
            <View style={styles.prBox}>
              <Text style={styles.prLabel}>Estimert PR</Text>
              <Text style={styles.prValue}>{formatKg(vm.pr1Rm)}</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={15}
              color="rgba(148,163,184,0.72)"
            />
          </View>
        </View>

        <View style={styles.statsChartRow}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Siste 1RM</Text>
              <Text style={styles.statValue}>{formatKg(vm.last1Rm)}</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Økter</Text>
              <Text style={styles.statValue}>
                {vm.sortedSessionsCount ?? "--"}
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Fremgang</Text>
              <Text style={[styles.statValue, { color: progressColor }]}>
                {vm.progress != null
                  ? `${vm.progress > 0 ? "+" : ""}${vm.progress} kg`
                  : "--"}
              </Text>
            </View>
          </View>

          <View style={styles.chartWrap}>
            <MiniExerciseChart data={vm.miniHistory} height={62} />
          </View>
        </View>
      </Pressable>

      <EditExerciseModal
        visible={editOpen}
        exercise={exercise}
        onClose={() => setEditOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    marginTop: 10,
    borderRadius: 13,
    overflow: "hidden",
    backgroundColor: ui.cardBg,
    borderWidth: 1,
    borderColor: ui.cardStroke,
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowColor: "rgb(0, 153, 255)",
    shadowOpacity: 0.36,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  topHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 65,
    backgroundColor: "rgba(4, 1, 37, 0.28)",
  },
  cardPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.995 }],
  },
  innerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: ui.cardStrokeInner,
  },
  accentGlow: {
    position: "absolute",
    top: -34,
    right: -60,
    width: 220,
    height: 190,
    borderRadius: 999,
    opacity: 0.95,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  leftCluster: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  handleCol: {
    width: 10,
    paddingTop: 11,
    alignItems: "center",
  },
  exerciseIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ui.iconBg,
    borderWidth: 1,
    borderColor: ui.iconStroke,
    marginTop: 2,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    color: ui.text,
    fontSize: 15,
    letterSpacing: 0.1,
  },
  iconBtn: {
    alignSelf: "flex-start",
  },
  iconBtnInner: {
    width: 18,
    height: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  iconPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  pill: {
    maxWidth: "100%",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillIndigo: {
    backgroundColor: ui.pillIndigoBg,
    borderColor: ui.pillIndigoStroke,
  },
  pillCyan: {
    backgroundColor: ui.pillCyanBg,
    borderColor: ui.pillCyanStroke,
  },
  pillText: {
    color: "rgba(191,219,254,0.88)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.05,
  },
  rightCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 1,
  },
  prBox: {
    alignItems: "flex-end",
  },
  prLabel: {
    fontSize: 10,
    color: ui.muted2,
    fontWeight: "500",
    letterSpacing: 0.08,
  },
  prValue: {
    marginTop: 2,
    color: "#38bdf8",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.08,
  },
  statsChartRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingTop: 10,
  },
  statsRow: {
    flex: 1,
    flexDirection: "row",
    gap: 10,
  },
  statItem: {
    flex: 1,
    justifyContent: "flex-end",
  },
  statLabel: {
    fontSize: 10,
    color: ui.muted2,
    fontWeight: "600",
    letterSpacing: 0.08,
  },
  statValue: {
    marginTop: 4,
    fontSize: 12,
    color: ui.text,
    fontWeight: "700",
    letterSpacing: 0.06,
  },
  chartWrap: {
    width: 110,
    justifyContent: "flex-end",
  },
});
