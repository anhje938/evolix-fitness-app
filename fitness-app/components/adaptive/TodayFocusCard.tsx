import { DataQualityLevel, type TodayFocus } from "@/types/adaptive";
import { useTodayFocus } from "@/hooks/useAdaptive";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

function qualityLabel(value: DataQualityLevel): string {
  if (value === DataQualityLevel.High) return "Høy sikkerhet";
  if (value === DataQualityLevel.Medium) return "Middels sikkerhet";
  return "Trenger mer data";
}

function MainContent({ focus }: { focus: TodayFocus }) {
  return (
    <>
      <View style={styles.titleRow}>
        <View style={styles.badge}>
          <Ionicons
            name="sparkles-outline"
            size={13}
            color="rgba(103,232,249,0.98)"
          />
          <Text style={styles.badgeText}>EvoliX Plan</Text>
        </View>
        <View style={styles.qualityPill}>
          <Text style={styles.qualityText}>
            {qualityLabel(focus.dataQuality)}
          </Text>
        </View>
      </View>

      <Text style={styles.mainAction} numberOfLines={2}>
        {focus.mainAction}
      </Text>

      <Text style={styles.why} numberOfLines={3}>
        {focus.why}
      </Text>

      <View style={styles.metricGrid}>
        <View style={styles.metricBox}>
          <Ionicons
            name="flag-outline"
            size={15}
            color="rgba(96,165,250,0.98)"
          />
          <Text style={styles.metricText} numberOfLines={2}>
            {focus.focus}
          </Text>
        </View>
        <View style={styles.metricBox}>
          <Ionicons
            name="nutrition-outline"
            size={15}
            color="rgba(34,197,94,0.98)"
          />
          <Text style={styles.metricText} numberOfLines={2}>
            {focus.nutrition}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.recoveryText} numberOfLines={2}>
          {focus.recovery}
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.reportButton,
            pressed && styles.reportButtonPressed,
          ]}
          onPress={() => router.push("/weekly-report")}
        >
          <Text style={styles.reportButtonText}>Rapport</Text>
          <Ionicons name="chevron-forward" size={14} color="#02111f" />
        </Pressable>
      </View>
    </>
  );
}

export function TodayFocusCard() {
  const { data, isLoading, isError, refetch } = useTodayFocus();

  return (
    <LinearGradient
      colors={[
        "rgba(15,23,42,0.72)",
        "rgba(8,47,73,0.46)",
        "rgba(15,23,42,0.62)",
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <LinearGradient
        colors={["rgba(34,211,238,0.22)", "rgba(34,197,94,0.09)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accentBar}
      />

      {isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="rgba(103,232,249,0.98)" />
          <Text style={styles.loadingText}>Henter dagens plan</Text>
        </View>
      ) : isError || !data ? (
        <View>
          <View style={styles.titleRow}>
            <View style={styles.badge}>
              <Ionicons
                name="sparkles-outline"
                size={13}
                color="rgba(103,232,249,0.98)"
              />
              <Text style={styles.badgeText}>EvoliX Plan</Text>
            </View>
          </View>
          <Text style={styles.mainAction}>Planen er ikke tilgjengelig nå</Text>
          <Text style={styles.why}>
            Prøv igjen når backend er klar, så henter EvoliX rapporten din.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.reportButtonPressed,
            ]}
            onPress={() => refetch()}
          >
            <Text style={styles.retryButtonText}>Prøv igjen</Text>
          </Pressable>
        </View>
      ) : (
        <MainContent focus={data} />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    overflow: "hidden",
    width: "100%",
    borderRadius: 18,
    paddingTop: 15,
    paddingHorizontal: 15,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.18)",
    shadowColor: "#06b6d4",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  accentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: "rgba(8,47,73,0.48)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.18)",
  },
  badgeText: {
    color: "rgba(226,232,240,0.94)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  qualityPill: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: "rgba(2,6,23,0.34)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
  },
  qualityText: {
    color: "rgba(203,213,225,0.9)",
    fontSize: 10,
    fontWeight: "700",
  },
  mainAction: {
    marginTop: 14,
    color: "rgba(248,250,252,0.99)",
    fontSize: 20,
    lineHeight: 27,
    fontWeight: "600",
  },
  why: {
    marginTop: 7,
    color: "rgba(203,213,225,0.93)",
    fontSize: 13,
    lineHeight: 19,
  },
  metricGrid: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },
  metricBox: {
    flex: 1,
    minHeight: 62,
    borderRadius: 15,
    padding: 10,
    backgroundColor: "rgba(2,6,23,0.28)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.12)",
    gap: 7,
  },
  metricText: {
    color: "rgba(226,232,240,0.94)",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  footer: {
    marginTop: 23,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  recoveryText: {
    flex: 1,
    minWidth: 0,
    color: "rgba(148,163,184,0.92)",
    fontSize: 12,
    lineHeight: 17,
  },
  reportButton: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "rgba(103,232,249,0.96)",
  },
  reportButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  reportButtonText: {
    color: "#02111f",
    fontSize: 12,
    fontWeight: "700",
  },
  loadingRow: {
    minHeight: 138,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    color: "rgba(226,232,240,0.92)",
    fontSize: 13,
    fontWeight: "700",
  },
  retryButton: {
    alignSelf: "flex-start",
    marginTop: 14,
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.2)",
    backgroundColor: "rgba(8,47,73,0.5)",
  },
  retryButtonText: {
    color: "rgba(226,232,240,0.96)",
    fontSize: 13,
    fontWeight: "800",
  },
});
