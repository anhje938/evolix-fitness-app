import { CompletedWorkoutSummaryDto } from "@/api/exercise/completedWorkouts";
import { useTranslation } from "@/i18n/translations";
import { formatDateKeyLongNO, formatTimeNO } from "@/utils/date";
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
  card: "rgba(15,23,42,0.42)",
  cardStrong: "#0b1220",
  surface: "rgba(255,255,255,0.04)",
  surfaceStrong: "rgba(255,255,255,0.07)",
  border: "rgba(255,255,255,0.09)",
  borderSoft: "rgba(255,255,255,0.05)",
  text: "rgba(241,245,249,0.96)",
  textMuted: "rgba(226,232,240,0.92)",
  muted: "rgba(148,163,184,0.84)",
  muted2: "rgba(148,163,184,0.68)",
  accent: "#22d3ee",
  accentDim: "rgba(34,211,238,0.18)",
  accentBg: "rgba(34,211,238,0.10)",
  blue: "rgba(96,165,250,0.96)",
  blueBg: "rgba(59,130,246,0.10)",
  blueDim: "rgba(96,165,250,0.18)",
  green: "rgba(52,211,153,0.92)",
  greenBg: "rgba(16,185,129,0.14)",
  orange: "rgba(251, 191, 36, 0.92)",
  orangeBg: "rgba(251, 191, 36, 0.12)",
};

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
  const { t } = useTranslation();
  const formattedDate = useMemo(() => {
    if (!selectedDate) return "";
    return formatDateKeyLongNO(selectedDate);
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
                <Text style={styles.sheetDateLabel}>{t("navWorkouts")}</Text>
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
                  const isProgram = s.mode === "program";
                  const iconColor = isHighCompletion
                    ? colors.green
                    : isProgram
                    ? colors.blue
                    : colors.accent;

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
                              isProgram && styles.iconBoxProgram,
                              isHighCompletion && styles.iconBoxSuccess,
                            ]}
                          >
                            <Ionicons
                              name={isProgram ? "list-outline" : "flash"}
                              size={20}
                              color={iconColor}
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
                              {formatTimeNO(s.startedAtUtc)}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.chevronBox}>
                          <Ionicons
                            name="chevron-forward"
                            size={14}
                            color={colors.muted2}
                          />
                        </View>
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
                                fontWeight: "600",
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

    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 18,

    // ✅ FIX: “ekte” sheet-høyde (60–70% av skjermen)
    height: "68%",
    maxHeight: "75%",
    minHeight: 320,

    // viktig for scrolling inni
    flexDirection: "column",
  },

  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignSelf: "center",
    marginBottom: 14,
  },

  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  sheetHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },

  sheetDateIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentBg,
    borderWidth: 1,
    borderColor: colors.accentDim,
  },

  sheetDateLabel: {
    fontSize: 9.5,
    fontWeight: "500",
    color: colors.muted,
    letterSpacing: 0.45,
    textTransform: "uppercase",
    marginBottom: 2,
  },

  sheetTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0,
  },

  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
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
    fontSize: 10.5,
    fontWeight: "500",
    color: colors.muted,
    letterSpacing: 0,
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
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
    letterSpacing: 0,
    marginBottom: 6,
  },

  emptySub: {
    fontSize: 11.5,
    fontWeight: "400",
    color: colors.muted2,
    textAlign: "center",
  },

  dayRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 12,
    marginBottom: 10,
    backgroundColor: colors.surface,
  },

  dayRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  dayRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },

  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentBg,
    borderWidth: 1,
    borderColor: colors.accentDim,
  },

  iconBoxProgram: {
    backgroundColor: colors.blueBg,
    borderColor: colors.blueDim,
  },

  iconBoxSuccess: {
    backgroundColor: colors.greenBg,
    borderColor: "rgba(52,211,153,0.22)",
  },

  dayRowTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },

  dayRowTitle: {
    color: colors.text,
    fontSize: 13.5,
    fontWeight: "500",
    letterSpacing: 0,
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
    fontSize: 11,
    fontWeight: "400",
    letterSpacing: 0,
  },

  dayRowStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 9,
  },

  dayRowStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },

  dayRowStatDivider: {
    width: 1,
    height: 10,
    backgroundColor: colors.borderSoft,
  },

  dayRowStatText: {
    fontSize: 10.5,
    fontWeight: "500",
    color: colors.muted,
    letterSpacing: 0,
  },

  chevronBox: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.035)",
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },

  progressBarBg: {
    height: 4,
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
