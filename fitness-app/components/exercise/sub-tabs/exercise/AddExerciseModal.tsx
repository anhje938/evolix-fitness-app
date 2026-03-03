import { ADVANCED_MUSCLE_FILTERS } from "@/types/muscles";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MuscleFilterBar } from "../../MuscleFilterBar";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description?: string;
    muscle?: string;
    equipment?: string;
    specificMuscleGroups?: string; // ✅ NY
  }) => void;
};

export function AddExerciseModal({ visible, onClose, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<string>("ALL");
  const [equipment, setEquipment] = useState("");
  const [specificGroups, setSpecificGroups] = useState<string[]>([]);

  // Ta bort ALL fra advanced chips-lista
  const advancedSpecificList = useMemo(
    () => ADVANCED_MUSCLE_FILTERS.filter((x) => x.value !== "ALL"),
    []
  );

  function toggleSpecific(v: string) {
    setSpecificGroups((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  }

  // Reset når vi åpner/lukker
  useEffect(() => {
    if (visible) {
      setName("");
      setDescription("");
      setSelectedMuscle("ALL");
      setEquipment("");
      setSpecificGroups([]); // ✅ reset
    }
  }, [visible]);

  const handleSubmit = () => {
    if (!name.trim()) return;

    const muscleToSend = selectedMuscle === "ALL" ? undefined : selectedMuscle;

    // ✅ lagre som CSV-string i backend-feltet "SpecificMuscleGroups"
    const specificToSend =
      specificGroups.length > 0 ? specificGroups.join(",") : undefined;

    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      muscle: muscleToSend,
      equipment: equipment.trim() || undefined,
      specificMuscleGroups: specificToSend,
    });
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.title}>Ny øvelse</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#ccc" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ maxHeight: 440 }}
            showsVerticalScrollIndicator={false}
          >
            {/* NAVN */}
            <Text style={styles.label}>Navn</Text>
            <TextInput
              style={styles.input}
              placeholder="F.eks. Skrå benkpress"
              placeholderTextColor="rgba(148,163,184,0.8)"
              value={name}
              onChangeText={setName}
              returnKeyType="done"
            />

            {/* Primær muskelgruppe */}
            <View>
              <Text style={styles.label}>Primær muskelgruppe</Text>
              <MuscleFilterBar
                value={selectedMuscle}
                onChange={setSelectedMuscle}
                preset="basic"
              />
            </View>

            {/* Spesifikke muskelgrupper */}
            <>
              <Text style={styles.label}>Spesifikke muskelgrupper</Text>

              <View style={styles.chipWrap}>
                {advancedSpecificList.map((item) => {
                  const active = specificGroups.includes(item.value);

                  return (
                    <Pressable
                      key={item.value}
                      onPress={() => toggleSpecific(item.value)}
                      style={[
                        styles.multiChip,
                        active && styles.multiChipActive,
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

            {/* UTSTYR */}
            <Text style={styles.label}>Utstyr</Text>
            <TextInput
              style={styles.input}
              placeholder="F.eks. Stang, Manualer, Maskin..."
              placeholderTextColor="rgba(148,163,184,0.8)"
              value={equipment}
              onChangeText={setEquipment}
              returnKeyType="done"
            />

            {/* BESKRIVELSE */}
            <Text style={styles.label}>Beskrivelse</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Kort beskrivelse av øvelsen, teknikk eller fokus..."
              placeholderTextColor="rgba(148,163,184,0.8)"
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </ScrollView>

          {/* KNAPP */}
          <TouchableOpacity style={styles.buttonWrapper} onPress={handleSubmit}>
            <LinearGradient
              colors={["#3A7BD5", "#00d2ff"]}
              style={styles.button}
            >
              <Ionicons name="save-outline" size={18} color="white" />
              <Text style={styles.buttonText}>Opprett øvelse</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  container: {
    backgroundColor: "#111827",
    width: "100%",
    maxHeight: "88%",
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    color: "white",
    fontSize: 22,
    fontWeight: "600",
  },
  label: {
    color: "#cbd5e1",
    marginBottom: 6,
    marginTop: 10,
    fontSize: 14,
  },
  input: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 12,
    color: "white",
    fontSize: 15,
  },
  textarea: {
    height: 90,
    textAlignVertical: "top",
  },

  // ✅ advanced chip grid
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
  },
  multiChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(14, 30, 50, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
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
    fontWeight: "600",
  },
  multiChipTextActive: {
    color: "white",
  },
  selectedHint: {
    marginTop: 4,
    color: "rgba(148,163,184,0.9)",
    fontSize: 12,
  },

  buttonWrapper: {
    marginTop: 14,
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
    fontWeight: "600",
  },
});
