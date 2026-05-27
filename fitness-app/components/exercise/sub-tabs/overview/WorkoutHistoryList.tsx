import { CompletedWorkoutSummaryDto } from "@/api/exercise/completedWorkouts";
import { typography } from "@/config/typography";
import { useTranslation } from "@/i18n/translations";
import { formatDateKey, formatTimeNO, getOsloDateKey } from "@/utils/date";
import { getMuscleLabel } from "@/types/muscles";
import { Ionicons } from "@expo/vector-icons";
import React, { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const ui = {
  surface: "rgba(8,47,73,0.56)",
  surfaceStrong: "rgba(12,74,110,0.58)",
  surfaceMuted: "rgba(34,211,238,0.08)",
  border: "rgba(125,211,252,0.18)",
  borderSoft: "rgba(125,211,252,0.12)",
  text: "rgba(241,245,249,0.96)",
  muted: "rgba(148,163,184,0.84)",
  muted2: "rgba(148,163,184,0.70)",
  accent: "rgba(34,211,238,0.96)",
  accentBg: "rgba(34,211,238,0.10)",
  accentBorder: "rgba(34,211,238,0.18)",
  program: "rgba(96,165,250,0.96)",
  programBg: "rgba(59,130,246,0.10)",
  programBorder: "rgba(96,165,250,0.18)",
};

function formatTimeFromUtc(isoUtc: string) {
  return formatTimeNO(isoUtc);
}

function formatDurationFromSummary(s: CompletedWorkoutSummaryDto) {
  const start = new Date(s.startedAtUtc).getTime();
  const end = new Date(s.finishedAtUtc).getTime();
  const secs = Math.max(0, Math.round((end - start) / 1000));
  const totalMinutes = Math.floor(secs / 60);
  const h = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  if (h > 0) return `${h}t ${mm}m`;
  return `${mm}m`;
}

// Liten "pretty" normalisering (uten antagelser om språk)
// - fjerner ekstra whitespace
// - stable casing: første bokstav stor, resten som input
function prettyMuscleLabel(raw: string, language: "nb" | "en") {
  const m = raw.trim();
  if (!m) return m;
  const localized = getMuscleLabel(m, language);
  return localized.charAt(0).toUpperCase() + localized.slice(1);
}

function uniqMuscles(input: string[] | undefined) {
  const arr = (input ?? []).map((x) => x.trim()).filter((x) => x.length > 0);

  // Case-insensitive uniqueness
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of arr) {
    const key = m.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out;
}

export const WorkoutHistoryList = memo(function WorkoutHistoryList({
  sessions,
  onOpenSession,
}: {
  sessions: CompletedWorkoutSummaryDto[];
  onOpenSession: (sessionId: string) => void;
}) {
  const { t, language } = useTranslation();
  const grouped = useMemo(() => {
    const sorted = [...sessions].sort(
      (a, b) =>
        new Date(b.finishedAtUtc).getTime() -
        new Date(a.finishedAtUtc).getTime()
    );

    const map = new Map<string, CompletedWorkoutSummaryDto[]>();
    for (const s of sorted) {
      const key = getOsloDateKey(s.finishedAtUtc);
      if (!key) continue;
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }

    return Array.from(map.entries()).map(([dateKey, items]) => ({
      dateKey,
      items,
    }));
  }, [sessions]);

  if (sessions.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[typography.bodyBold, styles.emptyTitle]}>
          {t("workoutNoCompletedTitle")}
        </Text>
        <Text style={[typography.body, styles.emptySubtitle]}>
          {t("workoutNoCompletedBody")}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {grouped.map((g) => (
        <View key={g.dateKey} style={styles.group}>
          <View style={styles.groupHeader}>
            <Text style={[typography.bodyBold, styles.groupTitle]}>
              {formatDateKey(g.dateKey, language)}
            </Text>
            <View style={styles.groupHairline} />
          </View>

          <View style={styles.groupCard}>
            {g.items.map((s, idx) => {
              const muscles = uniqMuscles(s.muscleGroups);
              const visible = muscles.slice(0, 4);
              const extraCount = Math.max(0, muscles.length - visible.length);
              const isProgram = s.mode === "program";

              return (
                <React.Fragment key={s.id}>
                  <Pressable
                    onPress={() => onOpenSession(s.id)}
                    style={({ pressed }) => [
                      styles.row,
                      isProgram ? styles.rowProgram : styles.rowQuick,
                      pressed && styles.rowPressed,
                    ]}
                  >
                    <View style={styles.rowLeft}>
                      <View
                        style={[
                          styles.iconBox,
                          isProgram ? styles.iconBoxProgram : styles.iconBoxQuick,
                        ]}
                      >
                        <Ionicons
                          name={isProgram ? "calendar-outline" : "flash-outline"}
                          size={18}
                          color={isProgram ? ui.program : ui.accent}
                        />
                      </View>

                      <View style={styles.mainCol}>
                        <Text
                          style={[typography.body, styles.rowTitle]}
                          numberOfLines={1}
                        >
                          {s.name}
                        </Text>

                        <View style={styles.subStack}>
                          <Text
                            style={[typography.body, styles.rowSub]}
                            numberOfLines={1}
                          >
                            {formatTimeFromUtc(s.startedAtUtc)} ·{" "}
                            {formatDurationFromSummary(s)}
                          </Text>

                          {visible.length > 0 && (
                            <View style={styles.muscleRow}>
                              {visible.map((m) => (
                                <View key={m} style={styles.musclePill}>
                                  <Text
                                    style={[typography.body, styles.muscleText]}
                                    numberOfLines={1}
                                  >
                                    {prettyMuscleLabel(m, language)}
                                  </Text>
                                </View>
                              ))}

                              {extraCount > 0 && (
                                <View style={styles.musclePill}>
                                  <Text
                                    style={[typography.body, styles.muscleText]}
                                    numberOfLines={1}
                                  >
                                    +{extraCount}
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                      </View>
                    </View>

                    <View style={styles.rightCol}>
                      <View style={styles.metricsPill}>
                        <Text style={[typography.body, styles.metricText]}>
                          {language === "en" ? `${s.exercisesCount} ex` : `${s.exercisesCount} øv`}
                        </Text>
                        <Text style={[typography.body, styles.metricDot]}>
                          ·
                        </Text>
                        <Text style={[typography.body, styles.metricText]}>
                          {language === "en" ? `${s.setsCount} sets` : `${s.setsCount} sett`}
                        </Text>
                      </View>

                      <View style={styles.chevronBox}>
                        <Ionicons
                          name="chevron-forward"
                          size={14}
                          color={ui.muted2}
                        />
                      </View>
                    </View>
                  </Pressable>

                  {idx !== g.items.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 4,
    gap: 12,
  },

  group: { gap: 8 },

  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 2,
  },

  groupTitle: {
    color: ui.muted2,
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },

  groupHairline: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  groupCard: {
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: ui.surface,
    borderWidth: 1,
    borderColor: ui.border,
    shadowColor: "#0891b2",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },

  row: {
    paddingVertical: 9,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderLeftWidth: 2,
    backgroundColor: "rgba(8,47,73,0.26)",
  },

  rowQuick: {
    borderLeftColor: "rgba(34,211,238,0.62)",
  },

  rowProgram: {
    borderLeftColor: "rgba(96,165,250,0.58)",
  },

  rowPressed: {
    opacity: 0.97,
    backgroundColor: ui.surfaceMuted,
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(125,211,252,0.10)",
    marginLeft: 54,
  },

  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    flex: 1,
    minWidth: 0,
  },

  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ui.surfaceStrong,
    borderWidth: 1,
    borderColor: ui.borderSoft,
  },
  iconBoxQuick: {
    backgroundColor: ui.accentBg,
    borderColor: ui.accentBorder,
  },
  iconBoxProgram: {
    backgroundColor: ui.programBg,
    borderColor: ui.programBorder,
  },

  mainCol: {
    flex: 1,
    minWidth: 0,
  },

  rowTitle: {
    color: ui.text,
    fontSize: 13.5,
    fontWeight: "500",
    letterSpacing: 0,
    lineHeight: 17,
  },

  subStack: {
    marginTop: 1,
    gap: 3,
  },

  rowSub: {
    color: ui.muted2,
    fontSize: 10.5,
    fontWeight: "400",
    lineHeight: 13,
  },

  muscleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },

  musclePill: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.035)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },

  muscleText: {
    color: ui.muted,
    fontSize: 10,
    fontWeight: "400",
  },

  rightCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  metricsPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 11,
    backgroundColor: "rgba(12,74,110,0.52)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.14)",
  },

  metricText: {
    color: ui.muted,
    fontSize: 10.5,
    fontWeight: "500",
  },

  metricDot: {
    color: ui.muted2,
    marginHorizontal: 5,
    fontSize: 10.5,
  },

  chevronBox: {
    width: 22,
    height: 22,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(14,116,144,0.18)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.12)",
  },

  empty: {
    paddingVertical: 44,
    alignItems: "center",
    paddingHorizontal: 20,
  },

  emptyTitle: {
    color: ui.text,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },

  emptySubtitle: {
    color: ui.muted2,
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
  },
});
