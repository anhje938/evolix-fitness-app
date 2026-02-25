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
  // Glass surface
  cardBg: "rgba(2,6,23,0.26)",
  cardSheenA: "rgba(99,102,241,0.16)",
  cardSheenB: "rgba(34,211,238,0.12)",
  strokeOuter: "rgba(255,255,255,0.12)",
  strokeInner: "rgba(255,255,255,0.07)",
  divider: "rgba(255,255,255,0.075)",

  // ✅ MORE CONTRAST BETWEEN SESSIONS (zebra + stronger separation)
  rowBg: "rgba(255,255,255,0.040)",
  rowBgAlt: "rgba(255,255,255,0.022)",
  rowEdgeTop: "rgba(255,255,255,0.06)",
  rowEdgeBottom: "rgba(0,0,0,0.28)",

  // Text
  text: "rgba(255,255,255,0.95)",
  muted: "rgba(148,163,184,0.88)",
  muted2: "rgba(148,163,184,0.72)",

  // Accents
  accent: "#22d3ee",
  danger: "rgba(248,113,113,0.98)",

  // ✅ PR treatment a bit stronger
  prText: "rgba(250,204,21,0.98)",
  prGlow: "rgba(250,204,21,0.085)",
  prBorder: "rgba(250,204,21,0.32)",
  prChipBg: "rgba(250,204,21,0.14)",

  // Icon chip
  iconBg: "rgba(255,255,255,0.055)",
  iconBorder: "rgba(255,255,255,0.12)",

  // ✅ SETS TABLE: more table contrast
  tableBg: "rgba(255,255,255,0.020)",
  tableRowA: "rgba(255,255,255,0.060)",
  tableRowB: "rgba(255,255,255,0.032)",
  tableBorder: "rgba(255,255,255,0.10)",
};

type Row = {
  key: string;
  performedAtUtc: string;
  sets: ExerciseSessionSetsDto["sets"];
  est1Rm: number;
  diff: number | null;
  isPr: boolean;
};

function sessionBest1Rm(s: ExerciseSessionSetsDto) {
  let best = 0;
  for (const set of s.sets ?? []) {
    const est = estimate1RMFromTopSet(
      set.weightKg,
      set.reps,
      { roundTo: 1, conservative: true, allowHighRep: true },
      "ensemble"
    );
    if (est.oneRm > best) best = est.oneRm;
  }
  return best;
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

function normalizeSets(sets: ExerciseSessionSetsDto["sets"]) {
  return [...(sets ?? [])]
    .sort((a, b) => a.setNumber - b.setNumber)
    .map((s, idx) => ({
      key: `${s.setNumber ?? idx}-${s.weightKg ?? "w"}-${s.reps ?? "r"}`,
      setNumber: s.setNumber ?? idx + 1,
      weightKg: s.weightKg,
      reps: s.reps,
    }));
}

function formatKg(w: number | null | undefined) {
  if (w == null || !Number.isFinite(w)) return "—";
  const rounded = Math.round(w * 10) / 10;
  const asInt = Math.round(rounded);
  return Math.abs(rounded - asInt) < 0.0001 ? `${asInt}` : `${rounded}`;
}

function formatReps(r: number | null | undefined) {
  if (r == null || !Number.isFinite(r)) return "—";
  return `${Math.max(0, Math.round(r))}`;
}

export default function ExerciseHistoryList({ history }: Props) {
  const sorted = useMemo(
    () =>
      [...history].sort(
        (a, b) =>
          new Date(b.performedAtUtc).getTime() -
          new Date(a.performedAtUtc).getTime()
      ),
    [history]
  );

  const rows: Row[] = useMemo(() => {
    if (sorted.length === 0) return [];

    const keyed = sorted.map((s) => {
      const key = s.sessionId ?? s.performedAtUtc;
      return { s, key };
    });

    const pr = keyed.reduce<{
      key: string;
      oneRm: number;
      performedAtUtc: string;
    } | null>((acc, cur) => {
      const oneRm = sessionBest1Rm(cur.s);
      if (!acc)
        return { key: cur.key, oneRm, performedAtUtc: cur.s.performedAtUtc };

      if (oneRm > acc.oneRm) {
        return { key: cur.key, oneRm, performedAtUtc: cur.s.performedAtUtc };
      }

      if (oneRm === acc.oneRm) {
        return new Date(cur.s.performedAtUtc) > new Date(acc.performedAtUtc)
          ? { key: cur.key, oneRm, performedAtUtc: cur.s.performedAtUtc }
          : acc;
      }

      return acc;
    }, null);

    return keyed.map(({ s, key }, idx) => {
      const est1Rm = sessionBest1Rm(s);
      const prev = idx < keyed.length - 1 ? keyed[idx + 1].s : null;
      const prevEst = prev ? sessionBest1Rm(prev) : null;
      const diff =
        prevEst != null ? Number((est1Rm - prevEst).toFixed(1)) : null;

      return {
        key,
        performedAtUtc: s.performedAtUtc,
        sets: s.sets ?? [],
        est1Rm,
        diff,
        isPr: !!pr && pr.key === key,
      };
    });
  }, [sorted]);

  const hasRows = rows.length > 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={[typography.h2, styles.title]}>Historikk</Text>

        {hasRows && (
          <View style={styles.countPill}>
            <Ionicons name="time-outline" size={14} color={colors.muted2} />
            <Text style={[typography.body, styles.countText]} numberOfLines={1}>
              {rows.length} økter
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
          rows.map(({ key, performedAtUtc, sets, est1Rm, diff, isPr }, idx) => {
            const { date, time } = parseISO(performedAtUtc);
            const label = getRelativeDateLabel(date);
            const rowBg = idx % 2 === 0 ? colors.rowBg : colors.rowBgAlt;

            const normalized = normalizeSets(sets);
            const shown = normalized.slice(0, 4);
            const more = normalized.length > 4 ? normalized.length - 4 : 0;

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
                {/* subtle row “edge” to separate sessions */}
                <View pointerEvents="none" style={styles.rowEdgeTop} />
                <View pointerEvents="none" style={styles.rowEdgeBottom} />

                <View style={[styles.iconChip, isPr && styles.iconChipPr]}>
                  <Ionicons
                    name={isPr ? "trophy-outline" : "barbell-outline"}
                    size={18}
                    color={isPr ? colors.prText : colors.text}
                  />
                  <View style={styles.iconChipHighlight} />
                </View>

                <View style={styles.content}>
                  <View style={styles.topRow}>
                    <View style={styles.leftInfo}>
                      <Text
                        style={[typography.body, styles.mainLabel]}
                        numberOfLines={1}
                      >
                        {label}
                      </Text>
                      <Text
                        style={[typography.body, styles.subLabel]}
                        numberOfLines={1}
                      >
                        {date} · {time}
                      </Text>

                      {isPr && (
                        <View style={styles.prChip}>
                          <Ionicons
                            name="trophy"
                            size={12}
                            color={colors.prText}
                          />
                          <Text style={styles.prChipText}>PR</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.right}>
                      <Text
                        style={[typography.body, styles.rmLabel]}
                        numberOfLines={1}
                      >
                        Est. 1RM
                      </Text>

                      <Text
                        style={[
                          typography.bodyBold,
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
                    {shown.length === 0 ? (
                      <View
                        style={[
                          styles.tableRow,
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
                      shown.map((s, i) => {
                        const bg =
                          i % 2 === 0 ? colors.tableRowA : colors.tableRowB;
                        const isLastRow = i === shown.length - 1 && more === 0;
                        return (
                          <View
                            key={s.key}
                            style={[
                              styles.tableRow,
                              { backgroundColor: bg },
                              isLastRow && styles.tableRowLast,
                            ]}
                          >
                            <View style={styles.setLeft}>
                              <Text style={[typography.body, styles.setIndex]}>
                                {s.setNumber}.
                              </Text>
                              <Text
                                style={[typography.body, styles.setWeight]}
                                numberOfLines={1}
                              >
                                {formatKg(s.weightKg)}
                                <Text style={styles.unit}> kg</Text>
                              </Text>
                            </View>

                            <View style={styles.tableDivider} />

                            <Text
                              style={[typography.body, styles.setReps]}
                              numberOfLines={1}
                            >
                              {formatReps(s.reps)}
                              <Text style={styles.unit}> reps</Text>
                            </Text>
                          </View>
                        );
                      })
                    )}

                    {more > 0 && (
                      <View style={[styles.tableRow, styles.tableRowLast]}>
                        <Text
                          style={[typography.body, styles.moreRowText]}
                          numberOfLines={1}
                        >
                          +{more} sett til
                        </Text>
                        <Ionicons
                          name="chevron-down-outline"
                          size={16}
                          color={colors.muted2}
                          style={{ marginLeft: "auto" }}
                        />
                      </View>
                    )}
                  </View>
                </View>

                {idx !== rows.length - 1 && <View style={styles.separator} />}
              </View>
            );
          })
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
    marginBottom: 10,
  },

  title: {
    color: colors.text,
  },

  countPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  countText: {
    color: colors.muted2,
    fontSize: 12,
    fontWeight: "700",
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
    paddingVertical: 18,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  emptyIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  emptySub: {
    marginTop: 2,
    color: colors.muted2,
    fontSize: 12,
    lineHeight: 16,
  },

  row: {
    position: "relative",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
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
    paddingTop: 14,
  },
  rowLast: {
    paddingBottom: 14,
  },
  rowPr: {
    backgroundColor: colors.prGlow,
  },

  separator: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 0,
    height: 1,
    backgroundColor: colors.divider,
  },

  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.iconBg,
    borderWidth: 1,
    borderColor: colors.iconBorder,
    overflow: "hidden",
    marginTop: 2,
  },
  iconChipPr: {
    borderColor: colors.prBorder,
    backgroundColor: colors.prChipBg,
  },
  iconChipHighlight: {
    position: "absolute",
    top: -10,
    left: -10,
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.035)",
  },

  content: {
    flex: 1,
    minWidth: 0,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  leftInfo: {
    flex: 1,
    minWidth: 0,
  },

  mainLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },

  subLabel: {
    color: colors.muted2,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },

  prChip: {
    marginTop: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.prChipBg,
    borderWidth: 1,
    borderColor: colors.prBorder,
  },
  prChipText: {
    color: colors.prText,
    fontSize: 12,
    fontWeight: "900",
  },

  right: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 2,
    minWidth: 92,
  },
  rmLabel: {
    color: colors.muted2,
    fontSize: 11,
    fontWeight: "700",
  },
  rmValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  rmValuePr: {
    color: colors.prText,
  },
  diffText: {
    fontSize: 11,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },

  table: {
    marginTop: 10,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.tableBorder,
    backgroundColor: colors.tableBg,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.tableBorder,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },

  setLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 120,
  },
  setIndex: {
    color: colors.muted2,
    fontSize: 12,
    fontWeight: "800",
    width: 18,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  setWeight: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  setReps: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  unit: {
    color: colors.muted2,
    fontWeight: "700",
  },

  tableDivider: {
    width: 1,
    height: 14,
    marginHorizontal: 10,
    backgroundColor: colors.tableBorder,
    opacity: 0.95,
  },

  noSetsText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
  },

  moreRowText: {
    color: colors.muted2,
    fontSize: 12,
    fontWeight: "800",
  },
});
