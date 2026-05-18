import { typography } from "@/config/typography";
import { useTranslation } from "@/i18n/translations";
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

export function CutIntelligenceCard() {
  const { t } = useTranslation();

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

        <Text style={[typography.h2, styles.title]}>{t("cutReportTitle")}</Text>
        <Text style={[typography.body, styles.body]}>
          {t("cutReportCardBody")}
        </Text>

        <View style={styles.metricRow}>
          <View style={styles.metricPill}>
            <Ionicons name="scale-outline" size={13} color="#93C5FD" />
            <Text style={styles.metricText}>{t("cutReportSevenDayAverage")}</Text>
          </View>
          <View style={styles.metricPill}>
            <Ionicons name="barbell-outline" size={13} color="#7DD3FC" />
            <Text style={styles.metricText}>1RM-trend</Text>
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
