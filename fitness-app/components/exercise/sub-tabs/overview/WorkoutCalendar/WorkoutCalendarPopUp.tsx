import { CompletedWorkoutSummaryDto } from "@/api/exercise/completedWorkouts";
import { Ionicons } from "@expo/vector-icons";
import React, { memo, useMemo } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const colors = {
  backdrop: "rgba(0,0,0,0.70)",
  card: "rgba(2,6,23,0.16)",
  cardStrong: "#0f172a",
  surface: "rgba(255,255,255,0.04)",
  surfaceStrong: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.07)",
  borderSoft: "rgba(255,255,255,0.05)",
  text: "#E5ECFF",
  textMuted: "rgba(226,232,240,0.95)",
  muted: "rgba(148,163,184,0.9)",
  muted2: "rgba(148,163,184,0.7)",
  accent: "#06b6d4",
  accentDim: "rgba(6,182,212,0.2)",
  accentBg: "rgba(6,182,212,0.08)",
  green: "rgba(34, 197, 94, 0.9)",
  greenBg: "rgba(34, 197, 94, 0.12)",
  orange: "rgba(251, 191, 36, 0.9)",
  orangeBg: "rgba(251, 191, 36, 0.12)",
};

function formatTimeFromUtc(isoUtc: string) {
  const d = new Date(isoUtc);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export const WorkoutCalendarLogPopUp = memo(function WorkoutCalendarLogPopUp({
  visible,
  selectedDate,
  daySessions,
  onClose,
  onOpenSession,
}: {
  visible: boolean;
  selectedDate: string | null;
  daySessions: CompletedWorkoutSummaryDto[];
  onClose: () => void;
  onOpenSession: (sessionId: string) => void;
}) {
  const formattedDate = useMemo(() => {
    if (!selectedDate) return "";
    return new Date(selectedDate).toLocaleDateString("nb-NO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [selectedDate]);

  const completedSetsSum = useMemo(() => {
    return daySessions.reduce((sum, s) => sum + (s.completedSetsCount ?? 0), 0);
  }, [daySessions]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Stopper backdrop-click når du trykker inni sheet */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <View style={styles.sheetHeaderLeft}>
              <View style={styles.sheetDateIcon}>
                <Ionicons name="calendar" size={20} color={colors.accent} />
              </View>
              <View>
                <Text style={styles.sheetDateLabel}>Økter</Text>
                <Text style={styles.sheetTitle}>{formattedDate}</Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={({ pressed }) => [
                styles.closeBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          {/* Stats-linje */}
          {daySessions.length > 0 && (
            <View style={styles.sheetStats}>
              <View style={styles.sheetStatItem}>
                <Ionicons
                  name="barbell-outline"
                  size={16}
                  color={colors.accent}
                />
                <Text style={styles.sheetStatText}>
                  {daySessions.length} økter
                </Text>
              </View>

              <View style={styles.sheetStatDivider} />

              <View style={styles.sheetStatItem}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={16}
                  color={colors.green}
                />
                <Text style={styles.sheetStatText}>
                  {completedSetsSum} sett fullført
                </Text>
              </View>
            </View>
          )}

          {/* Her er den viktige delen:
             Vi gir listen en faktisk plass ved å wrappe i flex:1 container */}
          {daySessions.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons
                  name="calendar-outline"
                  size={32}
                  color={colors.muted2}
                />
              </View>
              <Text style={styles.emptyTitle}>Ingen økter denne dagen</Text>
              <Text style={styles.emptySub}>
                Velg en dag med markering for å se økter
              </Text>
            </View>
          ) : (
            <View style={styles.listArea}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              >
                {daySessions.map((s) => {
                  const completionRate =
                    s.setsCount > 0
                      ? (s.completedSetsCount / s.setsCount) * 100
                      : 0;
                  const isHighCompletion = completionRate >= 90;

                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => onOpenSession(s.id)}
                      style={({ pressed }) => [
                        styles.dayRow,
                        pressed && {
                          opacity: 0.8,
                          transform: [{ scale: 0.99 }],
                        },
                      ]}
                    >
                      <View style={styles.dayRowTop}>
                        <View style={styles.dayRowLeft}>
                          <View
                            style={[
                              styles.iconBox,
                              isHighCompletion && styles.iconBoxSuccess,
                            ]}
                          >
                            <Ionicons
                              name={
                                s.mode === "program" ? "list-outline" : "flash"
                              }
                              size={20}
                              color={
                                isHighCompletion ? colors.green : colors.accent
                              }
                            />
                          </View>

                          <View style={{ flex: 1, minWidth: 0 }}>
                            <View style={styles.dayRowTitleRow}>
                              <Text
                                style={styles.dayRowTitle}
                                numberOfLines={1}
                              >
                                {s.name}
                              </Text>

                              {isHighCompletion && (
                                <View style={styles.completeBadge}>
                                  <Ionicons
                                    name="checkmark-circle"
                                    size={14}
                                    color={colors.green}
                                  />
                                </View>
                              )}
                            </View>

                            <Text style={styles.dayRowTime}>
                              <Ionicons
                                name="time-outline"
                                size={12}
                                color={colors.muted2}
                              />{" "}
                              {formatTimeFromUtc(s.startedAtUtc)}
                            </Text>
                          </View>
                        </View>

                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={colors.muted2}
                        />
                      </View>

                      <View style={styles.dayRowStats}>
                        <View style={styles.dayRowStat}>
                          <Ionicons
                            name="barbell-outline"
                            size={14}
                            color={colors.muted}
                          />
                          <Text style={styles.dayRowStatText}>
                            {s.exercisesCount} øvelser
                          </Text>
                        </View>

                        <View style={styles.dayRowStatDivider} />

                        <View style={styles.dayRowStat}>
                          <Ionicons
                            name="list-outline"
                            size={14}
                            color={colors.muted}
                          />
                          <Text style={styles.dayRowStatText}>
                            {s.completedSetsCount}/{s.setsCount} sett
                          </Text>
                        </View>

                        <View style={styles.dayRowStatDivider} />

                        <View style={styles.dayRowStat}>
                          <Text
                            style={[
                              styles.dayRowStatText,
                              {
                                color: isHighCompletion
                                  ? colors.green
                                  : colors.orange,
                                fontWeight: "700",
                              },
                            ]}
                          >
                            {Math.round(completionRate)}%
                          </Text>
                        </View>
                      </View>

                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${completionRate}%`,
                              backgroundColor: isHighCompletion
                                ? colors.green
                                : colors.accent,
                            },
                          ]}
                        />
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: "flex-end",
  },

  // Gjør sheet til en “layout-kolonne” som faktisk kan gi plass til liste
  sheet: {
    backgroundColor: colors.cardStrong,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,

    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 20,

    // ✅ FIX: “ekte” sheet-høyde (60–70% av skjermen)
    height: "68%",
    maxHeight: "75%",
    minHeight: 320,

    // viktig for scrolling inni
    flexDirection: "column",
  },

  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceStrong,
    alignSelf: "center",
    marginBottom: 16,
  },

  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  sheetHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },

  sheetDateIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentBg,
    borderWidth: 1,
    borderColor: colors.accentDim,
  },

  sheetDateLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.muted,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    marginBottom: 2,
  },

  sheetTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.1,
  },

  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },

  sheetStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },

  sheetStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },

  sheetStatDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.borderSoft,
  },

  sheetStatText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
    letterSpacing: 0.1,
  },

  // LISTE-AREAL: dette er det som gjør at listen faktisk vises
  listArea: {
    flex: 1,
    minHeight: 0, // super-viktig i RN for at ScrollView skal få plass
  },

  listContent: {
    paddingBottom: 8,
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },

  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: 0.1,
    marginBottom: 6,
  },

  emptySub: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted2,
    textAlign: "center",
  },

  dayRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    backgroundColor: colors.surface,
  },

  dayRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  dayRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },

  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentBg,
    borderWidth: 1,
    borderColor: colors.accentDim,
  },

  iconBoxSuccess: {
    backgroundColor: colors.greenBg,
    borderColor: "rgba(34, 197, 94, 0.3)",
  },

  dayRowTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },

  dayRowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.1,
    flex: 1,
  },

  completeBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  dayRowTime: {
    color: colors.muted2,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.1,
  },

  dayRowStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },

  dayRowStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },

  dayRowStatDivider: {
    width: 1,
    height: 12,
    backgroundColor: colors.borderSoft,
  },

  dayRowStatText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
    letterSpacing: 0.1,
  },

  progressBarBg: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceStrong,
    overflow: "hidden",
  },

  progressBarFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
});
