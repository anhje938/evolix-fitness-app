import { typography } from "@/config/typography";
import { useWorkoutSession } from "@/context/workoutSessionContext";
import { useTranslation } from "@/i18n/translations";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type Props = {
  style?: StyleProp<ViewStyle>;
  onLogMealPress?: () => void;
  onLogWeightPress?: () => void;
};

type ActionConfig = {
  key: "meal" | "weight" | "workout";
  title: string;
  accent: [string, string];
  glow: [string, string, string];
  icon: ReactNode;
};

export default function QuickStartButtons({
  style,
  onLogMealPress,
  onLogWeightPress,
}: Props) {
  const { openQuickSession } = useWorkoutSession();
  const { t } = useTranslation();
  const actions: ActionConfig[] = [
    {
      key: "meal",
      title: t("quickLogMeal"),
      accent: ["#2A2F3A", "#1B4DFF"],
      glow: [
        "rgba(59,130,246,0.22)",
        "rgba(59,130,246,0.08)",
        "rgba(59,130,246,0.00)",
      ],
      icon: <Ionicons name="restaurant-outline" size={16} color="#93C5FD" />,
    },
    {
      key: "weight",
      title: t("quickLogWeight"),
      accent: ["#22C55E", "#15803D"],
      glow: [
        "rgba(34,197,94,0.22)",
        "rgba(34,197,94,0.08)",
        "rgba(34,197,94,0.00)",
      ],
      icon: <Ionicons name="scale-outline" size={16} color="#86EFAC" />,
    },
    {
      key: "workout",
      title: t("quickStartWorkout"),
      accent: ["#F59E0B", "#D97706"],
      glow: [
        "rgba(245,158,11,0.22)",
        "rgba(245,158,11,0.08)",
        "rgba(245,158,11,0.00)",
      ],
      icon: <Ionicons name="flash-outline" size={16} color="#FCD34D" />,
    },
  ];

  const runAction = useCallback(
    (action: "meal" | "weight" | "workout") => {
      if (action === "meal") {
        onLogMealPress?.();
        return;
      }

      if (action === "weight") {
        onLogWeightPress?.();
        return;
      }

      openQuickSession(t("quickWorkoutName"));
    },
    [onLogMealPress, onLogWeightPress, openQuickSession, t]
  );

  return (
    <View style={[styles.container, style]}>
      {actions.map((action) => (
        <Pressable
          key={action.key}
          onPress={() => runAction(action.key)}
          style={({ pressed }) => [
            styles.buttonHitbox,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.glassButton}>
            <LinearGradient
              colors={action.glow}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={styles.innerGlow}
            />

            <LinearGradient
              colors={action.accent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.accentBar}
            />

            <View style={styles.iconWrap}>{action.icon}</View>

            <Text
              style={[typography.body, styles.buttonText]}
              numberOfLines={2}
            >
              {action.title}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
  },
  buttonHitbox: {
    flex: 1,
  },
  glassButton: {
    position: "relative",
    overflow: "hidden",
    minHeight: 74,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  innerGlow: {
    position: "absolute",
    inset: 0,
  },
  accentBar: {
    position: "absolute",
    top: 8,
    height: 2.5,
    width: "38%",
    borderRadius: 999,
    opacity: 0.92,
  },
  iconWrap: {
    marginTop: 2,
    marginBottom: 7,
  },
  buttonText: {
    color: "white",
    fontSize: 11.5,
    lineHeight: 15,
    textAlign: "center",
    letterSpacing: 0.05,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
});
