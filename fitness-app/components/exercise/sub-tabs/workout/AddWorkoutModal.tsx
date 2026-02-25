import { typography } from "@/config/typography";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description?: string;
    dayLabel?: string;
  }) => void;
};

const colors = {
  // Backdrop
  backdrop: "rgba(0,0,0,0.62)",

  // Modal base
  cardSolid: "rgba(10,16,30,0.96)",
  strokeOuter: "rgba(255,255,255,0.10)",
  strokeInner: "rgba(255,255,255,0.05)",

  // Text
  text: "rgba(255,255,255,0.94)",
  muted: "rgba(148,163,184,0.86)",
  muted2: "rgba(148,163,184,0.72)",

  // Surfaces
  surface: "rgba(255,255,255,0.05)",
  surface2: "rgba(255,255,255,0.075)",

  // Accent
  accentA: "rgba(99,102,241,0.94)", // indigo
  accentB: "rgba(34,211,238,0.78)", // cyan

  // Inputs
  inputBg: "rgba(255,255,255,0.045)",
  inputStroke: "rgba(255,255,255,0.10)",
  inputStrokeFocus: "rgba(34,211,238,0.26)",
  inputGlow: "rgba(34,211,238,0.10)",

  // Buttons
  iconBg: "rgba(255,255,255,0.05)",
  iconStroke: "rgba(255,255,255,0.10)",
  ctaStroke: "rgba(255,255,255,0.18)",

  danger: "rgba(248,113,113,0.95)",
};

export function AddWorkoutModal({ visible, onClose, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dayLabel, setDayLabel] = useState("");

  const [focusField, setFocusField] = useState<"name" | "day" | "desc" | null>(
    null
  );

  useEffect(() => {
    if (visible) {
      setName("");
      setDescription("");
      setDayLabel("");
      setFocusField(null);
    }
  }, [visible]);

  const canSubmit = useMemo(() => !!name.trim(), [name]);

  const handleSubmit = () => {
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      dayLabel: dayLabel.trim() || undefined,
    });
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Backdrop */}
        <Pressable style={styles.overlay} onPress={onClose}>
          {/* Stop propagation */}
          <Pressable style={styles.cardOuter} onPress={() => {}}>
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

            <View style={styles.content}>
              {/* Header */}
              <View style={styles.header}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[typography.h2, styles.title]}>Ny økt</Text>
                  <Text style={[typography.body, styles.subtitle]}>
                    Lag en økt du kan starte når som helst.
                  </Text>
                </View>

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

              {/* Field: Name */}
              <View style={styles.field}>
                <Text style={[typography.body, styles.label]}>Navn</Text>
                <View
                  style={[
                    styles.inputWrap,
                    focusField === "name" && styles.inputWrapFocus,
                  ]}
                >
                  {focusField === "name" && (
                    <View pointerEvents="none" style={styles.focusGlow} />
                  )}
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
              </View>

              {/* Field: Day/Label */}
              <View style={styles.field}>
                <Text style={[typography.body, styles.label]}>Dag / label</Text>
                <View
                  style={[
                    styles.inputWrap,
                    focusField === "day" && styles.inputWrapFocus,
                  ]}
                >
                  {focusField === "day" && (
                    <View pointerEvents="none" style={styles.focusGlow} />
                  )}
                  <TextInput
                    style={styles.input}
                    placeholder="F.eks. Mandag, Pull B..."
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
              </View>

              {/* Field: Description */}
              <View style={styles.field}>
                <Text style={[typography.body, styles.label]}>Beskrivelse</Text>
                <View
                  style={[
                    styles.inputWrap,
                    styles.textareaWrap,
                    focusField === "desc" && styles.inputWrapFocus,
                  ]}
                >
                  {focusField === "desc" && (
                    <View pointerEvents="none" style={styles.focusGlow} />
                  )}
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    placeholder="Kort beskrivelse av økten..."
                    placeholderTextColor={colors.muted2}
                    value={description}
                    onChangeText={setDescription}
                    returnKeyType="done"
                    onFocus={() => setFocusField("desc")}
                    onBlur={() =>
                      setFocusField((f) => (f === "desc" ? null : f))
                    }
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </View>

              {/* CTA */}
              <View style={styles.footer}>
                <Pressable
                  onPress={handleSubmit}
                  disabled={!canSubmit}
                  style={({ pressed }) => [
                    styles.ctaWrap,
                    !canSubmit && styles.ctaDisabled,
                    pressed && canSubmit && styles.ctaPressed,
                  ]}
                >
                  <LinearGradient
                    colors={[colors.accentA, colors.accentB]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cta}
                  >
                    <Ionicons name="sparkles-outline" size={16} color="white" />
                    <Text style={[typography.bodyBold, styles.ctaText]}>
                      Opprett økt
                    </Text>
                  </LinearGradient>
                </Pressable>

                {!canSubmit && (
                  <Text style={[typography.body, styles.helper]}>
                    Skriv inn et navn for å opprette.
                  </Text>
                )}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: "center",
    padding: 18,
  },

  cardOuter: {
    borderRadius: 22,
    overflow: "hidden",
  },

  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.cardSolid,
  },

  accentSheen: {
    position: "absolute",
    top: -44,
    right: -72,
    width: 240,
    height: 190,
    borderRadius: 999,
    opacity: 0.95,
  },

  outerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.strokeOuter,
  },
  innerStroke: {
    position: "absolute",
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.strokeInner,
  },

  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  title: {
    color: colors.text,
    fontSize: 18,
    letterSpacing: 0.12,
  },
  subtitle: {
    color: colors.muted2,
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: "500",
  },

  iconBtn: {
    alignSelf: "flex-start",
  },
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

  field: {
    gap: 8,
  },
  label: {
    color: colors.muted,
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
  focusGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.inputGlow,
    opacity: 0.55,
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
  },

  footer: {
    marginTop: 4,
    gap: 10,
  },

  ctaWrap: {
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.ctaStroke,
  },
  cta: {
    paddingVertical: 13,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  ctaText: {
    color: "white",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.12,
  },

  ctaPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  ctaDisabled: {
    opacity: 0.45,
  },

  helper: {
    color: colors.muted2,
    fontSize: 12.5,
    textAlign: "center",
  },
});
