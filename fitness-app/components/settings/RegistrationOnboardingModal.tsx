import { GLOBAL_IOS_KEYBOARD_ACCESSORY_ID } from "@/components/common/GlobalKeyboardAccessory";
import { typography } from "@/config/typography";
import { useAuth } from "@/context/AuthProvider";
import { useUserSettings } from "@/context/UserSettingsProvider";
import type { AppLanguage, UserGender } from "@/types/userSettings";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
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
import { SafeAreaView } from "react-native-safe-area-context";

const GENDER_OPTIONS: { value: UserGender; label: string; hint: string }[] = [
  { value: "male", label: "Mann", hint: "Brukes kun til tilpasning i appen" },
  {
    value: "female",
    label: "Kvinne",
    hint: "Brukes kun til tilpasning i appen",
  },
];

const LANGUAGE_OPTIONS: { value: AppLanguage; label: string; hint: string }[] =
  [
    { value: "nb", label: "Norsk", hint: "Appen vises på norsk bokmål" },
    { value: "en", label: "English", hint: "The app will use English text" },
  ];

const inputProps = {
  inputAccessoryViewID: GLOBAL_IOS_KEYBOARD_ACCESSORY_ID,
  returnKeyType: "done" as const,
  submitBehavior: "blurAndSubmit" as const,
  onSubmitEditing: () => Keyboard.dismiss(),
};

type StepKey = "age" | "gender" | "language";

const STEP_ORDER: StepKey[] = ["age", "gender", "language"];

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
    !userSettings.hasCompletedRegistration &&
    !userSettings.hasDismissedRegistrationOnboarding;

  const [ageText, setAgeText] = useState("");
  const [gender, setGender] = useState<UserGender | null>(null);
  const [language, setLanguage] = useState<AppLanguage>("nb");
  const [stepIndex, setStepIndex] = useState(0);
  const [showValidation, setShowValidation] = useState(false);

  console.log({
    authReady,
    token: !!token,
    hasLoadedUserSettings,
    userSettingsError,
    hasCompletedRegistration: userSettings.hasCompletedRegistration,
    hasDismissedRegistrationOnboarding:
      userSettings.hasDismissedRegistrationOnboarding,
    visible,
  });

  useEffect(() => {
    if (!visible) return;

    setAgeText(userSettings.age ? String(userSettings.age) : "");
    setGender(userSettings.gender);
    setLanguage(userSettings.language);
    setStepIndex(0);
    setShowValidation(false);
  }, [userSettings.age, userSettings.gender, userSettings.language, visible]);

  const age = useMemo(() => parseAge(ageText), [ageText]);
  const step = STEP_ORDER[stepIndex];
  const isLastStep = stepIndex === STEP_ORDER.length - 1;

  const canContinue =
    (step === "age" && !!age) ||
    (step === "gender" && !!gender) ||
    (step === "language" && !!language);

  const submitSettings = async (markCompleted: boolean) => {
    await saveUserSettingsNow({
      ...userSettings,
      age,
      gender,
      language,
      hasCompletedRegistration: markCompleted,
      hasDismissedRegistrationOnboarding: true,
    });
  };

  const handleContinue = () => {
    Keyboard.dismiss();
    setShowValidation(true);
    if (!canContinue) return;

    if (isLastStep) {
      void submitSettings(true);
      return;
    }

    setStepIndex((current) => current + 1);
    setShowValidation(false);
  };

  const handleCancel = () => {
    if (isSavingUserSettings) return;

    Alert.alert(
      "Avbryt registre ring",
      "Du kan fylle inn dette senere i innstillinger.",
      [
        { text: "Fortsett registrering", style: "cancel" },
        {
          text: "Avbryt",
          style: "destructive",
          onPress: () => {
            void submitSettings(false);
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={styles.screen}>
        <View style={styles.bgOrbTop} />
        <View style={styles.bgOrbBottom} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
        >
          <View style={styles.header}>
            <View style={styles.progressMeta}>
              <Text style={[typography.h2, styles.eyebrow]}>
                Første oppsett
              </Text>
              <Text style={styles.progressLabel}>
                {stepIndex + 1} av {STEP_ORDER.length}
              </Text>
            </View>

            <Pressable
              onPress={handleCancel}
              disabled={isSavingUserSettings}
              style={({ pressed }) => [
                styles.cancelButton,
                isSavingUserSettings && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.cancelButtonText}>Avbryt</Text>
            </Pressable>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${((stepIndex + 1) / STEP_ORDER.length) * 100}%` },
              ]}
            />
          </View>

          <View style={styles.hero}>
            <Text style={styles.title}>
              {step === "age" && "Hvor gammel er du?"}
              {step === "gender" && "Hvilket kjønn vil du bruke i appen?"}
              {step === "language" && "Hvilket språk vil du bruke?"}
            </Text>

            <Text style={styles.subtitle}>
              {step === "age" &&
                "Dette hjelper oss med å tilpasse mål og anbefalinger."}
              {step === "gender" &&
                "Valget brukes kun for å gjøre anbefalingene mer relevante."}
              {step === "language" &&
                "Du kan når som helst endre språk senere i innstillinger."}
            </Text>
          </View>

          <View style={styles.content}>
            {step === "age" ? (
              <View style={styles.ageCard}>
                <Text style={styles.ageLabel}>Alder</Text>
                <TextInput
                  {...inputProps}
                  value={ageText}
                  onChangeText={(next) => {
                    setAgeText(next.replace(/[^\d]/g, "").slice(0, 3));
                    setShowValidation(false);
                  }}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleContinue}
                  placeholder="Skriv alder"
                  placeholderTextColor="rgba(148,163,184,0.7)"
                  style={[
                    styles.ageInput,
                    showValidation && !age && styles.inputInvalid,
                  ]}
                  autoFocus
                />
              </View>
            ) : null}

            {step === "gender" ? (
              <View style={styles.optionList}>
                {GENDER_OPTIONS.map((option) => {
                  const active = gender === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => {
                        setGender(option.value);
                        setShowValidation(false);
                      }}
                      style={({ pressed }) => [
                        styles.optionCard,
                        active && styles.optionCardActive,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionTitle,
                          active && styles.optionTitleActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                      <Text
                        style={[
                          styles.optionHint,
                          active && styles.optionHintActive,
                        ]}
                      >
                        {option.hint}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {step === "language" ? (
              <View style={styles.optionList}>
                {LANGUAGE_OPTIONS.map((option) => {
                  const active = language === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => {
                        setLanguage(option.value);
                        setShowValidation(false);
                      }}
                      style={({ pressed }) => [
                        styles.optionCard,
                        active && styles.optionCardActive,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionTitle,
                          active && styles.optionTitleActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                      <Text
                        style={[
                          styles.optionHint,
                          active && styles.optionHintActive,
                        ]}
                      >
                        {option.hint}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {showValidation && !canContinue ? (
              <Text style={styles.errorText}>
                {step === "age" && "Legg inn en gyldig alder for å fortsette."}
                {step === "gender" && "Velg kjønn for å fortsette."}
                {step === "language" && "Velg språk for å fortsette."}
              </Text>
            ) : null}

            {userSettingsError ? (
              <Text style={styles.errorText}>
                Kunne ikke lagre innstillingene akkurat nå.
              </Text>
            ) : null}
          </View>

          <View style={styles.footer}>
            {stepIndex > 0 ? (
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  setStepIndex((current) => current - 1);
                  setShowValidation(false);
                }}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Tilbake</Text>
              </Pressable>
            ) : (
              <View style={styles.secondaryPlaceholder} />
            )}

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
                {isSavingUserSettings
                  ? "Lagrer..."
                  : isLastStep
                  ? "Fullfør"
                  : "Videre"}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#07111F",
  },
  flex: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 10,
  },
  bgOrbTop: {
    position: "absolute",
    top: -120,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(6,182,212,0.12)",
  },
  bgOrbBottom: {
    position: "absolute",
    bottom: -140,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(234,179,8,0.10)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  progressMeta: {
    gap: 4,
  },
  eyebrow: {
    color: "#67E8F9",
    fontSize: 14,
  },
  progressLabel: {
    color: "rgba(226,232,240,0.72)",
    fontSize: 13,
    fontWeight: "600",
  },
  cancelButton: {
    minHeight: 40,
    borderRadius: 999,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.72)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.22)",
  },
  cancelButtonText: {
    color: "rgba(226,232,240,0.9)",
    fontSize: 13,
    fontWeight: "700",
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.82)",
    marginTop: 20,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#EAB308",
  },
  hero: {
    marginTop: 32,
    gap: 12,
  },
  title: {
    color: "white",
    fontSize: 34,
    fontWeight: "500",
    lineHeight: 40,
    marginBottom: 0,
  },
  subtitle: {
    color: "rgba(226,232,240,0.8)",
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 520,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  ageCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.18)",
    backgroundColor: "rgba(15,23,42,0.84)",
    padding: 24,
    gap: 12,
  },
  ageLabel: {
    color: "rgba(226,232,240,0.84)",
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  ageInput: {
    minHeight: 88,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    backgroundColor: "rgba(2,6,23,0.92)",
    color: "white",
    fontSize: 32,
    fontWeight: "500",
    paddingHorizontal: 20,
  },
  optionList: {
    gap: 14,
  },
  optionCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    backgroundColor: "rgba(15,23,42,0.84)",
    padding: 24,
    minHeight: 120,
    justifyContent: "center",
    gap: 8,
  },
  optionCardActive: {
    borderColor: "rgba(234,179,8,0.52)",
    backgroundColor: "rgba(146,64,14,0.24)",
  },
  optionTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "700",
  },
  optionTitleActive: {
    color: "#FEF3C7",
  },
  optionHint: {
    color: "rgba(191,219,254,0.78)",
    fontSize: 14,
    lineHeight: 20,
  },
  optionHintActive: {
    color: "rgba(254,243,199,0.84)",
  },
  errorText: {
    marginTop: 16,
    color: "#FCA5A5",
    fontSize: 13,
    lineHeight: 19,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginBottom: 50,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.2)",
    backgroundColor: "rgba(15,23,42,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "rgba(226,232,240,0.92)",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryPlaceholder: {
    flex: 1,
  },
  primaryButton: {
    flex: 1.4,
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: "#EAB308",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "800",
  },
  inputInvalid: {
    borderColor: "rgba(248,113,113,0.58)",
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.9,
  },
});
