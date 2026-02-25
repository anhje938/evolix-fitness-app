import type { TextStyle, ViewStyle } from "react-native";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create<{
  card: ViewStyle;
  headerRow: ViewStyle;
  title: TextStyle;
  meta: TextStyle;
  hint: TextStyle;

  statsRow: ViewStyle;
  statBox: ViewStyle;
  statBoxAccent: ViewStyle;
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
  goalStatLabel: TextStyle;
  goalStatValue: TextStyle;
}>({
  card: {
    width: "100%",
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 22,
    marginBottom: 18,
    backgroundColor: "rgba(2,6,23,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    columnGap: 12,
    marginBottom: 14,
  },

  title: {
    color: "#E5ECFF",
    fontWeight: "700",
    letterSpacing: 0.1,
  },

  meta: {
    marginTop: 4,
    color: "rgba(148,163,184,0.85)",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.12,
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },

  statBox: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },

  statBoxAccent: {
    backgroundColor: "rgba(6,182,212,0.08)",
    borderColor: "rgba(6,182,212,0.2)",
  },

  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(148,163,184,0.9)",
    marginBottom: 4,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },

  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "rgba(226,232,240,0.95)",
    letterSpacing: -0.3,
  },

  changeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  trendIcon: {
    fontSize: 16,
    fontWeight: "700",
  },

  hint: {
    marginBottom: 12,
    color: "rgba(148,163,184,0.7)",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.1,
  },

  goalIndicator: {
    marginBottom: 12,
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
    backgroundColor: "rgba(2, 6, 23, 0.32)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },

  panelAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "rgba(6,182,212,0.25)",
    zIndex: 10,
  },

  zoomContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  zoomButton: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  zoomButtonDisabled: { opacity: 0.3 },

  zoomText: {
    color: "rgba(226,232,240,0.95)",
    fontSize: 18,
    fontWeight: "600",
  },

  zoomPill: {
    minWidth: 58,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  zoomLabel: {
    color: "rgba(226,232,240,0.95)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.15,
  },

  goalStats: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },

  goalStat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },

  goalStatLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "rgba(148,163,184,0.8)",
    marginBottom: 4,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },

  goalStatValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(226,232,240,0.9)",
    letterSpacing: -0.2,
  },

  additionalStats: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    flexDirection: "row",
    gap: 8,
  },

  miniStat: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
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
    marginTop: 10,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },

  emptyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  emptyIcon: { fontSize: 18 },

  emptyTitle: {
    color: "#E5ECFF",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.1,
  },

  emptySub: {
    marginTop: 3,
    color: "rgba(148,163,184,0.85)",
    fontSize: 11,
    fontWeight: "600",
  },
});
