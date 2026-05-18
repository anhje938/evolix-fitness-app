import { generalStyles } from "@/config/styles";
import { NonMedicalDisclaimer } from "@/components/common/NonMedicalDisclaimer";
import {
  coachCompactText,
  coachVisualTheme,
} from "@/components/coaching/coachVisualTheme";
import { typography } from "@/config/typography";
import {
  type BodyGoalCoachRecommendation,
  formatBodyGoalCoachCalories,
  formatBodyGoalCoachCaloriesRange,
  formatBodyGoalCoachTrend,
  formatBodyGoalCoachWeight,
} from "@/utils/coaching/bodyGoalCoach";
import { useTranslation } from "@/i18n/translations";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  recommendation: BodyGoalCoachRecommendation;
  variant: "food" | "weight";
};

function getTone() {
  return {
    accent: coachVisualTheme.accent,
    tint: coachVisualTheme.accentSoft,
    border: coachVisualTheme.accentBorder,
  };
}

function getActionCopy(
  recommendation: BodyGoalCoachRecommendation,
  variant: Props["variant"],
  language: "nb" | "en"
) {
  const recommendedRange = formatBodyGoalCoachCaloriesRange(
    recommendation.recommendedCaloriesMin,
    recommendation.recommendedCaloriesMax
  );
  const hasRecommendedCalories = recommendation.recommendedCaloriesMin !== null;
  const isFood = variant === "food";
  const isEnglish = language === "en";
  const text = (nb: string, en: string) => (isEnglish ? en : nb);
  const localizedRange = localizeUnitText(recommendedRange, language);

  if (!recommendation.canRecommendCalories) {
    return {
      label: isFood
        ? text("Tidlig estimat", "Early estimate")
        : text("Datagrunnlag", "Data foundation"),
      value:
        !isFood
          ? text(
              `${recommendation.trackedWeightDays} målinger`,
              `${recommendation.trackedWeightDays} measurements`
            )
          : recommendation.recentAverageCalories !== null
          ? formatBodyGoalCoachCalories(recommendation.recentAverageCalories)
          : text("Bygger data", "Building data"),
      note:
        recommendation.status === "earlySignal"
          ? text(
              "Synlig nå, men ikke presist nok til en kaloriendring.",
              "Visible now, but not precise enough for a calorie change."
            )
          : text(
              "Logg flere hele matdager og vektmålinger før coachen justerer.",
              "Log more complete food days and weight measurements before the coach adjusts."
            ),
    };
  }

  if (
    recommendation.status === "onTrack" ||
    recommendation.status === "goalReached"
  ) {
    return {
      label: isFood
        ? text("Kaloriområde", "Calorie range")
        : text("Coachområde", "Coach range"),
      value: hasRecommendedCalories
        ? localizedRange
        : text("Logg mer data", "Log more data"),
      note: isFood
        ? null
        : hasRecommendedCalories
        ? text(
            `Hold deg omtrent innenfor ${localizedRange} per dag.`,
            `Stay roughly within ${localizedRange} per day.`
          )
        : text(
            "Fortsett å logge jevnt, så blir kalorinivået mer presist.",
            "Keep logging consistently so the calorie level becomes more precise."
          ),
    };
  }

  if (recommendation.status === "insufficientData") {
    return {
      label: isFood
        ? text("Kaloriområde", "Calorie range")
        : text("Coachområde", "Coach range"),
      value: hasRecommendedCalories
        ? localizedRange
        : text("Logg mer data", "Log more data"),
      note: isFood
        ? text(
            "Flere hele matdager låser opp rådene.",
            "More complete food days unlock the recommendations."
          )
        : hasRecommendedCalories
        ? text(
            "Mer vektlogg vil gjøre rådet skarpere.",
            "More weight logs will make the recommendation sharper."
          )
        : text(
            `Du har ${recommendation.trackedCalorieDays} brukbare matdager og ${recommendation.trackedWeightDays} vektmålinger.`,
            `You have ${recommendation.trackedCalorieDays} usable food days and ${recommendation.trackedWeightDays} weight measurements.`
          ),
    };
  }

  return {
    label: isFood
      ? text("Kaloriområde", "Calorie range")
      : text("Coachområde", "Coach range"),
    value: hasRecommendedCalories
      ? localizedRange
      : text("Logg mer data", "Log more data"),
    note: isFood
      ? hasRecommendedCalories
        ? text(
            "Juster først når trenden holder seg 1-2 uker.",
            "Adjust only when the trend holds for 1-2 weeks."
          )
        : text(
            "Mer jevn logging gir tydeligere råd.",
            "More consistent logging gives clearer advice."
          )
      : hasRecommendedCalories
      ? text(
          `Start innenfor ${localizedRange} og juster bare når trenden holder seg der i 1-2 uker.`,
          `Start within ${localizedRange} and only adjust when the trend holds there for 1-2 weeks.`
        )
      : text(
          "Kalorinivået blir tydeligere når du har mer matlogg.",
          "The calorie level gets clearer when you have more food logs."
        ),
  };
}

function localizeUnitText(value: string, language: "nb" | "en") {
  if (language !== "en") return value;
  return value.replaceAll("kg/uke", "kg/week").replaceAll("på rad", "in a row");
}

function getCoachHeadline(
  recommendation: BodyGoalCoachRecommendation,
  language: "nb" | "en"
) {
  if (language !== "en") return recommendation.headline;

  if (recommendation.status === "earlySignal") return "Early signal found";
  if (recommendation.status === "insufficientData") {
    return "Log a little more before the coach gives advice";
  }
  if (recommendation.status === "goalReached") {
    return "Trend weight is around your goal";
  }
  if (recommendation.status === "onTrack") {
    return "Calories and trend weight point the right way";
  }
  if (recommendation.status === "deadlineRisk") {
    return "The timeline is tight";
  }
  return "A small adjustment may help";
}

function getStatusLabel(
  recommendation: BodyGoalCoachRecommendation,
  language: "nb" | "en"
) {
  if (language !== "en") return recommendation.statusLabel;

  const labels: Record<BodyGoalCoachRecommendation["status"], string> = {
    insufficientData: "Needs more data",
    earlySignal: "Early estimate",
    onTrack: "On track",
    increaseCalories: "Increase calories",
    decreaseCalories: "Decrease calories",
    deadlineRisk: "Tight timeline",
    goalReached: "Goal reached",
  };
  return labels[recommendation.status];
}

function getDataSummary(
  recommendation: BodyGoalCoachRecommendation,
  language: "nb" | "en"
) {
  if (language !== "en") return recommendation.dataSummary;

  return `Food: ${recommendation.trackedCalorieDays} usable days. Weight: ${recommendation.trackedWeightDays} measurements.`;
}

function getConfidenceLabel(
  recommendation: BodyGoalCoachRecommendation,
  language: "nb" | "en"
) {
  if (language !== "en") return recommendation.confidenceLabel;

  if (recommendation.confidence === "high") return "High confidence";
  if (recommendation.confidence === "medium") return "Medium confidence";
  return "Low confidence";
}

function getWeightCoachSummary(
  recommendation: BodyGoalCoachRecommendation,
  language: "nb" | "en"
) {
  const text = (nb: string, en: string) => (language === "en" ? en : nb);

  if (recommendation.status === "earlySignal") {
    return text(
      "Coachen viser tidlige signaler allerede nå, men venter med konkrete endringer til datagrunnlaget er mer stabilt.",
      "The coach already shows early signals, but waits with concrete changes until the data foundation is more stable."
    );
  }

  if (recommendation.status === "insufficientData") {
    return recommendation.latestMeasuredWeightKg === null
      ? text(
          "Logg vekt og mat noen dager til, så kan coachen skille trend fra normal variasjon.",
          "Log weight and food for a few more days so the coach can separate trend from normal variation."
        )
      : text(
          "Coachen trenger mer sammenhengende matlogg og flere vektmålinger før den anbefaler en endring.",
          "The coach needs more connected food logs and weight measurements before recommending a change."
        );
  }

  if (recommendation.status === "goalReached") {
    return text(
      "Trendvekten ligger rundt målet. Hold området stabilt og se etter ro over flere målinger.",
      "Trend weight is around the goal. Keep the range stable and look for calm across several measurements."
    );
  }

  if (recommendation.status === "onTrack") {
    return text(
      "Trendvekten følger målet godt nok. Det viktigste nå er å ikke overjustere.",
      "Trend weight follows the goal well enough. The most important thing now is not to over-adjust."
    );
  }

  if (recommendation.status === "deadlineRisk") {
    return text(
      "Målfarten er stram. Bruk et realistisk kaloriområde i stedet for å presse planen hardere.",
      "The required pace is tight. Use a realistic calorie range instead of pushing the plan harder."
    );
  }

  return text(
    "Trendvekten peker på en liten justering. Gjør endringen rolig og vurder igjen etter 7-14 dager.",
    "Trend weight points to a small adjustment. Make the change calmly and review again after 7-14 days."
  );
}

export function BodyGoalCoachCard({ recommendation, variant }: Props) {
  const { t, language } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const isFood = variant === "food";
  const isCollapsed = isFood && collapsed;
  const tone = getTone();
  const action = getActionCopy(recommendation, variant, language);
  const title = variant === "weight" ? t("weightCoachTitle") : t("settingsFoodCoach");
  const iconName =
    variant === "weight" ? "analytics-outline" : "restaurant-outline";
  const metrics =
    variant === "weight"
      ? [
          {
            label: language === "en" ? "Current weight" : "Nåvekt",
            value: formatBodyGoalCoachWeight(recommendation.latestWeightKg),
          },
          {
            label: language === "en" ? "Goal weight" : "Målvekt",
            value: formatBodyGoalCoachWeight(recommendation.goalWeightKg),
          },
          {
            label: language === "en" ? "Current trend" : "Trend nå",
            value: localizeUnitText(
              formatBodyGoalCoachTrend(recommendation.currentTrendKgPerWeek),
              language
            ),
          },
        ]
      : [
          {
            label:
              recommendation.maintenanceCalories === null
                ? language === "en"
                  ? "Weight logs"
                  : "Vektmålinger"
                : language === "en"
                ? "Maintenance"
                : "Vedlikehold",
            value:
              recommendation.maintenanceCalories === null
                ? `${recommendation.trackedWeightDays}`
                : formatBodyGoalCoachCalories(
                    recommendation.maintenanceCalories
                  ),
          },
          {
            label: language === "en" ? "Calorie log" : "Kalorilogg",
            value:
              language === "en"
                ? `${recommendation.consecutiveCalorieDays} in a row`
                : `${recommendation.consecutiveCalorieDays} på rad`,
          },
        ];

  return (
    <View
      style={[
        generalStyles.newCard,
        styles.card,
        styles.cardCompact,
        isCollapsed && styles.cardCollapsed,
        styles.cardFood,
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={[
          `${tone.accent}1A`,
          "rgba(34,197,94,0.04)",
          "rgba(2,6,23,0)",
        ]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.headerRow, styles.headerRowCompact]}>
        <View style={[styles.headerLeft, styles.headerLeftCompact]}>
          <View
            style={[
              styles.iconWrap,
              styles.iconWrapCompact,
              { backgroundColor: tone.tint },
            ]}
          >
            <Ionicons name={iconName} size={13} color={tone.accent} />
          </View>

          <View style={styles.headerCopy}>
            <Text style={[styles.kicker, styles.kickerCompact]}>
              {title}
            </Text>
            <Text
              style={[
                typography.body,
                styles.headline,
                styles.headlineCompact,
              ]}
            >
              {getCoachHeadline(recommendation, language)}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <View
            style={[
              styles.statusPill,
              styles.statusPillCompact,
              {
                backgroundColor: tone.tint,
                borderColor: tone.border,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                styles.statusTextCompact,
                { color: tone.accent },
              ]}
            >
              {getStatusLabel(recommendation, language)}
            </Text>
          </View>

          {isFood ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isCollapsed
                  ? language === "en"
                    ? "Show food coach"
                    : "Vis matcoach"
                  : language === "en"
                  ? "Minimize food coach"
                  : "Minimer matcoach"
              }
              onPress={() => setCollapsed((prev) => !prev)}
              style={({ pressed }) => [
                styles.collapseBtn,
                styles.collapseBtnFood,
                pressed && styles.collapseBtnPressed,
              ]}
            >
              <Ionicons
                name={isCollapsed ? "chevron-down" : "chevron-up"}
                size={14}
                color={tone.accent}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      {isCollapsed ? (
        <View
          style={[
            styles.collapsedActionRow,
            styles.collapsedActionRowCompact,
            {
              backgroundColor: "rgba(34,24,10,0.30)",
              borderColor: tone.border,
            },
          ]}
        >
          <Text
            style={[
              styles.collapsedActionLabel,
              styles.collapsedActionLabelCompact,
            ]}
          >
            {action.label}
          </Text>
          <Text
            style={[
              typography.body,
              styles.collapsedActionValue,
              styles.collapsedActionValueCompact,
            ]}
          >
            {action.value}
          </Text>
        </View>
      ) : (
        <>
          {isFood ? null : (
            <Text style={[typography.body, styles.summary]}>
              {getWeightCoachSummary(recommendation, language)}
            </Text>
          )}

          <View
            style={[
              styles.actionCard,
              styles.actionCardCompact,
              {
                backgroundColor: coachVisualTheme.panelBg,
                borderColor: tone.border,
              },
            ]}
          >
            <Text
              style={[styles.actionLabel, styles.actionLabelCompact]}
            >
              {action.label}
            </Text>
            <Text
              style={[
                typography.body,
                styles.actionValue,
                styles.actionValueCompact,
              ]}
            >
              {action.value}
            </Text>
            {action.note ? (
              <Text
                style={[styles.actionNote, styles.actionNoteCompact]}
              >
                {action.note}
              </Text>
            ) : null}
          </View>

          <View style={[styles.metricsGrid, styles.metricsGridCompact]}>
            {metrics.map((metric) => (
              <View
                key={metric.label}
                style={[
                  styles.metricItem,
                  styles.metricItemCompact,
                  styles.metricItemFood,
                ]}
              >
                <Text
                  style={[
                    styles.metricLabel,
                    styles.metricLabelCompact,
                  ]}
                >
                  {metric.label}
                </Text>
                <Text
                  style={[
                    typography.body,
                    styles.metricValue,
                    styles.metricValueCompact,
                  ]}
                >
                  {metric.value}
                </Text>
              </View>
            ))}
          </View>

          {isFood ? null : (
            <Text style={styles.note}>
              {language === "en"
                ? `${getConfidenceLabel(recommendation, language)}. Adjust only when the trend holds across several measurements.`
                : `${getConfidenceLabel(recommendation, language)}. Juster bare når trenden holder seg over flere målinger.`}
            </Text>
          )}

          <View style={[styles.dataQualityBox, styles.dataQualityBoxFood]}>
            <Ionicons
              name="information-circle-outline"
              size={13}
              color="rgba(253,230,138,0.76)"
            />
            <Text style={[styles.dataQualityText, styles.dataQualityTextFood]}>
              {getDataSummary(recommendation, language)}
            </Text>
          </View>

          <NonMedicalDisclaimer compact />
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
  },
  cardCompact: {
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  cardCollapsed: {
    paddingBottom: 12,
  },
  cardFood: {
    borderColor: coachVisualTheme.accentSoft,
    backgroundColor: coachVisualTheme.cardBg,
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
    fontSize: coachCompactText.kicker,
    marginBottom: 2,
    letterSpacing: 0.55,
    color: coachVisualTheme.accentMuted,
  },
  headline: {
    fontSize: 16,
    lineHeight: 21,
    color: "#F8FAFC",
    fontWeight: "500",
  },
  headlineCompact: {
    fontSize: coachCompactText.headline,
    lineHeight: coachCompactText.headlineLine,
    color: coachVisualTheme.text,
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
    fontSize: coachCompactText.label,
    marginBottom: 4,
    letterSpacing: 0.55,
    color: coachVisualTheme.label,
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
    color: coachVisualTheme.textMuted,
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
    backgroundColor: coachVisualTheme.darkPanel,
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
    color: coachVisualTheme.label,
  },
  metricValue: {
    fontSize: 15,
    lineHeight: 20,
    color: "#F8FAFC",
    fontWeight: "500",
  },
  metricValueCompact: {
    fontSize: coachCompactText.value,
    lineHeight: coachCompactText.valueLine,
    color: coachVisualTheme.text,
    fontWeight: "400",
  },
  note: {
    marginTop: 14,
    fontSize: 12,
    lineHeight: 18,
    color: "rgba(148,163,184,0.92)",
    fontFamily: "Inter_400Regular",
  },
  dataQualityBox: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
    backgroundColor: "rgba(15,23,42,0.42)",
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  dataQualityBoxFood: {
    borderColor: "rgba(251,191,36,0.12)",
    backgroundColor: coachVisualTheme.panelBgSoft,
  },
  dataQualityText: {
    flex: 1,
    color: "rgba(203,213,225,0.84)",
    fontSize: 11.5,
    lineHeight: 16,
    fontFamily: "Inter_400Regular",
  },
  dataQualityTextFood: {
    color: coachVisualTheme.textMuted,
    fontSize: 11,
  },
});
