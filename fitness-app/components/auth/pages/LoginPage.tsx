import { AuthRequestError, loginWithPassword } from "@/api/auth";
import { AuthScreenFrame } from "@/components/auth/AuthScreenFrame";
import { useAuth } from "@/context/AuthProvider";
import { useAppleSignIn } from "@/hooks/useAppleSignIn";
import { useTranslation } from "@/i18n/translations";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export function LoginPage() {
  const { setAuthSession } = useAuth();
  const { t } = useTranslation();
  const { isAppleSigningIn, signInWithApple } = useAppleSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isBusy = isSubmitting || isAppleSigningIn;

  const submit = async () => {
    if (isBusy) return;

    const trimmedEmail = email.trim();
    setFormError(null);

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setFormError(t("signInEmailError"));
      return;
    }

    if (!password) {
      setFormError(t("signInPasswordAuthFailed"));
      return;
    }

    try {
      setIsSubmitting(true);
      const session = await loginWithPassword(trimmedEmail, password);
      await setAuthSession(session);
      router.replace("/(tabs)/home");
    } catch (error: unknown) {
      const detail =
        error instanceof AuthRequestError
          ? error.message
          : error instanceof Error
          ? error.message
          : t("commonUnknownError");

      if (__DEV__) console.log("Password login error:", detail, error);
      setFormError(detail || t("signInPasswordAuthFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScreenFrame compact showBackButton>
      <View style={styles.card}>
        <Text style={styles.headerTitle}>{t("signInLogin")}</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t("signInEmail")}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder={t("signInEmailPlaceholder")}
            placeholderTextColor="rgba(148,163,184,0.62)"
            style={styles.input}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t("signInPassword")}</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            textContentType="password"
            placeholder={t("signInPasswordPlaceholder")}
            placeholderTextColor="rgba(148,163,184,0.62)"
            style={styles.input}
          />
        </View>

        {formError ? (
          <Text style={styles.formError}>{formError}</Text>
        ) : (
          <Text style={styles.formHint}>{t("signInLoginHint")}</Text>
        )}

        <Pressable
          disabled={isBusy}
          onPress={() => {
            void submit();
          }}
          style={({ pressed }) => [
            styles.primaryButton,
            (pressed || isBusy) && styles.primaryButtonPressed,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#001018" />
          ) : (
            <Text style={styles.primaryButtonText}>{t("signInLogin")}</Text>
          )}
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t("signInOr")}</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          disabled={isBusy}
          style={({ pressed }) => [
            styles.appleButton,
            (pressed || isAppleSigningIn) && styles.appleButtonPressed,
          ]}
          onPress={() => {
            void signInWithApple();
          }}
        >
          {isAppleSigningIn ? (
            <ActivityIndicator color="#f8fafc" />
          ) : (
            <>
              <Ionicons name="logo-apple" size={20} color="#f8fafc" />
              <Text style={styles.appleButtonText}>
                {t("signInAppleButton")}
              </Text>
            </>
          )}
        </Pressable>

        {isAppleSigningIn ? (
          <Text style={styles.loginStatus}>{t("signInStatus")}</Text>
        ) : null}
      </View>
    </AuthScreenFrame>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "rgba(15,23,42,0.58)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
    padding: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  headerTitle: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "700",
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    color: "rgba(226,232,240,0.92)",
    fontSize: 11,
    fontWeight: "600",
  },
  input: {
    minHeight: 42,
    borderRadius: 11,
    backgroundColor: "rgba(2,6,23,0.54)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    color: "#f8fafc",
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: "500",
  },
  formHint: {
    color: "rgba(148,163,184,0.86)",
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "600",
  },
  formError: {
    color: "#fca5a5",
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "600",
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#11c5d9",
    shadowColor: "#06b6d4",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
  },
  primaryButtonPressed: {
    opacity: 0.78,
  },
  primaryButtonText: {
    color: "#001018",
    fontSize: 14,
    fontWeight: "700",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(148,163,184,0.18)",
  },
  dividerText: {
    color: "rgba(148,163,184,0.88)",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  appleButton: {
    minHeight: 46,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#020617",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  appleButtonPressed: {
    opacity: 0.7,
  },
  appleButtonText: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "700",
  },
  loginStatus: {
    color: "rgba(226,232,240,0.84)",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "600",
  },
});
