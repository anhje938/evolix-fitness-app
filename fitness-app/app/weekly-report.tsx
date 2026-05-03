import { DarkOceanBackground } from "@/components/DarkOceanBackground";
import { RecommendationCard } from "@/components/adaptive/RecommendationCard";
import { useUserSettings } from "@/context/UserSettingsProvider";
import {
  useCurrentWeeklyReport,
  useRegenerateWeeklyReport,
} from "@/hooks/useAdaptive";
import {
  AdaptiveRecommendationType,
  DataQualityLevel,
  type WeeklyReport,
} from "@/types/adaptive";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { ComponentProps, ReactNode } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function formatDate(value: string | null | undefined) {
  if (!value) return "Ingen dato";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "short",
  });
}

function formatDateLong(value: string | null | undefined) {
  if (!value) return "Ingen dato";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatNumber(value: number | null | undefined, suffix = "") {
  if (value === null || value === undefined) return "Ingen data";
  if (!Number.isFinite(Number(value))) return "Ingen data";
  return `${Number(value).toLocaleString("nb-NO", {
    maximumFractionDigits: 1,
  })}${suffix}`;
}

function qualityLabel(value: DataQualityLevel) {
  if (value === DataQualityLevel.High) return "Godt datagrunnlag";
  if (value === DataQualityLevel.Medium) return "Middels datagrunnlag";
  return "Trenger mer data";
}

function scoreLabel(score: number | null) {
  if (score === null) return "Data bygges";
  if (score >= 90) return "Sterk uke";
  if (score >= 75) return "På god vei";
  if (score >= 60) return "Nyttig uke";
  return "Ujevn uke";
}

function isBodyPlanRecommendation(type: number) {
  return (
    type === AdaptiveRecommendationType.HoldCalories ||
    type === AdaptiveRecommendationType.ReduceCalories ||
    type === AdaptiveRecommendationType.IncreaseCalories ||
    type === AdaptiveRecommendationType.IncreaseProtein ||
    type === AdaptiveRecommendationType.AdjustTargetDate ||
    type === AdaptiveRecommendationType.NeedMoreData
  );
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
          <Ionicons name={icon} size={15} color="rgba(103,232,249,0.98)" />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
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

function ReportContent({ report }: { report: WeeklyReport }) {
  const { refreshUserSettings } = useUserSettings();
  const score = report.overallScore;
  const bodyRecommendations = report.recommendations.filter((item) =>
    isBodyPlanRecommendation(item.type)
  );
  const nextActions = report.nextWeekActions.filter((item) =>
    item.category === "Nutrition" || item.category === "Weight"
  );

  return (
    <>
      <LinearGradient
        colors={[
          "rgba(15,23,42,0.82)",
          "rgba(8,47,73,0.48)",
          "rgba(15,23,42,0.74)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <LinearGradient
          colors={["rgba(34,211,238,0.24)", "rgba(34,197,94,0.12)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.heroAccent}
        />

        <View style={styles.heroTopRow}>
          <View style={styles.heroBadge}>
            <Ionicons
              name="analytics-outline"
              size={14}
              color="rgba(103,232,249,0.98)"
            />
            <Text style={styles.heroBadgeText}>Ukesrapport</Text>
          </View>
          <Text style={styles.weekText}>
            {formatDate(report.weekStart)} - {formatDate(report.weekEnd)}
          </Text>
        </View>

        <View style={styles.scoreRow}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreValue}>{score ?? "--"}</Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>
          <View style={styles.scoreCopy}>
            <Text style={styles.scoreLabel}>{scoreLabel(score)}</Text>
            <Text style={styles.summaryText}>{report.summaryText}</Text>
            <Text style={styles.dataQuality}>
              {qualityLabel(report.dataQuality)}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {report.isStale && (
        <View style={styles.staleBox}>
          <Ionicons
            name="time-outline"
            size={16}
            color="rgba(251,191,36,0.96)"
          />
          <Text style={styles.staleText}>
            {report.staleReason || "Rapporten har nyere data tilgjengelig."}
          </Text>
        </View>
      )}

      <SectionCard title="Vekt" icon="scale-outline">
        <MetricRow
          label="Trend"
          value={`${formatNumber(report.weight?.startTrendWeightKg, " kg")} → ${formatNumber(
            report.weight?.endTrendWeightKg,
            " kg"
          )}`}
          accent
        />
        <MetricRow
          label="Endring"
          value={formatNumber(report.weight?.weeklyChangeKg, " kg")}
        />
        <MetricRow
          label="Måltempo"
          value={formatNumber(report.weight?.expectedWeeklyChangeKg, " kg/uke")}
        />
        {report.weight?.estimatedGoalDate && (
          <MetricRow
            label="Estimert måldato"
            value={formatDateLong(report.weight.estimatedGoalDate)}
          />
        )}
        <Text style={styles.insightText}>
          {report.weight?.insight ?? "EvoliX trenger flere vektmålinger."}
        </Text>
      </SectionCard>

      <SectionCard title="Mat" icon="nutrition-outline">
        <MetricRow
          label="Kalorier"
          value={`${formatNumber(report.nutrition?.averageCalories, " kcal")} / ${formatNumber(
            report.nutrition?.targetCalories,
            " kcal"
          )}`}
          accent
        />
        <MetricRow
          label="Protein"
          value={`${formatNumber(report.nutrition?.averageProtein, " g")} / ${formatNumber(
            report.nutrition?.targetProtein,
            " g"
          )}`}
        />
        <MetricRow
          label="Logging"
          value={`${report.nutrition?.loggedDays ?? 0} av 7 dager`}
        />
        <Text style={styles.insightText}>
          {report.nutrition?.insight ?? "Logg mat for tryggere anbefalinger."}
        </Text>
      </SectionCard>

      <SectionCard title="Neste steg" icon="calendar-outline">
        <View style={styles.actionList}>
          {(nextActions.length > 0 ? nextActions : report.nextWeekActions.slice(0, 2)).map((action) => (
            <View key={`${action.sortOrder}-${action.text}`} style={styles.actionRow}>
              <View style={styles.actionIndex}>
                <Text style={styles.actionIndexText}>{action.sortOrder}</Text>
              </View>
              <Text style={styles.actionText}>{action.text}</Text>
            </View>
          ))}
        </View>
      </SectionCard>

      <View style={styles.recommendationsHeader}>
        <Text style={styles.recommendationsTitle}>Anbefalinger</Text>
        <Text style={styles.recommendationsCount}>
          {bodyRecommendations.length}
        </Text>
      </View>

      <View style={styles.recommendationList}>
        {bodyRecommendations.length === 0 ? (
          <View style={styles.emptyRecommendations}>
            <Text style={styles.emptyTitle}>Ingen nye endringer</Text>
            <Text style={styles.emptyText}>
              Planen ser stabil ut for denne uken.
            </Text>
          </View>
        ) : (
          bodyRecommendations.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              onChanged={refreshUserSettings}
            />
          ))
        )}
      </View>
    </>
  );
}

export default function WeeklyReportScreen() {
  const insets = useSafeAreaInsets();
  const reportQuery = useCurrentWeeklyReport();
  const regenerateReport = useRegenerateWeeklyReport();

  const handleRefresh = async () => {
    await regenerateReport.mutateAsync();
    await reportQuery.refetch();
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
        <Text style={styles.headerTitle}>Rapport</Text>
        <Pressable
          disabled={regenerateReport.isPending}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && !regenerateReport.isPending && styles.headerButtonPressed,
            regenerateReport.isPending && styles.headerButtonDisabled,
          ]}
          onPress={handleRefresh}
        >
          {regenerateReport.isPending ? (
            <ActivityIndicator size="small" color="rgba(226,232,240,0.96)" />
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
            <ActivityIndicator size="small" color="rgba(103,232,249,0.98)" />
            <Text style={styles.loadingText}>Lager ukesrapport</Text>
          </View>
        ) : reportQuery.isError || !reportQuery.data ? (
          <View style={styles.loadingCard}>
            <Ionicons
              name="alert-circle-outline"
              size={23}
              color="rgba(251,191,36,0.96)"
            />
            <Text style={styles.errorTitle}>Rapporten kunne ikke hentes</Text>
            <Pressable
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.headerButtonPressed,
              ]}
              onPress={() => reportQuery.refetch()}
            >
              <Text style={styles.retryText}>Prøv igjen</Text>
            </Pressable>
          </View>
        ) : (
          <ReportContent report={reportQuery.data} />
        )}
      </ScrollView>
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
    borderColor: "rgba(125,211,252,0.16)",
    backgroundColor: "rgba(8,47,73,0.34)",
  },
  headerButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  headerButtonDisabled: {
    opacity: 0.58,
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
    borderColor: "rgba(125,211,252,0.18)",
    padding: 16,
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
    backgroundColor: "rgba(8,47,73,0.48)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.18)",
  },
  heroBadgeText: {
    color: "rgba(226,232,240,0.94)",
    fontSize: 11,
    fontWeight: "600",
  },
  weekText: {
    color: "rgba(148,163,184,0.92)",
    fontSize: 11,
    fontWeight: "500",
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
    borderColor: "rgba(103,232,249,0.38)",
    backgroundColor: "rgba(2,6,23,0.34)",
  },
  scoreValue: {
    color: "rgba(248,250,252,0.99)",
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "600",
  },
  scoreMax: {
    color: "rgba(148,163,184,0.92)",
    fontSize: 12,
    fontWeight: "500",
  },
  scoreCopy: {
    flex: 1,
    minWidth: 0,
  },
  scoreLabel: {
    color: "rgba(248,250,252,0.98)",
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "600",
  },
  summaryText: {
    marginTop: 5,
    color: "rgba(203,213,225,0.94)",
    fontSize: 13,
    lineHeight: 19,
  },
  dataQuality: {
    marginTop: 8,
    color: "rgba(103,232,249,0.98)",
    fontSize: 12,
    fontWeight: "600",
  },
  staleBox: {
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
  staleText: {
    flex: 1,
    minWidth: 0,
    color: "rgba(254,243,199,0.94)",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.14)",
    backgroundColor: "rgba(15,23,42,0.54)",
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
    backgroundColor: "rgba(8,47,73,0.46)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.16)",
  },
  sectionTitle: {
    color: "rgba(248,250,252,0.97)",
    fontSize: 15,
    fontWeight: "600",
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
    fontWeight: "500",
  },
  metricValue: {
    flex: 1,
    color: "rgba(226,232,240,0.96)",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    textAlign: "right",
  },
  metricValueAccent: {
    color: "rgba(103,232,249,0.98)",
    fontSize: 14,
    fontWeight: "600",
  },
  insightText: {
    marginTop: 10,
    color: "rgba(203,213,225,0.93)",
    fontSize: 12,
    lineHeight: 18,
  },
  muscleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  musclePill: {
    minWidth: "30%",
    flexGrow: 1,
    borderRadius: 13,
    paddingVertical: 9,
    paddingHorizontal: 10,
    backgroundColor: "rgba(2,6,23,0.3)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.13)",
  },
  muscleName: {
    color: "rgba(226,232,240,0.96)",
    fontSize: 12,
    fontWeight: "800",
  },
  muscleSets: {
    marginTop: 3,
    color: "rgba(148,163,184,0.92)",
    fontSize: 11,
    fontWeight: "700",
  },
  actionList: {
    gap: 9,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  actionIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(103,232,249,0.16)",
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.2)",
  },
  actionIndexText: {
    color: "rgba(103,232,249,0.98)",
    fontSize: 11,
    fontWeight: "900",
  },
  actionText: {
    flex: 1,
    color: "rgba(226,232,240,0.95)",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  recommendationsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  recommendationsTitle: {
    color: "rgba(248,250,252,0.98)",
    fontSize: 16,
    fontWeight: "900",
  },
  recommendationsCount: {
    minWidth: 26,
    textAlign: "center",
    color: "rgba(103,232,249,0.98)",
    fontSize: 13,
    fontWeight: "900",
  },
  recommendationList: {
    gap: 12,
  },
  emptyRecommendations: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.12)",
    backgroundColor: "rgba(15,23,42,0.46)",
    padding: 16,
  },
  emptyTitle: {
    color: "rgba(248,250,252,0.98)",
    fontSize: 14,
    fontWeight: "800",
  },
  emptyText: {
    marginTop: 5,
    color: "rgba(148,163,184,0.92)",
    fontSize: 12,
    lineHeight: 17,
  },
  loadingCard: {
    minHeight: 180,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.14)",
    backgroundColor: "rgba(15,23,42,0.5)",
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
  retryButton: {
    minHeight: 38,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(103,232,249,0.96)",
  },
  retryText: {
    color: "#02111f",
    fontSize: 13,
    fontWeight: "900",
  },
});
