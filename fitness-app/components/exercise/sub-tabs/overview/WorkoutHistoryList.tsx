import { CompletedWorkoutSummaryDto } from "@/api/exercise/completedWorkouts";
import { typography } from "@/config/typography";
import { Ionicons } from "@expo/vector-icons";
import React, { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const ui = {
  surface: "rgba(2,6,23,0.18)",
  surfaceStrong: "rgba(2,6,23,0.28)",
  border: "rgba(255,255,255,0.08)",
  borderSoft: "rgba(255,255,255,0.06)",
  text: "rgba(226,232,240,0.96)",
  muted: "rgba(148,163,184,0.92)",
  muted2: "rgba(148,163,184,0.78)",
};

function localDateKeyFromUtc(isoUtc: string) {
  const d = new Date(isoUtc);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatNorDate(yyyyMmDd: string) {
  const [y, m, d] = yyyyMmDd.split("-");
  return `${d}.${m}.${y}`;
}

function formatTimeFromUtc(isoUtc: string) {
  const d = new Date(isoUtc);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
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
function prettyMuscleLabel(raw: string) {
  const m = raw.trim();
  if (!m) return m;
  return m.charAt(0).toUpperCase() + m.slice(1);
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
  const grouped = useMemo(() => {
    const sorted = [...sessions].sort(
      (a, b) =>
        new Date(b.finishedAtUtc).getTime() -
        new Date(a.finishedAtUtc).getTime()
    );

    const map = new Map<string, CompletedWorkoutSummaryDto[]>();
    for (const s of sorted) {
      const key = localDateKeyFromUtc(s.finishedAtUtc);
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
          Ingen fullførte økter enda
        </Text>
        <Text style={[typography.body, styles.emptySubtitle]}>
          Fullfør en økt for å se historikk her.
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
              {formatNorDate(g.dateKey)}
            </Text>
            <View style={styles.groupHairline} />
          </View>

          <View style={styles.groupCard}>
            {g.items.map((s, idx) => {
              const muscles = uniqMuscles(s.muscleGroups);
              const visible = muscles.slice(0, 4);
              const extraCount = Math.max(0, muscles.length - visible.length);

              return (
                <React.Fragment key={s.id}>
                  <Pressable
                    onPress={() => onOpenSession(s.id)}
                    style={({ pressed }) => [
                      styles.row,
                      pressed && styles.rowPressed,
                    ]}
                  >
                    <View style={styles.rowLeft}>
                      <View style={styles.iconBox}>
                        <Ionicons
                          name={
                            s.mode === "program"
                              ? "calendar-outline"
                              : "flash-outline"
                          }
                          size={18}
                          color={ui.text}
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
                                    {prettyMuscleLabel(m)}
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
                          {s.exercisesCount} øv
                        </Text>
                        <Text style={[typography.body, styles.metricDot]}>
                          ·
                        </Text>
                        <Text style={[typography.body, styles.metricText]}>
                          {s.setsCount} sett
                        </Text>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={ui.muted2}
                        style={{ marginLeft: 10 }}
                      />
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
    paddingTop: 10,
    paddingBottom: 6,
    gap: 14,
  },

  group: { gap: 8 },

  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 2,
  },

  groupTitle: {
    color: ui.muted2,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.16,
  },

  groupHairline: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  groupCard: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: ui.surface,
    borderWidth: 1,
    borderColor: ui.borderSoft,
  },

  row: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  rowPressed: {
    opacity: 0.96,
    backgroundColor: "rgba(255,255,255,0.02)",
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginLeft: 62,
  },

  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },

  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: ui.borderSoft,
  },

  mainCol: {
    flex: 1,
    minWidth: 0,
  },

  rowTitle: {
    color: ui.text,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.05,
  },

  subStack: {
    marginTop: 3,
    gap: 6,
  },

  rowSub: {
    color: ui.muted2,
    fontSize: 11,
    fontWeight: "500",
  },

  muscleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  musclePill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },

  muscleText: {
    color: ui.muted2,
    fontSize: 10.5,
    fontWeight: "600",
  },

  rightCol: {
    flexDirection: "row",
    alignItems: "center",
  },

  metricsPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: ui.surfaceStrong,
    borderWidth: 1,
    borderColor: ui.borderSoft,
  },

  metricText: {
    color: ui.muted,
    fontSize: 11,
    fontWeight: "600",
  },

  metricDot: {
    color: ui.muted2,
    marginHorizontal: 6,
    fontSize: 11,
  },

  empty: {
    paddingVertical: 44,
    alignItems: "center",
    paddingHorizontal: 20,
  },

  emptyTitle: {
    color: ui.text,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  emptySubtitle: {
    color: ui.muted2,
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
  },
});
