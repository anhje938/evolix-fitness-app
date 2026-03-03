// components/exercise/sub-tabs/ProgressTab.tsx
import {
  Metric,
  MetricSwitcher,
  VolumeMetric,
} from "@/components/exercise/sub-tabs/progress/MetricSwitcher";
import { generalStyles } from "@/config/styles";
import { newColors } from "@/config/theme";
import { typography } from "@/config/typography";
import { useUserSettings } from "@/context/UserSettingsProvider";
import { useExercises } from "@/hooks/useExercises";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import SearchIcon from "../../../assets/icons/search-white.svg";

import type {
  ExerciseHistoryPointDto,
  ExerciseSessionSetsDto,
} from "@/api/exercise/exerchiseHistory";
import { useExerciseHistory } from "@/hooks/useExerciseHistory";
import { useExerciseSetsHistory } from "@/hooks/useExerciseSetsHistory";

import { CombinedExerciseChart } from "./progress/CombinedExerciseChart";
import {
  ExerciseProgressChart,
  ExerciseProgressPoint,
} from "./progress/ExerciseProgressChart";

import ExerciseHistoryList from "./progress/ExerciseHistoryList";
import { StatRow } from "./progress/StatRow";
import { YearSummaryCard } from "./progress/YearSummaryCard";

import { estimate1RMFromTopSet } from "@/utils/exercise/oneRepMax";
import { isUserCreatedExercise } from "@/utils/exercise/isUserCreated";

type ProgressTabProps = {
  selectedExerciseId: string | null;
  onSelectExercise: (exerciseId: string | null) => void;
};

const ui = {
  text: "rgba(255,255,255,0.94)",
  muted: "rgba(148,163,184,0.86)",
  muted2: "rgba(148,163,184,0.70)",

  glassBg: "rgba(2,6,23,0.18)",
  glassStroke: "rgba(255,255,255,0.10)",
  glassStrokeInner: "rgba(255,255,255,0.06)",

  inputBg: "rgba(255,255,255,0.05)",
  inputStroke: "rgba(255,255,255,0.10)",
  inputStrokeFocus: "rgba(34,211,238,0.30)",

  divider: "rgba(255,255,255,0.06)",

  sheenA: "rgba(99,102,241,0.14)",
  sheenB: "rgba(34,211,238,0.10)",
};

export default function ProgressTab({
  selectedExerciseId,
  onSelectExercise,
}: ProgressTabProps) {
  const { userSettings } = useUserSettings();
  const { data: exerciseData } = useExercises();
  const exercises = useMemo(() => {
    const allExercises = exerciseData ?? [];
    if (!userSettings.showOnlyCustomTrainingContent) return allExercises;
    return allExercises.filter(isUserCreatedExercise);
  }, [exerciseData, userSettings.showOnlyCustomTrainingContent]);

  const [search, setSearch] = useState("");
  const [metric, setMetric] = useState<Metric>("weight");
  const [volumeMetric, setVolumeMetric] = useState<VolumeMetric>("sets");
  const [searchFocused, setSearchFocused] = useState(false);

  // Keep selected exercise in sync with visible list
  useEffect(() => {
    if (exercises.length === 0) {
      if (selectedExerciseId !== null) onSelectExercise(null);
      return;
    }

    const selectedIsVisible = exercises.some((ex) => ex.id === selectedExerciseId);
    if (!selectedIsVisible) {
      onSelectExercise(exercises[0].id);
    }
  }, [exercises, selectedExerciseId, onSelectExercise]);

  const filteredExercises = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return exercises;

    return exercises.filter(
      (ex) =>
        ex.name.toLowerCase().includes(s) ||
        (ex.muscle ?? "").toLowerCase().includes(s)
    );
  }, [exercises, search]);

  const selectedExercise =
    exercises.find((ex) => ex.id === selectedExerciseId) ?? null;

  // Aggregated history (top-set per session) – used for charts + year summary weight
  const { data: historyData = [] } = useExerciseHistory(selectedExerciseId);

  // Raw sets history – used for StatRow + ExerciseHistoryList + year summary volume (best set)
  const { data: setsHistoryData = [] } =
    useExerciseSetsHistory(selectedExerciseId);

  const sortedHistory: ExerciseHistoryPointDto[] = useMemo(() => {
    if (!historyData) return [];
    return [...historyData].sort(
      (a, b) =>
        new Date(a.performedAtUtc).getTime() -
        new Date(b.performedAtUtc).getTime()
    );
  }, [historyData]);

  // Shared 1RM accessor for aggregated history points (ensemble)
  const getOneRm = (h: ExerciseHistoryPointDto, conservative = false): number =>
    estimate1RMFromTopSet(
      h.topSetWeightKg,
      h.topSetReps,
      { roundTo: 1, conservative, allowHighRep: true },
      "ensemble"
    ).oneRm;

  // StatRow values MUST match the same source as ExerciseHistoryList (sets-history)
  const { pr, lastEst1Rm, diffToPr } = useMemo(() => {
    if (!setsHistoryData || setsHistoryData.length === 0) {
      return { pr: 0, lastEst1Rm: 0, diffToPr: 0 };
    }

    // Newest -> oldest (same order as list)
    const sorted = [...setsHistoryData].sort(
      (a, b) =>
        new Date(b.performedAtUtc).getTime() -
        new Date(a.performedAtUtc).getTime()
    );

    // Best-set 1RM inside a session
    const sessionBest1Rm = (session: ExerciseSessionSetsDto) => {
      let best = 0;

      for (const set of session.sets ?? []) {
        const est = estimate1RMFromTopSet(
          set.weightKg,
          set.reps,
          { roundTo: 1, conservative: true, allowHighRep: true },
          "ensemble"
        );
        if (est.oneRm > best) best = est.oneRm;
      }

      return best;
    };

    const lastSession = sorted[0];
    const last = sessionBest1Rm(lastSession);

    // PR across sessions (max sessionBest1Rm)
    let prVal = 0;
    for (const s of sorted) prVal = Math.max(prVal, sessionBest1Rm(s));

    const diff = prVal > 0 ? Math.max(prVal - last, 0) : 0;

    return { pr: prVal, lastEst1Rm: last, diffToPr: diff };
  }, [setsHistoryData]);

  const { yearWeightIncrease, yearVolumeIncreaseKg } = useMemo(() => {
    // Weight increase (1RM) stays on aggregated history, as before
    let yearWeight = 0;

    if (sortedHistory.length > 0) {
      const now = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);

      const pointsLastYear = sortedHistory.filter(
        (h) => new Date(h.performedAtUtc) >= oneYearAgo
      );

      if (pointsLastYear.length >= 2) {
        const first = pointsLastYear[0];
        const last = pointsLastYear[pointsLastYear.length - 1];
        yearWeight = getOneRm(last, false) - getOneRm(first, false);
      }
    }

    // Volume increase: best set volume now vs ~1 year ago (from sets history)
    let yearVolume = 0;

    if (setsHistoryData && setsHistoryData.length > 0) {
      const sorted = [...setsHistoryData].sort(
        (a, b) =>
          new Date(b.performedAtUtc).getTime() -
          new Date(a.performedAtUtc).getTime()
      );

      const latest = sorted[0] ?? null;
      if (latest) {
        const now = new Date();
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(now.getFullYear() - 1);
        const targetTs = oneYearAgo.getTime();

        // Pick session closest to 1-year-ago timestamp
        let baseline: ExerciseSessionSetsDto | null = null;
        let bestDelta = Number.POSITIVE_INFINITY;

        for (const s of sorted) {
          const t = Date.parse(s.performedAtUtc);
          if (!Number.isFinite(t)) continue;

          const d = Math.abs(t - targetTs);
          if (d < bestDelta) {
            bestDelta = d;
            baseline = s;
          }
        }

        // Best single set volume in kg: max(weight * reps)
        const bestSetVolumeKg = (session: ExerciseSessionSetsDto) => {
          let best = 0;
          for (const set of session.sets ?? []) {
            const w = set.weightKg ?? 0;
            const r = set.reps ?? 0;
            if (w > 0 && r > 0) best = Math.max(best, w * r);
          }
          return best;
        };

        if (baseline) {
          yearVolume = bestSetVolumeKg(latest) - bestSetVolumeKg(baseline);
        }
      }
    }

    return { yearWeightIncrease: yearWeight, yearVolumeIncreaseKg: yearVolume };
  }, [sortedHistory, setsHistoryData]);

  // Single-series chart data (from aggregated history)
  const chartData: ExerciseProgressPoint[] = useMemo(() => {
    if (sortedHistory.length === 0) return [];

    if (metric === "weight") {
      return sortedHistory.map((h) => ({
        timestampUtc: h.performedAtUtc,
        value: getOneRm(h, false),
      }));
    }

    return sortedHistory.map((h) => ({
      timestampUtc: h.performedAtUtc,
      value:
        volumeMetric === "sets"
          ? Math.max(0, h.totalSets)
          : Math.max(0, h.totalVolumeKg ?? 0),
    }));
  }, [sortedHistory, metric, volumeMetric]);

  // Combined chart series (from aggregated history)
  const combinedWeightData: ExerciseProgressPoint[] = useMemo(() => {
    if (sortedHistory.length === 0) return [];
    return sortedHistory.map((h) => ({
      timestampUtc: h.performedAtUtc,
      value: getOneRm(h, false),
    }));
  }, [sortedHistory]);

  const combinedVolumeData: ExerciseProgressPoint[] = useMemo(() => {
    if (sortedHistory.length === 0) return [];
    return sortedHistory.map((h) => ({
      timestampUtc: h.performedAtUtc,
      value:
        volumeMetric === "sets"
          ? Math.max(0, h.totalSets)
          : Math.max(0, h.totalVolumeKg ?? 0),
    }));
  }, [sortedHistory, volumeMetric]);

  const chartTitle =
    metric === "weight"
      ? "Estimated 1RM"
      : volumeMetric === "sets"
      ? "Training volume (sets)"
      : "Training volume (total kg)";

  const showResults = search.trim().length > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 70 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[typography.h2, styles.heading]}>Progresjon</Text>
          <Text style={[typography.body, styles.subHeading]}>
            Velg øvelse og følg utviklingen din over tid.
          </Text>
        </View>

        {!!selectedExercise && (
          <View style={styles.selectedPill}>
            <Ionicons
              name="barbell-outline"
              size={14}
              color="rgba(226,232,240,0.86)"
            />
            <Text style={styles.selectedPillText} numberOfLines={1}>
              {selectedExercise.name}
            </Text>
          </View>
        )}
      </View>

      {/* Premium Search */}
      <View
        style={[
          generalStyles.newCard,
          styles.searchWrap,
          searchFocused && styles.searchWrapFocused,
        ]}
      >
        <LinearGradient
          colors={[
            "rgba(255,255,255,0.06)",
            "rgba(255,255,255,0.02)",
            "rgba(255,255,255,0.00)",
          ]}
          start={{ x: 0.06, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <LinearGradient
          colors={[ui.sheenA, ui.sheenB, "rgba(255,255,255,0.00)"]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.25, y: 1 }}
          style={styles.searchSheen}
          pointerEvents="none"
        />
        <View pointerEvents="none" style={styles.searchInnerStroke} />

        <View style={styles.searchIcon}>
          <SearchIcon height={18} width={18} opacity={0.55} />
        </View>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={
            selectedExercise ? selectedExercise.name : "Søk etter øvelse..."
          }
          placeholderTextColor={ui.muted2}
          style={styles.searchInput}
          returnKeyType="done"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          clearButtonMode="while-editing"
          autoCorrect={false}
          autoCapitalize="none"
        />

        {!!search.length && (
          <Pressable
            hitSlop={10}
            onPress={() => setSearch("")}
            style={({ pressed }) => [
              styles.clearBtn,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons name="close" size={16} color={ui.text} />
          </Pressable>
        )}
      </View>

      {/* Search results (popover card) */}
      {showResults && (
        <View style={[styles.resultsCard, generalStyles.newCard]}>
          <LinearGradient
            colors={[
              "rgba(255,255,255,0.06)",
              "rgba(255,255,255,0.02)",
              "rgba(255,255,255,0.00)",
            ]}
            start={{ x: 0.06, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View pointerEvents="none" style={styles.resultsInnerStroke} />

          {filteredExercises.length === 0 ? (
            <View style={styles.resultsEmpty}>
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color={ui.muted}
              />
              <Text style={styles.resultsEmptyText}>Ingen øvelser funnet.</Text>
            </View>
          ) : (
            filteredExercises.slice(0, 7).map((ex, idx) => (
              <Pressable
                key={ex.id}
                style={({ pressed }) => [
                  styles.resultRow,
                  idx !== 0 && styles.resultRowBorder,
                  pressed && { opacity: 0.92 },
                ]}
                onPress={() => {
                  onSelectExercise(ex.id);
                  setSearch("");
                }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.resultName} numberOfLines={1}>
                    {ex.name}
                  </Text>
                  {!!ex.muscle && (
                    <Text style={styles.resultMuscle} numberOfLines={1}>
                      {ex.muscle}
                    </Text>
                  )}
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color="rgba(226,232,240,0.55)"
                />
              </Pressable>
            ))
          )}
        </View>
      )}

      <StatRow pr={pr} lastWeight={lastEst1Rm} diffToPr={diffToPr} />

      <View style={[styles.modeCard, generalStyles.newCard]}>
        <LinearGradient
          colors={[
            "rgba(255,255,255,0.06)",
            "rgba(255,255,255,0.02)",
            "rgba(255,255,255,0.00)",
          ]}
          start={{ x: 0.06, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View pointerEvents="none" style={styles.modeInnerStroke} />

        <MetricSwitcher
          metric={metric}
          onMetricChange={setMetric}
          volumeMetric={volumeMetric}
          onVolumeMetricChange={setVolumeMetric}
        />
      </View>

      {metric === "both" ? (
        <CombinedExerciseChart
          title="1RM & volume"
          metric={metric}
          volumeMetric={volumeMetric}
          weightData={combinedWeightData}
          volumeData={combinedVolumeData}
          showVerticalLines={false}
          showOuterLines={false}
        />
      ) : (
        <ExerciseProgressChart
          data={chartData}
          title={chartTitle}
          variant={metric === "weight" ? "line" : "bar"}
          showVerticalLines={false}
          showOuterLines={false}
        />
      )}

      <YearSummaryCard
        weightIncrease={yearWeightIncrease}
        volumeIncreaseKg={yearVolumeIncreaseKg}
      />

      <ExerciseHistoryList history={setsHistoryData} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingVertical: 16, paddingHorizontal: 14 },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  heading: {
    marginBottom: 0,
    color: newColors.text.primary,
  },
  subHeading: {
    marginTop: 4,
    color: ui.muted2,
    fontSize: 12.5,
    lineHeight: 16,
  },
  selectedPill: {
    maxWidth: 160,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  selectedPillText: {
    color: "rgba(226,232,240,0.86)",
    fontSize: 12.5,
    fontWeight: "800",
  },

  // SEARCH
  searchWrap: {
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
    backgroundColor: ui.inputBg,
    borderWidth: 1,
    borderColor: ui.inputStroke,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  searchWrapFocused: {
    borderColor: ui.inputStrokeFocus,
  },
  searchInnerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ui.glassStrokeInner,
  },
  searchSheen: {
    position: "absolute",
    top: -36,
    right: -70,
    width: 220,
    height: 160,
    borderRadius: 999,
    opacity: 0.9,
  },
  searchIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  searchInput: {
    flex: 1,
    color: newColors.text.primary,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearBtn: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  // RESULTS
  resultsCard: {
    marginBottom: 16,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: ui.glassBg,
    borderWidth: 1,
    borderColor: ui.glassStroke,
  },
  resultsInnerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: ui.glassStrokeInner,
  },
  resultsEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  resultsEmptyText: {
    color: ui.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  resultRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  resultRowBorder: {
    borderTopWidth: 1,
    borderTopColor: ui.divider,
  },
  resultName: {
    color: ui.text,
    fontSize: 14,
    fontWeight: "800",
  },
  resultMuscle: {
    marginTop: 2,
    color: ui.muted2,
    fontSize: 12,
    fontWeight: "600",
  },

  // MODE CARD
  modeCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    backgroundColor: ui.glassBg,
    borderWidth: 1,
    borderColor: ui.glassStroke,
    overflow: "hidden",
  },
  modeInnerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ui.glassStrokeInner,
  },
});
