import { CompletedWorkoutSummaryDto } from "@/api/exercise/completedWorkouts";
import {
  getDateKeyEpochDay,
  getOsloDateKey,
  getOsloTodayDateKey,
  shiftDateKey,
} from "@/utils/date";
import { Ionicons } from "@expo/vector-icons";
import React, { memo, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Calendar } from "react-native-calendars";
import { WorkoutCalendarLogPopUp } from "./WorkoutCalendarPopUp";

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
  green: "rgba(52,211,153,0.92)",
  greenBg: "rgba(16,185,129,0.14)",
  orange: "rgba(251, 191, 36, 0.92)",
  orangeBg: "rgba(251, 191, 36, 0.12)",
};

export const WorkoutCalendarLog = memo(function WorkoutCalendarLog({
  sessions,
  onOpenSession,
}: {
  sessions: CompletedWorkoutSummaryDto[];
  onOpenSession: (sessionId: string) => void;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const byDate = useMemo(() => {
    const map = new Map<string, CompletedWorkoutSummaryDto[]>();
    for (const s of sessions) {
      const key = getOsloDateKey(s.finishedAtUtc);
      if (!key) continue;
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    // sort each day newest first
    for (const [k, arr] of map) {
      arr.sort(
        (a, b) =>
          new Date(b.finishedAtUtc).getTime() -
          new Date(a.finishedAtUtc).getTime()
      );
      map.set(k, arr);
    }
    return map;
  }, [sessions]);

  // Calculate stats (same as your design file)
  const stats = useMemo(() => {
    const todayDateKey = getOsloTodayDateKey();
    const todayMonthKey = todayDateKey.slice(0, 7);
    const todayEpochDay = getDateKeyEpochDay(todayDateKey);

    let monthCount = 0;
    let weekCount = 0;
    let currentStreak = 0;
    let longestStreak = 0;

    for (const s of sessions) {
      const dateKey = getOsloDateKey(s.finishedAtUtc);
      if (!dateKey) continue;

      if (dateKey.slice(0, 7) === todayMonthKey) {
        monthCount++;
      }

      const epochDay = getDateKeyEpochDay(dateKey);
      if (epochDay != null && todayEpochDay != null && todayEpochDay - epochDay <= 6) {
        weekCount++;
      }
    }

    // streak
    const sortedDates = Array.from(byDate.keys()).sort().reverse();

    if (sortedDates.length > 0) {
      let streak = 0;
      let checkDateKey = todayDateKey;

      for (let i = 0; i < 365 && checkDateKey; i++) {
        if (byDate.has(checkDateKey)) {
          streak++;
        } else if (i > 0) {
          break;
        }
        checkDateKey = shiftDateKey(checkDateKey, -1);
      }
      currentStreak = streak;

      // longest
      let tempStreak = 0;
      let prevEpochDay: number | null = null;

      for (const dateKey of sortedDates) {
        const currEpochDay = getDateKeyEpochDay(dateKey);
        if (currEpochDay == null) continue;

        if (prevEpochDay == null) {
          tempStreak = 1;
        } else {
          if (prevEpochDay - currEpochDay === 1) {
            tempStreak++;
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          }
        }
        prevEpochDay = currEpochDay;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    return { monthCount, weekCount, currentStreak, longestStreak };
  }, [sessions, byDate]);

  const markedDates = useMemo(() => {
    const obj: Record<string, any> = {};
    for (const [dateKey, arr] of byDate.entries()) {
      const count = arr.length;
      obj[dateKey] = {
        marked: true,
        dotColor: colors.accent,
        customStyles: {
          container: {
            backgroundColor:
              count > 2
                ? "rgba(34,211,238,0.12)"
                : count > 1
                ? "rgba(34,211,238,0.08)"
                : "rgba(34,211,238,0.04)",
            borderRadius: 8,
            borderWidth: 1,
            borderColor:
              count > 1
                ? "rgba(34,211,238,0.16)"
                : "rgba(34,211,238,0.08)",
          },
          text: {
            color: colors.text,
            fontWeight: count > 1 ? "600" : "500",
          },
        },
      };
    }

    if (selectedDate) {
      obj[selectedDate] = {
        ...(obj[selectedDate] ?? {}),
        selected: true,
        selectedColor: colors.accentDim,
        customStyles: {
          container: {
            backgroundColor: colors.accentDim,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.accent,
          },
          text: {
            color: colors.text,
            fontWeight: "600",
          },
        },
      };
    }

    return obj;
  }, [byDate, selectedDate]);

  const daySessions = useMemo(() => {
    return selectedDate ? byDate.get(selectedDate) ?? [] : [];
  }, [selectedDate, byDate]);

  // Keep exact theme values, avoid TS mismatch by casting (common with react-native-calendars)
  const calendarTheme = useMemo(
    () =>
      ({
        backgroundColor: "transparent",
        calendarBackground: "transparent",
        textSectionTitleColor: colors.muted,
        textSectionTitleFontWeight: "600",
        monthTextColor: colors.text,
        textMonthFontWeight: "600",
        textMonthFontSize: 15,
        dayTextColor: colors.textMuted,
        todayTextColor: colors.accent,
        selectedDayTextColor: colors.text,
        arrowColor: colors.accent,
        dotColor: colors.accent,
        selectedDotColor: colors.accent,
        textDisabledColor: colors.muted2,
        textDayFontWeight: "500",
        textDayFontSize: 13,
      } as any),
    []
  );

  return (
    <View style={styles.wrap}>
      {/* Stats Overview */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <View style={styles.statIconWrap}>
            <Ionicons name="flame" size={18} color={colors.orange} />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statLabel}>Streak</Text>
            <Text style={styles.statValue}>{stats.currentStreak} dager</Text>
          </View>
        </View>

        <View style={styles.statBox}>
          <View
            style={[styles.statIconWrap, { backgroundColor: colors.accentBg }]}
          >
            <Ionicons name="calendar" size={18} color={colors.accent} />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statLabel}>Denne måneden</Text>
            <Text style={styles.statValue}>{stats.monthCount} økter</Text>
          </View>
        </View>

        <View style={styles.statBox}>
          <View
            style={[styles.statIconWrap, { backgroundColor: colors.greenBg }]}
          >
            <Ionicons name="trophy" size={18} color={colors.green} />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statLabel}>Lengste streak</Text>
            <Text style={styles.statValue}>{stats.longestStreak} dager</Text>
          </View>
        </View>
      </View>

      {/* Calendar */}
      <View style={styles.calendarCard}>
        <View style={styles.calendarHeader}>
          <View style={styles.calendarHeaderIcon}>
            <Ionicons name="calendar-outline" size={20} color={colors.accent} />
          </View>
          <Text style={styles.calendarHeaderText}>Treningskalender</Text>
        </View>

        <Calendar
          markedDates={markedDates}
          onDayPress={(day) => setSelectedDate(day.dateString)}
          theme={calendarTheme}
          style={styles.calendar}
          markingType="custom"
        />
      </View>

      {/* Extracted Popup (same design) */}
      <WorkoutCalendarLogPopUp
        visible={!!selectedDate}
        selectedDate={selectedDate}
        daySessions={daySessions}
        onClose={() => setSelectedDate(null)}
        onOpenSession={(sessionId) => {
          setSelectedDate(null);
          onOpenSession(sessionId);
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 18 },

  statsContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },

  statBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingVertical: 11,
    paddingHorizontal: 10,
  },

  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.orangeBg,
  },

  statContent: {
    flex: 1,
  },

  statLabel: {
    fontSize: 9.5,
    fontWeight: "500",
    color: colors.muted,
    letterSpacing: 0.35,
    textTransform: "uppercase",
    marginBottom: 2,
  },

  statValue: {
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.text,
    letterSpacing: 0,
  },

  calendarCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    overflow: "hidden",
    paddingBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },

  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },

  calendarHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentBg,
    borderWidth: 1,
    borderColor: colors.accentDim,
  },

  calendarHeaderText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
    letterSpacing: 0,
  },

  calendar: {
    borderRadius: 22,
    paddingHorizontal: 10,
  },
});
