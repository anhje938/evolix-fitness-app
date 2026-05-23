import { AuthRequestError, registerWithPassword } from "@/api/auth";
import { AuthScreenFrame } from "@/components/auth/AuthScreenFrame";
import { useAuth } from "@/context/AuthProvider";
import { useAppleSignIn } from "@/hooks/useAppleSignIn";
import { type TranslationKey, useTranslation } from "@/i18n/translations";
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

function getRegistrationErrorMessage(
  error: unknown,
  t: (key: TranslationKey) => string,
) {
  if (error instanceof AuthRequestError) {
    if (error.status === 404) return t("signInRegisterUnavailable");
    if (error.status === 409 || error.code === "account_exists") {
      return t("signInRegisterAccountExists");
    }
    if (error.code === "invalid_email") return t("signInEmailError");
    if (error.code === "invalid_username") return t("signInUsernameError");
    if (error.code === "weak_password") return t("signInPasswordError");
    if (error.status >= 500) return t("signInRegisterServerError");
    return error.message || t("signInPasswordAuthFailed");
  }

  if (error instanceof TypeError) return t("signInRegisterNetworkError");
  if (error instanceof Error && error.message) return error.message;
  return t("signInPasswordAuthFailed");
}

export function SignInPage() {
  const { setAuthSession } = useAuth();
  const { t } = useTranslation();
  const { isAppleSigningIn, signInWithApple } = useAppleSignIn();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isBusy = isSubmitting || isAppleSigningIn;
  const hasValidUsername = username.trim().length >= 3;
  const hasValidPassword =
    password.length >= 8 &&
    /[A-Za-zÆØÅæøå]/.test(password) &&
    /\d/.test(password);
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  const submit = async () => {
    if (isBusy) return;

    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();
    setFormError(null);

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setFormError(t("signInEmailError"));
      return;
    }

    if (trimmedUsername.length < 3) {
      setFormError(t("signInUsernameError"));
      return;
    }

    if (
      password.length < 8 ||
      !/[A-Za-zÆØÅæøå]/.test(password) ||
      !/\d/.test(password)
    ) {
      setFormError(t("signInPasswordError"));
      return;
    }

    if (password !== confirmPassword) {
      setFormError(t("signInPasswordMatchError"));
      return;
    }

    try {
      setIsSubmitting(true);
      const session = await registerWithPassword(
        trimmedEmail,
        trimmedUsername,
        password,
      );
      await setAuthSession(session);
      router.replace("/(tabs)/home");
    } catch (error: unknown) {
      const detail = getRegistrationErrorMessage(error, t);

      if (__DEV__) console.log("Password registration error:", detail, error);
      setFormError(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScreenFrame compact showBackButton>
      <View style={styles.card}>
        <Text style={styles.headerTitle}>{t("signInCreateAccount")}</Text>

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
          <Text style={styles.inputLabel}>{t("signInUsername")}</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
            placeholder={t("signInUsernamePlaceholder")}
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
            textContentType="newPassword"
            placeholder={t("signInPasswordPlaceholder")}
            placeholderTextColor="rgba(148,163,184,0.62)"
            style={styles.input}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t("signInConfirmPassword")}</Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            textContentType="newPassword"
            placeholder={t("signInConfirmPasswordPlaceholder")}
            placeholderTextColor="rgba(148,163,184,0.62)"
            style={styles.input}
          />
        </View>

        {formError ? (
          <Text style={styles.formError}>{formError}</Text>
        ) : (
          <Text style={styles.formHint}>
            {isSubmitting
              ? t("signInRegisterSubmitting")
              : t("signInRegisterHint")}
          </Text>
        )}

        <View style={styles.feedbackList}>
          <Text
            style={[
              styles.feedbackText,
              username ? styles.feedbackTextReady : null,
            ]}
          >
            {hasValidUsername ? "✓" : "•"} {t("signInUsernameError")}
          </Text>
          <Text
            style={[
              styles.feedbackText,
              password ? styles.feedbackTextReady : null,
            ]}
          >
            {hasValidPassword ? "✓" : "•"} {t("signInPasswordError")}
          </Text>
          <Text
            style={[
              styles.feedbackText,
              confirmPassword ? styles.feedbackTextReady : null,
            ]}
          >
            {passwordsMatch ? "✓" : "•"} {t("signInPasswordMatchError")}
          </Text>
        </View>

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
            <Text style={styles.primaryButtonText}>
              {t("signInCreateAccount")}
            </Text>
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
    gap: 8,
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
  feedbackList: {
    gap: 2,
  },
  feedbackText: {
    color: "rgba(148,163,184,0.72)",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "500",
  },
  feedbackTextReady: {
    color: "rgba(45,212,191,0.9)",
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
