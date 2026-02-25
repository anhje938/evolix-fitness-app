import { CompletedWorkoutSummaryDto } from "@/api/exercise/completedWorkouts";
import { Ionicons } from "@expo/vector-icons";
import React, { memo, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Calendar } from "react-native-calendars";
import { WorkoutCalendarLogPopUp } from "./WorkoutCalendarPopUp";

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

function localDateKeyFromUtc(isoUtc: string) {
  const d = new Date(isoUtc);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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
      const key = localDateKeyFromUtc(s.finishedAtUtc);
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
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let monthCount = 0;
    let weekCount = 0;
    let currentStreak = 0;
    let longestStreak = 0;

    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (const s of sessions) {
      const d = new Date(s.finishedAtUtc);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        monthCount++;
      }
      if (d >= weekAgo) {
        weekCount++;
      }
    }

    // streak
    const sortedDates = Array.from(byDate.keys()).sort().reverse();

    if (sortedDates.length > 0) {
      let streak = 0;
      let checkDate = new Date();

      for (let i = 0; i < 365; i++) {
        const dateKey = localDateKeyFromUtc(checkDate.toISOString());
        if (byDate.has(dateKey)) {
          streak++;
        } else if (i > 0) {
          break;
        }
        checkDate.setDate(checkDate.getDate() - 1);
      }
      currentStreak = streak;

      // longest
      let tempStreak = 0;
      let prevDate: Date | null = null;

      for (const dateKey of sortedDates) {
        const [y, m, d] = dateKey.split("-").map(Number);
        const currDate = new Date(y, m - 1, d);

        if (!prevDate) {
          tempStreak = 1;
        } else {
          const dayDiff = Math.round(
            (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (dayDiff === 1) {
            tempStreak++;
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          }
        }
        prevDate = currDate;
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
                ? colors.accentBg
                : count > 1
                ? "rgba(6,182,212,0.05)"
                : "rgba(6,182,212,0.03)",
            borderRadius: 8,
          },
          text: {
            color: colors.text,
            fontWeight: count > 1 ? "700" : "600",
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
            borderWidth: 1.5,
            borderColor: colors.accent,
          },
          text: {
            color: colors.text,
            fontWeight: "700",
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
        textSectionTitleFontWeight: "700",
        monthTextColor: colors.text,
        textMonthFontWeight: "700",
        textMonthFontSize: 16,
        dayTextColor: colors.textMuted,
        todayTextColor: colors.accent,
        selectedDayTextColor: colors.text,
        arrowColor: colors.accent,
        dotColor: colors.accent,
        selectedDotColor: colors.accent,
        textDisabledColor: colors.muted2,
        textDayFontWeight: "600",
        textDayFontSize: 14,
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
  wrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 },

  statsContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },

  statBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12,
  },

  statIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.orangeBg,
  },

  statContent: {
    flex: 1,
  },

  statLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.muted,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    marginBottom: 2,
  },

  statValue: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.2,
  },

  calendarCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    overflow: "hidden",
    paddingBottom: 12,
  },

  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },

  calendarHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentBg,
    borderWidth: 1,
    borderColor: colors.accentDim,
  },

  calendarHeaderText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: 0.1,
  },

  calendar: {
    borderRadius: 20,
    paddingHorizontal: 8,
  },
});
