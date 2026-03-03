import { generalStyles } from "@/config/styles";
import { newColors } from "@/config/theme";
import { typography } from "@/config/typography";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAllExerciseSetsHistory } from "@/hooks/useAllExerciseSetsHistory";
import { useExercises } from "@/hooks/useExercises";
import { MuscleFilterBar } from "../MuscleFilterBar";

import { CreateExercise } from "@/api/exercise/exercise";
import { queryClient } from "@/config/queryClient";
import AddButton from "../AddButton";
import { AddExerciseModal } from "./exercise/AddExerciseModal";

import { useUserSettings } from "@/context/UserSettingsProvider";
import { MuscleFilterValue } from "@/types/muscles";
import { isUserCreatedExercise } from "@/utils/exercise/isUserCreated";
import { LinearGradient } from "expo-linear-gradient";
import ExerciseCard from "./exercise/ExerciseCard";

type Props = {
  onPressExercise: (exerciseId: string) => void;
};

const ui = {
  text: "rgba(255,255,255,0.94)",
  muted: "rgba(148,163,184,0.86)",
  muted2: "rgba(148,163,184,0.72)",

  inputBg: "rgba(255,255,255,0.045)",
  inputStroke: "rgba(255,255,255,0.10)",
  inputStrokeFocus: "rgba(34,211,238,0.26)",

  sheenA: "rgba(99,102,241,0.14)",
  sheenB: "rgba(34,211,238,0.10)",
};

export default function ExerciseTab({ onPressExercise }: Props) {
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<MuscleFilterValue>("ALL");
  const [openAdd, setOpenAdd] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const { userSettings } = useUserSettings();
  const { data, isLoading, error } = useExercises();
  const exercises = useMemo(() => {
    const allExercises = data ?? [];
    if (!userSettings.showOnlyCustomTrainingContent) return allExercises;
    return allExercises.filter(isUserCreatedExercise);
  }, [data, userSettings.showOnlyCustomTrainingContent]);

  const exerciseIds = useMemo(() => exercises.map((e) => e.id), [exercises]);
  const { data: setsHistoryMap } = useAllExerciseSetsHistory(exerciseIds);

  const filteredExercises = useMemo(() => {
    const s = search.toLowerCase().trim();
    return exercises.filter((ex) => {
      const matchesSearch =
        s.length === 0 ||
        ex.name.toLowerCase().includes(s) ||
        (ex.muscle ?? "").toLowerCase().includes(s);

      const matchesMuscle =
        muscleFilter === "ALL" || ex.muscle === muscleFilter;

      return matchesSearch && matchesMuscle;
    });
  }, [exercises, search, muscleFilter]);

  const handleCreateExercise = async (payload: {
    name: string;
    description?: string;
    muscle?: string;
    equipment?: string;
  }) => {
    try {
      await CreateExercise(payload);
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      setOpenAdd(false);
    } catch (err) {
      console.log("Feil ved oppretting av øvelse", err);
    }
  };

  if (isLoading) {
    return (
      <Text style={{ color: newColors.text.primary }}>Laster øvelser...</Text>
    );
  }

  if (error) {
    return (
      <Text style={{ color: newColors.text.primary }}>
        Feil: {(error as Error).message}
      </Text>
    );
  }

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 44 }}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[typography.h2, styles.headerTitle]}>Øvelser</Text>
            <Text style={[typography.body, styles.headerSub]}>
              Bibliotek + historikk. Trykk på en øvelse for detaljer.
            </Text>
          </View>

          <AddButton setOpen={setOpenAdd} open={openAdd} />
        </View>

        {/* Search */}
        <View
          style={[
            generalStyles.newCard,
            styles.searchWrap,
            searchFocused && styles.searchWrapFocused,
          ]}
        >
          {/* subtle sheen */}
          <LinearGradient
            colors={[
              "rgba(255,255,255,0.06)",
              "rgba(255,255,255,0.02)",
              "rgba(255,255,255,0.00)",
            ]}
            start={{ x: 0.06, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <LinearGradient
            colors={[ui.sheenA, ui.sheenB, "rgba(255,255,255,0.00)"]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0.25, y: 1 }}
            style={styles.searchSheen}
            pointerEvents="none"
          />

          <View style={styles.searchIcon}>
            <Ionicons name="search-outline" size={16} color={ui.muted} />
          </View>

          <TextInput
            returnKeyType="done"
            placeholder="Søk etter øvelser..."
            placeholderTextColor={ui.muted2}
            style={[typography.body, styles.input]}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            clearButtonMode="while-editing"
            autoCorrect={false}
            autoCapitalize="none"
          />

          {!!search.length && (
            <Pressable
              hitSlop={10}
              onPress={() => setSearch("")}
              style={({ pressed }) => [
                styles.clearBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="close" size={16} color={ui.text} />
            </Pressable>
          )}
        </View>

        {/* Muscle filter */}
        <View style={{ marginBottom: 12 }}>
          <MuscleFilterBar
            value={muscleFilter}
            onChange={(v) => setMuscleFilter(v as MuscleFilterValue)}
            preset={"basic"}
          />
        </View>

        {/* Cards */}
        {filteredExercises.map((ex) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            sessions={setsHistoryMap?.[ex.id] ?? []}
            onPress={() => onPressExercise(ex.id)}
          />
        ))}

        {filteredExercises.length === 0 && (
          <View style={styles.emptyWrap}>
            <Text style={[typography.bodyBold, styles.emptyTitle]}>
              Ingen treff
            </Text>
            <Text style={[typography.body, styles.emptySub]}>
              Prøv et annet søk eller bytt muskel-filter.
            </Text>
          </View>
        )}
      </ScrollView>

      <AddExerciseModal
        visible={openAdd}
        onClose={() => setOpenAdd(false)}
        onSubmit={handleCreateExercise}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
    paddingVertical: 16,
    paddingHorizontal: 14,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  headerTitle: {
    color: newColors.text.primary,
  },
  headerSub: {
    marginTop: 4,
    color: ui.muted2,
    fontSize: 12.5,
    lineHeight: 16,
  },

  searchWrap: {
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    backgroundColor: ui.inputBg,
    borderWidth: 1,
    borderColor: ui.inputStroke,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  searchWrapFocused: {
    borderColor: ui.inputStrokeFocus,
  },
  searchSheen: {
    position: "absolute",
    top: -36,
    right: -70,
    width: 220,
    height: 160,
    borderRadius: 999,
    opacity: 0.9,
  },
  searchIcon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: newColors.text.primary,
    paddingVertical: 0,
  },

  clearBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  emptyWrap: {
    marginTop: 10,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(2,6,23,0.20)",
  },
  emptyTitle: { color: ui.text, fontSize: 14 },
  emptySub: { marginTop: 4, color: ui.muted2, fontSize: 12.5, lineHeight: 16 },
});
