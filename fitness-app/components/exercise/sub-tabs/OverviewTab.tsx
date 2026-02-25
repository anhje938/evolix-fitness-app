import { typography } from "@/config/typography";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import QuickStart from "./overview/QuickStartWorkout";

import { WorkoutHistoryList } from "./overview/WorkoutHistoryList";

import { useWorkoutSession } from "@/context/workoutSessionContext";
import { useCompletedWorkouts } from "@/hooks/workout-history/useCompletedWorkouts";
import { WorkoutCalendarLog } from "./overview/WorkoutCalendar/WorkoutCalendarLog";

const sectionColors = {
  text: "rgba(255,255,255,0.92)",
  muted: "rgba(148,163,184,0.9)",
};

export default function OverviewTab() {
  const { data: sessions = [], isLoading } = useCompletedWorkouts();
  const { openCompletedSession } = useWorkoutSession();

  const onOpenSession = (id: string) => {
    // ✅ Åpner WorkoutSessionOverlay i "edit mode" (re-using overlay)
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
        <Text style={[typography.bodyBold, styles.sectionTitle]}>
          Treningslogg
        </Text>

        <WorkoutCalendarLog sessions={sessions} onOpenSession={onOpenSession} />
      </View>

      {/* COMPLETED WORKOUTS LIST */}
      <View style={styles.section}>
        <Text style={[typography.bodyBold, styles.sectionTitle]}>
          Fullførte økter
        </Text>

        {isLoading ? (
          <View style={{ paddingHorizontal: 14, paddingTop: 6 }}>
            <Text style={[typography.body, { color: sectionColors.muted }]}>
              Laster økter...
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
    paddingBottom: 18,
  },

  section: {
    marginTop: 14,
  },
  sectionTitle: {
    color: sectionColors.text,
    fontSize: 14,
    paddingHorizontal: 14,
  },
  sectionSubtitle: {
    color: sectionColors.muted,
    fontSize: 12,
    paddingHorizontal: 14,
    marginTop: 4,
    marginBottom: 6,
  },
});
