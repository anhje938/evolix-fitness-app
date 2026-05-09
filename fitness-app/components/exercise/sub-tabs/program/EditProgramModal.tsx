// components/exercise/sub-tabs/program/EditProgramModal.tsx
import {
  MODAL_MAX_HEIGHT,
  modalConfirmButtonColors,
  modalGradientColors,
  modalTheme,
} from "@/config/modalTheme";
import { newColors } from "@/config/theme";
import { typography } from "@/config/typography";
import type { Workout } from "@/types/exercise";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import DumbbellIcon from "../../../../assets/icons/dumbbell-white.svg";
import XIcon from "../../../../assets/icons/white-x.svg";
import { AddWorkoutModal } from "../workout/AddWorkoutModal";

type Props = {
  visible: boolean;
  onClose: () => void;
  initialName: string;
  initialWorkoutIds: string[];
  availableWorkouts: Workout[];
  onSubmit: (data: { name: string; workoutIds: string[] }) => void;
  onDelete: () => void;
  onCreateWorkout: (data: {
    name: string;
    description?: string;
    dayLabel?: string;
  }) => Promise<Workout>;
  isBusy?: boolean;
};

export default function EditProgramModal({
  visible,
  onClose,
  initialName,
  initialWorkoutIds,
  availableWorkouts,
  onSubmit,
  onDelete,
  onCreateWorkout,
  isBusy = false,
}: Props) {
  const [name, setName] = useState(initialName);
  const [selectedWorkoutIds, setSelectedWorkoutIds] =
    useState<string[]>(initialWorkoutIds);
  const [localError, setLocalError] = useState<string | null>(null);
  const [openCreateWorkout, setOpenCreateWorkout] = useState(false);
  const [creatingWorkout, setCreatingWorkout] = useState(false);
  const [focusField, setFocusField] = useState<"name" | "search" | null>(null);
  const [search, setSearch] = useState("");

  const submitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearSubmitTimer = () => {
    if (submitTimer.current) clearTimeout(submitTimer.current);
    submitTimer.current = null;
  };

  useEffect(() => {
    return () => clearSubmitTimer();
  }, []);

  useEffect(() => {
    if (!visible) return;

    setName(initialName ?? "");
    setSelectedWorkoutIds(
      Array.isArray(initialWorkoutIds) ? initialWorkoutIds : []
    );
    setLocalError(null);
    setOpenCreateWorkout(false);
    setCreatingWorkout(false);
    setSearch("");
    setFocusField(null);
    clearSubmitTimer();
  }, [visible, initialName, initialWorkoutIds]);

  const canInteract = !isBusy && !creatingWorkout;

  const selectedSet = useMemo(
    () => new Set(selectedWorkoutIds),
    [selectedWorkoutIds]
  );

  const workoutById = useMemo(() => {
    const map = new Map<string, Workout>();
    (availableWorkouts ?? []).forEach((workout) => map.set(workout.id, workout));
    return map;
  }, [availableWorkouts]);

  const selectedWorkouts = useMemo(() => {
    return selectedWorkoutIds
      .map((id) => workoutById.get(id))
      .filter((item): item is Workout => !!item);
  }, [selectedWorkoutIds, workoutById]);

  const unselectedWorkouts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const base = (availableWorkouts ?? []).filter(
      (workout) => !selectedSet.has(workout.id)
    );
    if (!query) return base;

    return base.filter((workout) => {
      const workoutName = (workout.name ?? "").toLowerCase();
      const description = (workout.description ?? "").toLowerCase();
      const dayLabel = (workout.dayLabel ?? "").toLowerCase();
      return (
        workoutName.includes(query) ||
        description.includes(query) ||
        dayLabel.includes(query)
      );
    });
  }, [availableWorkouts, selectedSet, search]);

  const toggleWorkout = (id: string) => {
    setSelectedWorkoutIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    setLocalError(null);
    const trimmed = (name ?? "").trim();
    if (!trimmed) {
      setLocalError("Programnavn kan ikke være tomt.");
      return;
    }

    onSubmit({ name: trimmed, workoutIds: selectedWorkoutIds });
  };

  const confirmDelete = () => {
    Alert.alert(
      "Slett program?",
      "Dette kan ikke angres. Vil du slette programmet?",
      [
        { text: "Avbryt", style: "cancel" },
        { text: "Slett", style: "destructive", onPress: onDelete },
      ]
    );
  };

  const handleCreateWorkout = async (data: {
    name: string;
    description?: string;
    dayLabel?: string;
  }) => {
    const trimmed = (data.name ?? "").trim();
    if (!trimmed) return;

    setLocalError(null);
    setCreatingWorkout(true);

    try {
      const created = await onCreateWorkout({
        name: trimmed,
        description: data.description,
        dayLabel: data.dayLabel,
      });

      setSelectedWorkoutIds((prev) => {
        if (prev.includes(created.id)) return prev;
        return [...prev, created.id];
      });

      setOpenCreateWorkout(false);
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "Kunne ikke opprette økt."
      );
    } finally {
      setCreatingWorkout(false);
    }
  };

  const renderSelectedRow = ({
    item: workout,
    drag,
    isActive,
  }: RenderItemParams<Workout>) => {
    return (
      <Pressable
        onPress={() => toggleWorkout(workout.id)}
        onLongPress={drag}
        delayLongPress={120}
        disabled={!canInteract}
        style={({ pressed }) => [
          styles.selectedRow,
          isActive && styles.selectedRowActive,
          pressed && !isActive && styles.pressed,
        ]}
      >
        <View style={styles.rowTextWrap}>
          <Text
            style={[typography.bodyBold, styles.rowTitle]}
            numberOfLines={1}
          >
            {workout.name}
          </Text>
          {(workout.dayLabel || workout.description) && (
            <Text style={[typography.body, styles.rowSub]} numberOfLines={2}>
              {workout.dayLabel || workout.description}
            </Text>
          )}
        </View>

        <Ionicons
          name="remove-circle"
          size={22}
          color={newColors.primary.light}
        />
      </Pressable>
    );
  };

  const renderAvailableRow = (workout: Workout) => {
    const sub = workout.dayLabel || workout.description;

    return (
      <Pressable
        key={workout.id}
        onPress={() => toggleWorkout(workout.id)}
        disabled={!canInteract}
        style={({ pressed }) => [styles.availableRow, pressed && styles.pressed]}
      >
        <View style={styles.rowTextWrap}>
          <Text
            style={[typography.bodyBold, styles.rowTitle]}
            numberOfLines={1}
          >
            {workout.name}
          </Text>
          {!!sub && (
            <Text style={[typography.body, styles.rowSub]} numberOfLines={2}>
              {sub}
            </Text>
          )}
        </View>

        <Ionicons
          name="add-circle"
          size={22}
          color={newColors.primary.light}
        />
      </Pressable>
    );
  };

  if (!visible) return null;

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={onClose} />

          <View style={styles.container}>
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
                <Text style={styles.title}>Rediger program</Text>
              </View>

              <TouchableOpacity
                onPress={onClose}
                disabled={!canInteract}
                style={styles.closeButton}
              >
                <XIcon height={18} width={18} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.label}>Navn</Text>
              <View
                style={[
                  styles.inputWrap,
                  focusField === "name" && styles.inputWrapFocus,
                ]}
              >
                <TextInput
                  style={styles.input}
                  placeholder="F.eks. Push Pull Legs"
                  placeholderTextColor="rgba(148,163,184,0.8)"
                  value={name}
                  onChangeText={setName}
                  returnKeyType="done"
                  editable={canInteract}
                  onFocus={() => setFocusField("name")}
                  onBlur={() =>
                    setFocusField((field) => (field === "name" ? null : field))
                  }
                />
              </View>

              {!!localError && (
                <View style={styles.errorBox}>
                  <Text style={[typography.body, styles.errorText]}>
                    {localError}
                  </Text>
                </View>
              )}

              <Text style={styles.label}>Økter i programmet</Text>
              {selectedWorkouts.length === 0 ? (
                <Text style={[typography.body, styles.emptyText]}>
                  Ingen økter valgt enda. Trykk på økter under for å legge dem
                  til.
                </Text>
              ) : (
                <View style={styles.selectedListShell}>
                  <DraggableFlatList
                    data={selectedWorkouts}
                    keyExtractor={(item) => item.id}
                    onDragEnd={({ data }: DragEndParams<Workout>) => {
                      setSelectedWorkoutIds(data.map((item) => item.id));
                    }}
                    renderItem={renderSelectedRow}
                    scrollEnabled={false}
                    activationDistance={10}
                    containerStyle={styles.selectedList}
                  />
                </View>
              )}

              <View style={styles.availableHeader}>
                <Text style={styles.label}>Tilgjengelige økter</Text>
                <TouchableOpacity
                  onPress={() => setOpenCreateWorkout(true)}
                  disabled={!canInteract}
                  style={[
                    styles.createButton,
                    !canInteract && styles.buttonDisabled,
                  ]}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={18}
                    color="rgba(224,242,254,0.95)"
                  />
                  <Text style={styles.createButtonText}>
                    {creatingWorkout ? "Oppretter..." : "Ny økt"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.inputWrap,
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
                  placeholder="Søk i økter..."
                  placeholderTextColor="rgba(148,163,184,0.8)"
                  value={search}
                  onChangeText={setSearch}
                  editable={canInteract}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                  onFocus={() => setFocusField("search")}
                  onBlur={() =>
                    setFocusField((field) => (field === "search" ? null : field))
                  }
                  clearButtonMode="while-editing"
                />
              </View>

              {availableWorkouts.length === 0 ? (
                <Text style={[typography.body, styles.emptyText]}>
                  Du har ingen økter enda. Opprett dem i Økter-fanen.
                </Text>
              ) : unselectedWorkouts.length === 0 ? (
                <Text style={[typography.body, styles.emptyText]}>
                  Ingen flere økter matcher søket akkurat nå.
                </Text>
              ) : (
                <View style={styles.availableList}>
                  {unselectedWorkouts.map(renderAvailableRow)}
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.buttonWrapper, !canInteract && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={!canInteract}
            >
              <LinearGradient
                colors={modalConfirmButtonColors}
                style={styles.button}
              >
                {isBusy || creatingWorkout ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color="white" />
                    <Text style={styles.buttonText}>Lagre endringer</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.deleteButton, !canInteract && styles.buttonDisabled]}
              onPress={confirmDelete}
              disabled={!canInteract}
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color="rgba(254,202,202,0.98)"
              />
              <Text style={styles.deleteButtonText}>Slett program</Text>
            </TouchableOpacity>

            <AddWorkoutModal
              visible={openCreateWorkout}
              onClose={() => setOpenCreateWorkout(false)}
              onSubmit={handleCreateWorkout}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: modalTheme.backdrop,
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    backgroundColor: modalTheme.surface,
    width: "100%",
    maxWidth: 560,
    height: MODAL_MAX_HEIGHT,
    maxHeight: MODAL_MAX_HEIGHT,
    borderRadius: 28,
    padding: 12,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: modalTheme.border,
    shadowColor: modalTheme.shadow,
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
    overflow: "hidden",
    alignSelf: "center",
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
    marginBottom: 10,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "48%",
  },
  title: {
    color: modalTheme.text,
    fontSize: 25,
    fontWeight: "500",
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
    paddingBottom: 8,
    flexGrow: 1,
  },
  label: {
    color: modalTheme.label,
    marginBottom: 6,
    marginTop: 15,
    fontSize: 14,
  },
  inputWrap: {
    borderRadius: 12,
    backgroundColor: modalTheme.surfaceMuted,
    borderWidth: 1,
    borderColor: modalTheme.inputBorder,
  },
  inputWrapFocus: {
    borderColor: "rgba(59,130,246,0.45)",
  },
  input: {
    backgroundColor: "transparent",
    borderRadius: 12,
    padding: 12,
    color: modalTheme.textStrong,
    fontSize: 13,
  },
  errorBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.25)",
    backgroundColor: "rgba(248,113,113,0.10)",
  },
  errorText: {
    color: modalTheme.text,
  },
  selectedListShell: {
    marginTop: 6,
  },
  selectedList: {
    gap: 8,
  },
  selectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderRadius: 14,
    backgroundColor: "rgba(14,30,50,0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  selectedRowActive: {
    opacity: 0.95,
    transform: [{ scale: 1.01 }],
  },
  pressed: {
    opacity: 0.92,
  },
  rowTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    color: modalTheme.textStrong,
    fontSize: 13.5,
  },
  rowSub: {
    marginTop: 4,
    color: modalTheme.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  availableHeader: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.22)",
    backgroundColor: "rgba(34,211,238,0.10)",
  },
  createButtonText: {
    color: "rgba(224,242,254,0.95)",
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: 0.12,
  },
  searchWrap: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    color: modalTheme.textStrong,
    fontSize: 13,
    paddingVertical: 0,
  },
  availableList: {
    marginTop: 10,
    gap: 6,
  },
  availableRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderRadius: 14,
    backgroundColor: "rgba(14,30,50,0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  emptyText: {
    color: modalTheme.muted,
    fontSize: 13,
    fontStyle: "italic",
    paddingVertical: 10,
  },
  buttonWrapper: {
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.72,
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
    backgroundColor: "rgba(127,29,29,0.32)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.55)",
  },
  deleteButtonText: {
    color: "rgba(254,202,202,0.98)",
    fontSize: 14,
    fontWeight: "500",
  },
});
