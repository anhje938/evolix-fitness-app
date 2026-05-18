// components/exercise/sub-tabs/workout/EditWorkoutModal.tsx
import {
  MODAL_MAX_HEIGHT,
  modalConfirmButtonColors,
  modalGradientColors,
  modalTheme,
} from "@/config/modalTheme";
import { newColors } from "@/config/theme";
import { typography } from "@/config/typography";
import type { Exercise } from "@/types/exercise";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DraggableFlatList, {
  DragEndParams,
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { SafeAreaView } from "react-native-safe-area-context";
import DumbbellIcon from "../../../../assets/icons/dumbbell-white.svg";
import XIcon from "../../../../assets/icons/white-x.svg";
import { useTranslation } from "@/i18n/translations";

type Props = {
  visible: boolean;
  onClose: () => void;
  initialName: string;
  initialDayLabel?: string;
  initialDescription?: string;
  initialExerciseIds: string[];
  availableExercises: Exercise[];
  onSubmit: (
    data: {
      name: string;
      dayLabel?: string;
      description?: string;
      exerciseIds: string[];
    },
    options?: { closeModal?: boolean }
  ) => void | Promise<void>;
  onDelete: () => void;
};

const colors = {
  textStrong: modalTheme.textStrong,
  muted: modalTheme.muted,
  label: modalTheme.label,
  surface: modalTheme.surface,
  surfaceMuted: modalTheme.surfaceMuted,
  inputBorder: modalTheme.inputBorder,
  inputFocus: "rgba(59,130,246,0.45)",
  cardBg: "rgba(14,30,50,0.9)",
  cardStroke: "rgba(255,255,255,0.06)",
  cardSelectedBg: "rgba(59,130,246,0.18)",
  cardSelectedStroke: "rgba(59,130,246,0.34)",
  chipBg: "rgba(255,255,255,0.055)",
  chipSoftBg: "rgba(255,255,255,0.045)",
  chipStroke: "rgba(255,255,255,0.10)",
  chipSoftStroke: "rgba(255,255,255,0.08)",
  chipText: "rgba(255,255,255,0.72)",
  dangerBg: "rgba(127,29,29,0.32)",
  dangerStroke: "rgba(248,113,113,0.55)",
  dangerText: "rgba(254,202,202,0.98)",
  sectionBg: "rgba(5,10,22,0.22)",
  sectionStroke: "rgba(255,255,255,0.05)",
};

type WorkoutDraftSnapshot = {
  name: string;
  dayLabel?: string;
  description?: string;
  exerciseIds: string[];
};

function normalizeWorkoutDraftSnapshot(
  snapshot: WorkoutDraftSnapshot
): WorkoutDraftSnapshot {
  return {
    name: snapshot.name.trim(),
    dayLabel: snapshot.dayLabel?.trim() || undefined,
    description: snapshot.description?.trim() || undefined,
    exerciseIds: [...snapshot.exerciseIds],
  };
}

function areWorkoutDraftSnapshotsEqual(
  a: WorkoutDraftSnapshot | null,
  b: WorkoutDraftSnapshot
) {
  if (!a) return false;
  if (
    a.name !== b.name ||
    a.dayLabel !== b.dayLabel ||
    a.description !== b.description ||
    a.exerciseIds.length !== b.exerciseIds.length
  ) {
    return false;
  }

  return a.exerciseIds.every((id, index) => id === b.exerciseIds[index]);
}

export function EditWorkoutModal({
  visible,
  onClose,
  initialName,
  initialDayLabel,
  initialDescription,
  initialExerciseIds,
  availableExercises,
  onSubmit,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [dayLabel, setDayLabel] = useState(initialDayLabel ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [selectedExerciseIds, setSelectedExerciseIds] =
    useState<string[]>(initialExerciseIds);
  const [search, setSearch] = useState("");
  const [focusField, setFocusField] = useState<
    "name" | "day" | "desc" | "search" | null
  >(null);

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSnapshotRef = useRef<WorkoutDraftSnapshot | null>(null);
  const autosaveReadyRef = useRef(false);

  const clearAutosaveTimer = () => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = null;
  };

  useEffect(() => {
    return () => {
      clearAutosaveTimer();
    };
  }, []);

  useEffect(() => {
    if (!visible) return;

    setName(initialName);
    setDayLabel(initialDayLabel ?? "");
    setDescription(initialDescription ?? "");
    setSelectedExerciseIds(initialExerciseIds);
    setSearch("");
    setFocusField(null);

    lastSavedSnapshotRef.current = normalizeWorkoutDraftSnapshot({
      name: initialName,
      dayLabel: initialDayLabel,
      description: initialDescription,
      exerciseIds: initialExerciseIds,
    });
    autosaveReadyRef.current = false;
    clearAutosaveTimer();
  }, [
    visible,
    initialName,
    initialDayLabel,
    initialDescription,
    initialExerciseIds,
  ]);

  useEffect(() => {
    if (!visible) return;

    const snapshot = normalizeWorkoutDraftSnapshot({
      name,
      dayLabel,
      description,
      exerciseIds: selectedExerciseIds,
    });

    if (!autosaveReadyRef.current) {
      autosaveReadyRef.current = true;
      return;
    }

    if (
      !snapshot.name ||
      areWorkoutDraftSnapshotsEqual(lastSavedSnapshotRef.current, snapshot)
    ) {
      clearAutosaveTimer();
      return;
    }

    clearAutosaveTimer();
    autosaveTimer.current = setTimeout(() => {
      void Promise.resolve(
        onSubmit(
          {
            name: snapshot.name,
            dayLabel: snapshot.dayLabel,
            description: snapshot.description,
            exerciseIds: snapshot.exerciseIds,
          },
          { closeModal: false }
        )
      )
        .then(() => {
          lastSavedSnapshotRef.current = snapshot;
        })
        .catch(() => {});
    }, 350);
  }, [visible, name, dayLabel, description, selectedExerciseIds, onSubmit]);

  const selectedSet = useMemo(
    () => new Set(selectedExerciseIds),
    [selectedExerciseIds]
  );

  const exerciseById = useMemo(() => {
    const map = new Map<string, Exercise>();
    availableExercises.forEach((exercise) => map.set(exercise.id, exercise));
    return map;
  }, [availableExercises]);

  const selectedExercises = useMemo(() => {
    return selectedExerciseIds
      .map((id) => exerciseById.get(id))
      .filter((item): item is Exercise => !!item);
  }, [selectedExerciseIds, exerciseById]);

  const filteredExercises = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return availableExercises;

    return availableExercises.filter((exercise) => {
      const exerciseName = (exercise.name ?? "").toLowerCase();
      const muscle = (exercise.muscle ?? "").toLowerCase();
      const equipment = (exercise.equipment ?? "").toLowerCase();
      return (
        exerciseName.includes(query) ||
        muscle.includes(query) ||
        equipment.includes(query)
      );
    });
  }, [availableExercises, search]);

  const availableVisibleExercises = useMemo(() => {
    return filteredExercises.filter(
      (exercise) => !selectedSet.has(exercise.id)
    );
  }, [filteredExercises, selectedSet]);

  const toggleExercise = (id: string) => {
    setSelectedExerciseIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const getCurrentSnapshot = () =>
    normalizeWorkoutDraftSnapshot({
      name,
      dayLabel,
      description,
      exerciseIds: selectedExerciseIds,
    });

  const handleSubmit = async () => {
    const snapshot = getCurrentSnapshot();
    if (!snapshot.name) return;

    clearAutosaveTimer();
    try {
      await Promise.resolve(
        onSubmit(
          {
            name: snapshot.name,
            dayLabel: snapshot.dayLabel,
            description: snapshot.description,
            exerciseIds: snapshot.exerciseIds,
          },
          { closeModal: true }
        )
      );
      lastSavedSnapshotRef.current = snapshot;
    } catch {
      // Let parent surface save failures.
    }
  };

  const confirmDelete = () => {
    Alert.alert(t("workoutDeleteTitle"), t("workoutDeleteBody"), [
      { text: t("commonCancel"), style: "cancel" },
      { text: t("commonDelete"), style: "destructive", onPress: onDelete },
    ]);
  };

  const handleCloseRequest = async () => {
    clearAutosaveTimer();

    const snapshot = getCurrentSnapshot();
    if (areWorkoutDraftSnapshotsEqual(lastSavedSnapshotRef.current, snapshot)) {
      onClose();
      return;
    }

    if (!snapshot.name) {
      Alert.alert(
        t("workoutDiscardTitle"),
        t("workoutNameRequiredToSave"),
        [
          { text: t("commonContinueEditing"), style: "cancel" },
          {
            text: t("commonDiscardChanges"),
            style: "destructive",
            onPress: onClose,
          },
        ]
      );
      return;
    }

    try {
      await Promise.resolve(
        onSubmit(
          {
            name: snapshot.name,
            dayLabel: snapshot.dayLabel,
            description: snapshot.description,
            exerciseIds: snapshot.exerciseIds,
          },
          { closeModal: false }
        )
      );
      lastSavedSnapshotRef.current = snapshot;
      onClose();
    } catch {
      // Keep the modal open if save fails.
    }
  };

  const renderSelectedItem = ({
    item: exercise,
    drag,
    isActive,
  }: RenderItemParams<Exercise>) => {
    return (
      <Pressable
        onPress={() => toggleExercise(exercise.id)}
        onLongPress={drag}
        delayLongPress={120}
        style={({ pressed }) => [
          styles.selectedRow,
          isActive && styles.selectedRowActive,
          pressed && !isActive && styles.pressed,
        ]}
      >
        <View style={styles.rowTextWrap}>
          <Text
            style={[typography.bodyBold, styles.selectedName]}
            numberOfLines={1}
          >
            {exercise.name}
          </Text>

          {(exercise.muscle || exercise.equipment) && (
            <View style={styles.selectedMetaRow}>
              {!!exercise.muscle && (
                <View style={styles.metaChip}>
                  <Text
                    style={[typography.bodyBlack, styles.metaChipText]}
                    numberOfLines={1}
                  >
                    {exercise.muscle}
                  </Text>
                </View>
              )}
              {!!exercise.equipment && (
                <View style={styles.metaChipSoft}>
                  <Text
                    style={[typography.bodyBlack, styles.metaChipText]}
                    numberOfLines={1}
                  >
                    {exercise.equipment}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.addIconWrap}>
          <Ionicons
            name="remove-circle"
            size={22}
            color={newColors.primary.light}
          />
        </View>
      </Pressable>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={() => {
        void handleCloseRequest();
      }}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.overlay}>
          <Pressable
            style={styles.backdrop}
            onPress={() => {
              void handleCloseRequest();
            }}
          />
          <View style={styles.sheet}>
            <LinearGradient
              pointerEvents="none"
              colors={modalGradientColors}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.95, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View pointerEvents="none" style={styles.orbTop} />
            <View pointerEvents="none" style={styles.orbBottom} />

            <View style={styles.header}>
              <View style={styles.headerTitleWrap}>
                <DumbbellIcon
                  height={25}
                  width={25}
                  stroke={newColors.primary.light}
                  fill={newColors.primary.light}
                />
                <Text style={styles.title}>{t("workoutEditTitle")}</Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  void handleCloseRequest();
                }}
                style={styles.closeButton}
              >
                <XIcon height={18} width={18} />
              </TouchableOpacity>
            </View>

            <Text style={[typography.body, styles.subtitle]}>
              {t("workoutAutosaveHint")}
            </Text>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              <Text style={[typography.body, styles.label]}>{t("modalName")}</Text>
              <View
                style={[
                  styles.inputWrap,
                  focusField === "name" && styles.inputWrapFocus,
                ]}
              >
                <TextInput
                  style={styles.input}
                  placeholder="F.eks. Push A"
                  placeholderTextColor="rgba(148,163,184,0.8)"
                  value={name}
                  onChangeText={setName}
                  returnKeyType="next"
                  onFocus={() => setFocusField("name")}
                  onBlur={() =>
                    setFocusField((field) => (field === "name" ? null : field))
                  }
                />
              </View>

              <Text style={[typography.body, styles.label]}>
                {t("workoutDayLabel")}
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  focusField === "day" && styles.inputWrapFocus,
                ]}
              >
                <TextInput
                  style={styles.input}
                  placeholder={t("workoutDayPlaceholder")}
                  placeholderTextColor="rgba(148,163,184,0.8)"
                  value={dayLabel}
                  onChangeText={setDayLabel}
                  returnKeyType="next"
                  onFocus={() => setFocusField("day")}
                  onBlur={() =>
                    setFocusField((field) => (field === "day" ? null : field))
                  }
                />
              </View>

              <Text style={[typography.body, styles.label]}>
                {t("modalDescription")}
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  styles.textareaWrap,
                  focusField === "desc" && styles.inputWrapFocus,
                ]}
              >
                <TextInput
                  style={[styles.input, styles.textarea]}
                  placeholder={t("workoutDescriptionPlaceholder")}
                  placeholderTextColor="rgba(148,163,184,0.8)"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  returnKeyType="done"
                  onFocus={() => setFocusField("desc")}
                  onBlur={() =>
                    setFocusField((field) => (field === "desc" ? null : field))
                  }
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[typography.body, styles.sectionTitle]}>
                    {t("workoutSelectedExercises")}
                  </Text>
                  <Text style={styles.sectionCount}>
                    {selectedExercises.length}
                  </Text>
                </View>

                {selectedExercises.length === 0 ? (
                  <Text style={[typography.body, styles.emptySelectedText]}>
                    {t("workoutNoSelectedExercises")}
                  </Text>
                ) : (
                  <View style={styles.selectedListShell}>
                    <DraggableFlatList
                      data={selectedExercises}
                      keyExtractor={(item) => item.id}
                      onDragEnd={({ data }: DragEndParams<Exercise>) => {
                        setSelectedExerciseIds(data.map((item) => item.id));
                      }}
                      renderItem={renderSelectedItem}
                      scrollEnabled={selectedExercises.length > 3}
                      nestedScrollEnabled
                      activationDistance={16}
                      containerStyle={styles.selectedList}
                    />
                  </View>
                )}
              </View>

              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[typography.body, styles.sectionTitle]}>
                    {t("workoutAvailableExercises")}
                  </Text>
                  <Text style={styles.sectionCount}>
                    {availableVisibleExercises.length}
                  </Text>
                </View>

                <View
                  style={[
                    styles.searchWrap,
                    focusField === "search" && styles.inputWrapFocus,
                  ]}
                >
                  <Ionicons
                    name="search-outline"
                    size={16}
                    color="rgba(148,163,184,0.8)"
                  />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={t("workoutSearchExercisesPlaceholder")}
                    placeholderTextColor="rgba(148,163,184,0.8)"
                    value={search}
                    onChangeText={setSearch}
                    returnKeyType="search"
                    autoCorrect={false}
                    autoCapitalize="none"
                    onFocus={() => setFocusField("search")}
                    onBlur={() =>
                      setFocusField((field) =>
                        field === "search" ? null : field
                      )
                    }
                    clearButtonMode="while-editing"
                  />
                </View>

                {availableExercises.length === 0 ? (
                  <Text style={[typography.body, styles.emptyText]}>
                    {t("workoutNoExercises")}
                  </Text>
                ) : availableVisibleExercises.length === 0 ? (
                  <Text style={[typography.body, styles.emptyText]}>
                    {t("workoutNoExerciseSearchResults")}
                  </Text>
                ) : (
                  <View style={styles.availableList}>
                    {availableVisibleExercises.map((exercise) => (
                      <Pressable
                        key={exercise.id}
                        onPress={() => toggleExercise(exercise.id)}
                        style={({ pressed }) => [
                          styles.exerciseItem,
                          pressed && styles.pressed,
                        ]}
                      >
                        <View style={styles.rowTextWrap}>
                          <Text
                            style={[typography.body, styles.exerciseName]}
                            numberOfLines={1}
                          >
                            {exercise.name}
                          </Text>

                          {(exercise.muscle || exercise.equipment) && (
                            <View style={styles.exerciseMetaRow}>
                              {!!exercise.muscle && (
                                <View style={styles.chip}>
                                  <Text
                                    style={[
                                      typography.bodyBlack,
                                      styles.chipText,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {exercise.muscle}
                                  </Text>
                                </View>
                              )}
                              {!!exercise.equipment && (
                                <View style={styles.chipSoft}>
                                  <Text
                                    style={[
                                      typography.bodyBlack,
                                      styles.chipText,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {exercise.equipment}
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}
                        </View>

                        <View style={styles.addIconWrap}>
                          <Ionicons
                            name="add-circle"
                            size={22}
                            color={newColors.primary.light}
                          />
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.buttonWrapper}
                onPress={() => {
                  void handleSubmit();
                }}
              >
                <LinearGradient
                  colors={modalConfirmButtonColors}
                  style={styles.button}
                >
                  <Ionicons name="save-outline" size={18} color="white" />
                  <Text style={styles.buttonText}>{t("modalSaveChanges")}</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={confirmDelete}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={colors.dangerText}
                />
                <Text style={styles.deleteButtonText}>{t("workoutDelete")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: modalTheme.backdrop,
  },
  sheet: {
    backgroundColor: colors.surface,
    width: "100%",
    maxWidth: 560,
    height: MODAL_MAX_HEIGHT,
    maxHeight: MODAL_MAX_HEIGHT,
    alignSelf: "center",
    borderRadius: 28,
    padding: 12,
    paddingTop: 18,
    borderWidth: 1,
    borderColor: modalTheme.border,
    shadowColor: modalTheme.shadow,
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
    overflow: "hidden",
  },
  orbTop: {
    position: "absolute",
    top: -56,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: modalTheme.orbTop,
  },
  orbBottom: {
    position: "absolute",
    left: -36,
    bottom: -72,
    width: 146,
    height: 146,
    borderRadius: 999,
    backgroundColor: modalTheme.orbBottom,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  title: {
    color: modalTheme.text,
    fontSize: 25,
    fontWeight: "500",
    flexShrink: 1,
  },
  subtitle: {
    color: modalTheme.muted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    paddingBottom: 150,
  },
  label: {
    color: colors.label,
    marginBottom: 6,
    marginTop: 15,
    fontSize: 14,
  },
  inputWrap: {
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  inputWrapFocus: {
    borderColor: colors.inputFocus,
  },
  input: {
    backgroundColor: "transparent",
    borderRadius: 12,
    padding: 12,
    color: colors.textStrong,
    fontSize: 13,
  },
  textareaWrap: {
    minHeight: 90,
  },
  textarea: {
    height: 90,
    textAlignVertical: "top",
  },
  sectionCard: {
    marginTop: 14,
    padding: 8,
    borderRadius: 16,
    backgroundColor: colors.sectionBg,
    borderWidth: 1,
    borderColor: colors.sectionStroke,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 12,
  },
  sectionTitle: {
    color: colors.label,
    fontSize: 14,
  },
  sectionCount: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(59,130,246,0.18)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.32)",
    color: newColors.primary.light,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  selectedListShell: {
    minHeight: 56,
    maxHeight: 188,
  },
  selectedList: {
    gap: 6,
  },
  selectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: colors.cardBg,
    borderColor: colors.cardStroke,
  },
  selectedRowActive: {
    opacity: 0.95,
    transform: [{ scale: 1.01 }],
  },
  rowTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  selectedName: {
    color: colors.textStrong,
    fontSize: 13,
  },
  selectedMetaRow: {
    marginTop: 4,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  metaChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.chipBg,
    borderWidth: 1,
    borderColor: colors.chipStroke,
  },
  metaChipSoft: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.chipSoftBg,
    borderWidth: 1,
    borderColor: colors.chipSoftStroke,
  },
  metaChipText: {
    color: colors.chipText,
    fontSize: 9,
    fontWeight: "500",
    maxWidth: 160,
  },
  emptySelectedText: {
    color: modalTheme.muted,
    fontSize: 13,
    fontStyle: "italic",
    paddingVertical: 6,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  searchInput: {
    flex: 1,
    color: colors.textStrong,
    fontSize: 13,
    paddingVertical: 0,
  },
  availableList: {
    marginTop: 10,
    gap: 6,
  },
  exerciseItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderRadius: 14,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardStroke,
  },
  exerciseName: {
    color: colors.textStrong,
    fontSize: 13,
  },
  exerciseMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
    gap: 4,
  },
  chip: {
    backgroundColor: colors.chipBg,
    borderWidth: 1,
    borderColor: colors.chipStroke,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  chipSoft: {
    backgroundColor: colors.chipSoftBg,
    borderWidth: 1,
    borderColor: colors.chipSoftStroke,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 9,
    color: colors.chipText,
    fontWeight: "500",
    maxWidth: 150,
  },
  addIconWrap: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: modalTheme.muted,
    fontSize: 13,
    fontStyle: "italic",
    paddingTop: 10,
    paddingBottom: 4,
  },
  footer: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 14,
  },
  buttonWrapper: {
    marginTop: 12,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  deleteButton: {
    marginTop: 8,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerStroke,
  },
  deleteButtonText: {
    color: colors.dangerText,
    fontSize: 14,
    fontWeight: "500",
  },
  pressed: {
    opacity: 0.9,
  },
});
