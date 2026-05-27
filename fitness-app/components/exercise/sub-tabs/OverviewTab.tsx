import { typography } from "@/config/typography";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import QuickStart from "./overview/QuickStartWorkout";

import { WorkoutHistoryList } from "./overview/WorkoutHistoryList";

import { useWorkoutSession } from "@/context/workoutSessionContext";
import { useCompletedWorkouts } from "@/hooks/workout-history/useCompletedWorkouts";
import { useTranslation } from "@/i18n/translations";
import { WorkoutCalendarLog } from "./overview/WorkoutCalendar/WorkoutCalendarLog";

const sectionColors = {
  text: "rgba(255,255,255,0.92)",
  muted: "rgba(148,163,184,0.9)",
};

export default function OverviewTab() {
  const { language } = useTranslation();
  const { data: sessions = [], isLoading } = useCompletedWorkouts();
  const { openCompletedSession } = useWorkoutSession();

  const onOpenSession = (id: string) => {
    // Edit mode
    void openCompletedSession(id);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* QUICK START WORKOUT */}
      <QuickStart />

      {/* CALENDAR LOG */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[typography.body, styles.sectionTitle]}>
            {language === "en" ? "Training log" : "Treningslogg"}
          </Text>
          <View style={styles.sectionRule} />
        </View>

        <WorkoutCalendarLog sessions={sessions} onOpenSession={onOpenSession} />
      </View>

      {/* COMPLETED WORKOUTS LIST */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[typography.body, styles.sectionTitle]}>
            {language === "en" ? "Completed workouts" : "Fullførte økter"}
          </Text>
          <View style={styles.sectionRule} />
        </View>

        {isLoading ? (
          <View style={{ paddingHorizontal: 14, paddingTop: 6 }}>
            <Text style={[typography.body, { color: sectionColors.muted }]}>
              {language === "en" ? "Loading workouts..." : "Laster økter..."}
            </Text>
          </View>
        ) : (
          <WorkoutHistoryList
            sessions={sessions}
            onOpenSession={onOpenSession}
          />
        )}
      </View>

      <View style={{ height: 18 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingBottom: 22,
  },

  section: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  sectionTitle: {
    color: sectionColors.text,
    fontSize: 12.5,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  sectionRule: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  sectionSubtitle: {
    color: sectionColors.muted,
    fontSize: 12,
    paddingHorizontal: 14,
    marginTop: 4,
    marginBottom: 6,
  },
});
