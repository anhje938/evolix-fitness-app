// components/exercise/sub-tabs/program/EditProgramModal.tsx
import { typography } from "@/config/typography";
import type { Workout } from "@/types/exercise";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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

import CreateProgramModal from "./CreateProgramModal";

type Props = {
  visible: boolean;
  onClose: () => void;

  initialName: string;
  initialWorkoutIds: string[];
  availableWorkouts: Workout[];

  onSubmit: (data: { name: string; workoutIds: string[] }) => void;

  onDelete: () => void;

  onCreateWorkout: (name: string) => Promise<Workout>;

  isBusy?: boolean;
};

const colors = {
  backdrop: "rgba(0,0,0,0.66)",

  sheet: "rgba(10,16,30,0.96)",
  strokeOuter: "rgba(255,255,255,0.10)",
  strokeInner: "rgba(255,255,255,0.05)",
  divider: "rgba(255,255,255,0.08)",

  text: "rgba(255,255,255,0.94)",
  muted: "rgba(148,163,184,0.86)",
  muted2: "rgba(148,163,184,0.72)",

  accentA: "rgba(99,102,241,0.94)", // indigo
  accentB: "rgba(34,211,238,0.78)", // cyan

  inputBg: "rgba(255,255,255,0.045)",
  inputStroke: "rgba(255,255,255,0.10)",
  inputStrokeFocus: "rgba(34,211,238,0.26)",

  chipBg: "rgba(255,255,255,0.05)",
  chipStroke: "rgba(255,255,255,0.10)",

  listItemBg: "rgba(255,255,255,0.035)",
  listItemStroke: "rgba(255,255,255,0.09)",
  listItemPressed: "rgba(255,255,255,0.028)",

  selectedBg: "rgba(34,211,238,0.075)",
  selectedStroke: "rgba(34,211,238,0.24)",

  iconBg: "rgba(255,255,255,0.05)",
  iconStroke: "rgba(255,255,255,0.10)",

  dangerBg: "rgba(127,29,29,0.35)",
  dangerStroke: "rgba(248,113,113,0.60)",
  dangerText: "rgba(254,202,202,0.98)",

  errorBg: "rgba(248,113,113,0.10)",
  errorStroke: "rgba(248,113,113,0.25)",

  ctaStroke: "rgba(255,255,255,0.18)",
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

  // optional: debounce submit if you want autosave later (kept ready)
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
    const m = new Map<string, Workout>();
    (availableWorkouts ?? []).forEach((w) => m.set(w.id, w));
    return m;
  }, [availableWorkouts]);

  const selectedWorkouts = useMemo(() => {
    return selectedWorkoutIds
      .map((id) => workoutById.get(id))
      .filter((x): x is Workout => !!x);
  }, [selectedWorkoutIds, workoutById]);

  const unselectedWorkouts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = (availableWorkouts ?? []).filter(
      (w) => !selectedSet.has(w.id)
    );
    if (!q) return base;

    return base.filter((w) => {
      const n = (w.name ?? "").toLowerCase();
      const d = (w.description ?? "").toLowerCase();
      const day = (w.dayLabel ?? "").toLowerCase();
      return n.includes(q) || d.includes(q) || day.includes(q);
    });
  }, [availableWorkouts, selectedSet, search]);

  const toggleWorkout = (id: string) => {
    setSelectedWorkoutIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
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

  const handleCreateWorkout = async (workoutName: string) => {
    const trimmed = (workoutName ?? "").trim();
    if (!trimmed) return;

    setLocalError(null);
    setCreatingWorkout(true);

    try {
      const created = await onCreateWorkout(trimmed);

      setSelectedWorkoutIds((prev) => {
        if (prev.includes(created.id)) return prev;
        return [...prev, created.id];
      });

      setOpenCreateWorkout(false);
    } catch (e) {
      setLocalError(
        e instanceof Error ? e.message : "Kunne ikke opprette økt."
      );
    } finally {
      setCreatingWorkout(false);
    }
  };

  const renderSelectedRow = ({
    item: w,
    drag,
    isActive,
  }: RenderItemParams<Workout>) => {
    return (
      <Pressable
        onLongPress={drag}
        delayLongPress={120}
        onPress={() => toggleWorkout(w.id)}
        disabled={!canInteract}
        style={({ pressed }) => [
          styles.rowCard,
          styles.rowSelected,
          isActive && styles.rowActive,
          pressed && !isActive && styles.rowPressed,
        ]}
      >
        <View style={styles.dragHandle}>
          <Ionicons name="reorder-two" size={18} color={colors.muted2} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={[typography.bodyBold, styles.rowTitle]}
            numberOfLines={1}
          >
            {w.name}
          </Text>

          {(w.dayLabel || w.description) && (
            <Text style={[typography.body, styles.rowSub]} numberOfLines={2}>
              {w.dayLabel || w.description}
            </Text>
          )}
        </View>

        <Ionicons
          name="checkmark-circle"
          size={22}
          color="rgba(34,211,238,0.92)"
        />
      </Pressable>
    );
  };

  const renderUnselectedItem = ({ item: w }: ListRenderItemInfo<Workout>) => {
    const sub = w.dayLabel || w.description;

    return (
      <Pressable
        onPress={() => toggleWorkout(w.id)}
        disabled={!canInteract}
        style={({ pressed }) => [styles.rowCard, pressed && styles.rowPressed]}
      >
        <View style={styles.rowIconCircle}>
          <Ionicons name="barbell-outline" size={14} color={colors.muted} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={[typography.bodyBold, styles.rowTitle]}
            numberOfLines={1}
          >
            {w.name}
          </Text>

          {!!sub && (
            <Text style={[typography.body, styles.rowSub]} numberOfLines={2}>
              {sub}
            </Text>
          )}
        </View>

        <Ionicons
          name="ellipse-outline"
          size={22}
          color="rgba(100,116,139,0.92)"
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
          <Pressable style={styles.backdrop} onPress={onClose} />

          <View style={styles.sheet}>
            {/* base */}
            <View pointerEvents="none" style={styles.base} />

            {/* glass depth */}
            <LinearGradient
              colors={[
                "rgba(255,255,255,0.060)",
                "rgba(255,255,255,0.020)",
                "rgba(255,255,255,0.00)",
              ]}
              start={{ x: 0.05, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            {/* accent sheen */}
            <LinearGradient
              colors={[
                "rgba(99,102,241,0.16)",
                "rgba(34,211,238,0.12)",
                "rgba(255,255,255,0.00)",
              ]}
              start={{ x: 1, y: 0 }}
              end={{ x: 0.25, y: 1 }}
              style={styles.accentSheen}
              pointerEvents="none"
            />

            <View pointerEvents="none" style={styles.outerStroke} />
            <View pointerEvents="none" style={styles.innerStroke} />

            {/* HEADER */}
            <View style={styles.header}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[typography.h2, styles.title]}>
                  Rediger program
                </Text>
                <Text style={[typography.body, styles.subtitle]}>
                  Endre navn og velg hvilke økter som inngår. Dra for å endre
                  rekkefølge.
                </Text>
              </View>

              <View style={styles.headerActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.deleteBtn,
                    pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
                  ]}
                  onPress={confirmDelete}
                  disabled={!canInteract}
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
                  disabled={!canInteract}
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

            <FlatList
              data={unselectedWorkouts}
              keyExtractor={(x) => x.id}
              renderItem={renderUnselectedItem}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={
                <View style={styles.sectionGap}>
                  {/* INPUT */}
                  <View>
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
                        placeholderTextColor={colors.muted2}
                        value={name}
                        onChangeText={setName}
                        returnKeyType="done"
                        editable={canInteract}
                        onFocus={() => setFocusField("name")}
                        onBlur={() =>
                          setFocusField((f) => (f === "name" ? null : f))
                        }
                      />
                    </View>

                    {!!localError && (
                      <View style={styles.errorBox}>
                        <Text style={[typography.body, { color: colors.text }]}>
                          {localError}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* SELECTED (draggable) */}
                  <View>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle}>
                        Økter i programmet
                      </Text>
                      <View style={styles.sectionDivider} />
                    </View>

                    {selectedWorkouts.length === 0 ? (
                      <Text style={[typography.body, styles.emptySelectedText]}>
                        Ingen økter valgt enda. Trykk på økter under for å legge
                        dem til.
                      </Text>
                    ) : (
                      <DraggableFlatList
                        data={selectedWorkouts}
                        keyExtractor={(item) => item.id}
                        onDragEnd={({ data }: DragEndParams<Workout>) => {
                          const nextIds = data.map((x) => x.id);
                          setSelectedWorkoutIds(nextIds);
                        }}
                        renderItem={renderSelectedRow}
                        scrollEnabled={false}
                        activationDistance={10}
                        containerStyle={styles.selectedList}
                      />
                    )}
                  </View>

                  {/* AVAILABLE HEADER + CREATE */}
                  <View>
                    <View style={styles.availableHeader}>
                      <View style={styles.sectionHeaderRowTight}>
                        <Text style={styles.sectionTitle}>
                          Tilgjengelige økter
                        </Text>
                        <View style={styles.sectionDivider} />
                      </View>

                      <Pressable
                        onPress={() => setOpenCreateWorkout(true)}
                        disabled={!canInteract}
                        style={({ pressed }) => [
                          styles.createBtn,
                          pressed && {
                            opacity: 0.92,
                            transform: [{ scale: 0.99 }],
                          },
                        ]}
                      >
                        <Ionicons
                          name="add-circle-outline"
                          size={18}
                          color="rgba(224,242,254,0.95)"
                        />
                        <Text style={styles.createText}>
                          {creatingWorkout ? "Oppretter..." : "Ny økt"}
                        </Text>
                      </Pressable>
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
                        placeholder="Søk i økter..."
                        placeholderTextColor={colors.muted2}
                        value={search}
                        onChangeText={setSearch}
                        editable={canInteract}
                        autoCorrect={false}
                        autoCapitalize="none"
                        returnKeyType="search"
                        onFocus={() => setFocusField("search")}
                        onBlur={() =>
                          setFocusField((f) => (f === "search" ? null : f))
                        }
                        clearButtonMode="while-editing"
                      />
                    </View>

                    {availableWorkouts.length === 0 && (
                      <Text style={[typography.body, styles.emptyText]}>
                        Du har ingen økter enda. Opprett dem i Økter-fanen.
                      </Text>
                    )}
                  </View>
                </View>
              }
              ListFooterComponent={<View style={{ height: 118 }} />}
            />

            {/* SAVE CTA (sticky) */}
            <View style={styles.footer}>
              <Pressable
                onPress={handleSubmit}
                disabled={!canInteract}
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
                  {isBusy || creatingWorkout ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={18} color="white" />
                      <Text style={[typography.bodyBold, styles.ctaText]}>
                        Lagre endringer
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </View>

            {/* OVERLAY MODAL: "Ny økt" */}
            <CreateProgramModal
              visible={openCreateWorkout}
              onClose={() => setOpenCreateWorkout(false)}
              onSubmit={handleCreateWorkout}
            />
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "transparent" },
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

  base: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.sheet },

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
  iconPressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },

  listContent: { paddingHorizontal: 16, paddingBottom: 10 },

  sectionGap: { paddingBottom: 6, gap: 18 },

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
  inputWrapFocus: { borderColor: colors.inputStrokeFocus },
  input: {
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  errorBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.errorStroke,
    backgroundColor: colors.errorBg,
  },

  sectionHeaderRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionHeaderRowTight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
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

  selectedList: { marginTop: 10, gap: 10 },

  rowCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 3,
    borderRadius: 16,
    backgroundColor: colors.listItemBg,
    borderWidth: 1,
    borderColor: colors.listItemStroke,
  },
  rowSelected: {
    backgroundColor: colors.selectedBg,
    borderColor: colors.selectedStroke,
  },
  rowPressed: { backgroundColor: colors.listItemPressed },
  rowActive: { opacity: 0.95, transform: [{ scale: 1.01 }] },

  dragHandle: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.chipBg,
    borderWidth: 1,
    borderColor: colors.chipStroke,
    marginTop: 1,
  },

  rowIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.chipBg,
    borderWidth: 1,
    borderColor: colors.chipStroke,
    marginTop: 1,
  },

  rowTitle: { color: colors.text, fontSize: 14.5 },
  rowSub: {
    marginTop: 4,
    color: colors.muted2,
    fontSize: 12.5,
    lineHeight: 16,
  },

  availableHeader: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  createBtn: {
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
  createText: {
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
