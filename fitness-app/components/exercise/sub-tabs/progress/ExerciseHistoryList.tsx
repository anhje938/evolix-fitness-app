import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
} from "react-native";

import type { ExerciseSessionSetsDto } from "@/api/exercise/exerchiseHistory";
import { typography } from "@/config/typography";
import { parseISO } from "@/utils/date";
import { estimate1RMFromTopSet } from "@/utils/exercise/oneRepMax";
import { getRelativeDateLabel } from "@/utils/pastWeek";
import { useTranslation } from "@/i18n/translations";

type Props = {
  history: ExerciseSessionSetsDto[];
};

type DayWindowValue = number | "all";

type DayWindowOption = {
  label: string;
  value: DayWindowValue;
};

const colors = {
  text: "#F8FAFC",
  muted: "rgba(148,163,184,0.86)",
  mutedSoft: "rgba(148,163,184,0.7)",
  border: "rgba(125,211,252,0.26)",
  borderSoft: "rgba(255,255,255,0.12)",
  cardBg: "rgba(10,23,48,0.84)",
  cardBgAlt: "rgba(12,26,52,0.8)",
  pillBg: "rgba(18,33,60,0.5)",
  iconBg: "rgba(18,40,75,0.86)",
  iconBorder: "rgba(147,197,253,0.3)",
  setPanelBg: "rgba(6,17,38,0.82)",
  setDivider: "rgba(255,255,255,0.09)",
  cyan: "#93C5FD",
  cyanBright: "#BFDBFE",
  pr: "#FACC15",
  gain: "#22C55E",
  loss: "#EF4444",
};

type DaySetRow = {
  key: string;
  performedAtUtc: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  est1Rm: number;
};

type Row = {
  key: string;
  date: string;
  performedAtUtc: string;
  sets: DaySetRow[];
  est1Rm: number;
  diff: number | null;
  isPr: boolean;
};

function estimateSet1Rm(weightKg: number | null, reps: number | null) {
  return estimate1RMFromTopSet(
    weightKg,
    reps,
    { roundTo: 1, conservative: true, allowHighRep: true },
    "ensemble"
  ).oneRm;
}

function compareSetStrength(a: DaySetRow, b: DaySetRow) {
  if (a.est1Rm !== b.est1Rm) return a.est1Rm - b.est1Rm;

  const aWeight = a.weightKg ?? 0;
  const bWeight = b.weightKg ?? 0;
  if (aWeight !== bWeight) return aWeight - bWeight;

  const aReps = a.reps ?? 0;
  const bReps = b.reps ?? 0;
  if (aReps !== bReps) return aReps - bReps;

  return a.setNumber - b.setNumber;
}

function normalizeSets(
  sets: ExerciseSessionSetsDto["sets"],
  performedAtUtc: string,
  sessionKey: string
): DaySetRow[] {
  return [...(sets ?? [])]
    .sort((a, b) => a.setNumber - b.setNumber)
    .map((set, idx) => ({
      key: `${sessionKey}-${set.setId ?? idx}-${set.setNumber ?? idx}`,
      performedAtUtc,
      setNumber: set.setNumber ?? idx + 1,
      weightKg: set.weightKg,
      reps: set.reps,
      est1Rm: estimateSet1Rm(set.weightKg, set.reps),
    }));
}

function formatKg(weightKg: number | null | undefined) {
  if (weightKg == null || !Number.isFinite(weightKg)) return "\u2014";
  const rounded = Math.round(weightKg * 10) / 10;
  const asInt = Math.round(rounded);
  return Math.abs(rounded - asInt) < 0.0001 ? `${asInt}` : `${rounded}`;
}

function formatReps(reps: number | null | undefined) {
  if (reps == null || !Number.isFinite(reps)) return "\u2014";
  return `${Math.max(0, Math.round(reps))}`;
}

function formatDiff(diff: number | null) {
  if (diff == null) return null;
  if (diff > 0) return `+${formatKg(diff)} kg`;
  if (diff < 0) return `${formatKg(diff)} kg`;
  return "0 kg";
}

function diffColor(diff: number | null) {
  if (diff == null || diff === 0) return colors.mutedSoft;
  return diff > 0 ? colors.gain : colors.loss;
}

function buildDayWindowOptions(total: number): DayWindowOption[] {
  if (total <= 0) return [];

  if (total <= 30) {
    const compact = [7, 14, 21, 30]
      .filter((value) => value < total)
      .map((value) => ({ label: `${value} dager`, value }));

    return [...compact, { label: `${total} dager`, value: total }];
  }

  const thresholdOptions = [7, 14, 21, 30, 60, 90, 120]
    .filter((value) => value <= total)
    .map((value) => ({ label: `${value} dager`, value }));

  const needsAll =
    thresholdOptions[thresholdOptions.length - 1]?.value !== total;

  return needsAll
    ? [...thresholdOptions, { label: "Alle", value: "all" }]
    : thresholdOptions;
}

export default function ExerciseHistoryList({ history }: Props) {
  const { t, language } = useTranslation();
  const [selectedWindow, setSelectedWindow] = useState<DayWindowValue | null>(
    null
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const rows = useMemo<Row[]>(() => {
    if (history.length === 0) return [];

    const sorted = [...history].sort(
      (a, b) =>
        new Date(b.performedAtUtc).getTime() -
        new Date(a.performedAtUtc).getTime()
    );

    const grouped = sorted.reduce<
      Map<
        string,
        {
          key: string;
          date: string;
          performedAtUtc: string;
          sets: DaySetRow[];
          est1Rm: number;
        }
      >
    >((acc, session) => {
      const { date } = parseISO(session.performedAtUtc);
      const sessionKey = session.sessionId ?? session.performedAtUtc;
      const daySets = normalizeSets(
        session.sets ?? [],
        session.performedAtUtc,
        sessionKey
      );

      const current = acc.get(date) ?? {
        key: date,
        date,
        performedAtUtc: session.performedAtUtc,
        sets: [],
        est1Rm: 0,
      };

      if (
        new Date(session.performedAtUtc).getTime() >
        new Date(current.performedAtUtc).getTime()
      ) {
        current.performedAtUtc = session.performedAtUtc;
      }

      for (const daySet of daySets) {
        current.sets.push(daySet);
        current.est1Rm = Math.max(current.est1Rm, daySet.est1Rm);
      }

      acc.set(date, current);
      return acc;
    }, new Map());

    const groupedRows = [...grouped.values()]
      .map((row) => ({
        ...row,
        sets: row.sets.slice().sort((a, b) => a.setNumber - b.setNumber),
      }))
      .sort(
        (a, b) =>
          new Date(b.performedAtUtc).getTime() -
          new Date(a.performedAtUtc).getTime()
      );

    const pr = groupedRows.reduce<{
      key: string;
      oneRm: number;
      performedAtUtc: string;
    } | null>((acc, row) => {
      if (!acc) {
        return {
          key: row.key,
          oneRm: row.est1Rm,
          performedAtUtc: row.performedAtUtc,
        };
      }

      if (row.est1Rm > acc.oneRm) {
        return {
          key: row.key,
          oneRm: row.est1Rm,
          performedAtUtc: row.performedAtUtc,
        };
      }

      if (
        row.est1Rm === acc.oneRm &&
        new Date(row.performedAtUtc).getTime() >
          new Date(acc.performedAtUtc).getTime()
      ) {
        return {
          key: row.key,
          oneRm: row.est1Rm,
          performedAtUtc: row.performedAtUtc,
        };
      }

      return acc;
    }, null);

    return groupedRows.map((row, idx) => {
      const previousRow =
        idx < groupedRows.length - 1 ? groupedRows[idx + 1] : null;
      const previousBest = previousRow?.est1Rm ?? null;

      return {
        key: row.key,
        date: row.date,
        performedAtUtc: row.performedAtUtc,
        sets: row.sets,
        est1Rm: row.est1Rm,
        diff:
          previousBest != null
            ? Number((row.est1Rm - previousBest).toFixed(1))
            : null,
        isPr: pr?.key === row.key,
      };
    });
  }, [history]);

  const prSetKey = useMemo(() => {
    const prRow = rows.find((row) => row.isPr);
    if (!prRow || prRow.sets.length === 0) return null;

    return (
      prRow.sets.reduce((best, set) => {
        if (!best) return set;
        return compareSetStrength(set, best) > 0 ? set : best;
      }, prRow.sets[0] ?? null)?.key ?? null
    );
  }, [rows]);

  const dayOptions = useMemo(
    () => buildDayWindowOptions(rows.length),
    [rows.length]
  );

  useEffect(() => {
    if (rows.length === 0) {
      setSelectedWindow(null);
      setIsMenuOpen(false);
      return;
    }

    const availableValues = dayOptions.map((option) => option.value);
    const defaultValue: DayWindowValue = rows.length <= 30 ? rows.length : 30;

    if (selectedWindow == null) {
      setSelectedWindow(defaultValue);
      return;
    }

    if (!availableValues.some((value) => value === selectedWindow)) {
      setSelectedWindow(defaultValue);
    }
  }, [dayOptions, rows.length, selectedWindow]);

  const visibleRows = useMemo(() => {
    if (selectedWindow == null || selectedWindow === "all") return rows;
    return rows.slice(0, selectedWindow);
  }, [rows, selectedWindow]);

  const formatDayWindowLabel = (value: DayWindowValue) =>
    value === "all" ? t("progressAll") : t("progressDays", { count: value });

  const selectedOptionLabel =
    selectedWindow == null ? "" : formatDayWindowLabel(selectedWindow);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={[typography.h2, styles.title]}>
          {t("progressHistoryTitle")}
        </Text>

        {rows.length > 0 && selectedWindow != null ? (
          <View style={styles.headerRight}>
            <Pressable
              onPress={() => setIsMenuOpen((current) => !current)}
              style={({ pressed }) => [
                styles.countPill,
                pressed && styles.countPillPressed,
                isMenuOpen && styles.countPillOpen,
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={13}
                color={colors.muted}
              />
              <Text style={[typography.body, styles.countText]}>
                {selectedOptionLabel}
              </Text>
              <Ionicons
                name={isMenuOpen ? "chevron-up" : "chevron-down"}
                size={13}
                color={colors.mutedSoft}
              />
            </Pressable>

            {isMenuOpen ? (
              <View style={styles.dropdownMenu}>
                {dayOptions.map((option, index) => {
                  const isSelected = option.value === selectedWindow;

                  return (
                    <Pressable
                      key={`${option.value}-${index}`}
                      onPress={() => {
                        setSelectedWindow(option.value);
                        setIsMenuOpen(false);
                      }}
                      style={({ pressed }) => [
                        styles.dropdownItem,
                        index > 0 && styles.dropdownItemBorder,
                        isSelected && styles.dropdownItemSelected,
                        pressed && styles.dropdownItemPressed,
                      ]}
                    >
                      <Text
                        style={[
                          typography.body,
                          styles.dropdownText,
                          isSelected && styles.dropdownTextSelected,
                        ]}
                      >
                        {formatDayWindowLabel(option.value)}
                      </Text>
                      {isSelected ? (
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color={colors.cyanBright}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {rows.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="barbell-outline" size={18} color={colors.muted} />
          <View style={styles.emptyCopy}>
            <Text style={[typography.body, styles.emptyTitle]}>
              {t("progressionNoHistory")}
            </Text>
            <Text style={[typography.body, styles.emptySub]}>
              {t("progressionNoHistoryBody")}
            </Text>
          </View>
        </View>
      ) : (
        visibleRows.map((row, index) => {
          const diffLabel = formatDiff(row.diff);
          const isFirst = index === 0;
          const cardBg = isFirst ? colors.cardBg : colors.cardBgAlt;
          const columnWidth = `${
            100 / Math.min(Math.max(row.sets.length, 1), 5)
          }%` as DimensionValue;

          return (
            <View
              key={row.key}
              style={[
                styles.dayCard,
                { backgroundColor: cardBg },
                row.isPr && styles.dayCardPr,
              ]}
            >
              <LinearGradient
                colors={[
                  row.isPr ? "rgba(250,204,21,0.18)" : "rgba(125,211,252,0.16)",
                  row.isPr ? "rgba(96,165,250,0.12)" : "rgba(59,130,246,0.12)",
                  "rgba(255,255,255,0.03)",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />

              <View style={styles.dayHeader}>
                <View style={styles.dayLeft}>
                  <View
                    style={[
                      styles.dayIcon,
                      row.isPr && styles.dayIconPr,
                    ]}
                  >
                    <Ionicons
                      name={row.isPr ? "trophy-outline" : "calendar-outline"}
                      size={15}
                      color={row.isPr ? colors.pr : colors.cyan}
                    />
                  </View>

                  <View style={styles.dayCopy}>
                    <Text style={[typography.body, styles.dayTitle]}>
                      {getRelativeDateLabel(row.date, language)}
                    </Text>
                    <Text style={[typography.body, styles.daySub]}>
                      {row.sets.length} {t("progressSets")}
                    </Text>
                  </View>
                </View>

                <View style={styles.dayRight}>
                  <Text style={[typography.body, styles.bestLabel]}>
                    {t("progressBestOneRm")}
                  </Text>

                  <View style={styles.bestValueRow}>
                    <Text
                      style={[
                        typography.body,
                        styles.bestValue,
                        row.isPr && styles.bestValuePr,
                      ]}
                    >
                      {formatKg(row.est1Rm)} kg
                    </Text>
                    {row.isPr ? (
                      <Ionicons
                        name="trophy"
                        size={13}
                        color={colors.pr}
                        style={styles.bestTrophy}
                      />
                    ) : null}
                  </View>

                  <View style={styles.metaBottomRow}>
                    <Text
                      style={[
                        typography.body,
                        styles.bestDiff,
                        { color: diffColor(row.diff) },
                      ]}
                    >
                      {diffLabel ?? "\u2014"}
                    </Text>

                    <View style={styles.chevronButton}>
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color={colors.muted}
                      />
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.setPanel}>
                <View style={styles.setGrid}>
                  {row.sets.length === 0 ? (
                    <Text style={[typography.body, styles.noSetsText]}>
                      {t("progressNoSets")}
                    </Text>
                  ) : (
                    row.sets.map((set, setIndex) => {
                      const isPrSet = set.key === prSetKey;
                      const needsDivider = setIndex < row.sets.length - 1;

                      return (
                        <View
                          key={set.key}
                          style={[styles.setCell, { width: columnWidth }]}
                        >
                          {needsDivider ? (
                            <View style={styles.setDivider} />
                          ) : null}

                          <Text style={[typography.body, styles.setNumber]}>
                            {set.setNumber}
                          </Text>

                          <Text style={[typography.body, styles.setReps]}>
                            {formatReps(set.reps)} reps
                          </Text>

                          <View style={styles.setWeightRow}>
                            <Text
                              style={[
                                typography.body,
                                styles.setWeight,
                                isPrSet && styles.setWeightPr,
                              ]}
                            >
                              {formatKg(set.weightKg)} kg
                            </Text>
                            {isPrSet ? (
                              <Ionicons
                                name="trophy"
                                size={10}
                                color={colors.pr}
                                style={styles.setTrophy}
                              />
                            ) : null}
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    paddingTop: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },
  title: {
    color: colors.text,
  },
  headerRight: {
    position: "relative",
    zIndex: 10,
  },
  countPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.pillBg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  countPillPressed: {
    opacity: 0.9,
  },
  countPillOpen: {
    borderColor: colors.border,
  },
  countText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600",
  },
  dropdownMenu: {
    position: "absolute",
    top: 36,
    right: 0,
    minWidth: 124,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(8,21,48,0.98)",
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  dropdownItem: {
    minHeight: 36,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  dropdownItemBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  dropdownItemSelected: {
    backgroundColor: "rgba(59,130,246,0.14)",
  },
  dropdownItemPressed: {
    opacity: 0.9,
  },
  dropdownText: {
    color: colors.text,
    fontSize: 11.5,
    fontWeight: "600",
  },
  dropdownTextSelected: {
    color: colors.cyanBright,
  },
  emptyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.cardBgAlt,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  emptyCopy: {
    flex: 1,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  emptySub: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 15,
  },
  dayCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    marginBottom: 8,
    shadowColor: "#020617",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 5,
  },
  dayCardPr: {
    borderColor: "rgba(250,204,21,0.34)",
    shadowColor: "rgba(250,204,21,0.42)",
    shadowOpacity: 0.12,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  dayLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  dayIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.iconBg,
    borderWidth: 1,
    borderColor: colors.iconBorder,
    marginRight: 9,
  },
  dayIconPr: {
    borderColor: "rgba(250,204,21,0.42)",
    backgroundColor: "rgba(109,80,10,0.54)",
  },
  dayCopy: {
    flex: 1,
    minWidth: 0,
  },
  dayTitle: {
    color: colors.text,
    fontSize: 12.5,
    fontWeight: "800",
  },
  daySub: {
    marginTop: 1,
    color: colors.muted,
    fontSize: 10.5,
    fontWeight: "500",
  },
  dayRight: {
    minWidth: 102,
    alignItems: "flex-end",
  },
  bestLabel: {
    color: colors.mutedSoft,
    fontSize: 10,
    fontWeight: "600",
  },
  bestValueRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 1,
  },
  bestValue: {
    color: colors.cyanBright,
    fontSize: 14.5,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  bestValuePr: {
    color: colors.pr,
  },
  bestTrophy: {
    marginLeft: 5,
    marginTop: 1,
  },
  metaBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 1,
  },
  bestDiff: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  chevronButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(147,197,253,0.08)",
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  setPanel: {
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: colors.setPanelBg,
    borderWidth: 1,
    borderColor: "rgba(147,197,253,0.12)",
    overflow: "hidden",
  },
  setGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  setCell: {
    position: "relative",
    width: "20%",
    minHeight: 62,
    paddingVertical: 7,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.024)",
  },
  setDivider: {
    position: "absolute",
    top: 10,
    bottom: 10,
    right: 0,
    width: 1,
    backgroundColor: colors.setDivider,
  },
  setNumber: {
    color: colors.muted,
    fontSize: 10.5,
    fontWeight: "600",
  },
  setReps: {
    marginTop: 3,
    color: colors.cyanBright,
    fontSize: 10.5,
    fontWeight: "700",
  },
  setWeightRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  setWeight: {
    color: colors.text,
    fontSize: 10.75,
    fontWeight: "700",
  },
  setWeightPr: {
    color: colors.pr,
  },
  setTrophy: {
    marginLeft: 4,
  },
  noSetsText: {
    width: "100%",
    textAlign: "center",
    paddingVertical: 12,
    color: colors.muted,
    fontSize: 11.5,
    fontWeight: "600",
  },
});
