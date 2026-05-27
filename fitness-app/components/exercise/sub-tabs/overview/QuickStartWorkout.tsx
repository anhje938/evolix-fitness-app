import { typography } from "@/config/typography";
import { useWorkoutSession } from "@/context/workoutSessionContext";
import { useTranslation } from "@/i18n/translations";
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
  const { language } = useTranslation();
  const { openQuickSession } = useWorkoutSession();

  return (
    <Pressable
      onPress={() => openQuickSession(language === "en" ? "Quick workout" : "Hurtigøkt")}
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
            "rgba(34,211,238,0.16)",
            "rgba(59,130,246,0.11)",
            "rgba(16,185,129,0.06)",
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
            color="rgba(34,211,238,0.96)"
          />
        </View>

        {/* text */}
        <View style={styles.textCol}>
          <Text style={[typography.body, styles.title]} numberOfLines={1}>
            {language === "en" ? "Quick start workout" : "Hurtigstart økt"}
          </Text>
          <Text style={[typography.body, styles.subtitle]} numberOfLines={1}>
            {language === "en" ? "Start an unplanned workout" : "Start uplanlagt økt"}
          </Text>
        </View>

        {/* right CTA */}
        <LinearGradient
          colors={["rgba(34,211,238,0.12)", "rgba(59,130,246,0.10)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ctaChip}
        >
          <Ionicons name="play" size={14} color="rgba(226,232,240,0.95)" />
          <Text style={[typography.body, styles.ctaText]}>Start</Text>
        </LinearGradient>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 10,
  },
  pressed: {
    transform: [{ scale: 0.995 }],
    opacity: 0.98,
  },

  card: {
    borderRadius: 20,
    paddingVertical: 11,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",

    backgroundColor: "rgba(15,23,42,0.42)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
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
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
    overflow: "hidden",

    backgroundColor: "rgba(255,255,255,0.035)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  textCol: {
    flex: 1,
    minWidth: 0,
  },

  title: {
    color: "rgba(241,245,249,0.96)",
    fontSize: 13.5,
    letterSpacing: 0.05,
    fontWeight: "400",
  },

  subtitle: {
    color: "rgba(148,163,184,0.82)",
    marginTop: 2,
    fontSize: 10.5,
    letterSpacing: 0.05,
    fontWeight: "400",
  },

  ctaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 13,

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  ctaText: {
    color: "rgba(226,232,240,0.95)",
    fontSize: 11.5,
    letterSpacing: 0.05,
    fontWeight: "400",
  },
});
