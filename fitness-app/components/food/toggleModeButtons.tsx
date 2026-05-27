import { typography } from "@/config/typography";
import { useTranslation } from "@/i18n/translations";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type ToggleModeButtonsProps = {
  mode: "manual" | "qr";
  setMode: (mode: "manual" | "qr") => void;
};

export function ToggleModeButtons({ setMode, mode }: ToggleModeButtonsProps) {
  const { language } = useTranslation();
  return (
    <View style={styles.toggleModeContainer}>
      <TouchableOpacity
        style={styles.buttonWrapper}
        onPress={() => setMode("manual")}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={
            mode === "manual"
              ? ["rgba(6,182,212,0.34)", "rgba(37,99,235,0.52)"]
              : ["rgba(8,15,28,0.84)", "rgba(8,15,28,0.84)"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.toggleModeButton,
            mode === "manual" && styles.toggleModeButtonActive,
          ]}
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
            {language === "en" ? "Manual" : "Manuell"}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.buttonWrapper}
        onPress={() => setMode("qr")}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={
            mode === "qr"
              ? ["rgba(6,182,212,0.34)", "rgba(37,99,235,0.52)"]
              : ["rgba(8,15,28,0.84)", "rgba(8,15,28,0.84)"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.toggleModeButton,
            mode === "qr" && styles.toggleModeButtonActive,
          ]}
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
            {language === "en" ? "Scan QR" : "Skann QR"}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleModeContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(3,7,18,0.72)",
    padding: 3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
  },
  buttonWrapper: {
    flex: 1,
  },
  toggleModeButton: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  toggleModeButtonActive: {
    borderColor: "rgba(103,232,249,0.16)",
  },
  toggleModeButtonText: {
    textAlign: "center",
    fontSize: 12.5,
    fontWeight: "600",
    letterSpacing: 0.08,
  },
  toggleTextActive: {
    color: "#F8FAFC",
  },
  toggleTextInactive: {
    color: "rgba(148,163,184,0.86)",
  },
});
