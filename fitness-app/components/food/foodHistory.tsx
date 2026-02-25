import { generalStyles } from "@/config/styles";
import { typography } from "@/config/typography";
import { Food } from "@/types/meal";
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

  const weeklyTotals = useMemo(
    () => getWeeklyMacroTotals(foodList ?? []),
    [foodList]
  );
  const activeWeek = weeklyTotals[0];

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
    options?: { expandable?: boolean; expanded?: boolean }
  ) => {
    const expandable = options?.expandable;
    const expanded = options?.expanded;

    return (
      <View style={styles.dayRow}>

        <View style={styles.dayIconWrap}>
          <Fontisto name="date" size={16} color="rgba(6,182,212,0.75)" />
        </View>

        <View style={styles.dayTextCol}>
          <Text style={[typography.bodyBlack, styles.dayTitle]}>
            {formatDateNO(date)}
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
              color="rgba(6,182,212,0.65)"
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
    const isExpanded = expandedDate === date;

    return (
      <View key={date} style={[generalStyles.newCard, styles.dayCard]}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => toggleDate(date)}>
          {renderDayHeader(date, total, {
            expandable: true,
            expanded: isExpanded,
          })}
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedWrap}>
            {mealsPerDate.map((meal: Food, idx: number) => {
              const iso = parseISO(meal.timestampUtc);
              const isLast = idx === mealsPerDate.length - 1;

              return (
                <View key={meal.id} style={styles.mealRow}>
                  <View style={styles.mealIconWrap}>
                    <Fontisto
                      name="shopping-basket"
                      size={12}
                      color="rgba(6,182,212,0.70)"
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
                    <Text style={[typography.body, styles.mealMacros]}>
                      P {meal.proteins} • C {meal.carbs} • F {meal.fats}
                    </Text>
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

    return (
      <View
        key={`${keyPrefix}${date}`}
        style={[generalStyles.newCard, styles.dayCard]}
      >
        {renderDayHeader(date, total)}
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
    <View style={[generalStyles.newCard, styles.container]}>

      <View style={styles.headerRow}>
        <Text style={[typography.h2, styles.headerTitle]}>Historikk</Text>

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

      {listMode === "daily" && (
        <View style={{ width: "100%", marginTop: 14 }}>
          {sortedDates
            .slice(0, dailyVisible)
            .map((date) => renderDailyExpandableCard(date))}

          {renderLoadMoreButton(
            () => setDailyVisible((v) => v + PAGE_SIZE),
            dailyVisible < sortedDates.length
          )}
        </View>
      )}

      {listMode === "weekly" && activeWeek && (
        <View style={{ width: "100%", marginTop: 14 }}>
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
    padding: 20,
  },

  headerRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },

  headerTitle: {
    color: "#FFFFFF",
  },

  segment: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 12,
    backgroundColor: "rgba(2,6,23,0.35)",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.10)",
  },

  segmentBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
  },

  segmentBtnActive: {
    backgroundColor: "rgba(6,182,212,0.10)",
    borderWidth: 0.5,
    borderColor: "rgba(6,182,212,0.20)",
    shadowColor: "#06b6d4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  segmentText: {
    ...typography.body,
    fontSize: 12,
    color: "rgba(148,163,184,0.85)",
    fontWeight: "600",
    letterSpacing: 0.1,
  },

  segmentTextActive: {
    color: "#06b6d4",
    fontWeight: "700",
  },

  dayCard: {
    width: "100%",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginVertical: 5,

    backgroundColor: "rgba(2,6,23,0.18)",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
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
    backgroundColor: "rgba(6,182,212,0.08)",
    borderWidth: 0.5,
    borderColor: "rgba(6,182,212,0.15)",
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
    backgroundColor: "rgba(6,182,212,0.10)",
    borderWidth: 0.5,
    borderColor: "rgba(6,182,212,0.20)",
    shadowColor: "#06b6d4",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },

  kcalValue: {
    color: "#06b6d4",
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
    borderTopWidth: 0.5,
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
    backgroundColor: "rgba(6,182,212,0.08)",
    borderWidth: 0.5,
    borderColor: "rgba(6,182,212,0.12)",
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
    color: "#06b6d4",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.05,
  },

  mealMacros: {
    color: "rgba(148,163,184,0.85)",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
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
    backgroundColor: "rgba(2,6,23,0.18)",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
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
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.08)",
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
    backgroundColor: "rgba(6,182,212,0.08)",
    borderWidth: 0.5,
    borderColor: "rgba(6,182,212,0.15)",
    shadowColor: "#06b6d4",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },

  loadMoreText: {
    color: "#06b6d4",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.05,
  },
});
