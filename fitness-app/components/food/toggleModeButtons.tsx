import { typography } from "@/config/typography";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type ToggleModeButtonsProps = {
  mode: "manual" | "qr";
  setMode: (mode: "manual" | "qr") => void;
};

export function ToggleModeButtons({ setMode, mode }: ToggleModeButtonsProps) {
  return (
    <View style={styles.toggleModeContainer}>
      {/* MANUAL BUTTON */}
      <TouchableOpacity
        style={styles.buttonWrapper}
        onPress={() => setMode("manual")}
      >
        <LinearGradient
          colors={
            mode === "manual"
              ? ["#00C6FF", "#00F5A0"]
              : ["rgba(15,23,42,0.9)", "rgba(15,23,42,0.9)"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.toggleModeButton}
        >
          <Text
            style={[
              typography.body,
              styles.toggleModeButtonText,
              mode === "manual"
                ? styles.toggleTextActive
                : styles.toggleTextInactive,
            ]}
          >
            Manuell
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* QR BUTTON */}
      <TouchableOpacity
        style={styles.buttonWrapper}
        onPress={() => setMode("qr")}
      >
        <LinearGradient
          colors={
            mode === "qr"
              ? ["#00C6FF", "#00F5A0"]
              : ["rgba(15,23,42,0.9)", "rgba(15,23,42,0.9)"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.toggleModeButton}
        >
          <Text
            style={[
              typography.body,
              styles.toggleModeButtonText,
              mode === "qr"
                ? styles.toggleTextActive
                : styles.toggleTextInactive,
            ]}
          >
            Skann QR
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleModeContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(15,23,42,0.95)",
    padding: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.4)",
    marginTop: 8,
    marginBottom: 12,
  },
  buttonWrapper: {
    flex: 1,
  },
  toggleModeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleModeButtonText: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "500",
  },
  toggleTextActive: {
    color: "#FFFFFF",
  },
  toggleTextInactive: {
    color: "rgba(148,163,184,0.9)",
  },
});
