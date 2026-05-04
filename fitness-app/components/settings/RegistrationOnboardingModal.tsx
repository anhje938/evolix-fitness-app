import { GLOBAL_IOS_KEYBOARD_ACCESSORY_ID } from "@/components/common/GlobalKeyboardAccessory";
import { typography } from "@/config/typography";
import { useAuth } from "@/context/AuthProvider";
import { useUserSettings } from "@/context/UserSettingsProvider";
import type { AppLanguage, UserGender } from "@/types/userSettings";
import React, { useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const GENDER_OPTIONS: { value: UserGender; label: string }[] = [
  { value: "male", label: "Mann" },
  { value: "female", label: "Kvinne" },
];

const LANGUAGE_OPTIONS: { value: AppLanguage; label: string }[] = [
  { value: "nb", label: "Norsk" },
  { value: "en", label: "English" },
];

const inputProps = {
  inputAccessoryViewID: GLOBAL_IOS_KEYBOARD_ACCESSORY_ID,
  returnKeyType: "done" as const,
  submitBehavior: "blurAndSubmit" as const,
  onSubmitEditing: () => Keyboard.dismiss(),
};

function parseAge(value: string) {
  const n = Number(value.replace(",", ".").trim());
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  return rounded >= 10 && rounded <= 120 ? rounded : null;
}

export function RegistrationOnboardingModal() {
  const { token, authReady } = useAuth();
  const {
    userSettings,
    saveUserSettingsNow,
    hasLoadedUserSettings,
    isSavingUserSettings,
    userSettingsError,
  } = useUserSettings();

  const visible =
    authReady &&
    !!token &&
    hasLoadedUserSettings &&
    !userSettingsError &&
    !userSettings.hasCompletedRegistration;

  const [ageText, setAgeText] = useState("");
  const [gender, setGender] = useState<UserGender | null>(null);
  const [language, setLanguage] = useState<AppLanguage>("nb");
  const [didTrySubmit, setDidTrySubmit] = useState(false);

  useEffect(() => {
    if (!visible) return;

    setAgeText(userSettings.age ? String(userSettings.age) : "");
    setGender(userSettings.gender);
    setLanguage(userSettings.language);
    setDidTrySubmit(false);
  }, [userSettings.age, userSettings.gender, userSettings.language, visible]);

  const age = useMemo(() => parseAge(ageText), [ageText]);
  const canContinue = !!age && !!gender && !!language;

  const handleContinue = () => {
    Keyboard.dismiss();
    setDidTrySubmit(true);
    if (!canContinue || !age || !gender) return;

    void saveUserSettingsNow({
      ...userSettings,
      age,
      gender,
      language,
      hasCompletedRegistration: true,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.kb}
        >
          <View style={styles.card}>
            <Text style={[typography.h2, styles.eyebrow]}>EvoliX profil</Text>
            <Text style={styles.title}>Sett opp kontoen din</Text>
            <Text style={styles.subtitle}>
              Dette brukes til å tilpasse mål, språk og anbefalinger.
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Alder</Text>
              <TextInput
                {...inputProps}
                value={ageText}
                onChangeText={(next) => {
                  setAgeText(next.replace(/[^\d]/g, "").slice(0, 3));
                  setDidTrySubmit(false);
                }}
                keyboardType="number-pad"
                placeholder="F.eks. 28"
                placeholderTextColor="rgba(148,163,184,0.7)"
                style={[
                  styles.input,
                  didTrySubmit && !age && styles.inputInvalid,
                ]}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Kjønn</Text>
              <View style={styles.grid}>
                {GENDER_OPTIONS.map((option) => {
                  const active = gender === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => {
                        setGender(option.value);
                        setDidTrySubmit(false);
                      }}
                      style={({ pressed }) => [
                        styles.option,
                        active && styles.optionActive,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          active && styles.optionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Språk</Text>
              <View style={styles.segment}>
                {LANGUAGE_OPTIONS.map((option) => {
                  const active = language === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setLanguage(option.value)}
                      style={({ pressed }) => [
                        styles.languageOption,
                        active && styles.optionActive,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          active && styles.optionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {didTrySubmit && !canContinue ? (
              <Text style={styles.errorText}>
                Fyll inn alder, kjønn og språk for å fortsette.
              </Text>
            ) : null}

            {userSettingsError ? (
              <Text style={styles.errorText}>
                Kunne ikke synkronisere innstillingene akkurat nå.
              </Text>
            ) : null}

            <Pressable
              onPress={handleContinue}
              disabled={isSavingUserSettings}
              style={({ pressed }) => [
                styles.primaryButton,
                isSavingUserSettings && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {isSavingUserSettings ? "Lagrer..." : "Fortsett"}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.82)",
    justifyContent: "center",
    padding: 20,
  },
  kb: {
    flex: 1,
    justifyContent: "center",
  },
  card: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    backgroundColor: "#0B1120",
    padding: 20,
  },
  eyebrow: {
    color: "#EAB308",
    fontSize: 13,
    marginBottom: 8,
  },
  title: {
    color: "white",
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 8,
  },
  subtitle: {
    color: "rgba(226,232,240,0.82)",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  field: {
    marginTop: 12,
    gap: 8,
  },
  label: {
    color: "rgba(226,232,240,0.9)",
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    backgroundColor: "rgba(15,23,42,0.92)",
    color: "white",
    fontSize: 16,
    paddingHorizontal: 14,
  },
  inputInvalid: {
    borderColor: "rgba(248,113,113,0.55)",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  segment: {
    flexDirection: "row",
    gap: 8,
  },
  option: {
    flexBasis: "48%",
    flexGrow: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    backgroundColor: "rgba(15,23,42,0.72)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  languageOption: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    backgroundColor: "rgba(15,23,42,0.72)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  optionActive: {
    backgroundColor: "rgba(234,179,8,0.14)",
    borderColor: "rgba(234,179,8,0.42)",
  },
  optionText: {
    color: "rgba(226,232,240,0.82)",
    fontSize: 13,
    fontWeight: "600",
  },
  optionTextActive: {
    color: "#FEF3C7",
  },
  errorText: {
    marginTop: 12,
    color: "#FCA5A5",
    fontSize: 12,
    lineHeight: 18,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#EAB308",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  primaryButtonText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.9,
  },
});
