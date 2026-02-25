import { typography } from "@/config/typography";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import QuickStartWorkout from "../exercise/sub-tabs/overview/QuickStartWorkout";

export default function QuickStartButtons() {
  return (
    <View>
      <View style={{ marginBottom: 30 }}>
        <QuickStartWorkout wrapperPaddingHorizontal={0} />
      </View>

      <View style={styles.container}>
        {/* LOG MEAL */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.buttonHitbox}
          onPress={() => router.push("/(tabs)/food")}
        >
          <View style={[styles.glassButton, styles.mealButton]}>
            {/* inner glow */}
            <LinearGradient
              colors={[
                "rgba(59,130,246,0.25)", // blue signal
                "rgba(59,130,246,0.08)",
                "rgba(59,130,246,0.00)",
              ]}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={styles.innerGlow}
            />

            {/* accent bar */}
            <LinearGradient
              colors={["#2A2F3A", "#1B4DFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.accentBar}
            />

            <Text style={[typography.body, styles.buttonText]}>
              Logg måltid
            </Text>
          </View>
        </TouchableOpacity>

        {/* LOG WEIGHT */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.buttonHitbox}
          onPress={() => router.push("/(tabs)/weight")}
        >
          <View style={[styles.glassButton, styles.weightButton]}>
            {/* inner glow */}
            <LinearGradient
              colors={[
                "rgba(34,197,94,0.25)", // green signal
                "rgba(34,197,94,0.08)",
                "rgba(34,197,94,0.00)",
              ]}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={styles.innerGlow}
            />

            {/* accent bar */}
            <LinearGradient
              colors={["#22C55E", "#15803D"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.accentBar}
            />

            <Text style={[typography.body, styles.buttonText]}>Logg vekt</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  buttonHitbox: {
    width: "48%",
  },

  glassButton: {
    position: "relative",
    overflow: "hidden",
    paddingVertical: 22,
    paddingHorizontal: 18,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "rgba(15, 23, 42, 0.32)",
    borderWidth: 1,

    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },

  mealButton: {
    borderColor: "rgba(59,130,246,0.45)", // blue signal
  },

  weightButton: {
    borderColor: "rgba(34,197,94,0.45)", // green signal
  },

  innerGlow: {
    position: "absolute",
    inset: 0,
  },

  accentBar: {
    position: "absolute",
    top: 10,
    height: 3,
    width: "42%",
    borderRadius: 999,
    opacity: 0.9,
  },

  buttonText: {
    color: "white",
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
