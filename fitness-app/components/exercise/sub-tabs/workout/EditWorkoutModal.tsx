// components/exercise/sub-tabs/workout/EditWorkoutModal.tsx
import { typography } from "@/config/typography";
import type { Exercise } from "@/types/exercise";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItemInfo,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DraggableFlatList, {
  DragEndParams,
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  onClose: () => void;

  initialName: string;
  initialDayLabel?: string;
  initialDescription?: string;
  initialExerciseIds: string[];

  availableExercises: Exercise[];

  onSubmit: (data: {
    name: string;
    dayLabel?: string;
    description?: string;
    exerciseIds: string[]; // ✅ ordered
  }) => void;

  onDelete: () => void;
};

const colors = {
  // Backdrop
  backdrop: "rgba(0,0,0,0.66)",

  // Sheet base
  cardSolid: "rgba(10,16,30,0.96)",
  strokeOuter: "rgba(255,255,255,0.10)",
  strokeInner: "rgba(255,255,255,0.05)",
  divider: "rgba(255,255,255,0.08)",

  // Text
  text: "rgba(255,255,255,0.94)",
  muted: "rgba(148,163,184,0.86)",
  muted2: "rgba(148,163,184,0.72)",

  // Accent
  accentA: "rgba(99,102,241,0.94)", // indigo
  accentB: "rgba(34,211,238,0.78)", // cyan

  // Inputs
  inputBg: "rgba(255,255,255,0.045)",
  inputStroke: "rgba(255,255,255,0.10)",
  inputStrokeFocus: "rgba(34,211,238,0.26)",

  // Neon tints
  indigoBg: "rgba(99,102,241,0.10)",
  indigoStroke: "rgba(99,102,241,0.22)",
  cyanBg: "rgba(34,211,238,0.085)",
  cyanStroke: "rgba(34,211,238,0.20)",
  emeraldBg: "rgba(16,185,129,0.080)",
  emeraldStroke: "rgba(16,185,129,0.18)",

  // Items
  itemBg: "rgba(255,255,255,0.035)",
  itemStroke: "rgba(255,255,255,0.09)",
  itemSelectedBg: "rgba(34,211,238,0.075)",
  itemSelectedStroke: "rgba(34,211,238,0.24)",

  // Buttons
  iconBg: "rgba(255,255,255,0.05)",
  iconStroke: "rgba(255,255,255,0.10)",

  // CTA
  ctaStroke: "rgba(255,255,255,0.18)",

  // Danger
  dangerBg: "rgba(127,29,29,0.35)",
  dangerStroke: "rgba(248,113,113,0.60)",
  dangerText: "rgba(254,202,202,0.98)",
};

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
  const [name, setName] = useState(initialName);
  const [dayLabel, setDayLabel] = useState(initialDayLabel ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [selectedExerciseIds, setSelectedExerciseIds] =
    useState<string[]>(initialExerciseIds);

  const [search, setSearch] = useState("");

  const [focusField, setFocusField] = useState<
    "name" | "day" | "desc" | "search" | null
  >(null);

  // --- Autosave (debounced) ---
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedIdsRef = useRef<string[] | null>(null);

  const clearAutosaveTimer = () => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = null;
  };

  useEffect(() => {
    return () => {
      clearAutosaveTimer();
    };
  }, []);

  const saveToApiDebounced = (nextIds: string[]) => {
    // Avoid spamming if same as last saved
    const last = lastSavedIdsRef.current;
    if (
      last &&
      last.length === nextIds.length &&
      last.every((v, i) => v === nextIds[i])
    ) {
      return;
    }

    clearAutosaveTimer();

    autosaveTimer.current = setTimeout(() => {
      const trimmedName = (name.trim() || initialName.trim()).trim();
      if (!trimmedName) return;

      onSubmit({
        name: trimmedName,
        dayLabel: dayLabel.trim() || undefined,
        description: description.trim() || undefined,
        exerciseIds: nextIds,
      });

      lastSavedIdsRef.current = nextIds;
    }, 350);
  };

  useEffect(() => {
    if (!visible) return;

    setName(initialName);
    setDayLabel(initialDayLabel ?? "");
    setDescription(initialDescription ?? "");
    setSelectedExerciseIds(initialExerciseIds);
    setSearch("");
    setFocusField(null);

    lastSavedIdsRef.current = initialExerciseIds;
    clearAutosaveTimer();
  }, [
    visible,
    initialName,
    initialDayLabel,
    initialDescription,
    initialExerciseIds,
  ]);

  const selectedSet = useMemo(
    () => new Set(selectedExerciseIds),
    [selectedExerciseIds]
  );

  const exById = useMemo(() => {
    const m = new Map<string, Exercise>();
    availableExercises.forEach((e) => m.set(e.id, e));
    return m;
  }, [availableExercises]);

  // Selected in current order
  const selectedExercises = useMemo(() => {
    return selectedExerciseIds
      .map((id) => exById.get(id))
      .filter((x): x is Exercise => !!x);
  }, [selectedExerciseIds, exById]);

  const filteredExercises = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableExercises;

    return availableExercises.filter((ex) => {
      const n = (ex.name ?? "").toLowerCase();
      const m = (ex.muscle ?? "").toLowerCase();
      const eq = (ex.equipment ?? "").toLowerCase();
      return n.includes(q) || m.includes(q) || eq.includes(q);
    });
  }, [availableExercises, search]);

  const toggleExercise = (id: string) => {
    setSelectedExerciseIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]; // add to end (order)

      saveToApiDebounced(next); // ✅ autosave selection/order
      return next;
    });
  };

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    // If user presses save, flush pending and save immediately
    clearAutosaveTimer();
    onSubmit({
      name: trimmed,
      dayLabel: dayLabel.trim() || undefined,
      description: description.trim() || undefined,
      exerciseIds: selectedExerciseIds,
    });
    lastSavedIdsRef.current = selectedExerciseIds;
  };

  const confirmDelete = () => {
    Alert.alert("Slett økt?", "Dette kan ikke angres. Vil du slette økten?", [
      { text: "Avbryt", style: "cancel" },
      { text: "Slett", style: "destructive", onPress: onDelete },
    ]);
  };

  const renderSelectedItem = ({
    item: ex,
    drag,
    isActive,
    getIndex,
  }: RenderItemParams<Exercise>) => {
    const idx = getIndex?.() ?? 0;

    const tint =
      idx % 3 === 0
        ? styles.tintIndigo
        : idx % 3 === 1
        ? styles.tintCyan
        : styles.tintEmerald;

    return (
      <Pressable
        onLongPress={drag}
        delayLongPress={120}
        onPress={() => toggleExercise(ex.id)} // tap to remove
        style={({ pressed }) => [
          styles.selectedRow,
          tint,
          isActive && styles.selectedRowActive,
          pressed && !isActive && { opacity: 0.92 },
        ]}
      >
        <View style={styles.dragHandle}>
          <Ionicons name="reorder-two" size={18} color={colors.muted2} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={[typography.bodyBold, styles.selectedName]}
            numberOfLines={1}
          >
            {ex.name}
          </Text>

          {(ex.muscle || ex.equipment) && (
            <View style={styles.selectedMetaRow}>
              {!!ex.muscle && (
                <View style={styles.metaChip}>
                  <Text
                    style={[typography.bodyBlack, styles.metaChipText]}
                    numberOfLines={1}
                  >
                    {ex.muscle}
                  </Text>
                </View>
              )}
              {!!ex.equipment && (
                <View style={styles.metaChipSoft}>
                  <Text
                    style={[typography.bodyBlack, styles.metaChipText]}
                    numberOfLines={1}
                  >
                    {ex.equipment}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.removeIcon}>
          <Ionicons
            name="close-circle"
            size={20}
            color="rgba(226,232,240,0.80)"
          />
        </View>
      </Pressable>
    );
  };

  const renderExerciseItem = ({ item: ex }: ListRenderItemInfo<Exercise>) => {
    const isSelected = selectedSet.has(ex.id);

    return (
      <Pressable
        onPress={() => toggleExercise(ex.id)}
        style={({ pressed }) => [
          styles.exerciseItem,
          isSelected && styles.exerciseItemSelected,
          pressed && { opacity: 0.92 },
        ]}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={[typography.body, styles.exerciseName]}
            numberOfLines={1}
          >
            {ex.name}
          </Text>

          {(ex.muscle || ex.equipment) && (
            <View style={styles.exerciseMetaRow}>
              {!!ex.muscle && (
                <View style={styles.chip}>
                  <Text
                    style={[typography.bodyBlack, styles.chipText]}
                    numberOfLines={1}
                  >
                    {ex.muscle}
                  </Text>
                </View>
              )}
              {!!ex.equipment && (
                <View style={styles.chipSoft}>
                  <Text
                    style={[typography.bodyBlack, styles.chipText]}
                    numberOfLines={1}
                  >
                    {ex.equipment}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        <Ionicons
          name={isSelected ? "checkmark-circle" : "ellipse-outline"}
          size={22}
          color={
            isSelected ? "rgba(34,211,238,0.90)" : "rgba(100,116,139,0.90)"
          }
        />
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <SafeAreaView style={styles.overlay}>
          {/* Backdrop click closes */}
          <Pressable style={styles.backdrop} onPress={onClose} />

          {/* Sheet */}
          <View style={styles.sheet}>
            {/* Base */}
            <View pointerEvents="none" style={styles.base} />

            {/* Glass overlay */}
            <LinearGradient
              colors={[
                "rgba(255,255,255,0.055)",
                "rgba(255,255,255,0.020)",
                "rgba(255,255,255,0.00)",
              ]}
              start={{ x: 0.05, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            {/* Accent sheen */}
            <LinearGradient
              colors={[
                "rgba(99,102,241,0.14)",
                "rgba(34,211,238,0.10)",
                "rgba(255,255,255,0.00)",
              ]}
              start={{ x: 1, y: 0 }}
              end={{ x: 0.25, y: 1 }}
              style={styles.accentSheen}
              pointerEvents="none"
            />

            {/* Strokes */}
            <View pointerEvents="none" style={styles.outerStroke} />
            <View pointerEvents="none" style={styles.innerStroke} />

            {/* HEADER */}
            <View style={styles.header}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[typography.h2, styles.title]}>Rediger økt</Text>
                <Text style={[typography.body, styles.subtitle]}>
                  Dra øvelser for å endre rekkefølge. Endringer lagres
                  automatisk.
                </Text>
              </View>

              <View style={styles.headerActions}>
                <Pressable
                  onPress={confirmDelete}
                  style={({ pressed }) => [
                    styles.deleteBtn,
                    pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
                  ]}
                  hitSlop={10}
                >
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={colors.dangerText}
                  />
                  <Text style={[typography.bodyBlack, styles.deleteText]}>
                    Slett
                  </Text>
                </Pressable>

                <Pressable
                  onPress={onClose}
                  hitSlop={12}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    pressed && styles.iconPressed,
                  ]}
                >
                  <View style={styles.iconBtnInner}>
                    <Ionicons name="close" size={18} color={colors.text} />
                  </View>
                </Pressable>
              </View>
            </View>

            {/* MAIN LIST */}
            <FlatList
              data={filteredExercises}
              keyExtractor={(x) => x.id}
              renderItem={renderExerciseItem}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={
                <View>
                  {/* INPUTS */}
                  <Text style={[typography.body, styles.label]}>Navn</Text>
                  <View
                    style={[
                      styles.inputWrap,
                      focusField === "name" && styles.inputWrapFocus,
                    ]}
                  >
                    <TextInput
                      style={styles.input}
                      placeholder="F.eks. Push A"
                      placeholderTextColor={colors.muted2}
                      value={name}
                      onChangeText={setName}
                      returnKeyType="next"
                      onFocus={() => setFocusField("name")}
                      onBlur={() =>
                        setFocusField((f) => (f === "name" ? null : f))
                      }
                    />
                  </View>

                  <Text style={[typography.body, styles.label]}>
                    Dag / label
                  </Text>
                  <View
                    style={[
                      styles.inputWrap,
                      focusField === "day" && styles.inputWrapFocus,
                    ]}
                  >
                    <TextInput
                      style={styles.input}
                      placeholder="F.eks. Mandag · Push A"
                      placeholderTextColor={colors.muted2}
                      value={dayLabel}
                      onChangeText={setDayLabel}
                      returnKeyType="next"
                      onFocus={() => setFocusField("day")}
                      onBlur={() =>
                        setFocusField((f) => (f === "day" ? null : f))
                      }
                    />
                  </View>

                  <Text style={[typography.body, styles.label]}>
                    Beskrivelse
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
                      placeholder="Kort beskrivelse av økten..."
                      placeholderTextColor={colors.muted2}
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      returnKeyType="done"
                      onFocus={() => setFocusField("desc")}
                      onBlur={() =>
                        setFocusField((f) => (f === "desc" ? null : f))
                      }
                      textAlignVertical="top"
                    />
                  </View>

                  {/* SELECTED (DRAGGABLE) */}
                  <View style={styles.sectionHeaderRow}>
                    <Text style={[typography.body, styles.sectionTitle]}>
                      Øvelser i denne økten
                    </Text>
                    <View style={styles.sectionDivider} />
                  </View>

                  {selectedExercises.length === 0 ? (
                    <Text style={[typography.body, styles.emptySelectedText]}>
                      Ingen øvelser valgt enda. Trykk på øvelsene under for å
                      legge til.
                    </Text>
                  ) : (
                    <DraggableFlatList
                      data={selectedExercises}
                      keyExtractor={(item) => item.id}
                      onDragEnd={({ data }: DragEndParams<Exercise>) => {
                        const nextIds = data.map((x) => x.id);
                        setSelectedExerciseIds(nextIds);
                        saveToApiDebounced(nextIds); // ✅ autosave on reorder
                      }}
                      renderItem={renderSelectedItem}
                      scrollEnabled={false}
                      activationDistance={10}
                      containerStyle={styles.selectedList}
                    />
                  )}

                  {/* SEARCH */}
                  <View style={styles.sectionHeaderRow}>
                    <Text style={[typography.body, styles.sectionTitle]}>
                      Tilgjengelige øvelser
                    </Text>
                    <View style={styles.sectionDivider} />
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
                      color={colors.muted}
                    />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Søk etter navn, muskel eller utstyr..."
                      placeholderTextColor={colors.muted2}
                      value={search}
                      onChangeText={setSearch}
                      returnKeyType="search"
                      autoCorrect={false}
                      autoCapitalize="none"
                      onFocus={() => setFocusField("search")}
                      onBlur={() =>
                        setFocusField((f) => (f === "search" ? null : f))
                      }
                      clearButtonMode="while-editing"
                    />
                  </View>

                  {availableExercises.length === 0 && (
                    <Text style={[typography.body, styles.emptyText]}>
                      Du har ingen øvelser enda. Opprett dem under Øvelser-fanen.
                    </Text>
                  )}
                </View>
              }
              ListFooterComponent={<View style={{ height: 112 }} />}
            />

            {/* STICKY CTA */}
            <View style={styles.footer}>
              <Pressable
                onPress={handleSubmit}
                style={({ pressed }) => [
                  styles.ctaWrap,
                  pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
                ]}
              >
                <LinearGradient
                  colors={[colors.accentA, colors.accentB]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cta}
                >
                  <Ionicons name="save-outline" size={18} color="white" />
                  <Text style={[typography.bodyBold, styles.ctaText]}>
                    Lagre endringer
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.backdrop,
  },

  sheet: {
    flex: 1,
    marginTop: 22,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden",
  },

  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.cardSolid,
  },
  accentSheen: {
    position: "absolute",
    top: -48,
    right: -78,
    width: 260,
    height: 200,
    borderRadius: 999,
    opacity: 0.95,
  },
  outerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: colors.strokeOuter,
  },
  innerStroke: {
    position: "absolute",
    top: 1,
    left: 1,
    right: 1,
    bottom: 0,
    borderTopLeftRadius: 21,
    borderTopRightRadius: 21,
    borderWidth: 1,
    borderColor: colors.strokeInner,
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 2,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    letterSpacing: 0.12,
    fontWeight: "600",
  },
  subtitle: {
    marginTop: 4,
    color: colors.muted2,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: "500",
  },

  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.dangerStroke,
    backgroundColor: colors.dangerBg,
  },
  deleteText: {
    color: colors.dangerText,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.12,
  },

  iconBtn: { alignSelf: "flex-start" },
  iconBtnInner: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.iconBg,
    borderWidth: 1,
    borderColor: colors.iconStroke,
  },
  iconPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },

  label: {
    color: colors.muted,
    marginBottom: 8,
    marginTop: 14,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.18,
    textTransform: "uppercase",
  },

  inputWrap: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputStroke,
  },
  inputWrapFocus: {
    borderColor: colors.inputStrokeFocus,
  },
  input: {
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textareaWrap: {
    minHeight: 104,
  },
  textarea: {
    minHeight: 104,
    paddingTop: 12,
    textAlignVertical: "top",
  },

  sectionHeaderRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionTitle: {
    color: colors.muted2,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  sectionDivider: {
    height: 1,
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginTop: 2,
  },

  emptySelectedText: {
    marginTop: 10,
    color: colors.muted2,
    fontSize: 13,
    fontStyle: "italic",
  },

  selectedList: {
    marginTop: 10,
    gap: 8,
  },

  selectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: colors.itemBg,
    borderColor: colors.itemStroke,
  },
  selectedRowActive: {
    opacity: 0.95,
    transform: [{ scale: 1.01 }],
  },

  tintIndigo: {
    backgroundColor: colors.indigoBg,
    borderColor: colors.indigoStroke,
  },
  tintCyan: {
    backgroundColor: colors.cyanBg,
    borderColor: colors.cyanStroke,
  },
  tintEmerald: {
    backgroundColor: colors.emeraldBg,
    borderColor: colors.emeraldStroke,
  },

  dragHandle: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  selectedName: {
    color: colors.text,
    fontSize: 13.5,
  },
  selectedMetaRow: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  metaChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  metaChipSoft: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.045)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  metaChipText: {
    color: "rgba(226,232,240,0.82)",
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.1,
    maxWidth: 180,
  },

  removeIcon: {
    paddingLeft: 6,
  },

  searchWrap: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputStroke,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    paddingVertical: 0,
  },

  // Available list items
  exerciseItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.itemBg,
    borderWidth: 1,
    borderColor: colors.itemStroke,
    marginTop: 10,
  },
  exerciseItemSelected: {
    backgroundColor: colors.itemSelectedBg,
    borderColor: colors.itemSelectedStroke,
  },
  exerciseName: {
    color: colors.text,
    fontSize: 14.5,
  },
  exerciseMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 7,
    gap: 6,
  },
  chip: {
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipSoft: {
    backgroundColor: "rgba(255,255,255,0.045)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 10.5,
    color: "rgba(226,232,240,0.80)",
    fontWeight: "800",
    letterSpacing: 0.1,
    maxWidth: 160,
  },

  emptyText: {
    color: colors.muted2,
    fontSize: 13,
    fontStyle: "italic",
    paddingVertical: 10,
  },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: "rgba(10,16,30,0.92)",
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  ctaWrap: {
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.ctaStroke,
  },
  cta: {
    paddingVertical: 13,
    borderRadius: 999,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  ctaText: {
    color: "white",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.12,
  },
});
