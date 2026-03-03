import { generalStyles } from "@/config/styles";
import { typography } from "@/config/typography";
import { Weight } from "@/types/weight";
import { parseISO } from "@/utils/date";
import { getRelativeDateLabel } from "@/utils/pastWeek";
import { weeklyAverageProgression } from "@/utils/weightProgression";
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

  const sevenDayAverage = useMemo(() => {
    if (weightList.length === 0) return null;
    const lastSeven = weightList.slice(0, 7);
    const sum = lastSeven.reduce((acc, w) => acc + w.weightKg, 0);
    return +(sum / lastSeven.length).toFixed(1);
  }, [weightList]);

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 100, weightList.length));
  };

  const formatDifference = (diff: number | null) => {
    if (diff === null) return "-";
    if (diff > 0) return `+${diff.toFixed(1)} kg`;
    if (diff < 0) return `${diff.toFixed(1)} kg`;
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
      text: "rgba(74,222,128,0.95)",
      bg: "rgba(74,222,128,0.10)",
      border: "rgba(74,222,128,0.22)",
    };
  };

  const latestMeta = useMemo(() => {
    if (!latest?.timestampUtc) return null;
    const { date, time } = parseISO(latest.timestampUtc);
    const label = getRelativeDateLabel(date);
    return { label, time };
  }, [latest]);
  const uniqueDayKeys = useMemo(() => {
    const dayKeys = new Set<string>();

    weightList.forEach((entry) => {
      const date = new Date(entry.timestampUtc);
      if (Number.isNaN(date.getTime())) return;

      const key = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-");

      dayKeys.add(key);
    });

    return dayKeys;
  }, [weightList]);

  const trackedDays = uniqueDayKeys.size;
  const currentStreak = useMemo(() => {
    if (uniqueDayKeys.size === 0) return 0;

    const cursor = new Date();
    cursor.setHours(12, 0, 0, 0);

    let streak = 0;
    while (true) {
      const key = [
        cursor.getFullYear(),
        String(cursor.getMonth() + 1).padStart(2, "0"),
        String(cursor.getDate()).padStart(2, "0"),
      ].join("-");

      if (!uniqueDayKeys.has(key)) break;

      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  }, [uniqueDayKeys]);
  return (
    <View style={styles.containerCard}>
      {/* Header + segmented */}
      <View style={styles.headerRow}>
        <Text style={[typography.h2, styles.title]}>Vektlogg</Text>

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
          <Ionicons name="flame-outline" size={13} color="#38bdf8" />
          <Text style={styles.summaryText}>{currentStreak} day streak</Text>
        </View>
        <View style={styles.summaryPill}>
          <Ionicons name="calendar-outline" size={13} color="#38bdf8" />
          <Text style={styles.summaryText}>{trackedDays} dager</Text>
        </View>
      </View>
      {/* Top summary: latest measurement */}
      {latest && (
        <View style={[generalStyles.newCard, styles.latestCard]}>
          <View style={styles.latestTopRow}>
            <View style={styles.latestIconWrap}>
              <Ionicons
                name="analytics-outline"
                size={16}
                color="rgba(56,189,248,0.82)"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyBlack, styles.latestLabel]}>
                Siste vektmåling
              </Text>
              {latestMeta && (
                <Text style={[typography.body, styles.latestSub]}>
                  {latestMeta.label} · {latestMeta.time}
                </Text>
              )}
            </View>

            <View style={styles.latestValueWrap}>
              <Text style={[typography.bodyBlack, styles.latestValue]}>
                {latest.weightKg.toFixed(1)}
              </Text>
              <Text style={[typography.body, styles.latestUnit]}>kg</Text>
            </View>
          </View>

          {/* subtle accent line */}
          <LinearGradient
            colors={[
              "rgba(34,211,238,0.26)",
              "rgba(59,130,246,0.18)",
              "rgba(255,255,255,0.00)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.latestAccent}
          />
        </View>
      )}

      {listMode === "daily" ? (
        <View style={{ width: "100%", marginTop: 12 }}>
          {/* 7 day average */}
          {sevenDayAverage !== null && (
            <View style={[generalStyles.newCard, styles.avgCard]}>
              <View style={styles.avgTopRow}>
                <View style={styles.avgIconWrap}>
                  <Ionicons
                    name="trending-up-outline"
                    size={15}
                    color="rgba(56,189,248,0.82)"
                  />
                </View>
                <Text style={[typography.bodyBlack, styles.avgLabel]}>
                  7-dagers snitt
                </Text>
              </View>

              <View style={styles.avgValueRow}>
                <Text style={[typography.bodyBlack, styles.avgValue]}>
                  {sevenDayAverage}
                </Text>
                <Text style={[typography.body, styles.avgUnit]}>kg</Text>
              </View>
            </View>
          )}

          {visibleDailyWeights.map((weight, index) => {
            const { date: parsedDate, time } = parseISO(weight.timestampUtc);
            const label = getRelativeDateLabel(parsedDate);

            const dateObj = new Date(weight.timestampUtc);
            const currentMonth = dateObj.getMonth();
            const currentYear = dateObj.getFullYear();

            let isNewMonth = false;
            if (index === 0) {
              isNewMonth = true;
            } else {
              const prev = visibleDailyWeights[index - 1];
              const prevDate = new Date(prev.timestampUtc);
              if (
                prevDate.getMonth() !== currentMonth ||
                prevDate.getFullYear() !== currentYear
              ) {
                isNewMonth = true;
              }
            }

            const monthLabel = dateObj.toLocaleString("nb-NO", {
              month: "long",
              year: "numeric",
            });

            const deviation = weeklyAverageProgression(weightList, weight.id);
            const diff = deviation?.deviation ?? null;

            const diffText = formatDifference(diff);
            const tone = getDiffTone(diff);

            return (
              <View key={weight.id} style={{ width: "100%" }}>
                {isNewMonth && (
                  <View style={styles.monthHeaderContainer}>
                    <Text
                      style={[typography.bodyBlack, styles.monthHeaderText]}
                    >
                      {monthLabel}
                    </Text>
                  </View>
                )}

                <View style={[generalStyles.newCard, styles.rowCard]}>
                  <View style={styles.row}>
                    <View style={styles.iconWrap}>
                      <Ionicons
                        name="scale-outline"
                        size={16}
                        color="rgba(56,189,248,0.78)"
                      />
                    </View>

                    <View style={styles.textCol}>
                      <Text style={[typography.bodyBlack, styles.primaryText]}>
                        {label}
                      </Text>
                      <Text style={[typography.body, styles.secondaryText]}>
                        {time}
                      </Text>
                    </View>

                    <View style={styles.valueCol}>
                      <View style={styles.weightStack}>
                        <Text
                          style={[typography.bodyBlack, styles.weightValue]}
                        >
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
                            typography.bodyBlack,
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
                <Text style={[typography.bodyBlack, styles.loadMoreText]}>
                  Vis 100 til
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={{ width: "100%", marginTop: 12 }}>
          {weeklySummary.map((week) => {
            const diff = week.difference;
            const diffText = formatDifference(diff);
            const tone = getDiffTone(diff);

            return (
              <View
                key={week.id}
                style={[generalStyles.newCard, styles.rowCard]}
              >
                <View style={styles.row}>
                  <View style={styles.iconWrap}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color="rgba(56,189,248,0.78)"
                    />
                  </View>

                  <View style={styles.textCol}>
                    <Text style={[typography.bodyBlack, styles.primaryText]}>
                      {week.weekLabel}
                    </Text>
                    <Text style={[typography.body, styles.secondaryText]}>
                      Ukentlig snitt
                    </Text>
                  </View>

                  <View style={styles.valueCol}>
                    <View style={styles.weightStack}>
                      <Text style={[typography.bodyBlack, styles.weightValue]}>
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
                          typography.bodyBlack,
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
  },

  title: { color: "white" },
  summaryRow: {
    width: "100%",
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    marginBottom: 2,
    flexWrap: "wrap",
  },
  summaryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(6,182,212,0.10)",
    borderWidth: 0.8,
    borderColor: "rgba(56,189,248,0.16)",
  },
  summaryText: {
    ...typography.body,
    color: "rgba(224,242,254,0.95)",
    fontSize: 11,
    fontWeight: "600",
  },

  segment: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 999,
    backgroundColor: "rgba(2,6,23,0.44)",
    borderWidth: 0.8,
    borderColor: "rgba(56,189,248,0.28)",
  },
  segmentBtn: {
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 999,
  },
  segmentBtnActive: {
    backgroundColor: "rgba(6,182,212,0.14)",
    borderWidth: 0.8,
    borderColor: "rgba(56,189,248,0.28)",
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 1,
  },
  segmentText: {
    ...typography.body,
    fontSize: 11,
    color: "rgba(148,163,184,0.92)",
    fontWeight: "800",
    letterSpacing: 0.1,
  },
  segmentTextActive: { color: "#38bdf8" },

  // Latest card (premium but compact)
  latestCard: {
    marginTop: 12,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    overflow: "hidden",
    backgroundColor: "rgba(2,6,23,0.22)",
    borderWidth: 0.8,
    borderColor: "rgba(56,189,248,0.11)",
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 4,
    elevation: 1,
  },
  latestTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  latestIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(6,182,212,0.10)",
    borderWidth: 0.8,
    borderColor: "rgba(56,189,248,0.16)",
    marginRight: 10,
  },
  latestLabel: {
    fontSize: 12,
    color: "rgba(148,163,184,0.92)",
    fontWeight: "900",
    letterSpacing: 0.12,
  },
  latestSub: {
    marginTop: 2,
    fontSize: 11,
    color: "rgba(148,163,184,0.82)",
    fontWeight: "700",
  },
  latestValueWrap: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginLeft: 12,
  },
  latestValue: {
    fontSize: 18,
    color: "#F8FAFC",
    fontWeight: "900",
    letterSpacing: 0.15,
  },
  latestUnit: {
    fontSize: 11,
    color: "rgba(148,163,184,0.85)",
    fontWeight: "800",
  },
  latestAccent: {
    height: 2,
    width: "100%",
    borderRadius: 999,
    opacity: 0.9,
    marginTop: 10,
  },

  // Avg card - tighter
  avgCard: {
    width: "100%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    marginBottom: 10,
    backgroundColor: "rgba(2,6,23,0.22)",
    borderWidth: 0.8,
    borderColor: "rgba(56,189,248,0.11)",
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 4,
    elevation: 1,
  },
  avgTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  avgIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(6,182,212,0.10)",
    borderWidth: 0.8,
    borderColor: "rgba(56,189,248,0.16)",
  },
  avgLabel: {
    fontSize: 11,
    color: "rgba(148,163,184,0.92)",
    fontWeight: "900",
    letterSpacing: 0.1,
  },
  avgValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 8,
  },
  avgValue: {
    fontSize: 22,
    color: "#F8FAFC",
    fontWeight: "900",
  },
  avgUnit: {
    fontSize: 11,
    color: "rgba(148,163,184,0.9)",
    fontWeight: "800",
  },

  // Month header
  monthHeaderContainer: {
    width: "100%",
    marginTop: 10,
    marginBottom: 6,
    alignItems: "flex-start",
    paddingHorizontal: 6,
  },
  monthHeaderText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.18,
    color: "rgba(148,163,184,0.9)",
    textTransform: "capitalize",
  },

  // Rows: lower height + smaller text
  rowCard: {
    width: "100%",
    paddingVertical: 9,
    paddingHorizontal: 10,
    marginBottom: 7,
    borderRadius: 18,

    backgroundColor: "rgba(2,6,23,0.20)",
    borderWidth: 0.8,
    borderColor: "rgba(56,189,248,0.10)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: "rgba(6,182,212,0.10)",
    borderWidth: 0.8,
    borderColor: "rgba(56,189,248,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  textCol: { flex: 1 },

  primaryText: {
    fontSize: 13,
    color: "#E5ECFF",
    fontWeight: "900",
    letterSpacing: 0.08,
  },
  secondaryText: {
    fontSize: 10.5,
    color: "rgba(148,163,184,0.85)",
    fontWeight: "700",
    marginTop: 2,
  },

  valueCol: {
    alignItems: "flex-end",
    marginLeft: 10,
  },
  weightStack: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
  },
  weightValue: {
    fontSize: 14.5,
    color: "#F1F5F9",
    fontWeight: "900",
    letterSpacing: 0.06,
  },
  weightUnit: {
    fontSize: 10.5,
    color: "rgba(148,163,184,0.85)",
    fontWeight: "800",
  },

  diffPill: {
    marginTop: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 0.8,
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  diffText: {
    fontSize: 10.5,
    fontWeight: "900",
    letterSpacing: 0.12,
  },

  loadMoreBtn: {
    marginTop: 12,
    marginBottom: 6,
    alignSelf: "center",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: "rgba(6,182,212,0.10)",
    borderWidth: 0.8,
    borderColor: "rgba(56,189,248,0.16)",
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  loadMoreText: {
    fontSize: 11,
    color: "#38bdf8",
    fontWeight: "900",
    letterSpacing: 0.16,
  },
});

