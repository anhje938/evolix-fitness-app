// components/exercise/MuscleFilterBar.tsx
import { newColors } from "@/config/theme";
import { typography } from "@/config/typography";
import { ADVANCED_MUSCLE_FILTERS, MUSCLE_FILTERS } from "@/types/muscles";
import React, { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Preset = "basic" | "advanced";

type Props = {
  value: string;
  onChange: (value: string) => void;
  preset: Preset;
  chipColors?: {
    background: string;
    border: string;
    activeBackground: string;
    activeBorder: string;
    text: string;
    activeText: string;
  };
};

const ROWS_VISIBLE_ADVANCED = 3;
// Adjust if chip padding, font, or margins change.
const ESTIMATED_ROW_HEIGHT = 42; // ~chip height + margin
const ADVANCED_MAX_HEIGHT = ROWS_VISIBLE_ADVANCED * ESTIMATED_ROW_HEIGHT + 8;

export function MuscleFilterBar({ value, onChange, preset, chipColors }: Props) {
  const list = useMemo(
    () => (preset === "advanced" ? ADVANCED_MUSCLE_FILTERS : MUSCLE_FILTERS),
    [preset]
  );

  // Basic horizontal scroll.
  if (preset === "basic") {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.containerHorizontal}
      >
        {list.map((item) => {
          const isActive = item.value === value;

          return (
            <TouchableOpacity
              key={`${item.label}-${item.value}`}
              style={[
                styles.chip,
                chipColors && {
                  backgroundColor: chipColors.background,
                  borderColor: chipColors.border,
                },
                isActive && styles.chipActive,
                isActive &&
                  chipColors && {
                    backgroundColor: chipColors.activeBackground,
                    borderColor: chipColors.activeBorder,
                  },
              ]}
              onPress={() => onChange(item.value)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  typography.body,
                  styles.chipText,
                  chipColors && { color: chipColors.text },
                  isActive && styles.chipTextActive,
                  isActive && chipColors && { color: chipColors.activeText },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  }

  // Advanced vertical wrapped list.
  return (
    <View style={[styles.advancedBox, { maxHeight: ADVANCED_MAX_HEIGHT }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.containerWrapped}
      >
        {list.map((item) => {
          const isActive = item.value === value;

          return (
            <TouchableOpacity
              key={`${item.label}-${item.value}`}
              style={[
                styles.chip,
                styles.chipWrapped,
                chipColors && {
                  backgroundColor: chipColors.background,
                  borderColor: chipColors.border,
                },
                isActive && styles.chipActive,
                isActive &&
                  chipColors && {
                    backgroundColor: chipColors.activeBackground,
                    borderColor: chipColors.activeBorder,
                  },
              ]}
              onPress={() => onChange(item.value)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  typography.body,
                  styles.chipText,
                  chipColors && { color: chipColors.text },
                  isActive && styles.chipTextActive,
                  isActive && chipColors && { color: chipColors.activeText },
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // BASIC
  containerHorizontal: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },

  // ADVANCED
  advancedBox: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 16,
  },
  containerWrapped: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
  },

  // CHIP (shared)
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 8,
    backgroundColor: "rgba(14, 30, 50, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  chipWrapped: {
    marginBottom: 8,
  },
  chipActive: {
    backgroundColor: newColors.primary.light,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  chipText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.65)",
  },
  chipTextActive: {
    color: "white",
  },
});
