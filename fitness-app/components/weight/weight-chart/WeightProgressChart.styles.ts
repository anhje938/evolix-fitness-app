import type { TextStyle, ViewStyle } from "react-native";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create<{
  card: ViewStyle;
  cardGlowTop: ViewStyle;
  cardGlowBottom: ViewStyle;
  headerRow: ViewStyle;
  kicker: TextStyle;
  title: TextStyle;
  meta: TextStyle;

  statsRow: ViewStyle;
  statBox: ViewStyle;
  statBoxAccent: ViewStyle;
  statHead: ViewStyle;
  statIconWrap: ViewStyle;
  statLabel: TextStyle;
  statValue: TextStyle;
  changeRow: ViewStyle;
  trendIcon: TextStyle;

  goalIndicator: ViewStyle;
  goalBadge: ViewStyle;
  goalBadgeAbove: ViewStyle;
  goalBadgeBelow: ViewStyle;
  goalBadgeIcon: TextStyle;
  goalBadgeContent: ViewStyle;
  goalBadgeLabel: TextStyle;
  goalBadgeValue: TextStyle;
  goalBadgeDistance: TextStyle;
  goalHint: ViewStyle;
  goalHintActive: ViewStyle;
  goalHintText: TextStyle;
  goalHintTextActive: TextStyle;
  goalHintValue: TextStyle;

  compareButton: ViewStyle;
  compareButtonActive: ViewStyle;
  compareButtonIcon: TextStyle;
  compareButtonIconActive: TextStyle;
  compareButtonText: TextStyle;
  compareButtonTextActive: TextStyle;

  chartOuter: ViewStyle;
  scrollContent: ViewStyle;
  chartPanel: ViewStyle;
  panelAccent: ViewStyle;

  zoomContainer: ViewStyle;
  zoomButton: ViewStyle;
  zoomButtonDisabled: ViewStyle;
  zoomText: TextStyle;
  zoomPill: ViewStyle;
  zoomLabel: TextStyle;

  additionalStats: ViewStyle;
  miniStat: ViewStyle;
  miniStatLabel: TextStyle;
  miniStatValue: TextStyle;

  emptyRow: ViewStyle;
  emptyIconWrap: ViewStyle;
  emptyIcon: TextStyle;
  emptyTitle: TextStyle;
  emptySub: TextStyle;

  goalStats: ViewStyle;
  goalStat: ViewStyle;
  goalLabelRow: ViewStyle;
  goalLabelIconWrap: ViewStyle;
  goalLabelIcon: TextStyle;
  goalValueRow: ViewStyle;
  goalWeightValue: TextStyle;
  goalValueIcon: TextStyle;
  goalStatLabel: TextStyle;
  goalStatValue: TextStyle;
}>({
  card: {
    position: "relative",
    overflow: "hidden",
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 22,
    marginBottom: 16,
    backgroundColor: "rgba(3,7,18,0.5)",
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.12)",
    shadowColor: "#020617",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 5,
  },
  cardGlowTop: {
    position: "absolute",
    top: -64,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: "rgba(34,211,238,0.08)",
  },
  cardGlowBottom: {
    position: "absolute",
    left: -42,
    bottom: -80,
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: "rgba(37,99,235,0.08)",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    columnGap: 12,
    marginBottom: 12,
  },
  kicker: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(125,211,252,0.92)",
    letterSpacing: 1.4,
    marginBottom: 5,
    textTransform: "uppercase",
  },

  title: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: -0.15,
  },

  meta: {
    marginTop: 2,
    color: "rgba(191,219,254,0.76)",
    fontSize: 10.5,
    fontWeight: "500",
    letterSpacing: 0.08,
  },

  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },

  statBox: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "rgba(8,15,28,0.66)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
  },

  statBoxAccent: {
    backgroundColor: "rgba(8,47,73,0.36)",
    borderColor: "rgba(56,189,248,0.22)",
  },

  statHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },

  statIconWrap: {
    width: 16,
    height: 16,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(6,182,212,0.12)",
    borderWidth: 0.8,
    borderColor: "rgba(56,189,248,0.2)",
  },

  statLabel: {
    fontSize: 9,
    fontWeight: "500",
    color: "rgba(191,219,254,0.72)",
    letterSpacing: 0.24,
    textTransform: "uppercase",
  },

  statValue: {
    fontSize: 15,
    fontWeight: "400",
    color: "#E2E8F0",
    letterSpacing: -0.2,
  },

  changeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  trendIcon: {
    fontSize: 13,
    fontWeight: "500",
  },

  goalIndicator: {
    marginBottom: 10,
    alignItems: "center",
  },

  goalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
  },

  goalBadgeAbove: {
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    borderColor: "rgba(251, 191, 36, 0.3)",
  },

  goalBadgeBelow: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderColor: "rgba(34, 197, 94, 0.3)",
  },

  goalBadgeIcon: {
    fontSize: 18,
    fontWeight: "700",
    color: "rgba(251, 191, 36, 0.95)",
  },

  goalBadgeContent: {
    flex: 1,
  },

  goalBadgeLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "rgba(148,163,184,0.9)",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },

  goalBadgeValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "rgba(251, 191, 36, 0.95)",
    letterSpacing: -0.3,
  },

  goalBadgeDistance: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(226,232,240,0.85)",
    letterSpacing: -0.2,
  },
  goalHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "rgba(251,191,36,0.10)",
    borderWidth: 0.8,
    borderColor: "rgba(251,191,36,0.25)",
  },
  goalHintActive: {
    backgroundColor: "rgba(56,189,248,0.12)",
    borderColor: "rgba(56,189,248,0.3)",
  },
  goalHintText: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(251,191,36,0.95)",
    letterSpacing: 0.08,
  },
  goalHintTextActive: {
    color: "rgba(125,211,252,0.96)",
  },
  goalHintValue: {
    fontSize: 10,
    fontWeight: "500",
    color: "rgba(226,232,240,0.88)",
    letterSpacing: 0.04,
  },

  compareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(251, 191, 36, 0.25)",
  },

  compareButtonActive: {
    backgroundColor: "rgba(251, 191, 36, 0.18)",
    borderColor: "rgba(251, 191, 36, 0.5)",
  },

  compareButtonIcon: {
    fontSize: 16,
    fontWeight: "700",
    color: "rgba(251, 191, 36, 0.85)",
  },

  compareButtonIconActive: {
    color: "rgba(251, 191, 36, 1)",
  },

  compareButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(251, 191, 36, 0.9)",
    letterSpacing: 0.1,
  },

  compareButtonTextActive: {
    color: "rgba(251, 191, 36, 1)",
  },

  chartOuter: { width: "100%" },

  scrollContent: { paddingBottom: 6 },

  chartPanel: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(2, 6, 23, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.12)",
  },

  panelAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "rgba(56,189,248,0.36)",
    zIndex: 10,
  },

  zoomContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  zoomButton: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8,15,28,0.84)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.14)",
  },

  zoomButtonDisabled: { opacity: 0.3 },

  zoomText: {
    color: "rgba(224,242,254,0.95)",
    fontSize: 15,
    fontWeight: "500",
  },

  zoomPill: {
    minWidth: 48,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "rgba(8,15,28,0.66)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  zoomLabel: {
    color: "rgba(224,242,254,0.95)",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.08,
  },

  goalStats: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(56,189,248,0.12)",
  },

  goalStat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "rgba(8,15,28,0.68)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.12)",
  },
  goalLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  goalLabelIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(251,191,36,0.18)",
    borderWidth: 0.8,
    borderColor: "rgba(251,191,36,0.4)",
  },
  goalLabelIcon: {
    marginTop: 0,
  },
  goalValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  goalWeightValue: {
    color: "rgba(251,191,36,0.98)",
    fontWeight: "700",
  },
  goalValueIcon: {
    marginTop: -0.5,
  },

  goalStatLabel: {
    fontSize: 9,
    fontWeight: "500",
    color: "rgba(148,163,184,0.8)",
    marginBottom: 3,
    letterSpacing: 0.22,
    textTransform: "uppercase",
  },

  goalStatValue: {
    fontSize: 12.5,
    fontWeight: "500",
    color: "rgba(226,232,240,0.9)",
    letterSpacing: -0.2,
  },

  additionalStats: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(56,189,248,0.12)",
    flexDirection: "row",
    gap: 8,
  },

  miniStat: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "rgba(15,23,42,0.68)",
    borderWidth: 0.8,
    borderColor: "rgba(56,189,248,0.12)",
  },

  miniStatLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "rgba(148,163,184,0.8)",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    marginBottom: 4,
  },

  miniStatValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(226,232,240,0.92)",
    letterSpacing: -0.2,
  },

  emptyRow: {
    marginTop: 8,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },

  emptyIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(6,182,212,0.10)",
    borderWidth: 0.8,
    borderColor: "rgba(56,189,248,0.16)",
  },

  emptyIcon: { fontSize: 18 },

  emptyTitle: {
    color: "#E5ECFF",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.1,
  },

  emptySub: {
    marginTop: 2,
    color: "rgba(148,163,184,0.85)",
    fontSize: 10,
    fontWeight: "500",
  },
});
