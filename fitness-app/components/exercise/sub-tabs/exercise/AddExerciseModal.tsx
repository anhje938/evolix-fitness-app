import {
  MODAL_MAX_HEIGHT,
  modalConfirmButtonColors,
  modalGradientColors,
  modalTheme,
} from "@/config/modalTheme";
import { useTranslation } from "@/i18n/translations";
import {
  ADVANCED_MUSCLE_FILTERS,
  getLocalizedMuscleFilters,
  getMuscleLabel,
} from "@/types/muscles";
import type { CreateExercisePayload } from "@/types/exercise";
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
import XIcon from "../../../../assets/icons/white-x.svg";
import DumbbellIcon from "../../../../assets/icons/dumbbell-white.svg";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateExercisePayload) => void | Promise<void>;
  initialName?: string;
  isSubmitting?: boolean;
  useModal?: boolean;
};

const exerciseModalColors = {
  backdrop: modalTheme.backdrop,
  container: modalTheme.surface,
  surface: modalTheme.surfaceMuted,
  input: modalTheme.surfaceMuted,
  text: modalTheme.text,
  textStrong: modalTheme.textStrong,
  muted: modalTheme.label,
  muted2: modalTheme.muted,
  border: modalTheme.border,
  borderSoft: modalTheme.borderSoft,
  accent: "#38bdf8",
  accentDim: "rgba(56,189,248,0.24)",
  accentBg: "rgba(56,189,248,0.12)",
};

export function AddExerciseModal({
  visible,
  onClose,
  onSubmit,
  initialName,
  isSubmitting = false,
  useModal = true,
}: Props) {
  const { t, language } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<string>("ALL");
  const [equipment, setEquipment] = useState("");
  const [specificGroups, setSpecificGroups] = useState<string[]>([]);

  const advancedSpecificList = useMemo(
    () =>
      getLocalizedMuscleFilters(ADVANCED_MUSCLE_FILTERS, language).filter(
        (x) => x.value !== "ALL"
      ),
    [language]
  );

  function toggleSpecific(value: string) {
    if (isSubmitting) return;

    setSpecificGroups((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  }

  useEffect(() => {
    if (!visible) return;

    setName(initialName?.trim() ?? "");
    setDescription("");
    setSelectedMuscle("ALL");
    setEquipment("");
    setSpecificGroups([]);
  }, [initialName, visible]);

  const handleSubmit = async () => {
    if (isSubmitting || !name.trim()) return;

    const muscleToSend = selectedMuscle === "ALL" ? undefined : selectedMuscle;
    const specificToSend =
      specificGroups.length > 0 ? specificGroups.join(",") : undefined;

    await onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      muscle: muscleToSend,
      equipment: equipment.trim() || undefined,
      specificMuscleGroups: specificToSend,
    });
  };

  if (!visible) {
    return null;
  }

  const content = (
    <View style={[styles.overlay, !useModal && styles.inlineOverlay]}>
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
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              width: "40%",
            }}
          >
            <DumbbellIcon
              height={25}
              width={25}
              stroke={exerciseModalColors.accent}
              fill={exerciseModalColors.accent}
            />
            <Text style={styles.title}>{t("exerciseNewTitle")}</Text>
          </View>

          <TouchableOpacity
            onPress={onClose}
            disabled={isSubmitting}
            style={styles.closeButton}
          >
            <XIcon height={18} width={18} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>{t("modalName")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("exerciseNamePlaceholder")}
            placeholderTextColor={exerciseModalColors.muted2}
            value={name}
            onChangeText={setName}
            editable={!isSubmitting}
            returnKeyType="done"
          />

          <View pointerEvents={isSubmitting ? "none" : "auto"}>
            <Text style={styles.label}>{t("exercisePrimaryMuscle")}</Text>
            <MuscleFilterBar
              value={selectedMuscle}
              onChange={setSelectedMuscle}
              preset="basic"
              chipColors={{
                background: exerciseModalColors.surface,
                border: exerciseModalColors.borderSoft,
                activeBackground: exerciseModalColors.accentBg,
                activeBorder: exerciseModalColors.accentDim,
                text: exerciseModalColors.muted2,
                activeText: exerciseModalColors.text,
              }}
            />
          </View>

          <>
            <Text style={styles.label}>{t("exerciseSpecificMuscles")}</Text>

            <View style={styles.chipWrap}>
              {advancedSpecificList.map((item) => {
                const active = specificGroups.includes(item.value);

                return (
                  <Pressable
                    key={item.value}
                    disabled={isSubmitting}
                    onPress={() => toggleSpecific(item.value)}
                    style={[styles.multiChip, active && styles.multiChipActive]}
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
                {t("exerciseSelected")}:{" "}
                {specificGroups
                  .map((group) => getMuscleLabel(group, language))
                  .join(", ")}
              </Text>
            )}
          </>

          <Text style={styles.label}>{t("exerciseEquipment")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("exerciseEquipmentPlaceholder")}
            placeholderTextColor={exerciseModalColors.muted2}
            value={equipment}
            onChangeText={setEquipment}
            editable={!isSubmitting}
            returnKeyType="done"
          />

          <Text style={styles.label}>{t("modalDescription")}</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder={t("exerciseDescriptionPlaceholder")}
            placeholderTextColor={exerciseModalColors.muted2}
            value={description}
            onChangeText={setDescription}
            editable={!isSubmitting}
            returnKeyType="done"
          />
        </ScrollView>

        <TouchableOpacity
          style={[styles.buttonWrapper, isSubmitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <LinearGradient
            colors={modalConfirmButtonColors}
            style={styles.button}
          >
            <Ionicons name="save-outline" size={18} color="white" />
            <Text style={styles.buttonText}>
              {isSubmitting ? t("modalCreating") : t("exerciseCreate")}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!useModal) {
    return content;
  }

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: exerciseModalColors.backdrop,
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 24,
  },
  inlineOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    elevation: 40,
  },
  container: {
    backgroundColor: exerciseModalColors.container,
    width: "100%",
    maxWidth: 560,
    height: MODAL_MAX_HEIGHT,
    maxHeight: MODAL_MAX_HEIGHT,
    borderRadius: 28,
    padding: 12,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: exerciseModalColors.border,
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
    color: exerciseModalColors.text,
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
    color: exerciseModalColors.muted,
    marginBottom: 6,
    marginTop: 15,
    fontSize: 14,
  },
  input: {
    backgroundColor: exerciseModalColors.input,
    borderRadius: 12,
    padding: 12,
    color: exerciseModalColors.textStrong,
    fontSize: 13,
    borderWidth: 1,
    borderColor: exerciseModalColors.border,
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
    backgroundColor: exerciseModalColors.surface,
    borderWidth: 1,
    borderColor: exerciseModalColors.borderSoft,
    marginRight: 8,
    marginBottom: 8,
  },
  multiChipActive: {
    backgroundColor: exerciseModalColors.accentBg,
    borderColor: exerciseModalColors.accentDim,
  },
  multiChipText: {
    color: exerciseModalColors.muted2,
    fontSize: 12,
    fontWeight: "500",
  },
  multiChipTextActive: {
    color: exerciseModalColors.text,
  },
  selectedHint: {
    marginTop: 4,
    color: exerciseModalColors.accent,
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
});
