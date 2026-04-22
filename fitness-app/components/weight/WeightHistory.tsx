import { generalStyles } from "@/config/styles";
import { typography } from "@/config/typography";
import { Weight } from "@/types/weight";
import {
  dateKeyToUtcDate,
  formatMonthYearNO,
  getOsloDateKey,
  getOsloTodayDateKey,
  parseISO,
} from "@/utils/date";
import { getRelativeDateLabel } from "@/utils/pastWeek";
import { calculateWeightTrendSeries } from "@/utils/weightTrend";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type WeeklySummaryItem = {
  id: string;
  weekLabel: string;
  avgWeight: number;
  difference: number | null;
};

type WeightHistoryProps = {
  weightList: Weight[];
  weeklySummary: WeeklySummaryItem[];
};

const DAILY_PAGE_SIZE = 30;

export default function WeightHistory({
  weightList,
  weeklySummary,
}: WeightHistoryProps) {
  const [listMode, setListMode] = useState<"daily" | "weekly">("daily");
  const [visibleCount, setVisibleCount] = useState<number>(DAILY_PAGE_SIZE);

  const visibleDailyWeights = useMemo(
    () => weightList.slice(0, visibleCount),
    [weightList, visibleCount]
  );

  const latest = useMemo(() => weightList?.[0] ?? null, [weightList]);
  const trendSeries = useMemo(
    () => calculateWeightTrendSeries(weightList),
    [weightList]
  );
  const trendById = useMemo(() => {
    const byId = new Map<
      string,
      { trendWeightKg: number; deltaFromTrendKg: number; hasBaseline: boolean }
    >();

    trendSeries.forEach((entry, index) => {
      byId.set(entry.id, {
        trendWeightKg: Number(entry.trendWeightKg.toFixed(1)),
        deltaFromTrendKg: Number(entry.deltaFromTrendKg.toFixed(1)),
        hasBaseline: index > 0,
      });
    });

    return byId;
  }, [trendSeries]);
  const latestTrendEntry = useMemo(
    () => (trendSeries.length ? trendSeries[trendSeries.length - 1] : null),
    [trendSeries]
  );
  const latestTrendWeight = useMemo(
    () =>
      latestTrendEntry ? Number(latestTrendEntry.trendWeightKg.toFixed(1)) : null,
    [latestTrendEntry]
  );
  const latestTrendDelta = useMemo(() => {
    if (!latestTrendEntry || trendSeries.length < 2) return null;
    return Number(latestTrendEntry.deltaFromTrendKg.toFixed(1));
  }, [latestTrendEntry, trendSeries.length]);

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 100, weightList.length));
  };

  const formatDifference = (
    diff: number | null,
    variant: "compact" | "trend" = "compact"
  ) => {
    if (diff === null) return "-";

    const rounded = Number(diff.toFixed(1));

    if (variant === "trend") {
      if (rounded > 0) return `+${rounded.toFixed(1)} kg over trend`;
      if (rounded < 0) return `${rounded.toFixed(1)} kg under trend`;
      return "På trend";
    }

    if (rounded > 0) return `+${rounded.toFixed(1)} kg`;
    if (rounded < 0) return `${rounded.toFixed(1)} kg`;
    return "0.0 kg";
  };

  const getDiffTone = (diff: number | null) => {
    if (diff === null || diff === 0) {
      return {
        text: "rgba(186,230,253,0.95)",
        bg: "rgba(56,189,248,0.08)",
        border: "rgba(56,189,248,0.16)",
      };
    }

    if (diff > 0) {
      return {
        text: "rgba(249,115,22,0.95)",
        bg: "rgba(249,115,22,0.10)",
        border: "rgba(249,115,22,0.22)",
      };
    }

    return {
      text: "rgba(103,232,249,0.96)",
      bg: "rgba(6,182,212,0.10)",
      border: "rgba(103,232,249,0.22)",
    };
  };

  const latestMeta = useMemo(() => {
    if (!latest?.timestampUtc) return null;
    const { date, time } = parseISO(latest.timestampUtc);
    return { label: getRelativeDateLabel(date), time };
  }, [latest]);

  const uniqueDayKeys = useMemo(() => {
    const dayKeys = new Set<string>();

    weightList.forEach((entry) => {
      const key = getOsloDateKey(entry.timestampUtc);
      if (!key) return;
      dayKeys.add(key);
    });

    return dayKeys;
  }, [weightList]);

  const trackedDays = uniqueDayKeys.size;

  const currentStreak = useMemo(() => {
    if (uniqueDayKeys.size === 0) return 0;

    const cursor = dateKeyToUtcDate(getOsloTodayDateKey());
    if (!cursor) return 0;

    let streak = 0;
    while (true) {
      const key = getOsloDateKey(cursor);

      if (!uniqueDayKeys.has(key)) break;

      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    return streak;
  }, [uniqueDayKeys]);

  return (
    <View style={styles.containerCard}>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text style={[typography.body, styles.title]}>Vektlogg</Text>
        </View>

        <View style={styles.segment}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setListMode("daily")}
            style={[
              styles.segmentBtn,
              listMode === "daily" && styles.segmentBtnActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                listMode === "daily" && styles.segmentTextActive,
              ]}
            >
              Daglig
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setListMode("weekly")}
            style={[
              styles.segmentBtn,
              listMode === "weekly" && styles.segmentBtnActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                listMode === "weekly" && styles.segmentTextActive,
              ]}
            >
              Ukentlig
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryPill}>
          <Ionicons name="flame-outline" size={12} color="#38BDF8" />
          <Text style={styles.summaryText}>{currentStreak} dager på rad</Text>
        </View>

        <View style={styles.summaryPill}>
          <Ionicons name="calendar-outline" size={12} color="#38BDF8" />
          <Text style={styles.summaryText}>{trackedDays} dager</Text>
        </View>
      </View>

      {latest && (
        <View style={[generalStyles.newCard, styles.latestCard]}>
          <LinearGradient
            pointerEvents="none"
            colors={[
              "rgba(34,211,238,0.12)",
              "rgba(59,130,246,0.06)",
              "rgba(2,6,23,0)",
            ]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.latestTopRow}>
            <View style={styles.latestIconWrap}>
              <Ionicons
                name="analytics-outline"
                size={15}
                color="rgba(56,189,248,0.84)"
              />
            </View>

            <View style={styles.latestCopy}>
              <Text style={[typography.body, styles.latestLabel]}>
                Siste vektmåling
              </Text>
              {latestMeta && (
                <Text style={[typography.body, styles.latestSub]}>
                  {latestMeta.label} {"·"} {latestMeta.time}
                </Text>
              )}
            </View>

            <View style={styles.latestValueWrap}>
              <Text style={[typography.body, styles.latestValue]}>
                {latest.weightKg.toFixed(1)}
              </Text>
              <Text style={[typography.body, styles.latestUnit]}>kg</Text>
            </View>
          </View>

          <LinearGradient
            colors={[
              "rgba(34,211,238,0.32)",
              "rgba(59,130,246,0.18)",
              "rgba(255,255,255,0)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.latestAccent}
          />
        </View>
      )}

      {listMode === "daily" ? (
        <View style={styles.listSection}>
          {latestTrendWeight !== null && (
            <View style={[generalStyles.newCard, styles.avgCard]}>
              <LinearGradient
                pointerEvents="none"
                colors={[
                  "rgba(34,211,238,0.10)",
                  "rgba(59,130,246,0.05)",
                  "rgba(2,6,23,0)",
                ]}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={StyleSheet.absoluteFill}
              />

              <View style={styles.avgTopRow}>
                <View style={styles.avgIconWrap}>
                  <Ionicons
                    name="trending-up-outline"
                    size={15}
                    color="rgba(56,189,248,0.84)"
                  />
                </View>
                <Text style={[typography.body, styles.avgLabel]}>
                  Trendvekt
                </Text>
              </View>

              <View style={styles.avgValueRow}>
                <Text style={[typography.body, styles.avgValue]}>
                  {latestTrendWeight}
                </Text>
                <Text style={[typography.body, styles.avgUnit]}>kg</Text>
              </View>

              <Text
                style={[
                  typography.body,
                  styles.avgHint,
                  latestTrendDelta !== null && {
                    color: getDiffTone(latestTrendDelta).text,
                  },
                ]}
              >
                {latestTrendDelta === null
                  ? "Trendvekten blir mer presis etter neste måling."
                  : formatDifference(latestTrendDelta, "trend")}
              </Text>
            </View>
          )}

          {visibleDailyWeights.map((weight, index) => {
            const { date: parsedDate, time } = parseISO(weight.timestampUtc);
            const label = getRelativeDateLabel(parsedDate);

            const currentMonthKey = getOsloDateKey(weight.timestampUtc).slice(0, 7);

            let isNewMonth = false;
            if (index === 0) {
              isNewMonth = true;
            } else {
              const prev = visibleDailyWeights[index - 1];
              const prevMonthKey = getOsloDateKey(prev.timestampUtc).slice(0, 7);

              if (prevMonthKey !== currentMonthKey) {
                isNewMonth = true;
              }
            }

            const monthLabel = formatMonthYearNO(weight.timestampUtc);

            const trendEntry = trendById.get(weight.id);
            const diff =
              trendEntry && trendEntry.hasBaseline
                ? trendEntry.deltaFromTrendKg
                : null;
            const diffText = formatDifference(diff);
            const tone = getDiffTone(diff);

            return (
              <View key={weight.id} style={styles.rowBlock}>
                {isNewMonth && (
                  <View style={styles.monthHeaderContainer}>
                    <Text style={[typography.body, styles.monthHeaderText]}>
                      {monthLabel}
                    </Text>
                  </View>
                )}

                <View style={[generalStyles.newCard, styles.rowCard]}>
                  <View style={styles.row}>
                    <View style={styles.iconWrap}>
                      <Ionicons
                        name="scale-outline"
                        size={15}
                        color="rgba(56,189,248,0.82)"
                      />
                    </View>

                    <View style={styles.textCol}>
                      <Text style={[typography.body, styles.primaryText]}>
                        {label}
                      </Text>
                      <Text style={[typography.body, styles.secondaryText]}>
                        {diff !== null ? `${time} · trendavvik` : time}
                      </Text>
                    </View>

                    <View style={styles.valueCol}>
                      <View style={styles.weightStack}>
                        <Text style={[typography.body, styles.weightValue]}>
                          {weight.weightKg.toFixed(1)}
                        </Text>
                        <Text style={[typography.body, styles.weightUnit]}>
                          kg
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.diffPill,
                          {
                            backgroundColor: tone.bg,
                            borderColor: tone.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            typography.body,
                            styles.diffText,
                            { color: tone.text },
                          ]}
                        >
                          {diffText}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}

          {visibleCount < weightList.length && (
            <TouchableOpacity activeOpacity={0.9} onPress={handleLoadMore}>
              <View style={styles.loadMoreBtn}>
                <Text style={[typography.body, styles.loadMoreText]}>
                  Vis 100 til
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.listSection}>
          {weeklySummary.map((week) => {
            const diff = week.difference;
            const diffText = formatDifference(diff);
            const tone = getDiffTone(diff);

            return (
              <View
                key={week.id}
                style={[generalStyles.newCard, styles.rowCard, styles.weekRowCard]}
              >
                <View style={styles.row}>
                  <View style={styles.iconWrap}>
                    <Ionicons
                      name="calendar-outline"
                      size={15}
                      color="rgba(56,189,248,0.82)"
                    />
                  </View>

                  <View style={styles.textCol}>
                    <Text style={[typography.body, styles.primaryText]}>
                      {week.weekLabel}
                    </Text>
                    <Text style={[typography.body, styles.secondaryText]}>
                      Ukentlig trend
                    </Text>
                  </View>

                  <View style={styles.valueCol}>
                    <View style={styles.weightStack}>
                      <Text style={[typography.body, styles.weightValue]}>
                        {week.avgWeight.toFixed(1)}
                      </Text>
                      <Text style={[typography.body, styles.weightUnit]}>
                        kg
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.diffPill,
                        {
                          backgroundColor: tone.bg,
                          borderColor: tone.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typography.body,
                          styles.diffText,
                          { color: tone.text },
                        ]}
                      >
                        {diffText}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  containerCard: {
    width: "100%",
    padding: 0,
    borderRadius: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    columnGap: 12,
  },
  titleBlock: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 15.5,
    fontWeight: "400",
    letterSpacing: -0.12,
  },
  summaryRow: {
    width: "100%",
    flexDirection: "row",
    gap: 7,
    marginTop: 10,
    marginBottom: 2,
    flexWrap: "wrap",
  },
  summaryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: "rgba(8,15,28,0.62)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.14)",
  },
  summaryText: {
    ...typography.body,
    color: "rgba(224,242,254,0.92)",
    fontSize: 10,
    fontWeight: "400",
  },
  segment: {
    flexDirection: "row",
    padding: 2,
    borderRadius: 12,
    backgroundColor: "rgba(8,15,28,0.72)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
  },
  segmentBtn: {
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: "rgba(8,47,73,0.72)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.26)",
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 1,
  },
  segmentText: {
    ...typography.body,
    fontSize: 10.5,
    color: "rgba(148,163,184,0.9)",
    fontWeight: "400",
    letterSpacing: 0.08,
  },
  segmentTextActive: {
    color: "#BAE6FD",
    fontWeight: "500",
  },
  latestCard: {
    position: "relative",
    marginTop: 10,
    borderRadius: 18,
    paddingVertical: 11,
    paddingHorizontal: 12,
    overflow: "hidden",
    backgroundColor: "rgba(3,7,18,0.46)",
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.12)",
    shadowColor: "#020617",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4,
  },
  latestTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  latestIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8,47,73,0.32)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.18)",
    marginRight: 8,
  },
  latestCopy: {
    flex: 1,
  },
  latestLabel: {
    fontSize: 10,
    color: "rgba(191,219,254,0.72)",
    fontWeight: "400",
    letterSpacing: 0.16,
  },
  latestSub: {
    marginTop: 1,
    fontSize: 9.5,
    color: "rgba(148,163,184,0.88)",
    fontWeight: "400",
  },
  latestValueWrap: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginLeft: 12,
  },
  latestValue: {
    fontSize: 16,
    color: "#F8FAFC",
    fontWeight: "500",
    letterSpacing: -0.1,
  },
  latestUnit: {
    fontSize: 9.5,
    color: "rgba(191,219,254,0.72)",
    fontWeight: "400",
  },
  latestAccent: {
    height: 1,
    width: "100%",
    borderRadius: 999,
    opacity: 0.76,
    marginTop: 8,
  },
  listSection: {
    width: "100%",
    marginTop: 11,
  },
  avgCard: {
    width: "100%",
    position: "relative",
    overflow: "hidden",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    marginBottom: 10,
    backgroundColor: "rgba(3,7,18,0.4)",
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.1)",
    shadowColor: "#020617",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 3,
  },
  avgTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avgIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8,47,73,0.3)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.16)",
  },
  avgLabel: {
    fontSize: 10,
    color: "rgba(191,219,254,0.72)",
    fontWeight: "400",
    letterSpacing: 0.12,
  },
  avgValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
    marginTop: 6,
  },
  avgValue: {
    fontSize: 16,
    color: "#F8FAFC",
    fontWeight: "500",
  },
  avgUnit: {
    fontSize: 9.5,
    color: "rgba(191,219,254,0.7)",
    fontWeight: "400",
  },
  avgHint: {
    marginTop: 6,
    fontSize: 9.5,
    lineHeight: 14,
    color: "rgba(191,219,254,0.78)",
    fontWeight: "500",
  },
  rowBlock: {
    width: "100%",
  },
  monthHeaderContainer: {
    width: "100%",
    marginTop: 8,
    marginBottom: 5,
    alignItems: "flex-start",
    paddingHorizontal: 4,
  },
  monthHeaderText: {
    fontSize: 9.5,
    fontWeight: "500",
    letterSpacing: 0.2,
    color: "rgba(191,219,254,0.72)",
    textTransform: "capitalize",
  },
  rowCard: {
    width: "100%",
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 6,
    borderRadius: 16,
    backgroundColor: "rgba(3,7,18,0.38)",
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.08)",
    shadowColor: "#020617",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 1,
  },
  weekRowCard: {
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "rgba(8,47,73,0.26)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  textCol: {
    flex: 1,
  },
  primaryText: {
    fontSize: 12,
    color: "#F1F5F9",
    fontWeight: "500",
    letterSpacing: 0.04,
  },
  secondaryText: {
    fontSize: 9.5,
    color: "rgba(191,219,254,0.62)",
    fontWeight: "400",
    marginTop: 1,
  },
  valueCol: {
    alignItems: "flex-end",
    marginLeft: 8,
  },
  weightStack: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  weightValue: {
    fontSize: 12.5,
    color: "#F1F5F9",
    fontWeight: "500",
    letterSpacing: 0.04,
  },
  weightUnit: {
    fontSize: 9,
    color: "rgba(191,219,254,0.7)",
    fontWeight: "400",
  },
  diffPill: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 58,
    alignItems: "center",
    justifyContent: "center",
  },
  diffText: {
    fontSize: 9,
    fontWeight: "500",
    letterSpacing: 0.04,
  },
  loadMoreBtn: {
    marginTop: 10,
    marginBottom: 8,
    alignSelf: "center",
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 999,
    backgroundColor: "rgba(8,47,73,0.34)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.16)",
    shadowColor: "#020617",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  loadMoreText: {
    fontSize: 10,
    color: "#BAE6FD",
    fontWeight: "500",
    letterSpacing: 0.08,
  },
});
