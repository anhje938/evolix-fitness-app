import { DarkOceanBackground } from "@/components/DarkOceanBackground";
import { RecommendationCard } from "@/components/adaptive/RecommendationCard";
import { useUserSettings } from "@/context/UserSettingsProvider";
import {
  useCurrentWeeklyReport,
  useGenerateWeeklyReport,
} from "@/hooks/useAdaptive";
import { DataQualityLevel, type WeeklyReport } from "@/types/adaptive";
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
            <Text style={styles.heroBadgeText}>Weekly Intelligence</Text>
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

      <SectionCard title="Vekt og mål" icon="scale-outline">
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

      <SectionCard title="Ernæring" icon="nutrition-outline">
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

      <SectionCard title="Trening" icon="barbell-outline">
        <MetricRow
          label="Økter"
          value={`${report.training?.completedWorkouts ?? 0}`}
          accent
        />
        <MetricRow label="Sett" value={`${report.training?.totalSets ?? 0}`} />
        <MetricRow
          label="Volum"
          value={formatNumber(report.training?.totalVolumeKg, " kg")}
        />
        <MetricRow
          label="Forbedret"
          value={`${report.training?.exercisesImproved ?? 0} øvelser`}
        />
        <Text style={styles.insightText}>
          {report.training?.bestProgressText ||
            report.training?.insight ||
            "Fullfør økter for bedre progresjonsforslag."}
        </Text>
      </SectionCard>

      <SectionCard title="Recovery" icon="pulse-outline">
        <MetricRow
          label="Neste økt"
          value={report.recovery?.recommendedNextSession || "Ingen data"}
          accent
        />
        <MetricRow
          label="Intensitet"
          value={report.recovery?.intensityRecommendation || "Ingen data"}
        />
        <MetricRow
          label="Klar"
          value={report.recovery?.readyMusclesText || "Ingen data"}
        />
        <MetricRow
          label="Bør hvile"
          value={report.recovery?.restMusclesText || "Ingen tydelige"}
        />
        <Text style={styles.insightText}>
          {report.recovery?.insight ?? "Recovery blir bedre etter flere økter."}
        </Text>
      </SectionCard>

      {report.muscleBalance.length > 0 && (
        <SectionCard title="Muskelbalanse" icon="body-outline">
          <View style={styles.muscleGrid}>
            {report.muscleBalance.slice(0, 8).map((item) => (
              <View key={item.muscle} style={styles.musclePill}>
                <Text style={styles.muscleName} numberOfLines={1}>
                  {item.muscle}
                </Text>
                <Text style={styles.muscleSets}>
                  {formatNumber(item.sets)} sett
                </Text>
              </View>
            ))}
          </View>
        </SectionCard>
      )}

      <SectionCard title="Neste uke" icon="calendar-outline">
        <View style={styles.actionList}>
          {report.nextWeekActions.map((action) => (
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
          {report.recommendations.length}
        </Text>
      </View>

      <View style={styles.recommendationList}>
        {report.recommendations.length === 0 ? (
          <View style={styles.emptyRecommendations}>
            <Text style={styles.emptyTitle}>Ingen nye endringer</Text>
            <Text style={styles.emptyText}>
              Planen ser stabil ut for denne uken.
            </Text>
          </View>
        ) : (
          report.recommendations.map((recommendation) => (
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
  const generateReport = useGenerateWeeklyReport();

  const handleRefresh = async () => {
    await generateReport.mutateAsync();
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
          disabled={generateReport.isPending}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && !generateReport.isPending && styles.headerButtonPressed,
            generateReport.isPending && styles.headerButtonDisabled,
          ]}
          onPress={handleRefresh}
        >
          {generateReport.isPending ? (
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
    fontWeight: "800",
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
    fontWeight: "800",
  },
  weekText: {
    color: "rgba(148,163,184,0.92)",
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
    borderColor: "rgba(103,232,249,0.38)",
    backgroundColor: "rgba(2,6,23,0.34)",
  },
  scoreValue: {
    color: "rgba(248,250,252,0.99)",
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "900",
  },
  scoreMax: {
    color: "rgba(148,163,184,0.92)",
    fontSize: 12,
    fontWeight: "700",
  },
  scoreCopy: {
    flex: 1,
    minWidth: 0,
  },
  scoreLabel: {
    color: "rgba(248,250,252,0.98)",
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "800",
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
    fontWeight: "800",
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
    fontWeight: "800",
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
    fontWeight: "700",
  },
  metricValue: {
    flex: 1,
    color: "rgba(226,232,240,0.96)",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    textAlign: "right",
  },
  metricValueAccent: {
    color: "rgba(103,232,249,0.98)",
    fontSize: 14,
    fontWeight: "900",
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
