import { generalStyles } from "@/config/styles";
import { newColors } from "@/config/theme";
import { typography } from "@/config/typography";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { ExerciseSessionSetsDto } from "@/api/exercise/exerchiseHistory";
import { Exercise } from "@/types/exercise";
import { sessionBest1RmFromSets } from "@/utils/exercise/sessionBest1RmFromSets";
import { MiniExerciseChart } from "./MiniExerciseChart";

import { DeleteExercise, UpdateExercise } from "@/api/exercise/exercise";
import { queryClient } from "@/config/queryClient";
import {
  ADVANCED_MUSCLE_FILTERS,
  MUSCLE_FILTERS,
  MuscleFilterValue,
} from "@/types/muscles";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

type MiniHistoryPoint = {
  performedAt: string;
  topSetWeight: number;
};

function formatKg(v: number | null) {
  return v != null ? `${v}kg` : "--";
}

function normalizeMuscle(v?: string | null): MuscleFilterValue {
  const s = (v ?? "").trim();
  if (!s) return "ALL";

  const hit = MUSCLE_FILTERS.find(
    (x) => x.value !== "ALL" && x.value.toLowerCase() === s.toLowerCase()
  );

  return hit?.value ?? "ALL";
}

function parseSpecificGroups(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof input === "string") {
    return input
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeSpecificToKnownAdvanced(values: string[]) {
  const known = new Set<string>(
    ADVANCED_MUSCLE_FILTERS.map((x) => x.value as string)
  );

  return Array.from(
    new Set(
      (values ?? [])
        .map((x) => x.trim())
        .filter(Boolean)
        .filter((x) => x !== "ALL")
        .filter((x) => known.has(x))
    )
  );
}

const ui = {
  // Card
  cardBg: "rgba(2,6,23,0.22)",
  cardStroke: "rgba(255,255,255,0.08)",
  cardStrokeInner: "rgba(255,255,255,0.05)",
  divider: "rgba(255,255,255,0.08)",

  // Text
  text: "rgba(255,255,255,0.94)",
  muted: "rgba(148,163,184,0.86)",
  muted2: "rgba(148,163,184,0.72)",

  // Accents
  accentA: "rgba(99,102,241,0.95)",
  accentB: "rgba(34,211,238,0.86)",
  accentSoft: "rgba(34,211,238,0.10)",

  // Pills
  pillBg: "rgba(255,255,255,0.05)",
  pillStroke: "rgba(255,255,255,0.10)",
  pillCyanBg: "rgba(34,211,238,0.12)",
  pillCyanStroke: "rgba(34,211,238,0.22)",
  pillIndigoBg: "rgba(99,102,241,0.12)",
  pillIndigoStroke: "rgba(99,102,241,0.22)",

  // Modal
  backdrop: "rgba(0,0,0,0.62)",
  modalBg: "rgba(10,16,30,0.96)",
  modalStroke: "rgba(255,255,255,0.10)",
  inputBg: "rgba(255,255,255,0.045)",
  inputStroke: "rgba(255,255,255,0.10)",
  dangerBg: "rgba(127,29,29,0.32)",
  dangerStroke: "rgba(248,113,113,0.55)",
  dangerText: "rgba(254,202,202,0.98)",
};

export default function ExerciseCard({
  exercise,
  sessions,
  onPress,
}: {
  exercise: Exercise;
  sessions: ExerciseSessionSetsDto[];
  onPress: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState<MuscleFilterValue>("ALL");
  const [equipment, setEquipment] = useState("");
  const [description, setDescription] = useState("");

  const isGlobal = exercise.userId == null;
  const canEdit = !isGlobal;

  const [specificGroups, setSpecificGroups] = useState<string[]>([]);

  const advancedSpecificList = useMemo(() => {
    const basic = new Set(
      MUSCLE_FILTERS.map((x) => x.value).filter((v) => v !== "ALL")
    );

    return ADVANCED_MUSCLE_FILTERS.filter(
      (x) => x.value !== "ALL" && !basic.has(x.value as any)
    );
  }, []);

  const displayMuscleChips = useMemo(() => {
    const fromDb = normalizeSpecificToKnownAdvanced(
      parseSpecificGroups((exercise as any).specificMuscleGroups)
    );

    if (fromDb.length > 0) return fromDb;

    const base = (exercise.muscle ?? "").trim();
    return base ? [base] : [];
  }, [exercise]);

  const displayEquipmentList = useMemo(() => {
    const eq = (exercise.equipment ?? "").trim();
    return eq ? [eq] : [];
  }, [exercise]);

  const vm = useMemo(() => {
    const sortedSessions = [...(sessions ?? [])].sort(
      (a, b) =>
        new Date(a.performedAtUtc).getTime() -
        new Date(b.performedAtUtc).getTime()
    );

    const points = sortedSessions
      .map((s) => {
        const oneRm = sessionBest1RmFromSets(s.sets ?? []);
        return { performedAt: s.performedAtUtc, oneRm };
      })
      .filter((p) => p.oneRm > 0);

    const oneRms = points.map((p) => p.oneRm);

    const last1Rm = oneRms.at(-1) ?? null;
    const first1Rm = oneRms.at(0) ?? null;
    const pr1Rm = oneRms.length ? Math.max(...oneRms) : null;

    let progress: number | null = null;
    if (first1Rm != null && last1Rm != null && oneRms.length >= 2) {
      progress = Number((last1Rm - first1Rm).toFixed(1));
    }

    const miniHistory: MiniHistoryPoint[] = points.map((p) => ({
      performedAt: p.performedAt,
      topSetWeight: p.oneRm,
    }));

    return {
      sortedSessionsCount: sortedSessions.length,
      last1Rm,
      pr1Rm,
      progress,
      miniHistory,
    };
  }, [sessions]);

  const progressColor =
    vm.progress != null && vm.progress !== 0
      ? vm.progress > 0
        ? newColors.text.accent
        : "#f97373"
      : ui.text;

  const openEdit = () => setEditOpen(true);
  const closeEdit = () => setEditOpen(false);

  useEffect(() => {
    if (!editOpen) return;

    setName(exercise.name ?? "");
    setMuscle(normalizeMuscle(exercise.muscle));
    setEquipment(exercise.equipment ?? "");
    setDescription(exercise.description ?? "");

    const parsed = normalizeSpecificToKnownAdvanced(
      parseSpecificGroups((exercise as any).specificMuscleGroups)
    );
    setSpecificGroups(parsed);
  }, [editOpen, exercise]);

  function toggleSpecific(v: string) {
    setSpecificGroups((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  }

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Mangler navn", "Skriv inn navn på øvelsen.");
      return;
    }

    try {
      setSaving(true);

      const cleanedSpecific = normalizeSpecificToKnownAdvanced(specificGroups);

      await UpdateExercise(exercise.id, {
        name: trimmed,
        description: description.trim() ? description.trim() : "",
        muscle: muscle === "ALL" ? "" : muscle,
        equipment: equipment.trim() ? equipment.trim() : "",
        specificMuscleGroups:
          cleanedSpecific.length > 0 ? cleanedSpecific.join(",") : "",
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["exercises"] }),
        queryClient.invalidateQueries({ queryKey: ["sessionDetails"] }),
        queryClient.invalidateQueries({ queryKey: ["completedWorkouts"] }),
      ]);
      closeEdit();
    } catch (err) {
      console.log("Feil ved oppdatering av øvelse", err);
      Alert.alert("Noe gikk galt", "Kunne ikke lagre endringene.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      "Slett øvelse?",
      "Dette kan ikke angres. Vil du slette øvelsen?",
      [
        { text: "Avbryt", style: "cancel" },
        { text: "Slett", style: "destructive", onPress: handleDelete },
      ]
    );
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await DeleteExercise(exercise.id);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["exercises"] }),
        queryClient.invalidateQueries({ queryKey: ["sessionDetails"] }),
        queryClient.invalidateQueries({ queryKey: ["completedWorkouts"] }),
      ]);
      closeEdit();
    } catch (err) {
      console.log("Feil ved sletting av øvelse", err);
      Alert.alert("Noe gikk galt", "Kunne ikke slette øvelsen.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.cardOuter,
          generalStyles.newCard,
          pressed && { opacity: 0.96, transform: [{ scale: 0.995 }] },
        ]}
      >
        {/* glass depth */}
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

        {/* accent sheen */}
        <LinearGradient
          colors={[
            "rgba(99,102,241,0.16)",
            "rgba(34,211,238,0.12)",
            "rgba(255,255,255,0.00)",
          ]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.25, y: 1 }}
          style={styles.accentGlow}
          pointerEvents="none"
        />

        {/* inner stroke */}
        <View pointerEvents="none" style={styles.innerStroke} />

        {/* TOP ROW */}
        <View style={styles.topRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.titleRow}>
              <Text
                style={[typography.bodyBold, styles.title]}
                numberOfLines={1}
              >
                {exercise.name}
              </Text>

              {/* ✅ edit only when user can edit */}
              {canEdit && (
                <Pressable
                  hitSlop={12}
                  onPress={(e: any) => {
                    e?.stopPropagation?.();
                    openEdit();
                  }}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    pressed && styles.iconPressed,
                  ]}
                >
                  <View style={styles.iconBtnInner}>
                    <Ionicons name="pencil-outline" size={14} color={ui.text} />
                  </View>
                </Pressable>
              )}
            </View>

            {/* chips */}
            {(displayMuscleChips.length > 0 ||
              displayEquipmentList.length > 0) && (
              <View style={styles.chipsWrap}>
                {displayMuscleChips.map((m, idx) => {
                  const variant = idx % 2 === 0 ? "indigo" : "cyan";
                  return (
                    <View
                      key={`m-${m}`}
                      style={[
                        styles.pill,
                        variant === "indigo"
                          ? styles.pillIndigo
                          : styles.pillCyan,
                      ]}
                    >
                      <Text
                        style={[typography.bodyBlack, styles.pillText]}
                        numberOfLines={1}
                      >
                        {m}
                      </Text>
                    </View>
                  );
                })}

                {displayEquipmentList.map((eq) => (
                  <View key={`eq-${eq}`} style={styles.pill}>
                    <Text
                      style={[typography.bodyBlack, styles.pillText]}
                      numberOfLines={1}
                    >
                      {eq}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* PR box */}
          <View style={styles.prBox}>
            <Text style={styles.prLabel}>Beste 1RM</Text>
            <Text style={styles.prValue}>{formatKg(vm.pr1Rm)}</Text>
            <Text style={styles.prHint}>(est.)</Text>
          </View>
        </View>

        {/* STATS */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Siste 1RM</Text>
            <Text style={styles.statValue}>{formatKg(vm.last1Rm)}</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Økter</Text>
            <Text style={styles.statValue}>
              {vm.sortedSessionsCount ?? "--"}
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Fremgang</Text>
            <Text style={[styles.statValue, { color: progressColor }]}>
              {vm.progress != null
                ? `${vm.progress > 0 ? "+" : ""}${vm.progress}kg`
                : "--"}
            </Text>
          </View>
        </View>

        <View style={styles.chartWrap}>
          <MiniExerciseChart data={vm.miniHistory} />
        </View>
      </Pressable>

      {/* EDIT MODAL */}
      <Modal
        visible={editOpen}
        animationType="fade"
        transparent
        onRequestClose={closeEdit}
      >
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            {/* modal glass */}
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
              colors={[
                "rgba(99,102,241,0.16)",
                "rgba(34,211,238,0.12)",
                "rgba(255,255,255,0.00)",
              ]}
              start={{ x: 1, y: 0 }}
              end={{ x: 0.25, y: 1 }}
              style={styles.modalSheen}
              pointerEvents="none"
            />
            <View pointerEvents="none" style={styles.modalInnerStroke} />

            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[typography.h2, styles.modalTitle]}>
                  Rediger øvelse
                </Text>
                <Text style={[typography.body, styles.modalSubtitle]}>
                  Oppdater navn, muskelgrupper og detaljer.
                </Text>
              </View>

              <Pressable
                onPress={closeEdit}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.iconBtn,
                  pressed && styles.iconPressed,
                ]}
              >
                <View style={styles.iconBtnInner}>
                  <Ionicons name="close" size={18} color={ui.text} />
                </View>
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 18 }}
            >
              <Text style={styles.sectionLabel}>Navn</Text>
              <View style={[styles.inputWrapper, generalStyles.newCard]}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="F.eks. Skrå benkpress"
                  placeholderTextColor={ui.muted2}
                  style={styles.input}
                  returnKeyType="done"
                />
              </View>

              <>
                <Text style={[styles.sectionLabel, { marginTop: 14 }]}>
                  Muskelgruppe
                </Text>

                <View style={styles.pillsRow}>
                  {MUSCLE_FILTERS.map((m) => {
                    const active = m.value === muscle;
                    return (
                      <Pressable
                        key={m.value}
                        onPress={() => setMuscle(m.value)}
                        style={({ pressed }) => [
                          styles.pillSelect,
                          active
                            ? styles.pillSelectActive
                            : styles.pillSelectInactive,
                          pressed && { opacity: 0.92 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.pillSelectText,
                            active
                              ? styles.pillSelectTextActive
                              : styles.pillSelectTextInactive,
                          ]}
                        >
                          {m.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>

              <>
                <Text style={[styles.sectionLabel, { marginTop: 14 }]}>
                  Spesifikke muskelgrupper
                </Text>

                <View style={styles.chipWrap}>
                  {advancedSpecificList.map((item) => {
                    const active = specificGroups.includes(item.value);

                    return (
                      <Pressable
                        key={item.value}
                        onPress={() => toggleSpecific(item.value)}
                        style={({ pressed }) => [
                          styles.multiChip,
                          active && styles.multiChipActive,
                          pressed && { opacity: 0.92 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.multiChipText,
                            active && styles.multiChipTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {!!specificGroups.length && (
                  <Text style={styles.selectedHint}>
                    Valgt: {specificGroups.join(", ")}
                  </Text>
                )}
              </>

              <Text style={[styles.sectionLabel, { marginTop: 14 }]}>
                Utstyr
              </Text>
              <View style={[styles.inputWrapper, generalStyles.newCard]}>
                <TextInput
                  value={equipment}
                  onChangeText={setEquipment}
                  placeholder="F.eks. Stang, Manualer, Maskin..."
                  placeholderTextColor={ui.muted2}
                  style={styles.input}
                  returnKeyType="done"
                />
              </View>

              <Text style={[styles.sectionLabel, { marginTop: 14 }]}>
                Beskrivelse
              </Text>
              <View style={[styles.textAreaWrapper, generalStyles.newCard]}>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Kort beskrivelse av øvelsen, teknikk eller fokus..."
                  placeholderTextColor={ui.muted2}
                  style={[
                    styles.input,
                    { height: 110, textAlignVertical: "top" },
                  ]}
                  multiline
                />
              </View>

              <View style={{ marginTop: 16, gap: 10 }}>
                <Pressable
                  onPress={handleSave}
                  disabled={saving || deleting}
                  style={({ pressed }) => [
                    styles.primaryButtonWrap,
                    (saving || deleting) && { opacity: 0.7 },
                    pressed && !(saving || deleting) && { opacity: 0.92 },
                  ]}
                >
                  <LinearGradient
                    colors={[ui.accentA, ui.accentB]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryButton}
                  >
                    <Ionicons name="save-outline" size={18} color="white" />
                    <Text style={styles.primaryButtonText}>
                      {saving ? "Lagrer..." : "Lagre endringer"}
                    </Text>
                  </LinearGradient>
                </Pressable>

                <Pressable
                  onPress={confirmDelete}
                  disabled={saving || deleting}
                  style={({ pressed }) => [
                    styles.deleteButton,
                    (saving || deleting) && { opacity: 0.7 },
                    pressed && !(saving || deleting) && { opacity: 0.92 },
                  ]}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={ui.dangerText}
                  />
                  <Text style={styles.deleteButtonText}>
                    {deleting ? "Sletter..." : "Slett øvelse"}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    marginTop: 12,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: ui.cardBg,
    borderWidth: 1,
    borderColor: ui.cardStroke,
    padding: 16,
  },
  innerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: ui.cardStrokeInner,
  },
  accentGlow: {
    position: "absolute",
    top: -44,
    right: -72,
    width: 240,
    height: 190,
    borderRadius: 999,
    opacity: 0.95,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    color: ui.text,
    fontSize: 16,
    letterSpacing: 0.12,
  },

  iconBtn: { alignSelf: "flex-start" },
  iconBtnInner: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  iconPressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },

  chipsWrap: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    maxWidth: "100%",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: ui.pillBg,
    borderWidth: 1,
    borderColor: ui.pillStroke,
  },
  pillIndigo: {
    backgroundColor: ui.pillIndigoBg,
    borderColor: ui.pillIndigoStroke,
  },
  pillCyan: {
    backgroundColor: ui.pillCyanBg,
    borderColor: ui.pillCyanStroke,
  },
  pillText: {
    color: "rgba(226,232,240,0.82)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.12,
  },

  prBox: {
    alignItems: "flex-end",
    paddingLeft: 8,
    marginTop: 2,
  },
  prLabel: {
    fontSize: 11,
    color: ui.muted2,
    fontWeight: "700",
    letterSpacing: 0.12,
  },
  prValue: {
    fontSize: 20,
    color: newColors.text.accent,
    marginTop: 3,
    fontWeight: "800",
    letterSpacing: 0.12,
  },
  prHint: {
    marginTop: 1,
    fontSize: 11,
    color: ui.muted2,
    fontWeight: "700",
  },

  statsRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: ui.divider,
  },
  statItem: { flex: 1 },
  statLabel: {
    fontSize: 11,
    color: ui.muted2,
    fontWeight: "700",
    letterSpacing: 0.12,
  },
  statValue: {
    marginTop: 4,
    fontSize: 14,
    color: ui.text,
    fontWeight: "800",
    letterSpacing: 0.1,
  },

  chartWrap: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },

  // Modal
  backdrop: {
    flex: 1,
    backgroundColor: ui.backdrop,
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    borderRadius: 24,
    backgroundColor: ui.modalBg,
    borderWidth: 1,
    borderColor: ui.modalStroke,
    overflow: "hidden",
    padding: 16,
    maxHeight: "92%",
  },
  modalSheen: {
    position: "absolute",
    top: -50,
    right: -86,
    width: 280,
    height: 220,
    borderRadius: 999,
    opacity: 0.95,
  },
  modalInnerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },

  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },
  modalTitle: {
    color: ui.text,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.12,
  },
  modalSubtitle: {
    marginTop: 4,
    color: ui.muted2,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: "500",
  },

  sectionLabel: {
    marginTop: 10,
    marginBottom: 8,
    fontSize: 12,
    color: ui.muted,
    fontWeight: "800",
    letterSpacing: 0.18,
    textTransform: "uppercase",
  },

  inputWrapper: {
    borderRadius: 16,
    backgroundColor: ui.inputBg,
    borderWidth: 1,
    borderColor: ui.inputStroke,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textAreaWrapper: {
    borderRadius: 16,
    backgroundColor: ui.inputBg,
    borderWidth: 1,
    borderColor: ui.inputStroke,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    color: ui.text,
    fontSize: 15,
  },

  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  pillSelect: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
  },
  pillSelectActive: {
    backgroundColor: ui.accentSoft,
    borderColor: "rgba(34,211,238,0.35)",
  },
  pillSelectInactive: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.10)",
  },
  pillSelectText: { fontSize: 13, letterSpacing: 0.1 },
  pillSelectTextActive: {
    color: ui.text,
    fontWeight: "800",
  },
  pillSelectTextInactive: {
    color: ui.muted2,
    fontWeight: "700",
  },

  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  multiChip: {
    maxWidth: "100%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  multiChipActive: {
    backgroundColor: "rgba(34,211,238,0.12)",
    borderColor: "rgba(34,211,238,0.28)",
  },
  multiChipText: {
    color: "rgba(226,232,240,0.72)",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.1,
  },
  multiChipTextActive: { color: ui.text },
  selectedHint: {
    marginTop: 8,
    color: ui.muted2,
    fontSize: 12,
    fontWeight: "600",
  },

  primaryButtonWrap: {
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  primaryButton: {
    paddingVertical: 13,
    borderRadius: 999,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  primaryButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.12,
  },

  deleteButton: {
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: ui.dangerBg,
    borderWidth: 1,
    borderColor: ui.dangerStroke,
  },
  deleteButtonText: {
    color: ui.dangerText,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.12,
  },
});
