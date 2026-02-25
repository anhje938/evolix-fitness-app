import { typography } from "@/config/typography";
import { useWorkoutSession } from "@/context/workoutSessionContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type QuickStartProps = {
  /** Override horizontal padding on the outer wrapper */
  wrapperPaddingHorizontal?: number;
};

export default memo(function QuickStart({
  wrapperPaddingHorizontal = 14,
}: QuickStartProps) {
  const { openQuickSession } = useWorkoutSession();

  return (
    <Pressable
      onPress={() => openQuickSession("Hurtigøkt")}
      style={({ pressed }) => [
        styles.wrap,
        { paddingHorizontal: wrapperPaddingHorizontal },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.card}>
        {/* subtle accent sweep (brand) */}
        <LinearGradient
          pointerEvents="none"
          colors={[
            "rgba(34,211,238,0.18)",
            "rgba(59,130,246,0.10)",
            "rgba(168,85,247,0.08)",
            "rgba(0,0,0,0)",
          ]}
          start={{ x: 0, y: 0.1 }}
          end={{ x: 1, y: 0.9 }}
          style={styles.accent}
        />

        {/* top hairline (premium) */}
        <LinearGradient
          pointerEvents="none"
          colors={[
            "rgba(255,255,255,0.14)",
            "rgba(255,255,255,0.02)",
            "rgba(255,255,255,0.00)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.hairline}
        />

        {/* left icon */}
        <View style={styles.iconShell}>
          <LinearGradient
            pointerEvents="none"
            colors={[
              "rgba(56,189,248,0.20)",
              "rgba(59,130,246,0.10)",
              "rgba(255,255,255,0.02)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Ionicons
            name="flash-outline"
            size={20}
            color="rgba(56,189,248,0.95)"
          />
        </View>

        {/* text */}
        <View style={styles.textCol}>
          <Text style={[typography.bodyBold, styles.title]} numberOfLines={1}>
            Hurtigstart økt
          </Text>
          <Text style={[typography.body, styles.subtitle]} numberOfLines={1}>
            Start uplanlagt økt
          </Text>
        </View>

        {/* right CTA */}
        <LinearGradient
          colors={["rgba(56,189,248,0.14)", "rgba(168,85,247,0.10)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ctaChip}
        >
          <Ionicons name="play" size={14} color="rgba(226,232,240,0.95)" />
          <Text style={[typography.bodyBold, styles.ctaText]}>Start</Text>
        </LinearGradient>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 12,
  },
  pressed: {
    transform: [{ scale: 0.995 }],
    opacity: 0.98,
  },

  card: {
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",

    backgroundColor: "rgba(2,6,23,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",

    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },

  accent: {
    ...StyleSheet.absoluteFillObject,
    opacity: 1,
  },

  hairline: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.9,
  },

  iconShell: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",

    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  textCol: {
    flex: 1,
    minWidth: 0,
  },

  title: {
    color: "rgba(226,232,240,0.94)",
    fontSize: 14,
    letterSpacing: 0.1,
    fontWeight: "600",
  },

  subtitle: {
    color: "rgba(148,163,184,0.88)",
    marginTop: 2,
    fontSize: 11,
    letterSpacing: 0.1,
    fontWeight: "600",
  },

  ctaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  ctaText: {
    color: "rgba(226,232,240,0.95)",
    fontSize: 12,
    letterSpacing: 0.1,
    fontWeight: "600",
  },
});
