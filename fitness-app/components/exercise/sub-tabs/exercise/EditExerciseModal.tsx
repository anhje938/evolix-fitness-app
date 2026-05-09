import {
  MODAL_MAX_HEIGHT,
  modalConfirmButtonColors,
  modalGradientColors,
  modalTheme,
} from "@/config/modalTheme";
import { ADVANCED_MUSCLE_FILTERS } from "@/types/muscles";
import type { Exercise } from "@/types/exercise";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
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
import { useWorkoutSession } from "@/context/workoutSessionContext";
import { queryClient } from "@/config/queryClient";
import DumbbellIcon from "../../../../assets/icons/dumbbell-white.svg";
import XIcon from "../../../../assets/icons/white-x.svg";
import { MuscleFilterBar } from "../../MuscleFilterBar";
import { newColors } from "@/config/theme";
import { DeleteExercise, UpdateExercise } from "@/api/exercise/exercise";

type Props = {
  visible: boolean;
  exercise: Exercise;
  onClose: () => void;
};

export function EditExerciseModal({ visible, exercise, onClose }: Props) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState<string>("ALL");
  const [equipment, setEquipment] = useState("");
  const [description, setDescription] = useState("");
  const [specificGroups, setSpecificGroups] = useState<string[]>([]);
  const { updateExerciseDetails } = useWorkoutSession();

  const advancedSpecificList = useMemo(
    () => ADVANCED_MUSCLE_FILTERS.filter((x) => x.value !== "ALL"),
    []
  );

  useEffect(() => {
    if (!visible) return;

    setName(exercise.name ?? "");
    setMuscle(exercise.muscle ?? "ALL");
    setEquipment(exercise.equipment ?? "");
    setDescription(exercise.description ?? "");

    const specificGroupsFromExercise = Array.isArray(
      exercise.specificMuscleGroups
    )
      ? exercise.specificMuscleGroups
      : exercise.specificMuscleGroups
          ?.split(",")
          .map((x: string) => x.trim())
          .filter(Boolean) ?? [];
    setSpecificGroups(specificGroupsFromExercise);
  }, [exercise, visible]);

  function toggleSpecific(value: string) {
    if (saving || deleting) return;

    setSpecificGroups((prev) =>
      prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value]
    );
  }

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Mangler navn", "Skriv inn navn på øvelsen.");
      return;
    }

    try {
      setSaving(true);
      const cleanedSpecific = specificGroups.filter((x) => x && x !== "ALL");

      const updatedExercise = await UpdateExercise(exercise.id, {
        name: name.trim(),
        description: description.trim() || "",
        muscle: muscle === "ALL" ? "" : muscle,
        equipment: equipment.trim() || "",
        specificMuscleGroups: cleanedSpecific.length
          ? cleanedSpecific.join(",")
          : "",
      });

      updateExerciseDetails({
        exerciseId: exercise.id,
        name: updatedExercise.name ?? name.trim(),
        muscle: updatedExercise.muscle ?? (muscle === "ALL" ? null : muscle),
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["exercises"] }),
        queryClient.invalidateQueries({ queryKey: ["sessionDetails"] }),
        queryClient.invalidateQueries({ queryKey: ["completedWorkouts"] }),
      ]);

      onClose();
    } catch (err) {
      console.log("Feil ved oppdatering av øvelse", err);
      Alert.alert("Noe gikk galt", "Kunne ikke lagre endringene.");
    } finally {
      setSaving(false);
    }
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

      onClose();
    } catch (err) {
      console.log("Feil ved sletting av øvelse", err);
      Alert.alert("Noe gikk galt", "Kunne ikke slette øvelsen.");
    } finally {
      setDeleting(false);
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

  if (!visible) return null;

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={modalGradientColors}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.95, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View pointerEvents="none" style={styles.orbTop} />
          <View pointerEvents="none" style={styles.orbBottom} />

          {/* Header */}
          <View style={styles.header}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <DumbbellIcon
                height={25}
                width={25}
                fill={newColors.primary.light}
                stroke={newColors.primary.light}
              />
              <Text style={styles.title}>Rediger øvelse</Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              disabled={saving || deleting}
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
            {/* Navn */}
            <Text style={styles.label}>Navn</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              editable={!saving && !deleting}
              placeholder="F.eks. Skrå benkpress"
              placeholderTextColor="rgba(148,163,184,0.8)"
            />

            {/* Primær muskelgruppe */}
            <Text style={styles.label}>Primær muskelgruppe</Text>
            <MuscleFilterBar
              value={muscle}
              onChange={setMuscle}
              preset="basic"
            />

            {/* Spesifikke muskelgrupper */}
            <Text style={styles.label}>Spesifikke muskelgrupper</Text>
            <View style={styles.chipWrap}>
              {advancedSpecificList.map((item) => {
                const active = specificGroups.includes(item.value);
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => toggleSpecific(item.value)}
                    style={[styles.multiChip, active && styles.multiChipActive]}
                  >
                    <Text
                      style={[
                        styles.multiChipText,
                        active && styles.multiChipTextActive,
                      ]}
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

            {/* Utstyr */}
            <Text style={styles.label}>Utstyr</Text>
            <TextInput
              style={styles.input}
              value={equipment}
              onChangeText={setEquipment}
              editable={!saving && !deleting}
              placeholder="F.eks. Stang, manualer, maskin..."
              placeholderTextColor="rgba(148,163,184,0.8)"
            />

            {/* Beskrivelse */}
            <Text style={styles.label}>Beskrivelse</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={description}
              onChangeText={setDescription}
              multiline
              editable={!saving && !deleting}
              placeholder="Kort beskrivelse av øvelsen, teknikk eller fokus..."
              placeholderTextColor="rgba(148,163,184,0.8)"
            />
          </ScrollView>

          {/* Actions */}
          <TouchableOpacity
            style={[styles.buttonWrapper, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving || deleting}
          >
            <LinearGradient
              colors={modalConfirmButtonColors}
              style={styles.button}
            >
              <Ionicons name="save-outline" size={18} color="white" />
              <Text style={styles.buttonText}>
                {saving ? "Lagrer..." : "Lagre endringer"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteButton, deleting && styles.buttonDisabled]}
            onPress={confirmDelete}
            disabled={saving || deleting}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color="rgba(254,202,202,0.98)"
            />
            <Text style={styles.deleteButtonText}>
              {deleting ? "Sletter..." : "Slett øvelse"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
  input: {
    backgroundColor: modalTheme.surfaceMuted,
    borderRadius: 12,
    padding: 12,
    color: modalTheme.textStrong,
    fontSize: 13,
    borderWidth: 1,
    borderColor: modalTheme.inputBorder,
  },
  textarea: {
    height: 90,
    textAlignVertical: "top",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
  },
  multiChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginRight: 8,
    marginBottom: 8,
  },
  multiChipActive: {
    backgroundColor: "rgba(59, 130, 246, 0.28)",
    borderColor: "rgba(59, 130, 246, 0.45)",
  },
  multiChipText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "500",
  },
  multiChipTextActive: {
    color: "white",
  },
  selectedHint: {
    marginTop: 4,
    color: newColors.primary.light,
    fontSize: 12,
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
