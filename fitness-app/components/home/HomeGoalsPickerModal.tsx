import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { typography } from "@/config/typography";
import type { HomeGoalTile } from "@/types/userSettings";

const colors = {
  backdrop: "rgba(0,0,0,0.55)",
  cardBg: "rgba(15,23,42,0.92)",
  border: "rgba(255,255,255,0.08)",
  text: "rgba(229,236,255,0.95)",
  muted: "rgba(148,163,184,0.85)",
  rowBg: "rgba(255,255,255,0.04)",
  rowBorder: "rgba(255,255,255,0.06)",
  accent: "rgba(56,189,248,0.95)",
};

const ALL: HomeGoalTile[] = ["calories", "protein", "carbs", "fat"];

const labelMap: Record<HomeGoalTile, string> = {
  calories: "Kalorier",
  protein: "Protein",
  carbs: "Karbo",
  fat: "Fett",
};

type Props = {
  visible: boolean;
  selected: HomeGoalTile[];
  onClose: () => void;
  onSave: (next: HomeGoalTile[]) => void;
};

export default function HomeGoalsPickerModal({
  visible,
  selected,
  onClose,
  onSave,
}: Props) {
  const [local, setLocal] = useState<HomeGoalTile[]>(selected);

  // sync when opening
  React.useEffect(() => {
    if (visible) setLocal(selected);
  }, [visible, selected]);

  const canSave = local.length >= 1;

  const toggle = (t: HomeGoalTile) => {
    setLocal((prev) => {
      const has = prev.includes(t);
      if (has) return prev.filter((x) => x !== t);
      if (prev.length >= 4) return prev; // maks 4
      return [...prev, t];
    });
  };

  const rows = useMemo(() => ALL, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={[typography.h2, styles.title]}>Velg mål på Home</Text>
          <Pressable onPress={onClose} style={styles.iconBtn}>
            <Ionicons name="close" size={18} color={colors.text} />
          </Pressable>
        </View>

        <Text style={[typography.body, styles.help]}>
          Velg 1–4 mål som vises i “Dagens mål”.
        </Text>

        <View style={styles.list}>
          {rows.map((t) => {
            const active = local.includes(t);
            return (
              <Pressable
                key={t}
                onPress={() => toggle(t)}
                style={[styles.row, active && styles.rowActive]}
              >
                <Text style={[typography.body, styles.rowText]}>
                  {labelMap[t]}
                </Text>

                <View style={[styles.check, active && styles.checkActive]}>
                  {active && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={colors.cardBg}
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.actions}>
          <Pressable onPress={onClose} style={[styles.btn, styles.btnGhost]}>
            <Text style={[typography.body, styles.btnTextGhost]}>Avbryt</Text>
          </Pressable>

          <Pressable
            disabled={!canSave}
            onPress={() => onSave(local)}
            style={[
              styles.btn,
              styles.btnPrimary,
              !canSave && styles.btnDisabled,
            ]}
          >
            <Text style={[typography.body, styles.btnTextPrimary]}>Lagre</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.backdrop,
  },

  sheet: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 120,
    borderRadius: 18,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  title: {
    color: colors.text,
  },

  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.border,
  },

  help: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 13,
    fontWeight: "300",
  },

  list: {
    marginTop: 12,
    gap: 8,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: colors.rowBg,
    borderWidth: 1,
    borderColor: colors.rowBorder,
  },

  rowActive: {
    borderColor: "rgba(56,189,248,0.35)",
  },

  rowText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "300",
  },

  check: {
    width: 26,
    height: 26,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.rowBorder,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },

  checkActive: {
    backgroundColor: colors.accent,
    borderColor: "rgba(56,189,248,0.45)",
  },

  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 14,
  },

  btn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },

  btnGhost: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: colors.border,
  },
  btnTextGhost: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "300",
  },

  btnPrimary: {
    backgroundColor: "rgba(56,189,248,0.18)",
    borderColor: "rgba(56,189,248,0.35)",
  },
  btnTextPrimary: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "400",
  },

  btnDisabled: {
    opacity: 0.5,
  },
});
