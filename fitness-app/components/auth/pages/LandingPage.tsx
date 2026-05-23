import { AuthScreenFrame } from "@/components/auth/AuthScreenFrame";
import { useTranslation } from "@/i18n/translations";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function LandingPage() {
  const { t } = useTranslation();

  return (
    <AuthScreenFrame>
      <View style={styles.actions}>
        <Pressable
          onPress={() => router.push("/(auth)/login")}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>{t("signInLogin")}</Text>
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t("signInOr")}</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          onPress={() => router.push("/(auth)/register")}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.secondaryButtonText}>{t("signInRegister")}</Text>
        </Pressable>
      </View>
    </AuthScreenFrame>
  );
}

const styles = StyleSheet.create({
  actions: {
    width: "100%",
    gap: 12,
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#11c5d9",
    shadowColor: "#06b6d4",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(2,6,23,0.54)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.22)",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(148,163,184,0.18)",
  },
  dividerText: {
    color: "rgba(148,163,184,0.82)",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  buttonPressed: {
    opacity: 0.78,
  },
  primaryButtonText: {
    color: "#001018",
    fontSize: 14,
    fontWeight: "900",
  },
  secondaryButtonText: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "900",
  },
});
