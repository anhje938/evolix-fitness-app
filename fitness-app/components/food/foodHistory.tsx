import { generalStyles } from "@/config/styles";
import { typography } from "@/config/typography";
import type { Food } from "@/types/meal";
import { formatDateNO, parseISO } from "@/utils/date";
import { calcTotalMacros } from "@/utils/food/calculateTotalMacros";
import {
  getWeeklyMacroTotals,
  groupMealsByDate,
} from "@/utils/food/groupFoodList";
import { Fontisto, Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const PAGE_SIZE = 50;

type FoodHistoryProps = {
  foodList: Food[];
};

function toWeekdayNo(date: string): string | null {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("nb-NO", { weekday: "long" }).format(parsed);
}

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function FoodHistory({ foodList }: FoodHistoryProps) {
  const [listMode, setListMode] = useState<"daily" | "weekly">("daily");
  const [dailyVisible, setDailyVisible] = useState(PAGE_SIZE);
  const [weeklyVisible, setWeeklyVisible] = useState(PAGE_SIZE);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const groupedMeals = useMemo(
    () => groupMealsByDate(foodList ?? []),
    [foodList]
  );

  const sortedDates = useMemo(
    () => Object.keys(groupedMeals).sort().reverse(),
    [groupedMeals]
  );
  const latestFiveCalendarDateSet = useMemo(() => {
    const set = new Set<string>();
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    for (let i = 0; i < 5; i += 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      set.add(toLocalDateKey(d));
    }

    return set;
  }, []);

  const weeklyTotals = useMemo(
    () => getWeeklyMacroTotals(foodList ?? []),
    [foodList]
  );
  const activeWeek = weeklyTotals[0];

  const totalMeals = foodList?.length ?? 0;
  const trackedDays = sortedDates.length;
  const avgMealsPerDay =
    trackedDays > 0 ? (totalMeals / trackedDays).toFixed(1) : "0.0";

  const weeklyAverages = useMemo(() => {
    if (sortedDates.length === 0) return null;

    const lastDates = sortedDates.slice(0, 7);
    let totalCalories = 0;
    let totalProteins = 0;
    let totalCarbs = 0;
    let totalFats = 0;

    lastDates.forEach((date) => {
      const mealsForDate = groupedMeals[date] ?? [];
      const totals = calcTotalMacros(mealsForDate);
      totalCalories += totals.totalCalories;
      totalProteins += totals.totalProteins;
      totalCarbs += totals.totalCarbs;
      totalFats += totals.totalFats;
    });

    const days = lastDates.length || 1;

    return {
      caloriesPerDay: Math.round(totalCalories / days),
      proteinsPerDay: Math.round(totalProteins / days),
      carbsPerDay: Math.round(totalCarbs / days),
      fatsPerDay: Math.round(totalFats / days),
    };
  }, [sortedDates, groupedMeals]);

  const toggleDate = (date: string) => {
    setExpandedDate((prev) => (prev === date ? null : date));
  };

  const renderDayHeader = (
    date: string,
    total: ReturnType<typeof calcTotalMacros>,
    mealsCount: number,
    showWeekday: boolean,
    options?: { expandable?: boolean; expanded?: boolean }
  ) => {
    const expandable = options?.expandable;
    const expanded = options?.expanded;
    const weekday = showWeekday ? toWeekdayNo(date) : null;
    const dayLabel = weekday ?? formatDateNO(date);

    return (
      <View style={styles.dayRow}>
        <View style={styles.dayIconWrap}>
          <Fontisto name="date" size={16} color="rgba(56,189,248,0.76)" />
        </View>

        <View style={styles.dayTextCol}>
          <Text style={[typography.bodyBlack, styles.dayTitle]}>
            {dayLabel}
          </Text>
          <Text style={styles.dayMetaText}>
            {mealsCount} {mealsCount === 1 ? "måltid" : "måltider"}
          </Text>

          <View style={styles.macroLine}>
            <Text style={[styles.macroTag, styles.macroP]}>
              P {total.totalProteins}g
            </Text>
            <Text style={[styles.macroTag, styles.macroC]}>
              C {total.totalCarbs}g
            </Text>
            <Text style={[styles.macroTag, styles.macroF]}>
              F {total.totalFats}g
            </Text>
          </View>
        </View>

        <View style={styles.dayRightCol}>
          <View style={styles.kcalPill}>
            <Text style={[typography.bodyBlack, styles.kcalValue]}>
              {total.totalCalories}
            </Text>
            <Text style={[typography.body, styles.kcalUnit]}>kcal</Text>
          </View>

          {expandable && (
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={15}
              color="rgba(56,189,248,0.66)"
              style={{ marginTop: 5, alignSelf: "flex-end" }}
            />
          )}
        </View>
      </View>
    );
  };

  const renderDailyExpandableCard = (date: string) => {
    const mealsPerDate = groupedMeals[date] ?? [];
    const total = calcTotalMacros(mealsPerDate);
    const mealsCount = mealsPerDate.length;
    const isExpanded = expandedDate === date;

    return (
      <View key={date} style={[generalStyles.newCard, styles.dayCard]}>
        <View style={styles.dayCardAccent} />

        <TouchableOpacity activeOpacity={0.9} onPress={() => toggleDate(date)}>
          {renderDayHeader(
            date,
            total,
            mealsCount,
            latestFiveCalendarDateSet.has(date),
            {
            expandable: true,
            expanded: isExpanded,
            }
          )}
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedWrap}>
            {mealsPerDate.map((meal, idx) => {
              const iso = parseISO(meal.timestampUtc);
              const isLast = idx === mealsPerDate.length - 1;

              return (
                <View key={meal.id} style={styles.mealRow}>
                  <View style={styles.mealIconWrap}>
                    <Fontisto
                      name="shopping-basket"
                      size={12}
                      color="rgba(56,189,248,0.68)"
                    />
                  </View>

                  <View style={styles.mealTextCol}>
                    <Text
                      style={[typography.bodyBlack, styles.mealTitle]}
                      numberOfLines={1}
                    >
                      {meal.title}
                    </Text>
                    <Text style={[typography.body, styles.mealSub]}>
                      {iso.time}
                    </Text>
                  </View>

                  <View style={styles.mealRightCol}>
                    <Text style={[typography.bodyBlack, styles.mealKcal]}>
                      {meal.calories} kcal
                    </Text>

                    <View style={styles.mealMacroRow}>
                      <Text style={[styles.mealMacroChip, styles.mealMacroP]}>
                        P {meal.proteins}
                      </Text>
                      <Text style={[styles.mealMacroChip, styles.mealMacroC]}>
                        C {meal.carbs}
                      </Text>
                      <Text style={[styles.mealMacroChip, styles.mealMacroF]}>
                        F {meal.fats}
                      </Text>
                    </View>
                  </View>

                  {!isLast && <View style={styles.rowDivider} />}
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const renderDailySimpleCard = (date: string, keyPrefix = "") => {
    const mealsPerDate = groupedMeals[date] ?? [];
    const total = calcTotalMacros(mealsPerDate);
    const mealsCount = mealsPerDate.length;

    return (
      <View
        key={`${keyPrefix}${date}`}
        style={[generalStyles.newCard, styles.dayCard]}
      >
        <View style={styles.dayCardAccent} />
        {renderDayHeader(
          date,
          total,
          mealsCount,
          latestFiveCalendarDateSet.has(date)
        )}
      </View>
    );
  };

  const renderLoadMoreButton = (onPress: () => void, hasMore: boolean) => {
    if (!hasMore) return null;
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        style={styles.loadMoreBtn}
        onPress={onPress}
      >
        <Text style={[typography.bodyBlack, styles.loadMoreText]}>
          Vis 50 til
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container]}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={[typography.h2, styles.headerTitle]}>Matlogg</Text>
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
        <View style={styles.summaryChip}>
          <Ionicons name="calendar-outline" size={13} color="#38bdf8" />
          <Text style={styles.summaryChipText}>{trackedDays} dager</Text>
        </View>
        <View style={styles.summaryChip}>
          <Ionicons name="pulse-outline" size={13} color="#38bdf8" />
          <Text style={styles.summaryChipText}>{avgMealsPerDay} per dag</Text>
        </View>
      </View>

      {sortedDates.length === 0 && (
        <View style={[generalStyles.newCard, styles.emptyStateCard]}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="sparkles-outline" size={17} color="#38bdf8" />
          </View>
          <Text style={[typography.bodyBlack, styles.emptyTitle]}>
            Ingen måltider logget ennå
          </Text>
          <Text style={[typography.body, styles.emptySub]}>
            Når du logger mat vil historikken vises her.
          </Text>
        </View>
      )}

      {listMode === "daily" && sortedDates.length > 0 && (
        <View style={styles.modeContent}>
          {sortedDates
            .slice(0, dailyVisible)
            .map((date) => renderDailyExpandableCard(date))}

          {renderLoadMoreButton(
            () => setDailyVisible((v) => v + PAGE_SIZE),
            dailyVisible < sortedDates.length
          )}
        </View>
      )}

      {listMode === "weekly" && activeWeek && sortedDates.length > 0 && (
        <View style={styles.modeContent}>
          {weeklyAverages && (
            <View style={[generalStyles.newCard, styles.weekCard]}>
              <Text style={[typography.bodyBlack, styles.weekTitle]}>
                Gjennomsnitt per dag (siste 7 dager)
              </Text>

              <View style={styles.weekGrid}>
                <View style={styles.weekCell}>
                  <Text style={styles.weekLabel}>Kalorier</Text>
                  <Text style={styles.weekValue}>
                    {weeklyAverages.caloriesPerDay}
                  </Text>
                  <Text style={styles.weekUnit}>kcal / dag</Text>
                </View>

                <View style={styles.weekCell}>
                  <Text style={styles.weekLabel}>Protein</Text>
                  <Text style={[styles.weekValue, { color: "#4ade80" }]}>
                    {weeklyAverages.proteinsPerDay}
                  </Text>
                  <Text style={styles.weekUnit}>g / dag</Text>
                </View>

                <View style={styles.weekCell}>
                  <Text style={styles.weekLabel}>Karbo</Text>
                  <Text style={[styles.weekValue, { color: "#38bdf8" }]}>
                    {weeklyAverages.carbsPerDay}
                  </Text>
                  <Text style={styles.weekUnit}>g / dag</Text>
                </View>

                <View style={styles.weekCell}>
                  <Text style={styles.weekLabel}>Fett</Text>
                  <Text style={[styles.weekValue, { color: "#fb923c" }]}>
                    {weeklyAverages.fatsPerDay}
                  </Text>
                  <Text style={styles.weekUnit}>g / dag</Text>
                </View>
              </View>
            </View>
          )}

          <View
            style={[generalStyles.newCard, styles.weekCard, { marginTop: 12 }]}
          >
            <Text style={[typography.bodyBlack, styles.weekTitle]}>
              Total ukentlig inntak
            </Text>

            <View style={{ marginTop: 6 }}>
              <Text style={styles.weekLabel}>Totalt</Text>
              <Text style={styles.weekTotal}>
                {activeWeek.totalCalories} kcal
              </Text>
            </View>

            <View style={styles.weekMacroRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.weekLabel}>Protein</Text>
                <Text style={[styles.weekMacroValue, { color: "#4ade80" }]}>
                  {activeWeek.totalProteins}g
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.weekLabel}>Karbo</Text>
                <Text style={[styles.weekMacroValue, { color: "#38bdf8" }]}>
                  {activeWeek.totalCarbs}g
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.weekLabel}>Fett</Text>
                <Text style={[styles.weekMacroValue, { color: "#fb923c" }]}>
                  {activeWeek.totalFats}g
                </Text>
              </View>
            </View>
          </View>

          <Text style={[typography.bodyBlack, styles.dailyOverviewTitle]}>
            Daglig oversikt
          </Text>

          {sortedDates
            .slice(0, weeklyVisible)
            .map((date) => renderDailySimpleCard(date, "weekly-"))}

          {renderLoadMoreButton(
            () => setWeeklyVisible((v) => v + PAGE_SIZE),
            weeklyVisible < sortedDates.length
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    padding: 0,
  },

  headerRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
    gap: 10,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },

  headerTitle: {
    color: "#FFFFFF",
  },

  segment: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 13,
    backgroundColor: "rgba(2,6,23,0.44)",
    borderWidth: 0.8,
    borderColor: "rgba(255,255,255,0.10)",
  },

  segmentBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
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
    fontSize: 12,
    color: "rgba(148,163,184,0.85)",
    fontWeight: "600",
    letterSpacing: 0.1,
  },

  segmentTextActive: {
    color: "#38bdf8",
    fontWeight: "700",
  },

  summaryRow: {
    width: "100%",
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  summaryChip: {
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
  summaryChipText: {
    ...typography.body,
    color: "rgba(224,242,254,0.95)",
    fontSize: 11,
    fontWeight: "600",
  },

  modeContent: {
    width: "100%",
    marginTop: 14,
  },

  emptyStateCard: {
    width: "100%",
    marginTop: 14,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "center",
    backgroundColor: "rgba(2,6,23,0.20)",
    borderWidth: 0.8,
    borderColor: "rgba(56,189,248,0.12)",
  },
  emptyIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(6,182,212,0.12)",
    borderWidth: 0.8,
    borderColor: "rgba(56,189,248,0.16)",
    marginBottom: 8,
  },
  emptyTitle: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  emptySub: {
    marginTop: 3,
    fontSize: 12,
    color: "rgba(148,163,184,0.9)",
  },

  dayCard: {
    position: "relative",
    overflow: "hidden",
    width: "100%",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginVertical: 5,
    backgroundColor: "rgba(2,6,23,0.22)",
    borderWidth: 0.8,
    borderColor: "rgba(56,189,248,0.11)",
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 4,
    elevation: 1,
  },
  dayCardAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "rgba(56,189,248,0.58)",
    opacity: 0.7,
  },

  dayRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  dayIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: "rgba(6,182,212,0.10)",
    borderWidth: 0.8,
    borderColor: "rgba(56,189,248,0.16)",
  },

  dayTextCol: {
    flex: 1,
  },

  dayTitle: {
    color: "#F1F5F9",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  dayMetaText: {
    ...typography.body,
    marginTop: 2,
    color: "rgba(148,163,184,0.86)",
    fontSize: 11,
    fontWeight: "600",
  },

  macroLine: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },

  macroTag: {
    ...typography.body,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.05,
    color: "rgba(148,163,184,0.92)",
  },

  macroP: { color: "#4ade80" },
  macroC: { color: "#38bdf8" },
  macroF: { color: "#fb923c" },

  dayRightCol: {
    alignItems: "flex-end",
    marginLeft: 10,
  },

  kcalPill: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 10,
    backgroundColor: "rgba(6,182,212,0.12)",
    borderWidth: 0.8,
    borderColor: "rgba(56,189,248,0.18)",
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },

  kcalValue: {
    color: "#38bdf8",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.05,
  },

  kcalUnit: {
    color: "rgba(148,163,184,0.80)",
    fontSize: 10,
    fontWeight: "600",
  },

  expandedWrap: {
    marginTop: 14,
    borderTopWidth: 0.8,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingTop: 12,
  },

  mealRow: {
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },

  mealIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
    backgroundColor: "rgba(6,182,212,0.10)",
    borderWidth: 0.8,
    borderColor: "rgba(56,189,248,0.14)",
  },

  mealTextCol: {
    flex: 1,
  },

  mealTitle: {
    color: "#F1F5F9",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.05,
  },

  mealSub: {
    color: "rgba(148,163,184,0.85)",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 3,
  },

  mealRightCol: {
    alignItems: "flex-end",
    marginLeft: 10,
  },

  mealKcal: {
    color: "#38bdf8",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.05,
  },
  mealMacroRow: {
    marginTop: 4,
    flexDirection: "row",
    gap: 4,
  },
  mealMacroChip: {
    ...typography.body,
    fontSize: 10,
    fontWeight: "700",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 7,
    overflow: "hidden",
  },
  mealMacroP: {
    color: "#86efac",
    backgroundColor: "rgba(74,222,128,0.12)",
    borderWidth: 0.8,
    borderColor: "rgba(74,222,128,0.25)",
  },
  mealMacroC: {
    color: "#7dd3fc",
    backgroundColor: "rgba(56,189,248,0.12)",
    borderWidth: 0.8,
    borderColor: "rgba(56,189,248,0.24)",
  },
  mealMacroF: {
    color: "#fdba74",
    backgroundColor: "rgba(251,146,60,0.12)",
    borderWidth: 0.8,
    borderColor: "rgba(251,146,60,0.24)",
  },

  rowDivider: {
    position: "absolute",
    left: 41,
    right: 0,
    bottom: 0,
    height: 0.5,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  weekCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: "rgba(2,6,23,0.22)",
    borderWidth: 0.8,
    borderColor: "rgba(56,189,248,0.11)",
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 4,
    elevation: 1,
  },

  weekTitle: {
    color: "#F1F5F9",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.1,
    marginBottom: 12,
  },

  weekGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  weekCell: {
    width: "48%",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 0.8,
    borderColor: "rgba(255,255,255,0.10)",
  },

  weekLabel: {
    ...typography.body,
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(148,163,184,0.85)",
    letterSpacing: 0.05,
  },

  weekValue: {
    ...typography.bodyBlack,
    fontSize: 19,
    fontWeight: "700",
    color: "#F8FAFC",
    marginTop: 5,
    letterSpacing: 0.05,
  },

  weekUnit: {
    ...typography.body,
    fontSize: 10,
    fontWeight: "500",
    color: "rgba(148,163,184,0.80)",
    marginTop: 3,
  },

  weekTotal: {
    ...typography.bodyBlack,
    fontSize: 19,
    fontWeight: "700",
    color: "#F8FAFC",
    marginTop: 5,
    letterSpacing: 0.05,
  },

  weekMacroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    gap: 12,
  },

  weekMacroValue: {
    ...typography.bodyBlack,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 5,
    letterSpacing: 0.05,
  },

  dailyOverviewTitle: {
    color: "rgba(148,163,184,0.85)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    marginTop: 18,
    marginBottom: 8,
  },

  loadMoreBtn: {
    marginTop: 14,
    alignSelf: "center",
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: "rgba(6,182,212,0.10)",
    borderWidth: 0.8,
    borderColor: "rgba(56,189,248,0.16)",
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },

  loadMoreText: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.05,
  },
});
