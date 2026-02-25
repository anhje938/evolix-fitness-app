import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
};

export default function CreateProgramModal({
  visible,
  onClose,
  onSubmit,
}: Props) {
  const [name, setName] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit(name);
    setName("");
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.title}>Nytt program</Text>

            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#ccc" />
            </TouchableOpacity>
          </View>

          {/* INPUT: NAVN */}
          <Text style={styles.label}>Programnavn</Text>
          <TextInput
            style={styles.input}
            placeholder="F.eks. Push Pull Legs"
            placeholderTextColor="#6b7280"
            value={name}
            onChangeText={setName}
            returnKeyType="done"
          />

          {/* BUTTON */}
          <TouchableOpacity style={styles.buttonWrapper} onPress={handleSubmit}>
            <LinearGradient
              colors={["#3A7BD5", "#00d2ff"]}
              style={styles.button}
            >
              <Ionicons name="save-outline" size={18} color="white" />
              <Text style={styles.buttonText}>Opprett program</Text>
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
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    color: "white",
    fontSize: 22,
    fontWeight: "600",
  },
  label: {
    color: "#cbd5e1",
    marginBottom: 6,
    fontSize: 14,
  },
  input: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 14,
    color: "white",
    fontSize: 16,
  },
  buttonWrapper: {
    marginTop: 18,
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
