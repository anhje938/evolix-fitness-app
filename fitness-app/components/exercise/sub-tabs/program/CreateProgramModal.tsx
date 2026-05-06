import { MODAL_MAX_HEIGHT, modalGradientColors, modalTheme } from "@/config/modalTheme";
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
          <LinearGradient
            pointerEvents="none"
            colors={modalGradientColors}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.95, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View pointerEvents="none" style={styles.orbTop} />
          <View pointerEvents="none" style={styles.orbBottom} />
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.title}>Nytt program</Text>

            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons
                name="close"
                size={20}
                color={modalTheme.textStrong}
              />
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
    backgroundColor: modalTheme.backdrop,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 24,
  },
  container: {
    backgroundColor: modalTheme.surface,
    width: "100%",
    maxWidth: 560,
    maxHeight: MODAL_MAX_HEIGHT,
    borderRadius: 28,
    padding: 22,
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
    marginBottom: 20,
  },
  title: {
    color: modalTheme.text,
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: modalTheme.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTheme.borderSoft,
  },
  label: {
    color: modalTheme.label,
    marginBottom: 6,
    fontSize: 14,
  },
  input: {
    backgroundColor: modalTheme.surfaceMuted,
    borderRadius: 12,
    padding: 14,
    color: modalTheme.textStrong,
    fontSize: 16,
    borderWidth: 1,
    borderColor: modalTheme.inputBorder,
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
