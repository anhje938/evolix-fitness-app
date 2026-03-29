import { generalStyles } from "@/config/styles";
import { typography } from "@/config/typography";
import {
  type BodyGoalCoachRecommendation,
  formatBodyGoalCoachCalories,
  formatBodyGoalCoachCaloriesRange,
  formatBodyGoalCoachTrend,
  formatBodyGoalCoachWeight,
} from "@/utils/coaching/bodyGoalCoach";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  recommendation: BodyGoalCoachRecommendation;
  variant: "food" | "weight";
};

function getTone(
  status: BodyGoalCoachRecommendation["status"],
  variant: Props["variant"]
) {
  if (variant === "food") {
    switch (status) {
      case "goalReached":
        return {
          accent: "#4ADE80",
          tint: "rgba(74,222,128,0.14)",
          border: "rgba(74,222,128,0.22)",
        };
      case "onTrack":
        return {
          accent: "#34D399",
          tint: "rgba(52,211,153,0.14)",
          border: "rgba(52,211,153,0.22)",
        };
      case "increaseCalories":
        return {
          accent: "#F59E0B",
          tint: "rgba(245,158,11,0.14)",
          border: "rgba(245,158,11,0.22)",
        };
      case "decreaseCalories":
        return {
          accent: "#FB7185",
          tint: "rgba(251,113,133,0.14)",
          border: "rgba(251,113,133,0.22)",
        };
      case "deadlineRisk":
        return {
          accent: "#F59E0B",
          tint: "rgba(245,158,11,0.14)",
          border: "rgba(245,158,11,0.24)",
        };
      default:
        return {
          accent: "#FBBF24",
          tint: "rgba(251,191,36,0.12)",
          border: "rgba(251,191,36,0.20)",
        };
    }
  }

  switch (status) {
    case "goalReached":
      return {
        accent: "#4ADE80",
        tint: "rgba(74,222,128,0.18)",
        border: "rgba(74,222,128,0.28)",
      };
    case "onTrack":
      return {
        accent: "#38BDF8",
        tint: "rgba(56,189,248,0.18)",
        border: "rgba(56,189,248,0.28)",
      };
    case "increaseCalories":
      return {
        accent: "#FB923C",
        tint: "rgba(251,146,60,0.18)",
        border: "rgba(251,146,60,0.28)",
      };
    case "decreaseCalories":
      return {
        accent: "#F472B6",
        tint: "rgba(244,114,182,0.18)",
        border: "rgba(244,114,182,0.28)",
      };
    case "deadlineRisk":
      return {
        accent: "#F59E0B",
        tint: "rgba(245,158,11,0.18)",
        border: "rgba(245,158,11,0.28)",
      };
    default:
      return {
        accent: "#94A3B8",
        tint: "rgba(148,163,184,0.16)",
        border: "rgba(148,163,184,0.24)",
      };
  }
}

function getActionCopy(
  recommendation: BodyGoalCoachRecommendation,
  variant: Props["variant"]
) {
  const recommendedRange = formatBodyGoalCoachCaloriesRange(
    recommendation.recommendedCaloriesMin,
    recommendation.recommendedCaloriesMax
  );
  const hasRecommendedCalories = recommendation.recommendedCaloriesMin !== null;
  const isFood = variant === "food";

  if (
    recommendation.status === "onTrack" ||
    recommendation.status === "goalReached"
  ) {
    return {
      label: isFood ? "Kaloriområde" : "Coachområde",
      value: hasRecommendedCalories ? recommendedRange : "Logg mer data",
      note: isFood
        ? null
        : hasRecommendedCalories
        ? `Hold deg omtrent innenfor ${recommendedRange} per dag.`
        : "Fortsett å logge jevnt, så blir kalorinivået mer presist.",
    };
  }

  if (recommendation.status === "insufficientData") {
    return {
      label: isFood ? "Kaloriområde" : "Coachområde",
      value: hasRecommendedCalories ? recommendedRange : "Logg mer data",
      note: isFood
        ? "7 hele dager på rad låser opp rådene."
        : hasRecommendedCalories
        ? "Mer vektlogg vil gjøre rådet skarpere."
        : `Du har ${recommendation.consecutiveCalorieDays} gyldige kalori-dager på rad. Coachen låses opp ved 7 hele dager på rad.`,
    };
  }

  return {
    label: isFood ? "Kaloriområde" : "Coachområde",
    value: hasRecommendedCalories ? recommendedRange : "Logg mer data",
    note: isFood
      ? hasRecommendedCalories
        ? "Juster først når trenden holder seg 1-2 uker."
        : "Mer jevn logging gir tydeligere råd."
      : hasRecommendedCalories
      ? `Start innenfor ${recommendedRange} og juster bare når trenden holder seg der i 1-2 uker.`
      : "Kalorinivået blir tydeligere når du har mer matlogg.",
  };
}

export function BodyGoalCoachCard({ recommendation, variant }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const isFood = variant === "food";
  const isCollapsed = isFood && collapsed;
  const tone = getTone(recommendation.status, variant);
  const action = getActionCopy(recommendation, variant);
  const title = variant === "weight" ? "Vektcoach" : "Matcoach";
  const iconName =
    variant === "weight" ? "analytics-outline" : "restaurant-outline";
  const metrics =
    variant === "weight"
      ? [
          {
            label: "Nåvekt",
            value: formatBodyGoalCoachWeight(recommendation.latestWeightKg),
          },
          {
            label: "Målvekt",
            value: formatBodyGoalCoachWeight(recommendation.goalWeightKg),
          },
          {
            label: "Trend nå",
            value: formatBodyGoalCoachTrend(
              recommendation.currentTrendKgPerWeek
            ),
          },
          {
            label: "Plan",
            value: formatBodyGoalCoachTrend(
              recommendation.requiredTrendKgPerWeek
            ),
          },
        ]
      : [
          {
            label:
              recommendation.maintenanceCalories === null
                ? "Vektmålinger"
                : "Vedlikehold",
            value:
              recommendation.maintenanceCalories === null
                ? `${recommendation.trackedWeightDays}`
                : formatBodyGoalCoachCalories(
                    recommendation.maintenanceCalories
                  ),
          },
          {
            label: "Kalorilogg",
            value: `${recommendation.consecutiveCalorieDays} på rad`,
          },
        ];

  return (
    <View
      style={[
        generalStyles.newCard,
        styles.card,
        isFood && styles.cardCompact,
        isCollapsed && styles.cardCollapsed,
        isFood && styles.cardFood,
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={[
          isFood ? `${tone.accent}1A` : `${tone.accent}22`,
          isFood ? "rgba(34,197,94,0.04)" : "rgba(15,23,42,0.08)",
          "rgba(2,6,23,0)",
        ]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.headerRow, isFood && styles.headerRowCompact]}>
        <View style={[styles.headerLeft, isFood && styles.headerLeftCompact]}>
          <View
            style={[
              styles.iconWrap,
              isFood && styles.iconWrapCompact,
              { backgroundColor: tone.tint },
            ]}
          >
            <Ionicons
              name={iconName}
              size={isFood ? 13 : 15}
              color={tone.accent}
            />
          </View>

          <View style={styles.headerCopy}>
            <Text style={[styles.kicker, isFood && styles.kickerCompact]}>
              {title}
            </Text>
            <Text
              style={[
                typography.body,
                styles.headline,
                isFood && styles.headlineCompact,
              ]}
            >
              {recommendation.headline}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <View
            style={[
              styles.statusPill,
              isFood && styles.statusPillCompact,
              {
                backgroundColor: tone.tint,
                borderColor: tone.border,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                isFood && styles.statusTextCompact,
                { color: tone.accent },
              ]}
            >
              {recommendation.statusLabel}
            </Text>
          </View>

          {isFood ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isCollapsed ? "Vis matcoach" : "Minimer matcoach"
              }
              onPress={() => setCollapsed((prev) => !prev)}
              style={({ pressed }) => [
                styles.collapseBtn,
                isFood && styles.collapseBtnFood,
                pressed && styles.collapseBtnPressed,
              ]}
            >
              <Ionicons
                name={isCollapsed ? "chevron-down" : "chevron-up"}
                size={14}
                color={isFood ? tone.accent : "rgba(191,219,254,0.88)"}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      {isCollapsed ? (
        <View
          style={[
            styles.collapsedActionRow,
            isFood && styles.collapsedActionRowCompact,
            isFood && {
              backgroundColor: "rgba(34,24,10,0.30)",
              borderColor: tone.border,
            },
          ]}
        >
          <Text
            style={[
              styles.collapsedActionLabel,
              isFood && styles.collapsedActionLabelCompact,
            ]}
          >
            {action.label}
          </Text>
          <Text
            style={[
              typography.body,
              styles.collapsedActionValue,
              isFood && styles.collapsedActionValueCompact,
            ]}
          >
            {action.value}
          </Text>
        </View>
      ) : (
        <>
          {isFood ? null : (
            <Text style={[typography.body, styles.summary]}>
              {recommendation.summary}
            </Text>
          )}

          <View
            style={[
              styles.actionCard,
              isFood && styles.actionCardCompact,
              isFood && {
                backgroundColor: "rgba(34,24,10,0.34)",
                borderColor: tone.border,
              },
            ]}
          >
            <Text
              style={[styles.actionLabel, isFood && styles.actionLabelCompact]}
            >
              {action.label}
            </Text>
            <Text
              style={[
                typography.body,
                styles.actionValue,
                isFood && styles.actionValueCompact,
              ]}
            >
              {action.value}
            </Text>
            {action.note ? (
              <Text
                style={[styles.actionNote, isFood && styles.actionNoteCompact]}
              >
                {action.note}
              </Text>
            ) : null}
          </View>

          <View
            style={[styles.metricsGrid, isFood && styles.metricsGridCompact]}
          >
            {metrics.map((metric) => (
              <View
                key={metric.label}
                style={[
                  styles.metricItem,
                  isFood && styles.metricItemCompact,
                  isFood && styles.metricItemFood,
                ]}
              >
                <Text
                  style={[
                    styles.metricLabel,
                    isFood && styles.metricLabelCompact,
                  ]}
                >
                  {metric.label}
                </Text>
                <Text
                  style={[
                    typography.body,
                    styles.metricValue,
                    isFood && styles.metricValueCompact,
                  ]}
                >
                  {metric.value}
                </Text>
              </View>
            ))}
          </View>

          {isFood ? null : <Text style={styles.note}>{recommendation.note}</Text>}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginTop: 16,
  },
  cardCompact: {
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 0,
    marginBottom: 18,
  },
  cardCollapsed: {
    paddingBottom: 12,
  },
  cardFood: {
    borderColor: "rgba(251,191,36,0.14)",
    backgroundColor: "rgba(20,19,15,0.42)",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  headerRowCompact: {
    gap: 10,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  headerLeftCompact: {
    gap: 10,
  },
  headerActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  iconWrapCompact: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  headerCopy: {
    flex: 1,
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: "rgba(191,219,254,0.82)",
    marginBottom: 4,
    fontFamily: "Inter_500Medium",
  },
  kickerCompact: {
    fontSize: 10,
    marginBottom: 2,
    letterSpacing: 0.55,
    color: "rgba(253,230,138,0.74)",
  },
  headline: {
    fontSize: 16,
    lineHeight: 21,
    color: "#F8FAFC",
    fontWeight: "500",
  },
  headlineCompact: {
    fontSize: 14,
    lineHeight: 18,
    color: "rgba(248,250,252,0.94)",
    fontWeight: "400",
  },
  statusPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPillCompact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  statusTextCompact: {
    fontSize: 10.5,
  },
  collapseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.54)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
  },
  collapseBtnFood: {
    backgroundColor: "rgba(34,24,10,0.32)",
    borderColor: "rgba(251,191,36,0.14)",
  },
  collapseBtnPressed: {
    opacity: 0.82,
  },
  collapsedActionRow: {
    marginTop: 12,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(8,15,31,0.64)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.14)",
    gap: 3,
  },
  collapsedActionRowCompact: {
    marginTop: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  collapsedActionLabel: {
    fontSize: 10.5,
    textTransform: "uppercase",
    letterSpacing: 0.55,
    color: "rgba(148,163,184,0.82)",
    fontFamily: "Inter_500Medium",
  },
  collapsedActionLabelCompact: {
    fontSize: 9.5,
    color: "rgba(253,230,138,0.72)",
  },
  collapsedActionValue: {
    fontSize: 15,
    lineHeight: 19,
    color: "#F8FAFC",
    fontWeight: "500",
  },
  collapsedActionValueCompact: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "400",
  },
  summary: {
    marginTop: 14,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(226,232,240,0.9)",
  },
  actionCard: {
    marginTop: 16,
    borderRadius: 22,
    backgroundColor: "rgba(8,15,31,0.72)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.16)",
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  actionCardCompact: {
    marginTop: 12,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  actionLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: "rgba(148,163,184,0.88)",
    marginBottom: 6,
    fontFamily: "Inter_500Medium",
  },
  actionLabelCompact: {
    fontSize: 10,
    marginBottom: 4,
    letterSpacing: 0.55,
    color: "rgba(253,230,138,0.70)",
  },
  actionValue: {
    fontSize: 22,
    color: "#F8FAFC",
    fontWeight: "500",
  },
  actionValueCompact: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "400",
  },
  actionNote: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(191,219,254,0.84)",
    fontFamily: "Inter_400Regular",
  },
  actionNoteCompact: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 14,
    color: "rgba(226,232,240,0.74)",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  metricsGridCompact: {
    gap: 8,
    marginTop: 10,
  },
  metricItem: {
    flexBasis: "48%",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: "rgba(15,23,42,0.62)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  metricItemCompact: {
    flex: 1,
    flexBasis: "auto",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  metricItemFood: {
    backgroundColor: "rgba(15,23,42,0.48)",
    borderColor: "rgba(251,191,36,0.10)",
  },
  metricLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: "rgba(148,163,184,0.84)",
    marginBottom: 4,
    fontFamily: "Inter_500Medium",
  },
  metricLabelCompact: {
    fontSize: 9.5,
    marginBottom: 3,
    letterSpacing: 0.5,
    color: "rgba(253,230,138,0.70)",
  },
  metricValue: {
    fontSize: 15,
    lineHeight: 20,
    color: "#F8FAFC",
    fontWeight: "500",
  },
  metricValueCompact: {
    fontSize: 13,
    lineHeight: 17,
    color: "rgba(248,250,252,0.92)",
    fontWeight: "400",
  },
  note: {
    marginTop: 14,
    fontSize: 12,
    lineHeight: 18,
    color: "rgba(148,163,184,0.92)",
    fontFamily: "Inter_400Regular",
  },
});
