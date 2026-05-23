import { DarkOceanBackground } from "@/components/DarkOceanBackground";
import { LockedFeatureCard } from "@/components/subscription/LockedFeatureCard";
import { Paywall } from "@/components/subscription/Paywall";
import { typography } from "@/config/typography";
import { useSubscription } from "@/context/SubscriptionProvider";
import { useUserSettings } from "@/context/UserSettingsProvider";
import { useTranslation } from "@/i18n/translations";
import {
  useApplyCutRecommendation,
  useCurrentCutReport,
  useCutReadiness,
  useUndoLastCutRecommendation,
} from "@/hooks/useCutIntelligence";
import type {
  CutRecommendation,
  CutReadiness,
  CutReport,
  CutReportConfidence,
  CutReportStatus,
  GoalReportType,
} from "@/types/cutIntelligence";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState, type ComponentProps, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const premiumBlue = {
  soft: "#BFDBFE",
  text: "rgba(219,234,254,0.96)",
  muted: "rgba(191,219,254,0.78)",
  border: "rgba(147,197,253,0.22)",
  panel: "rgba(15,23,42,0.58)",
  panelSoft: "rgba(15,23,42,0.42)",
};

const premiumBlueGradient = [
  "rgba(3,24,60,0.94)",
  "rgba(14,78,148,0.80)",
  "rgba(8,145,178,0.34)",
] as const;

const premiumBluePreviewGradient = [
  "rgba(3,24,60,0.88)",
  "rgba(14,78,148,0.72)",
  "rgba(15,23,42,0.62)",
] as const;

const premiumBlueAccent = [
  "rgba(96,165,250,0.72)",
  "rgba(34,211,238,0.42)",
] as const;

type TranslationFn = ReturnType<typeof useTranslation>["t"];

function getEmptyReadiness(t: TranslationFn): CutReadiness {
  return {
    isReady: false,
    readyItemCount: 0,
    totalItemCount: 4,
    summary: t("cutReportReadinessFallback"),
    items: [
      {
        id: "cut_days",
        label: t("cutReportReadinessCutDays"),
        current: 0,
        required: 7,
        isReady: false,
        unit: t("cutReportUnitDays"),
      },
      {
        id: "weight_logs",
        label: t("cutReportReadinessWeightLogs"),
        current: 0,
        required: 4,
        isReady: false,
        unit: t("cutReportUnitMeasurements"),
      },
      {
        id: "food_logs",
        label: t("cutReportReadinessFoodLogs"),
        current: 0,
        required: 4,
        isReady: false,
        unit: t("cutReportUnitDays"),
      },
      {
        id: "strength_sessions",
        label: t("cutReportReadinessStrengthSessions"),
        current: 0,
        required: 2,
        isReady: false,
        unit: t("cutReportUnitSessions"),
      },
    ],
  };
}

function normalizeReport(report: CutReport, t: TranslationFn): CutReport {
  const emptyReadiness = getEmptyReadiness(t);

  return {
    ...report,
    warnings: Array.isArray(report.warnings) ? report.warnings : [],
    goalType: report.goalType ?? "cut",
    isLimitedReport: Boolean(report.isLimitedReport),
    notEnoughData: Boolean(report.notEnoughData),
    statusReasons: Array.isArray(report.statusReasons)
      ? report.statusReasons
      : [],
    recommendations: Array.isArray(report.recommendations)
      ? report.recommendations
      : [],
    readiness: report.readiness ?? emptyReadiness,
    scoreBreakdown: Array.isArray(report.scoreBreakdown)
      ? report.scoreBreakdown
      : [],
    weightTrend: {
      ...report.weightTrend,
      points: Array.isArray(report.weightTrend?.points)
        ? report.weightTrend.points
        : [],
      summary: report.weightTrend?.summary ?? t("cutReportWeightTrendMissing"),
    },
    nutritionSummary: {
      ...report.nutritionSummary,
      averagePreWorkoutCarbs:
        report.nutritionSummary?.averagePreWorkoutCarbs ?? null,
      averagePostWorkoutCarbs:
        report.nutritionSummary?.averagePostWorkoutCarbs ?? null,
      summary:
        report.nutritionSummary?.summary ??
        t("cutReportNutritionMissing"),
    },
    strengthSummary: {
      ...report.strengthSummary,
      keyExercises: Array.isArray(report.strengthSummary?.keyExercises)
        ? report.strengthSummary.keyExercises
        : [],
      summary:
        report.strengthSummary?.summary ??
        t("cutReportStrengthMissing"),
    },
    trainingLoadSummary: {
      ...report.trainingLoadSummary,
      summary:
        report.trainingLoadSummary?.summary ??
        t("cutReportTrainingMissing"),
    },
    adherenceSummary: report.adherenceSummary ?? {
      mealLoggingAdherencePercent: report.nutritionSummary?.loggingAdherencePercent ?? 0,
      weighInAdherencePercent: 0,
      proteinTargetAdherencePercent: 0,
      calorieTargetAdherencePercent: 0,
      workoutAdherencePercent: null,
      summary: "Adherence mangler i responsen.",
    },
    timelineSummary: report.timelineSummary ?? {
      targetWeightKg: null,
      estimatedWeeksToGoal: null,
      maintenanceStabilityStreakWeeks: 0,
      summary: "Timeline mangler i responsen.",
    },
    previousComparison: report.previousComparison ?? {
      hasPreviousReport: false,
      previousScore: null,
      scoreChange: null,
      previousStatus: null,
      statusChanged: false,
      consecutiveWeeksOnTrack: 0,
      consecutiveWeeksOffTrack: 0,
      repeatedProblems: [],
      resolvedProblems: [],
      lastRecommendationIds: [],
      summary: "Ingen tidligere rapport å sammenligne med.",
    },
  };
}

function formatNumber(value: number | null | undefined, suffix = "") {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "--";
  }

  return `${Number(value).toLocaleString("nb-NO", {
    maximumFractionDigits: 1,
  })}${suffix}`;
}

function goalTitle(
  goalType: GoalReportType | undefined,
  language: "nb" | "en" = "nb"
) {
  if (language === "en") {
    if (goalType === "leanBulk") return "Bulk Report";
    if (goalType === "maintenance") return "Maintenance Report";
    return "Cut Report";
  }
  if (goalType === "leanBulk") return "Bulk Rapport";
  if (goalType === "maintenance") return "Maintenance Rapport";
  return "Cut Rapport";
}

function goalTypeFromDirection(
  direction: "gain" | "lose" | "maintain" | undefined
): GoalReportType {
  if (direction === "gain") return "leanBulk";
  if (direction === "maintain") return "maintenance";
  return "cut";
}

function goalPreviewTitle(
  goalType: GoalReportType | undefined,
  language: "nb" | "en" = "nb"
) {
  if (language === "en") {
    if (goalType === "leanBulk") return "Bulk Report is locked";
    if (goalType === "maintenance") return "Maintenance Report is locked";
    return "Cut Report is locked";
  }
  if (goalType === "leanBulk") return "Bulk Rapport er låst";
  if (goalType === "maintenance") return "Maintenance Rapport er låst";
  return "Cut Rapport er låst";
}

function goalPreviewBody(
  goalType: GoalReportType | undefined,
  language: "nb" | "en" = "nb"
) {
  if (language === "en") {
    if (goalType === "leanBulk") {
      return "Pro analyzes weight gain, macros, strength response and bulk quality before suggesting next week.";
    }
    if (goalType === "maintenance") {
      return "Pro analyzes weight stability, logging, training and real maintenance calories over time.";
    }
    return "Pro analyzes weight loss, macros, strength retention, logging and training load before suggesting next week.";
  }
  if (goalType === "leanBulk") {
    return "Pro analyserer vektoppgang, makroer, styrkerespons og bulk-kvalitet før den foreslår neste uke.";
  }
  if (goalType === "maintenance") {
    return "Pro analyserer vektstabilitet, logging, trening og faktisk vedlikeholdskalori over tid.";
  }
  return "Pro analyserer vekttap, makroer, styrkebevaring, logging og treningsbelastning før den foreslår neste uke.";
}

function statusLabel(status: CutReportStatus, language: "nb" | "en" = "nb") {
  if (language === "en") {
    const labels: Record<CutReportStatus, string> = {
      excellent: "Excellent",
      onTrack: "On track",
      slightlyAggressive: "Slightly aggressive",
      tooAggressive: "Too aggressive",
      tooSlow: "Too slow",
      strengthRisk: "Strength risk",
      fatigueRisk: "Fatigue risk",
      inconsistentData: "Inconsistent data",
      limitedData: "Limited report",
      notEnoughData: "Needs more data",
      tooFast: "Too fast",
      dirtyBulkRisk: "Dirty bulk risk",
      poorTrainingResponse: "Weak training response",
      strengthProgressing: "Strength improving",
      stable: "Stable",
      driftingUp: "Drifting up",
      driftingDown: "Drifting down",
      recompProgress: "Recomp signal",
      maintenanceFound: "Maintenance found",
    };
    return labels[status] ?? status;
  }
  const labels: Record<CutReportStatus, string> = {
    excellent: "Svært bra",
    onTrack: "På plan",
    slightlyAggressive: "Litt aggressiv",
    tooAggressive: "For aggressiv",
    tooSlow: "For treg",
    strengthRisk: "Styrkerisiko",
    fatigueRisk: "Fatigue-risiko",
    inconsistentData: "Ujevn data",
    limitedData: "Begrenset rapport",
    notEnoughData: "Trenger mer data",
    tooFast: "For rask",
    dirtyBulkRisk: "Dirty bulk-risiko",
    poorTrainingResponse: "Svak treningsrespons",
    strengthProgressing: "Styrke øker",
    stable: "Stabil",
    driftingUp: "Driver opp",
    driftingDown: "Driver ned",
    recompProgress: "Recomp-signal",
    maintenanceFound: "Vedlikehold funnet",
  };
  return labels[status] ?? status;
}

function confidenceLabel(
  confidence: CutReportConfidence,
  language: "nb" | "en" = "nb"
) {
  if (language === "en") {
    if (confidence === "high") return "High confidence";
    if (confidence === "medium") return "Medium confidence";
    return "Low confidence";
  }
  if (confidence === "high") return "Høy sikkerhet";
  if (confidence === "medium") return "Middels sikkerhet";
  return "Lav sikkerhet";
}

function problemLabel(problem: string) {
  const labels: Record<string, string> = {
    not_enough_data: "For lite data",
    limited_training_data: "Begrenset treningsdata",
    possible_water_weight: "Mulig vannvekt",
    unsafe_weight_pace: "Utrygt vekttempo",
    strength_response: "Styrkerespons",
    fatigue_risk: "Fatigue-risiko",
    low_protein: "Lavt protein",
    low_logging: "Svak logging",
    low_training_consistency: "Svak treningskonsistens",
    low_carbs_strength_drop: "Lav karbo og styrkefall",
    low_fat: "Lavt fett",
  };
  return labels[problem] ?? problem;
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  children: ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={15} color={premiumBlue.soft} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function ReadinessChecklist({ readiness }: { readiness: CutReadiness }) {
  return (
    <View style={styles.readinessList}>
      {readiness.items.map((item) => {
        const pct = Math.min(100, (item.current / item.required) * 100);
        return (
          <View key={item.id} style={styles.readinessRow}>
            <View style={styles.readinessTop}>
              <View style={styles.readinessLabelRow}>
                <Ionicons
                  name={item.isReady ? "checkmark-circle" : "ellipse-outline"}
                  size={15}
                  color={
                    item.isReady
                      ? "rgba(74,222,128,0.98)"
                      : "rgba(251,191,36,0.96)"
                  }
                />
                <Text style={styles.readinessLabel}>{item.label}</Text>
              </View>
              <Text style={styles.readinessValue}>
                {item.current}/{item.required}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct}%` }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function MetricRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, accent && styles.metricValueAccent]}>
        {value}
      </Text>
    </View>
  );
}

function WeightTrendChart({
  points,
  pointsLabel,
  averageLabel,
  emptyLabel,
}: {
  points: CutReport["weightTrend"]["points"];
  pointsLabel: string;
  averageLabel: string;
  emptyLabel: string;
}) {
  const width = 320;
  const height = 120;
  const pad = 12;
  const values = points.flatMap((point) =>
    point.rollingAverage7d == null
      ? [point.weightKg]
      : [point.weightKg, point.rollingAverage7d]
  );

  if (points.length < 2 || values.length < 2) {
    return (
      <View style={styles.chartEmpty}>
        <Text style={styles.chartEmptyText}>
          {emptyLabel}
        </Text>
      </View>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(0.1, max - min);
  const xFor = (index: number) =>
    pad + (index / Math.max(1, points.length - 1)) * (width - pad * 2);
  const yFor = (value: number) =>
    height - pad - ((value - min) / span) * (height - pad * 2);
  const rawLine = points
    .map((point, index) => `${xFor(index)},${yFor(point.weightKg)}`)
    .join(" ");
  const trendLine = points
    .map((point, index) =>
      point.rollingAverage7d == null
        ? null
        : `${xFor(index)},${yFor(point.rollingAverage7d)}`
    )
    .filter(Boolean)
    .join(" ");

  return (
    <View style={styles.chartWrap}>
      <Svg viewBox={`0 0 ${width} ${height}`} style={styles.chartSvg}>
        <Polyline
          points={rawLine}
          fill="none"
          stroke="rgba(148,163,184,0.55)"
          strokeWidth={2}
        />
        {trendLine ? (
          <Polyline
            points={trendLine}
            fill="none"
            stroke="rgba(96,165,250,0.96)"
            strokeWidth={3}
          />
        ) : null}
        {points.map((point, index) => (
          <Circle
            key={`${point.date}-${index}`}
            cx={xFor(index)}
            cy={yFor(point.weightKg)}
            r={3}
            fill="rgba(125,211,252,0.95)"
          />
        ))}
      </Svg>
      <View style={styles.chartLegend}>
        <Text style={styles.chartLegendText}>{pointsLabel}</Text>
        <Text style={styles.chartLegendAccent}>{averageLabel}</Text>
      </View>
    </View>
  );
}

function RecommendationCard({
  recommendation,
  isApplying,
  onApply,
  applyLabel,
}: {
  recommendation: CutRecommendation;
  isApplying?: boolean;
  onApply?: (id: string) => void;
  applyLabel: string;
}) {
  return (
    <View style={styles.recommendationCard}>
      <View style={styles.recommendationTop}>
        <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
        <Text style={styles.priorityPill}>{recommendation.priority}</Text>
      </View>
      <Text style={styles.recommendationReason}>{recommendation.reason}</Text>
      <Text style={styles.recommendationAction}>
        {recommendation.suggestedAction}
      </Text>
      {recommendation.expectedOutcome ? (
        <Text style={styles.recommendationOutcome}>
          {recommendation.expectedOutcome}
        </Text>
      ) : null}
      {recommendation.canApply && onApply ? (
        <Pressable
          disabled={isApplying}
          onPress={() => onApply(recommendation.id)}
          style={({ pressed }) => [
            styles.applyButton,
            pressed && !isApplying && styles.headerButtonPressed,
            isApplying && styles.headerButtonDisabled,
          ]}
        >
          {isApplying ? (
            <ActivityIndicator size="small" color="#02111f" />
          ) : (
            <Text style={styles.applyButtonText}>{applyLabel}</Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

function ReportContent({
  report,
  applyingRecommendationId,
  onApplyRecommendation,
}: {
  report: CutReport;
  applyingRecommendationId: string | null;
  onApplyRecommendation: (id: string) => void;
}) {
  const { t, language } = useTranslation();
  const safeReport = normalizeReport(report, t);
  const showScore = safeReport.status !== "notEnoughData";

  return (
    <>
      <LinearGradient
        colors={premiumBlueGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <LinearGradient
          colors={premiumBlueAccent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.heroAccent}
        />

        <View style={styles.heroTopRow}>
          <View style={styles.heroBadge}>
            <Ionicons name="analytics-outline" size={14} color={premiumBlue.soft} />
            <Text style={styles.heroBadgeText}>
              {goalTitle(safeReport.goalType, language)}
            </Text>
          </View>
          <Text style={styles.confidenceText}>
            {confidenceLabel(safeReport.confidence, language)}
          </Text>
        </View>

        <View style={styles.scoreRow}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreValue}>{showScore ? safeReport.score : "--"}</Text>
            <Text style={styles.scoreMax}>{showScore ? "/100" : "klar"}</Text>
          </View>
          <View style={styles.scoreCopy}>
            <Text style={styles.statusText}>
              {statusLabel(safeReport.status, language)}
            </Text>
            <Text style={styles.scoreLabel}>{safeReport.scoreLabel}</Text>
            {safeReport.isLimitedReport ? (
              <Text style={styles.scoreLabel}>Begrenset rapport</Text>
            ) : null}
            <Text style={styles.heroSummary}>
              {safeReport.weightTrend.summary}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {safeReport.warnings.length > 0 ? (
        <View style={styles.warningBox}>
          <Ionicons
            name="alert-circle-outline"
            size={17}
            color="rgba(251,191,36,0.96)"
          />
          <View style={styles.warningCopy}>
            {safeReport.warnings.map((warning) => (
              <Text key={warning} style={styles.warningText}>
                {warning}
              </Text>
            ))}
          </View>
        </View>
      ) : null}

      {safeReport.statusReasons.length > 0 ? (
        <SectionCard
          title={t("cutReportWhyStatus")}
          icon="information-circle-outline"
        >
          <View style={styles.reasonList}>
            {safeReport.statusReasons.map((reason) => (
              <View key={reason} style={styles.reasonRow}>
                <Ionicons name="ellipse" size={6} color={premiumBlue.soft} />
                <Text style={styles.reasonText}>{reason}</Text>
              </View>
            ))}
          </View>
        </SectionCard>
      ) : null}

      <SectionCard title={t("cutReportDataFoundation")} icon="checkmark-done-outline">
        <Text style={styles.insightText}>{safeReport.readiness.summary}</Text>
        <ReadinessChecklist readiness={safeReport.readiness} />
      </SectionCard>

      {showScore ? (
        <SectionCard title={t("cutReportScoreBreakdown")} icon="calculator-outline">
          {safeReport.scoreBreakdown.length === 0 ? (
            <Text style={styles.insightText}>
              {t("cutReportNoScoreDeductions")}
            </Text>
          ) : (
            <View style={styles.scoreFactorList}>
              {safeReport.scoreBreakdown.map((factor) => (
                <View key={factor.id} style={styles.scoreFactorRow}>
                  <View style={styles.scoreFactorCopy}>
                    <Text style={styles.scoreFactorTitle}>{factor.label}</Text>
                    <Text style={styles.scoreFactorReason}>{factor.reason}</Text>
                  </View>
                  <Text style={styles.scoreFactorPoints}>
                    {factor.score}/100
                  </Text>
                  <Text style={styles.scoreFactorWeight}>
                    {factor.weightPercent} %
                  </Text>
                </View>
              ))}
            </View>
          )}
        </SectionCard>
      ) : null}

      <SectionCard title={t("cutReportWeightTrend")} icon="scale-outline">
        <WeightTrendChart
          points={safeReport.weightTrend.points}
          pointsLabel={t("cutReportPoints")}
          averageLabel={t("cutReportSevenDayAverage")}
          emptyLabel={t("cutReportChartEmpty")}
        />
        <MetricRow
          label={t("cutReportSevenDayAverage")}
          value={formatNumber(safeReport.weightTrend.averageWeight7d, " kg")}
          accent
        />
        <MetricRow
          label={t("cutReportPreviousSevenDayAverage")}
          value={formatNumber(safeReport.weightTrend.averageWeightPrevious7d, " kg")}
        />
        <MetricRow
          label={t("cutReportWeeklyChange")}
          value={`${formatNumber(safeReport.weightTrend.weeklyWeightChangeKg, " kg")} · ${formatNumber(
            safeReport.weightTrend.weeklyWeightChangePercent,
            " %"
          )}`}
        />
        <MetricRow
          label={t("cutReportEstimatedDeficit")}
          value={formatNumber(
            safeReport.weightTrend.estimatedDailyDeficit,
            language === "en" ? " kcal/day" : " kcal/dag"
          )}
        />
        {safeReport.goalType === "leanBulk" ? (
          <MetricRow
            label={t("cutReportEstimatedSurplus")}
            value={formatNumber(
              safeReport.weightTrend.estimatedDailySurplus,
              language === "en" ? " kcal/day" : " kcal/dag"
            )}
          />
        ) : null}
        <Text style={styles.insightText}>{safeReport.weightTrend.summary}</Text>
      </SectionCard>

      <SectionCard title={t("cutReportNutrition")} icon="nutrition-outline">
        <MetricRow
          label={t("cutReportCalories")}
          value={formatNumber(safeReport.nutritionSummary.averageCalories7d, " kcal")}
          accent
        />
        <MetricRow
          label={t("homeProtein")}
          value={`${formatNumber(safeReport.nutritionSummary.averageProtein7d, " g")} · ${formatNumber(
            safeReport.nutritionSummary.proteinPerKg,
            " g/kg"
          )}`}
        />
        <MetricRow
          label={t("cutReportCarbs")}
          value={formatNumber(safeReport.nutritionSummary.carbsPerKg, " g/kg")}
        />
        <MetricRow
          label={t("cutReportTrainingCarbs")}
          value={`${formatNumber(
            safeReport.nutritionSummary.averagePreWorkoutCarbs,
            language === "en" ? " g pre" : " g før"
          )} · ${formatNumber(
            safeReport.nutritionSummary.averagePostWorkoutCarbs,
            language === "en" ? " g post" : " g etter"
          )}`}
        />
        <MetricRow
          label={t("cutReportFat")}
          value={`${formatNumber(safeReport.nutritionSummary.fatPerKg, " g/kg")} · ${formatNumber(
            safeReport.nutritionSummary.fatCaloriesPercent,
            " %"
          )}`}
        />
        <MetricRow
          label={t("cutReportLogging")}
          value={
            language === "en"
              ? `${safeReport.nutritionSummary.loggedDaysLast7d} of 7 days`
              : `${safeReport.nutritionSummary.loggedDaysLast7d} av 7 dager`
          }
        />
        {safeReport.nutritionSummary.estimatedMaintenanceCalories ? (
          <MetricRow
            label={t("cutReportEstimatedMaintenance")}
            value={`${formatNumber(
              safeReport.nutritionSummary.estimatedMaintenanceCalories,
              " kcal"
            )} / ${confidenceLabel(
              safeReport.nutritionSummary.maintenanceEstimateConfidence,
              language
            )}`}
          />
        ) : null}
        <Text style={styles.insightText}>{safeReport.nutritionSummary.summary}</Text>
      </SectionCard>

      <SectionCard title={t("cutReportStrengthRetention")} icon="barbell-outline">
        <MetricRow
          label={t("cutReportAverageKeyStrength")}
          value={formatNumber(
            safeReport.strengthSummary.averageStrengthChangePercent,
            " %"
          )}
          accent
        />
        <MetricRow
          label={t("cutReportComparableExercises")}
          value={`${safeReport.strengthSummary.comparableExercises}`}
        />
        <MetricRow
          label={t("cutReportSignificantDrop")}
          value={`${safeReport.strengthSummary.exercisesSignificantRegression}`}
        />
        <Text style={styles.insightText}>{safeReport.strengthSummary.summary}</Text>

        {safeReport.strengthSummary.keyExercises.length > 0 ? (
          <View style={styles.exerciseList}>
            {safeReport.strengthSummary.keyExercises.map((exercise) => (
              <View key={exercise.exerciseId} style={styles.exerciseRow}>
                <Text style={styles.exerciseName} numberOfLines={1}>
                  {exercise.exerciseName}
                </Text>
                <Text style={styles.exerciseChange}>
                  {formatNumber(exercise.changePercent, " %")}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </SectionCard>

      <SectionCard title={t("cutReportTrainingLoad")} icon="pulse-outline">
        <MetricRow
          label={t("cutReportSessionsLast14")}
          value={`${safeReport.trainingLoadSummary.sessionsLast14d}`}
          accent
        />
        <MetricRow
          label={t("cutReportWeeklyVolume")}
          value={formatNumber(safeReport.trainingLoadSummary.weeklyVolumeCurrent, " kg")}
        />
        <MetricRow
          label={t("cutReportVolumeChange")}
          value={formatNumber(safeReport.trainingLoadSummary.volumeChangePercent, " %")}
        />
        <Text style={styles.insightText}>
          {safeReport.trainingLoadSummary.summary}
        </Text>
      </SectionCard>

      <SectionCard title={t("cutReportAdherence")} icon="checkbox-outline">
        <MetricRow
          label={t("cutReportMealLogging")}
          value={formatNumber(
            safeReport.adherenceSummary.mealLoggingAdherencePercent,
            " %"
          )}
          accent
        />
        <MetricRow
          label={t("cutReportWeighIn")}
          value={formatNumber(
            safeReport.adherenceSummary.weighInAdherencePercent,
            " %"
          )}
        />
        <MetricRow
          label={t("cutReportProteinTarget")}
          value={formatNumber(
            safeReport.adherenceSummary.proteinTargetAdherencePercent,
            " %"
          )}
        />
        <MetricRow
          label={t("cutReportCalorieTarget")}
          value={formatNumber(
            safeReport.adherenceSummary.calorieTargetAdherencePercent,
            " %"
          )}
        />
        <MetricRow
          label={t("cutReportWorkoutTarget")}
          value={formatNumber(
            safeReport.adherenceSummary.workoutAdherencePercent,
            " %"
          )}
        />
        <Text style={styles.insightText}>
          {safeReport.adherenceSummary.summary}
        </Text>
      </SectionCard>

      <SectionCard title={t("cutReportTimeline")} icon="time-outline">
        <MetricRow
          label={t("cutReportTargetWeight")}
          value={formatNumber(safeReport.timelineSummary.targetWeightKg, " kg")}
          accent
        />
        {safeReport.goalType === "maintenance" ? (
          <MetricRow
            label={t("cutReportStableWeeks")}
            value={`${safeReport.timelineSummary.maintenanceStabilityStreakWeeks}`}
          />
        ) : (
          <MetricRow
            label={t("cutReportWeeksToGoal")}
            value={
              safeReport.timelineSummary.estimatedWeeksToGoal == null
                ? t("homeNoData")
                : `${safeReport.timelineSummary.estimatedWeeksToGoal}`
            }
          />
        )}
        <Text style={styles.insightText}>
          {safeReport.timelineSummary.summary}
        </Text>
      </SectionCard>

      <SectionCard title={t("cutReportPreviousReport")} icon="git-compare-outline">
        <MetricRow
          label={t("cutReportScoreChange")}
          value={
            safeReport.previousComparison.scoreChange == null
              ? t("homeNoData")
              : `${safeReport.previousComparison.scoreChange > 0 ? "+" : ""}${safeReport.previousComparison.scoreChange}`
          }
          accent
        />
        <MetricRow
          label={t("cutReportStatusChanged")}
          value={
            safeReport.previousComparison.statusChanged
              ? t("cutReportYes")
              : t("cutReportNo")
          }
        />
        {safeReport.previousComparison.repeatedProblems.length > 0 ? (
          <Text style={styles.insightText}>
            {t("cutReportRepeated")}:{" "}
            {safeReport.previousComparison.repeatedProblems
              .map(problemLabel)
              .join(", ")}
          </Text>
        ) : null}
        {safeReport.previousComparison.resolvedProblems.length > 0 ? (
          <Text style={styles.insightText}>
            Løst:{" "}
            {safeReport.previousComparison.resolvedProblems
              .map(problemLabel)
              .join(", ")}
          </Text>
        ) : null}
        <Text style={styles.insightText}>
          {safeReport.previousComparison.summary}
        </Text>
      </SectionCard>

      <SectionCard title={t("cutReportNextWeek")} icon="calendar-outline">
        <View style={styles.recommendationList}>
          {safeReport.recommendations.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              isApplying={applyingRecommendationId === recommendation.id}
              onApply={onApplyRecommendation}
              applyLabel={t("cutReportApplyRecommendation")}
            />
          ))}
        </View>
      </SectionCard>
    </>
  );
}

function CutIntelligencePremiumScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const reportQuery = useCurrentCutReport(true);
  const applyRecommendation = useApplyCutRecommendation();
  const undoRecommendation = useUndoLastCutRecommendation();
  const { refreshUserSettings, userSettings } = useUserSettings();
  const [applyingRecommendationId, setApplyingRecommendationId] =
    useState<string | null>(null);

  const handleApplyRecommendation = async (id: string) => {
    if (applyRecommendation.isPending) return;

    try {
      setApplyingRecommendationId(id);
      const result = await applyRecommendation.mutateAsync(id);
      await refreshUserSettings();
      await reportQuery.refetch();
      if (result.canUndo) {
        Alert.alert(
          userSettings.language === "en" ? "Goals updated" : "Mål oppdatert",
          result.message ||
            (userSettings.language === "en"
              ? "The recommendation was applied to your goals."
              : "Anbefalingen er brukt i målene dine."),
          [
            { text: "OK", style: "cancel" },
            {
              text: userSettings.language === "en" ? "Undo" : "Angre",
              onPress: async () => {
                await undoRecommendation.mutateAsync();
                await refreshUserSettings();
                await reportQuery.refetch();
              },
            },
          ]
        );
      }
    } finally {
      setApplyingRecommendationId(null);
    }
  };

  return (
    <DarkOceanBackground
      style={[styles.screen, { paddingTop: insets.top + 10 }]}
    >
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.headerButtonPressed,
          ]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={20} color="rgba(226,232,240,0.96)" />
        </Pressable>
        <Text style={styles.headerTitle}>
          {goalTitle(
            reportQuery.data?.goalType ?? goalTypeFromDirection(userSettings.weightDirection),
            userSettings.language
          )}
        </Text>
        <Pressable
          disabled={reportQuery.isFetching}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && !reportQuery.isFetching && styles.headerButtonPressed,
            reportQuery.isFetching && styles.headerButtonDisabled,
          ]}
          onPress={() => reportQuery.refetch()}
        >
          {reportQuery.isFetching ? (
            <ActivityIndicator size="small" color={premiumBlue.soft} />
          ) : (
            <Ionicons name="refresh" size={17} color="rgba(226,232,240,0.96)" />
          )}
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 28 },
        ]}
      >
        {reportQuery.isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={premiumBlue.soft} />
            <Text style={styles.loadingText}>{t("cutReportLoading")}</Text>
          </View>
        ) : reportQuery.isError || !reportQuery.data ? (
          <View style={styles.loadingCard}>
            <Ionicons
              name="alert-circle-outline"
              size={24}
              color="rgba(251,191,36,0.96)"
            />
            <Text style={styles.errorTitle}>{t("cutReportFetchErrorTitle")}</Text>
            <Text style={styles.errorText}>
              {t("cutReportFetchErrorBody")}
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.headerButtonPressed,
              ]}
              onPress={() => reportQuery.refetch()}
            >
              <Text style={styles.retryText}>{t("commonRetry")}</Text>
            </Pressable>
          </View>
        ) : (
          <ReportContent
            report={reportQuery.data}
            applyingRecommendationId={applyingRecommendationId}
            onApplyRecommendation={handleApplyRecommendation}
          />
        )}
      </ScrollView>
    </DarkOceanBackground>
  );
}

export default function CutIntelligenceScreen() {
  const insets = useSafeAreaInsets();
  const { isPremium, isLoading } = useSubscription();
  const { userSettings } = useUserSettings();
  const [paywallVisible, setPaywallVisible] = useState(false);
  const readinessQuery = useCutReadiness(!isPremium);
  const activeGoalType = goalTypeFromDirection(userSettings.weightDirection);

  if (isPremium) return <CutIntelligencePremiumScreen />;

  return (
    <DarkOceanBackground
      style={[styles.screen, { paddingTop: insets.top + 10 }]}
    >
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.headerButtonPressed,
          ]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={20} color="rgba(226,232,240,0.96)" />
        </Pressable>
        <Text style={styles.headerTitle}>
          {goalTitle(activeGoalType, userSettings.language)}
        </Text>
        <View style={styles.headerButtonPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 28 },
        ]}
      >
        <LinearGradient
          colors={premiumBluePreviewGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.previewCard}
        >
          <Text style={[typography.h2, styles.previewTitle]}>
            {goalPreviewTitle(activeGoalType, userSettings.language)}
          </Text>
          <Text style={[typography.body, styles.previewText]}>
            {goalPreviewBody(activeGoalType, userSettings.language)}
          </Text>
          {readinessQuery.data ? (
            <View style={styles.previewReadiness}>
              <Text style={styles.previewReadinessTitle}>
                {readinessQuery.data.summary}
              </Text>
              <ReadinessChecklist readiness={readinessQuery.data} />
            </View>
          ) : null}
        </LinearGradient>

        <LockedFeatureCard
          title={`${goalTitle(activeGoalType, userSettings.language)} Pro`}
          description={goalPreviewBody(activeGoalType, userSettings.language)}
          isLoading={isLoading}
          onPress={() => setPaywallVisible(true)}
        />
      </ScrollView>

      <Paywall
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        source="cut-intelligence"
      />
    </DarkOceanBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: premiumBlue.border,
    backgroundColor: "rgba(15,23,42,0.42)",
  },
  headerButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  headerButtonDisabled: {
    opacity: 0.58,
  },
  headerButtonPlaceholder: {
    width: 38,
    height: 38,
  },
  headerTitle: {
    color: "rgba(248,250,252,0.98)",
    fontSize: 18,
    fontWeight: "600",
  },
  scrollContent: {
    gap: 14,
  },
  heroCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: premiumBlue.border,
    padding: 16,
    shadowColor: "#38BDF8",
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
  heroAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.44)",
    borderWidth: 1,
    borderColor: premiumBlue.border,
  },
  heroBadgeText: {
    color: premiumBlue.text,
    fontSize: 11,
    fontWeight: "700",
  },
  confidenceText: {
    color: premiumBlue.soft,
    fontSize: 11,
    fontWeight: "700",
  },
  scoreRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  scoreCircle: {
    width: 94,
    height: 94,
    borderRadius: 47,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.45)",
    backgroundColor: "rgba(15,23,42,0.42)",
  },
  scoreValue: {
    color: "rgba(248,250,252,0.99)",
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "700",
  },
  scoreMax: {
    color: premiumBlue.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  scoreCopy: {
    flex: 1,
    minWidth: 0,
  },
  statusText: {
    color: "rgba(248,250,252,0.98)",
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "700",
  },
  scoreLabel: {
    marginTop: 3,
    color: premiumBlue.soft,
    fontSize: 12,
    fontWeight: "700",
  },
  heroSummary: {
    marginTop: 7,
    color: "rgba(219,234,254,0.90)",
    fontSize: 12.5,
    lineHeight: 18,
  },
  warningBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.24)",
    backgroundColor: "rgba(251,191,36,0.08)",
    paddingVertical: 11,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  warningCopy: {
    flex: 1,
    gap: 5,
  },
  warningText: {
    color: "rgba(254,243,199,0.94)",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: premiumBlue.border,
    backgroundColor: premiumBlue.panel,
    padding: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 10,
  },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: premiumBlue.panelSoft,
    borderWidth: 1,
    borderColor: premiumBlue.border,
  },
  sectionTitle: {
    color: "rgba(248,250,252,0.97)",
    fontSize: 15,
    fontWeight: "700",
  },
  metricRow: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  metricLabel: {
    color: "rgba(148,163,184,0.92)",
    fontSize: 12,
    fontWeight: "600",
  },
  metricValue: {
    flex: 1,
    color: "rgba(226,232,240,0.96)",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    textAlign: "right",
  },
  metricValueAccent: {
    color: premiumBlue.soft,
    fontSize: 14,
    fontWeight: "800",
  },
  insightText: {
    marginTop: 10,
    color: "rgba(203,213,225,0.93)",
    fontSize: 12,
    lineHeight: 18,
  },
  chartWrap: {
    marginBottom: 12,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: premiumBlue.panelSoft,
    borderWidth: 1,
    borderColor: "rgba(147,197,253,0.14)",
    padding: 8,
  },
  chartSvg: {
    width: "100%",
    height: 120,
  },
  chartLegend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
    paddingHorizontal: 4,
    paddingBottom: 2,
  },
  chartLegendText: {
    color: "rgba(148,163,184,0.86)",
    fontSize: 10,
    fontWeight: "700",
  },
  chartLegendAccent: {
    color: premiumBlue.soft,
    fontSize: 10,
    fontWeight: "800",
  },
  chartEmpty: {
    minHeight: 74,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: premiumBlue.panelSoft,
    borderWidth: 1,
    borderColor: "rgba(147,197,253,0.14)",
    padding: 12,
    marginBottom: 12,
  },
  chartEmptyText: {
    color: "rgba(148,163,184,0.9)",
    fontSize: 12,
    textAlign: "center",
  },
  readinessList: {
    marginTop: 12,
    gap: 11,
  },
  readinessRow: {
    gap: 7,
  },
  readinessTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  readinessLabelRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  readinessLabel: {
    flex: 1,
    color: "rgba(226,232,240,0.94)",
    fontSize: 12,
    fontWeight: "700",
  },
  readinessValue: {
    color: premiumBlue.soft,
    fontSize: 12,
    fontWeight: "800",
  },
  progressTrack: {
    height: 5,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(148,163,184,0.14)",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(96,165,250,0.92)",
  },
  scoreFactorList: {
    gap: 9,
  },
  scoreFactorRow: {
    minHeight: 46,
    borderRadius: 13,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    backgroundColor: premiumBlue.panelSoft,
    borderWidth: 1,
    borderColor: "rgba(147,197,253,0.14)",
  },
  scoreFactorCopy: {
    flex: 1,
    minWidth: 0,
  },
  scoreFactorTitle: {
    color: "rgba(248,250,252,0.96)",
    fontSize: 12,
    fontWeight: "800",
  },
  scoreFactorReason: {
    marginTop: 3,
    color: "rgba(148,163,184,0.92)",
    fontSize: 11,
    lineHeight: 15,
  },
  scoreFactorPoints: {
    color: premiumBlue.soft,
    fontSize: 14,
    fontWeight: "900",
  },
  scoreFactorWeight: {
    color: "rgba(148,163,184,0.88)",
    fontSize: 10,
    fontWeight: "800",
  },
  reasonList: {
    gap: 8,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  reasonText: {
    flex: 1,
    color: "rgba(203,213,225,0.93)",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  exerciseList: {
    marginTop: 12,
    gap: 8,
  },
  exerciseRow: {
    minHeight: 34,
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    backgroundColor: premiumBlue.panelSoft,
    borderWidth: 1,
    borderColor: "rgba(147,197,253,0.14)",
  },
  exerciseName: {
    flex: 1,
    color: "rgba(226,232,240,0.95)",
    fontSize: 12,
    fontWeight: "700",
  },
  exerciseChange: {
    color: premiumBlue.soft,
    fontSize: 12,
    fontWeight: "800",
  },
  recommendationList: {
    gap: 10,
  },
  recommendationCard: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: premiumBlue.panelSoft,
    borderWidth: 1,
    borderColor: "rgba(147,197,253,0.14)",
  },
  recommendationTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  recommendationTitle: {
    flex: 1,
    color: "rgba(248,250,252,0.98)",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
  },
  priorityPill: {
    overflow: "hidden",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
    color: "rgba(2,17,31,0.98)",
    backgroundColor: "rgba(147,197,253,0.96)",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  recommendationReason: {
    marginTop: 8,
    color: "rgba(203,213,225,0.93)",
    fontSize: 12,
    lineHeight: 17,
  },
  recommendationAction: {
    marginTop: 8,
    color: premiumBlue.soft,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  recommendationOutcome: {
    marginTop: 7,
    color: "rgba(203,213,225,0.92)",
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: "600",
  },
  applyButton: {
    marginTop: 11,
    minHeight: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(147,197,253,0.96)",
  },
  applyButtonText: {
    color: "#02111f",
    fontSize: 12,
    fontWeight: "900",
  },
  loadingCard: {
    minHeight: 190,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: premiumBlue.border,
    backgroundColor: premiumBlue.panel,
    padding: 20,
  },
  loadingText: {
    color: "rgba(226,232,240,0.94)",
    fontSize: 13,
    fontWeight: "800",
  },
  errorTitle: {
    color: "rgba(226,232,240,0.96)",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  errorText: {
    marginTop: 8,
    color: "rgba(203,213,225,0.94)",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  retryButton: {
    minHeight: 38,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(147,197,253,0.96)",
  },
  retryText: {
    color: "#02111f",
    fontSize: 13,
    fontWeight: "900",
  },
  previewCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: premiumBlue.border,
    padding: 16,
  },
  previewTitle: {
    color: "rgba(248,250,252,0.98)",
    fontSize: 18,
  },
  previewText: {
    marginTop: 8,
    color: "rgba(219,234,254,0.88)",
    fontSize: 13,
    lineHeight: 19,
  },
  previewReadiness: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(148,163,184,0.14)",
    paddingTop: 12,
  },
  previewReadinessTitle: {
    color: premiumBlue.soft,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
});
