import { generalStyles } from "@/config/styles";
import { newColors } from "@/config/theme";
import { typography } from "@/config/typography";
import { useMemo, useRef, useState } from "react";
import type { CreateExercisePayload, Exercise } from "@/types/exercise";
import { Ionicons } from "@expo/vector-icons";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewToken,
} from "react-native";

import { useUserSettings } from "@/context/UserSettingsProvider";
import { useAllExerciseSetsHistory } from "@/hooks/useAllExerciseSetsHistory";
import { useCreateExercise } from "@/hooks/useCreateExercise";
import { useExercises } from "@/hooks/useExercises";
import { useMyUser } from "@/hooks/useMyUser";
import { useTranslation } from "@/i18n/translations";
import { MuscleFilterValue } from "@/types/muscles";
import { isUserCreatedExercise } from "@/utils/exercise/isUserCreated";
import { sortExercisesByPopularity } from "@/utils/exercise/sortExercisesByPopularity";
import { LinearGradient } from "expo-linear-gradient";
import AddButton from "../AddButton";
import { MuscleFilterBar } from "../MuscleFilterBar";
import { AddExerciseModal } from "./exercise/AddExerciseModal";
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
  const { t } = useTranslation();
  const HISTORY_PREVIEW_FALLBACK_COUNT = 8;
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<MuscleFilterValue>("ALL");
  const [openAdd, setOpenAdd] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [visibleExerciseIds, setVisibleExerciseIds] = useState<string[]>([]);
  const searchInputRef = useRef<TextInput | null>(null);
  const createExerciseMutation = useCreateExercise();

  const { userSettings } = useUserSettings();
  const { data, isLoading, error } = useExercises();
  const { data: me } = useMyUser();
  const isAdmin = !!me?.isAdmin;

  const exercises = useMemo(() => {
    const allExercises = data ?? [];
    const visible = userSettings.showOnlyCustomTrainingContent
      ? allExercises.filter(isUserCreatedExercise)
      : allExercises;
    return sortExercisesByPopularity(visible);
  }, [data, userSettings.showOnlyCustomTrainingContent]);

  const filteredExercises = useMemo(() => {
    const s = search.toLowerCase().trim();
    return sortExercisesByPopularity(
      exercises.filter((ex) => {
        const matchesSearch =
          s.length === 0 ||
          ex.name.toLowerCase().includes(s) ||
          (ex.muscle ?? "").toLowerCase().includes(s);

        const matchesMuscle =
          muscleFilter === "ALL" || ex.muscle === muscleFilter;

        return matchesSearch && matchesMuscle;
      })
    );
  }, [exercises, search, muscleFilter]);

  const historyExerciseIds = useMemo(() => {
    const visibleIdSet = new Set(visibleExerciseIds);
    const visibleIds = filteredExercises
      .filter((exercise) => visibleIdSet.has(exercise.id))
      .map((exercise) => exercise.id);

    if (visibleIds.length > 0) return visibleIds;

    return filteredExercises
      .slice(0, HISTORY_PREVIEW_FALLBACK_COUNT)
      .map((exercise) => exercise.id);
  }, [filteredExercises, visibleExerciseIds]);

  const { data: setsHistoryMap } =
    useAllExerciseSetsHistory(historyExerciseIds);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const nextIds = viewableItems
        .map((item) => {
          const exercise = item.item as Exercise | undefined;
          return exercise?.id ?? "";
        })
        .filter((id) => id.length > 0);

      setVisibleExerciseIds(nextIds);
    }
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 25,
  });

  const handleCreateExercise = async (payload: CreateExercisePayload) => {
    try {
      await createExerciseMutation.mutateAsync(payload);
      setOpenAdd(false);
    } catch (err) {
      if (__DEV__) console.log("Feil ved oppretting av øvelse", err);
    }
  };

  if (isLoading) {
    return (
      <Text style={{ color: newColors.text.primary }}>{t("exerciseLoading")}</Text>
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
      <FlatList
        data={filteredExercises}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ExerciseCard
            exercise={item}
            sessions={setsHistoryMap?.[item.id] ?? []}
            isAdmin={isAdmin}
            onPress={() => onPressExercise(item.id)}
          />
        )}
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        ListHeaderComponent={
          <>
            <View style={styles.headerRow}>
              <View style={styles.headerTextWrap}>
                <Text style={[typography.h2, styles.headerTitle]}>
                  {t("exerciseMyExercises")}
                </Text>
                <Text style={[typography.body, styles.headerSub]}>
                  {t("exerciseListHint")}
                </Text>
              </View>

              <View style={styles.headerActions}>
                <AddButton setOpen={setOpenAdd} open={openAdd} />
              </View>
            </View>

            <Pressable
              onPress={() => searchInputRef.current?.focus()}
              style={[
                generalStyles.newCard,
                styles.searchWrap,
                searchFocused && styles.searchWrapFocused,
              ]}
            >
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
                ref={searchInputRef}
                returnKeyType="done"
                placeholder={t("exerciseSearchPlaceholder")}
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
                  onPress={() => {
                    setSearch("");
                    searchInputRef.current?.focus();
                  }}
                  style={({ pressed }) => [
                    styles.clearBtn,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Ionicons name="close" size={16} color={ui.text} />
                </Pressable>
              )}
            </Pressable>

            <View style={styles.filterWrap}>
              <MuscleFilterBar
                value={muscleFilter}
                onChange={(v) => setMuscleFilter(v as MuscleFilterValue)}
                preset="basic"
              />
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={[typography.bodyBold, styles.emptyTitle]}>
              {t("exerciseNoResultsTitle")}
            </Text>
            <Text style={[typography.body, styles.emptySub]}>
              {t("exerciseNoResultsBody")}
            </Text>
          </View>
        }
      />

      <AddExerciseModal
        visible={openAdd}
        onClose={() => setOpenAdd(false)}
        onSubmit={handleCreateExercise}
        isSubmitting={createExerciseMutation.isPending}
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
  content: {
    paddingBottom: 44,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
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
  headerActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  headerMeta: {
    color: ui.muted2,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.1,
    textTransform: "uppercase",
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
    paddingVertical: 9,
    minHeight: 48,
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
    fontSize: 14,
    color: newColors.text.primary,
    paddingVertical: 0,
  },
  clearBtn: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  filterWrap: {
    marginBottom: 12,
  },
  emptyWrap: {
    marginTop: 10,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(2,6,23,0.20)",
  },
  emptyTitle: {
    color: ui.text,
    fontSize: 14,
  },
  emptySub: {
    marginTop: 4,
    color: ui.muted2,
    fontSize: 12.5,
    lineHeight: 16,
  },
});
