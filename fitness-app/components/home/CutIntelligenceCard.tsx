import { typography } from "@/config/typography";
import { useUserSettings } from "@/context/UserSettingsProvider";
import { useCutReadiness } from "@/hooks/useCutIntelligence";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

const premiumBlueGradient = [
  "rgba(3,24,60,0.92)",
  "rgba(14,78,148,0.78)",
  "rgba(8,145,178,0.34)",
] as const;

const premiumBlueAccent = [
  "rgba(96,165,250,0.72)",
  "rgba(34,211,238,0.40)",
] as const;

function confidenceLabel(score: number, language: "nb" | "en") {
  if (language === "en") {
    if (score >= 75) return "High";
    if (score >= 45) return "Medium";
    return "Low";
  }
  if (score >= 75) return "Høy";
  if (score >= 45) return "Middels";
  return "Lav";
}

function readinessCopy(
  readyItems: number,
  totalItems: number,
  language: "nb" | "en"
) {
  if (language === "en") {
    return readyItems >= totalItems
      ? "Your monthly analysis is ready."
      : "Your monthly analysis is being built.";
  }
  return readyItems >= totalItems
    ? "Månedsanalysen er klar."
    : "Månedsanalysen bygges opp.";
}

export function CutIntelligenceCard() {
  const { userSettings } = useUserSettings();
  const { data: readiness } = useCutReadiness(true);
  const language = userSettings.language;
  const goalDays = readiness?.items.find((item) => item.id === "goal_days");
  const foodDays = readiness?.items.find((item) => item.id === "food_logs");
  const weighIns = readiness?.items.find((item) => item.id === "weight_logs");
  const workouts = readiness?.items.find(
    (item) => item.id === "strength_sessions"
  );
  const daysTracked = Math.min(goalDays?.current ?? 0, goalDays?.required ?? 28);
  const daysRequired = goalDays?.required ?? 28;
  const timePct = Math.min(100, (daysTracked / Math.max(1, daysRequired)) * 100);
  const readyItems = readiness?.readyItemCount ?? 0;
  const totalItems = readiness?.totalItemCount ?? 4;
  const qualityPct = Math.min(
    100,
    (readyItems / Math.max(1, totalItems)) * 100
  );
  const signalCount =
    (foodDays?.current ? 1 : 0) +
    (weighIns?.current ? 1 : 0) +
    (workouts?.current ? 1 : 0);
  const title =
    userSettings.weightDirection === "gain"
      ? language === "en"
        ? "Monthly Bulk Report"
        : "Månedlig bulkrapport"
      : userSettings.weightDirection === "maintain"
        ? language === "en"
          ? "Monthly Maintenance Report"
          : "Månedlig vedlikeholdsrapport"
        : language === "en"
          ? "Monthly Cut Report"
          : "Månedlig cutrapport";
  const body =
    userSettings.weightDirection === "gain"
      ? language === "en"
        ? "Pro builds the monthly report from weekly check-ins, weight, macros and strength response."
        : "Pro bygger månedsrapporten fra ukentlige innsikter, vekt, makroer og styrkerespons."
      : userSettings.weightDirection === "maintain"
        ? language === "en"
          ? "Pro reviews weight stability, logging, training and your real calorie baseline over 28 days."
          : "Pro vurderer vektstabilitet, logging, trening og faktisk kaloribaseline over 28 dager."
        : language === "en"
          ? "Pro turns your weekly check-ins into a 28-day cut analysis."
        : "Pro gjør ukentlige innsikter om til en 28-dagers analyse av cutten.";

  return (
    <Pressable
      onPress={() => router.push("/cut-intelligence")}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={premiumBlueGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <LinearGradient
          colors={premiumBlueAccent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.accent}
        />

        <View style={styles.topRow}>
          <View style={styles.badge}>
            <Ionicons name="analytics-outline" size={14} color="#BFDBFE" />
            <Text style={styles.badgeText}>Pro</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color="rgba(226,232,240,0.88)"
          />
        </View>

        <Text style={[typography.h2, styles.title]}>{title}</Text>
        <Text style={[typography.body, styles.body]}>
          {body}
        </Text>

        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>
              {readinessCopy(readyItems, totalItems, language)}
            </Text>
            <Text style={styles.progressValue}>
              {daysTracked}/{daysRequired}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${timePct}%` }]} />
          </View>
        </View>

        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>
              {language === "en" ? "Report confidence" : "Rapportsikkerhet"}
            </Text>
            <Text style={styles.progressValue}>
              {confidenceLabel(qualityPct, language)}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${qualityPct}%` }]} />
          </View>
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metricPill}>
            <Ionicons name="nutrition-outline" size={13} color="#93C5FD" />
            <Text style={styles.metricText}>
              {foodDays?.current ?? 0} {language === "en" ? "food days" : "matdager"}
            </Text>
          </View>
          <View style={styles.metricPill}>
            <Ionicons name="scale-outline" size={13} color="#7DD3FC" />
            <Text style={styles.metricText}>
              {weighIns?.current ?? 0} {language === "en" ? "weigh-ins" : "veiinger"}
            </Text>
          </View>
          <View style={styles.metricPill}>
            <Ionicons name="sparkles-outline" size={13} color="#FDE68A" />
            <Text style={styles.metricText}>
              {signalCount} {language === "en" ? "signals found" : "signaler funnet"}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },
  card: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(147,197,253,0.26)",
    padding: 15,
    shadowColor: "#38BDF8",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  accent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 9,
    backgroundColor: "rgba(15,23,42,0.44)",
    borderWidth: 1,
    borderColor: "rgba(147,197,253,0.28)",
  },
  badgeText: {
    color: "rgba(219,234,254,0.96)",
    fontSize: 11,
    fontWeight: "700",
  },
  title: {
    marginTop: 13,
    color: "rgba(248,250,252,0.98)",
    fontSize: 18,
  },
  body: {
    marginTop: 6,
    color: "rgba(219,234,254,0.88)",
    fontSize: 12.5,
    lineHeight: 18,
  },
  progressBlock: {
    marginTop: 13,
    gap: 7,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  progressTitle: {
    flex: 1,
    color: "rgba(219,234,254,0.9)",
    fontSize: 11.5,
    fontWeight: "800",
  },
  progressValue: {
    color: "rgba(248,250,252,0.96)",
    fontSize: 12,
    fontWeight: "900",
  },
  progressTrack: {
    height: 7,
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.62)",
    borderWidth: 1,
    borderColor: "rgba(147,197,253,0.14)",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(103,232,249,0.86)",
  },
  metricRow: {
    marginTop: 13,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  metricPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: "rgba(15,23,42,0.42)",
    borderWidth: 1,
    borderColor: "rgba(147,197,253,0.16)",
  },
  metricText: {
    color: "rgba(219,234,254,0.94)",
    fontSize: 11,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
