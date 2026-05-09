import {
  MODAL_MAX_HEIGHT,
  modalConfirmButtonColors,
  modalGradientColors,
  modalTheme,
} from "@/config/modalTheme";
import { newColors } from "@/config/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
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
import DumbbellIcon from "../../../../assets/icons/dumbbell-white.svg";
import XIcon from "../../../../assets/icons/white-x.svg";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description?: string;
    dayLabel?: string;
  }) => void | Promise<void>;
};

export function AddWorkoutModal({ visible, onClose, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dayLabel, setDayLabel] = useState("");

  useEffect(() => {
    if (!visible) return;

    setName("");
    setDescription("");
    setDayLabel("");
  }, [visible]);

  const canSubmit = !!name.trim();

  const handleSubmit = async () => {
    if (!canSubmit) return;

    await onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      dayLabel: dayLabel.trim() || undefined,
    });
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={() => {}}>
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
              <Text style={styles.title}>Ny økt</Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <XIcon height={18} width={18} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.label}>Navn</Text>
            <TextInput
              style={styles.input}
              placeholder="F.eks. Push A"
              placeholderTextColor="rgba(148,163,184,0.8)"
              value={name}
              onChangeText={setName}
              returnKeyType="next"
            />

            <Text style={styles.label}>Dag / etikett</Text>
            <TextInput
              style={styles.input}
              placeholder="F.eks. Mandag, Pull B..."
              placeholderTextColor="rgba(148,163,184,0.8)"
              value={dayLabel}
              onChangeText={setDayLabel}
              returnKeyType="next"
            />

            <Text style={styles.label}>Beskrivelse</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Kort beskrivelse av økten..."
              placeholderTextColor="rgba(148,163,184,0.8)"
              value={description}
              onChangeText={setDescription}
              returnKeyType="done"
              multiline
              textAlignVertical="top"
            />
          </ScrollView>

          <TouchableOpacity
            style={[styles.buttonWrapper, !canSubmit && styles.buttonDisabled]}
            onPress={() => {
              void handleSubmit();
            }}
            disabled={!canSubmit}
          >
            <LinearGradient
              colors={modalConfirmButtonColors}
              style={styles.button}
            >
              <Ionicons name="save-outline" size={18} color="white" />
              <Text style={styles.buttonText}>Opprett økt</Text>
            </LinearGradient>
          </TouchableOpacity>

          {!canSubmit && (
            <Text style={styles.helperText}>
              Skriv inn et navn for å opprette.
            </Text>
          )}
        </Pressable>
      </Pressable>
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
    justifyContent: "space-between",
    width: "40%",
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
  helperText: {
    marginTop: 10,
    color: modalTheme.muted,
    fontSize: 12,
    textAlign: "center",
  },
});
