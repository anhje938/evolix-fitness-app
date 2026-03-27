// components/exercise/sub-tabs/progress/ExerciseHistoryList.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ExerciseSessionSetsDto } from "@/api/exercise/exerchiseHistory";
import { typography } from "@/config/typography";
import { parseISO } from "@/utils/date";
import { estimate1RMFromTopSet } from "@/utils/exercise/oneRepMax";
import { getRelativeDateLabel } from "@/utils/pastWeek";

type Props = {
  history: ExerciseSessionSetsDto[];
};

const colors = {
  cardBg: "rgba(2,6,23,0.26)",
  cardSheenA: "rgba(99,102,241,0.16)",
  cardSheenB: "rgba(34,211,238,0.12)",
  strokeOuter: "rgba(255,255,255,0.12)",
  strokeInner: "rgba(255,255,255,0.07)",
  divider: "rgba(255,255,255,0.075)",

  rowBg: "rgba(255,255,255,0.040)",
  rowBgAlt: "rgba(255,255,255,0.022)",
  rowEdgeTop: "rgba(255,255,255,0.06)",
  rowEdgeBottom: "rgba(0,0,0,0.28)",

  text: "rgba(255,255,255,0.95)",
  muted: "rgba(148,163,184,0.88)",
  muted2: "rgba(148,163,184,0.72)",

  accent: "#22d3ee",
  danger: "rgba(248,113,113,0.98)",

  prText: "rgba(250,204,21,0.98)",
  prGlow: "rgba(250,204,21,0.085)",
  prBorder: "rgba(250,204,21,0.32)",
  prChipBg: "rgba(250,204,21,0.14)",

  iconBg: "rgba(255,255,255,0.055)",
  iconBorder: "rgba(255,255,255,0.12)",

  tableBg: "rgba(255,255,255,0.020)",
  tableRowA: "rgba(255,255,255,0.060)",
  tableRowB: "rgba(255,255,255,0.032)",
  tableBorder: "rgba(255,255,255,0.10)",
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
  sessionCount: number;
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

  const timeDiff =
    new Date(a.performedAtUtc).getTime() - new Date(b.performedAtUtc).getTime();
  if (timeDiff !== 0) return timeDiff;

  return a.setNumber - b.setNumber;
}

function formatDiff(diff: number | null) {
  if (diff == null) return "—";
  if (diff > 0) return `+${diff}kg`;
  if (diff < 0) return `${diff}kg`;
  return "0kg";
}

function diffColor(diff: number | null) {
  if (diff == null || diff === 0) return colors.muted2;
  return diff > 0 ? colors.accent : colors.danger;
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
  if (weightKg == null || !Number.isFinite(weightKg)) return "—";
  const rounded = Math.round(weightKg * 10) / 10;
  const asInt = Math.round(rounded);
  return Math.abs(rounded - asInt) < 0.0001 ? `${asInt}` : `${rounded}`;
}

function formatReps(reps: number | null | undefined) {
  if (reps == null || !Number.isFinite(reps)) return "—";
  return `${Math.max(0, Math.round(reps))}`;
}

export default function ExerciseHistoryList({ history }: Props) {
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
          sessionCount: number;
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
        sessionCount: 0,
      };

      if (
        new Date(session.performedAtUtc).getTime() >
        new Date(current.performedAtUtc).getTime()
      ) {
        current.performedAtUtc = session.performedAtUtc;
      }

      current.sessionCount += 1;

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
        sets: row.sets.slice().sort((a, b) => {
          const timeDiff =
            new Date(a.performedAtUtc).getTime() -
            new Date(b.performedAtUtc).getTime();
          if (timeDiff !== 0) return timeDiff;
          return a.setNumber - b.setNumber;
        }),
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
        sessionCount: row.sessionCount,
      };
    });
  }, [history]);

  const prSetKey = useMemo(() => {
    const prRow = rows.find((row) => row.isPr);
    if (!prRow || prRow.sets.length === 0) return null;

    return prRow.sets.reduce((best, set) => {
      if (!best) return set;
      return compareSetStrength(set, best) > 0 ? set : best;
    }, prRow.sets[0] ?? null)?.key ?? null;
  }, [rows]);

  const hasRows = rows.length > 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={[typography.h2, styles.title]}>Historikk</Text>

        {hasRows && (
          <View style={styles.countPill}>
            <Ionicons name="time-outline" size={14} color={colors.muted2} />
            <Text style={[typography.body, styles.countText]} numberOfLines={1}>
              {rows.length} dager
            </Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <LinearGradient
          colors={[
            "rgba(255,255,255,0.07)",
            "rgba(255,255,255,0.02)",
            "rgba(255,255,255,0.00)",
          ]}
          start={{ x: 0.06, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <LinearGradient
          colors={[colors.cardSheenA, colors.cardSheenB, "rgba(255,255,255,0)"]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.2, y: 1 }}
          style={styles.cardSheen}
          pointerEvents="none"
        />
        <View pointerEvents="none" style={styles.innerStroke} />

        {!hasRows ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="time-outline" size={18} color={colors.muted2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.body, styles.emptyTitle]}>
                Ingen historikk enda
              </Text>
              <Text style={[typography.body, styles.emptySub]}>
                Logg en økt for å se 1RM-estimat og trend.
              </Text>
            </View>
          </View>
        ) : (
          rows.map(
            ({ key, date, sets, est1Rm, diff, isPr, sessionCount }, idx) => {
              const label = getRelativeDateLabel(date);
              const rowBg = idx % 2 === 0 ? colors.rowBg : colors.rowBgAlt;

              return (
                <View
                  key={key}
                  style={[
                    styles.row,
                    { backgroundColor: rowBg },
                    isPr && styles.rowPr,
                    idx === 0 && styles.rowFirst,
                    idx === rows.length - 1 && styles.rowLast,
                  ]}
                >
                  <View pointerEvents="none" style={styles.rowEdgeTop} />
                  <View pointerEvents="none" style={styles.rowEdgeBottom} />

                  <View style={styles.content}>
                    <View style={styles.rowHeader}>
                      <View style={styles.leftInfo}>
                        <View style={styles.labelRow}>
                          <View
                            style={[styles.iconChip, isPr && styles.iconChipPr]}
                          >
                            <Ionicons
                              name={isPr ? "trophy-outline" : "calendar-outline"}
                              size={14}
                              color={isPr ? colors.prText : colors.text}
                            />
                            <View style={styles.iconChipHighlight} />
                          </View>
                          <Text
                            style={[typography.body, styles.mainLabel]}
                            numberOfLines={1}
                          >
                            {label}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.right}>
                        <Text
                          style={[typography.body, styles.rmLabel]}
                          numberOfLines={1}
                        >
                          Beste 1RM
                        </Text>

                        <Text
                          style={[
                            typography.body,
                            styles.rmValue,
                            isPr && styles.rmValuePr,
                          ]}
                          numberOfLines={1}
                        >
                          {est1Rm} kg
                        </Text>

                        <Text
                          style={[
                            typography.body,
                            styles.diffText,
                            { color: diffColor(diff) },
                          ]}
                          numberOfLines={1}
                        >
                          {formatDiff(diff)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.table}>
                      {sets.length === 0 ? (
                        <View
                          style={[
                            styles.tableRow,
                            styles.tableRowLast,
                            { backgroundColor: colors.tableRowA },
                          ]}
                        >
                          <Text
                            style={[typography.body, styles.noSetsText]}
                            numberOfLines={1}
                          >
                            Ingen sett
                          </Text>
                        </View>
                      ) : (
                        sets.map((set, setIndex) => {
                          const rowTone =
                            setIndex % 2 === 0
                              ? colors.tableRowA
                              : colors.tableRowB;
                          const setTime = parseISO(set.performedAtUtc).time;
                          const isPrSet = set.key === prSetKey;

                          return (
                            <View
                              key={set.key}
                              style={[
                                styles.tableRow,
                                { backgroundColor: rowTone },
                                setIndex === sets.length - 1 &&
                                  styles.tableRowLast,
                              ]}
                            >
                              <View style={styles.setLeft}>
                                <Text
                                  style={[typography.body, styles.setIndex]}
                                >
                                  {set.setNumber}.
                                </Text>

                                <View style={styles.setInfo}>
                                  <Text
                                    style={[typography.body, styles.setReps]}
                                    numberOfLines={1}
                                  >
                                    {formatReps(set.reps)}
                                    <Text style={styles.unit}> reps</Text>
                                  </Text>

                                  {sessionCount > 1 && (
                                    <Text
                                      style={[typography.body, styles.setMeta]}
                                      numberOfLines={1}
                                    >
                                      {setTime}
                                    </Text>
                                  )}
                                </View>
                              </View>

                              <View style={styles.tableDivider} />

                              <View
                                style={[styles.setValueColumn, styles.setMiddleColumn]}
                              >
                                <Text
                                  style={[
                                    typography.body,
                                    styles.setWeight,
                                    styles.setWeightLeft,
                                  ]}
                                  numberOfLines={1}
                                >
                                  {formatKg(set.weightKg)}
                                  <Text style={styles.unit}> kg</Text>
                                </Text>
                              </View>

                              <View style={styles.tableDivider} />

                              <View
                                style={[styles.setValueColumn, styles.setRmColumn]}
                              >
                                {isPrSet && (
                                  <Ionicons
                                    name="trophy"
                                    size={10}
                                    color={colors.prText}
                                    style={styles.setPrIcon}
                                  />
                                )}
                                <Text
                                  style={[
                                    typography.body,
                                    styles.setWeight,
                                    styles.setWeightRight,
                                    isPrSet && styles.prSetText,
                                  ]}
                                  numberOfLines={1}
                                >
                                  {formatKg(set.est1Rm > 0 ? set.est1Rm : null)}
                                  <Text style={styles.unit}> kg 1RM</Text>
                                </Text>
                              </View>
                            </View>
                          );
                        })
                      )}
                    </View>
                  </View>

                  {idx !== rows.length - 1 && <View style={styles.separator} />}
                </View>
              );
            }
          )
        )}
      </View>
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

  countPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  countText: {
    color: colors.muted2,
    fontSize: 11,
    fontWeight: "600",
  },

  card: {
    borderRadius: 18,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.strokeOuter,
    overflow: "hidden",
  },
  innerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.strokeInner,
  },
  cardSheen: {
    position: "absolute",
    top: -44,
    right: -88,
    width: 260,
    height: 190,
    borderRadius: 999,
    opacity: 0.98,
  },

  empty: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  emptyIcon: {
    width: 30,
    height: 30,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 12.5,
    fontWeight: "600",
  },
  emptySub: {
    marginTop: 1,
    color: colors.muted2,
    fontSize: 11,
    lineHeight: 14,
  },

  row: {
    position: "relative",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  rowEdgeTop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 1,
    backgroundColor: colors.rowEdgeTop,
    opacity: 0.9,
  },
  rowEdgeBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: colors.rowEdgeBottom,
    opacity: 0.55,
  },

  rowFirst: {
    paddingTop: 10,
  },
  rowLast: {
    paddingBottom: 10,
  },
  rowPr: {
    backgroundColor: colors.prGlow,
  },

  separator: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 0,
    height: 1,
    backgroundColor: colors.divider,
  },

  iconChip: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.iconBg,
    borderWidth: 1,
    borderColor: colors.iconBorder,
    overflow: "hidden",
  },
  iconChipPr: {
    borderColor: colors.prBorder,
    backgroundColor: colors.prChipBg,
  },
  iconChipHighlight: {
    position: "absolute",
    top: -8,
    left: -8,
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.035)",
  },

  content: {
    width: "100%",
  },

  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 6,
  },

  leftInfo: {
    flex: 1,
    minWidth: 0,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  mainLabel: {
    color: colors.text,
    fontSize: 12.5,
    fontWeight: "600",
  },

  right: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 0,
    minWidth: 78,
  },
  rmLabel: {
    color: colors.muted2,
    fontSize: 9.5,
    fontWeight: "500",
  },
  rmValue: {
    color: colors.text,
    fontSize: 12.5,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  rmValuePr: {
    color: colors.prText,
  },
  diffText: {
    fontSize: 10,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },

  table: {
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.tableBorder,
    backgroundColor: colors.tableBg,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.tableBorder,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },

  setLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  setIndex: {
    color: colors.muted2,
    fontSize: 10.5,
    fontWeight: "600",
    width: 14,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  setInfo: {
    flex: 1,
    minWidth: 0,
  },
  setReps: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  setMeta: {
    marginTop: 1,
    color: colors.muted2,
    fontSize: 9.5,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
  setValueColumn: {
    alignItems: "flex-end",
    justifyContent: "center",
    minWidth: 78,
  },
  setMiddleColumn: {
    alignItems: "flex-start",
  },
  setRmColumn: {
    minWidth: 92,
  },
  setWeight: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  setWeightRight: {
    textAlign: "right",
  },
  setWeightLeft: {
    textAlign: "left",
  },
  prSetText: {
    color: colors.prText,
  },
  setPrIcon: {
    marginBottom: 2,
  },
  unit: {
    color: colors.muted2,
    fontWeight: "500",
  },

  tableDivider: {
    width: 1,
    height: 12,
    marginHorizontal: 8,
    backgroundColor: colors.tableBorder,
    opacity: 0.95,
  },

  noSetsText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600",
  },
});
