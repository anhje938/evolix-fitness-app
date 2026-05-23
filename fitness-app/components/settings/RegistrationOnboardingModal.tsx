import { GLOBAL_IOS_KEYBOARD_ACCESSORY_ID } from "@/components/common/GlobalKeyboardAccessory";
import { AppDateTimePicker } from "@/components/date/AppDateTimePicker";
import { useAuth } from "@/context/AuthProvider";
import { useUserSettings } from "@/context/UserSettingsProvider";
import type {
  AppLanguage,
  UserGender,
  UserSettings,
} from "@/types/userSettings";
import { getFutureUtcNoonIsoDate, toUtcNoonIsoDate } from "@/utils/date";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const inputProps = {
  inputAccessoryViewID: GLOBAL_IOS_KEYBOARD_ACCESSORY_ID,
  returnKeyType: "done" as const,
  submitBehavior: "blurAndSubmit" as const,
  onSubmitEditing: () => Keyboard.dismiss(),
};

type StepKey = "profile" | "goal" | "weight" | "macros" | "finish";
type GenderChoice = UserGender | "other";
type WeightDirection = NonNullable<UserSettings["weightDirection"]>;

const FORCE_EXPO_GO_REGISTRATION_ON_EACH_OPEN = false;
const STEP_ORDER: StepKey[] = [
  "profile",
  "goal",
  "weight",
  "macros",
  "finish",
];

const GOAL_OPTIONS = [
  {
    value: "lose" as const,
    title: "Cut",
    subtitle: "Gå ned i vekt",
    subtitleEn: "Lose weight",
    icon: "trending-down" as const,
    color: "#FB7185",
    background: "rgba(251,113,133,0.1)",
    gradient: ["#FB7185", "#F97316"] as [string, string],
  },
  {
    value: "gain" as const,
    title: "Bulk",
    subtitle: "Bygge muskler",
    subtitleEn: "Build muscle",
    icon: "trending-up" as const,
    color: "#38BDF8",
    background: "rgba(56,189,248,0.1)",
    gradient: ["#38BDF8", "#6366F1"] as [string, string],
  },
  {
    value: "maintain" as const,
    title: "Maintenance",
    subtitle: "Vedlikehold",
    subtitleEn: "Maintain",
    icon: "remove" as const,
    color: "#11D6C0",
    background: "rgba(17,214,192,0.1)",
    gradient: ["#11D6C0", "#A3E635"] as [string, string],
  },
];

const STEP_META = {
  profile: {
    icon: "person-outline" as const,
    colors: ["#10D9E6", "#11D6C0"] as [string, string],
  },
  goal: {
    icon: "flag-outline" as const,
    colors: ["#FB7185", "#F97316"] as [string, string],
  },
  weight: {
    icon: "scale-outline" as const,
    colors: ["#38BDF8", "#11D6C0"] as [string, string],
  },
  macros: {
    icon: "sparkles-outline" as const,
    colors: ["#A855F7", "#EC4899"] as [string, string],
  },
  finish: {
    icon: "checkmark-circle-outline" as const,
    colors: ["#11D6C0", "#A3E635"] as [string, string],
  },
};

function parseAge(value: string) {
  const n = Number(value.replace(",", ".").trim());
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  return rounded >= 18 && rounded <= 120 ? rounded : null;
}

function parsePositiveNumber(value: string) {
  const n = Number(value.replace(",", ".").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

function sanitizeNumberText(value: string, maxLength = 7) {
  return value
    .replace(/[^0-9,.]/g, "")
    .replace(",", ".")
    .slice(0, maxLength);
}

function roundTo(value: number, decimals = 0) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function formatNumber(value: number | null, decimals = 0) {
  if (value == null || !Number.isFinite(value)) return "--";
  return new Intl.NumberFormat("nb-NO", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}

function toSafeDate(value: string | null | undefined) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
}

function addDays(date: Date, days: number) {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

function buildMacroSuggestion(
  currentWeightKg: number | null,
  direction: WeightDirection
) {
  const weight = currentWeightKg && currentWeightKg > 0 ? currentWeightKg : 80;
  const adjustment =
    direction === "lose" ? -350 : direction === "gain" ? 250 : 0;
  const calories = Math.max(
    1400,
    Math.round((weight * 30 + adjustment) / 10) * 10
  );
  const protein = Math.round(weight * (direction === "lose" ? 2.2 : 2));
  const fat = Math.round(weight * (direction === "gain" ? 0.9 : 0.8));
  const carbs = Math.max(
    80,
    Math.round((calories - protein * 4 - fat * 9) / 4)
  );

  return { calories, protein, carbs, fat };
}

export function RegistrationOnboardingModal() {
  const scrollViewRef = useRef<ScrollView>(null);
  const { token, authReady } = useAuth();
  const {
    userSettings,
    saveUserSettingsNow,
    hasLoadedUserSettings,
    isSavingUserSettings,
    userSettingsError,
  } = useUserSettings();

  const [ageText, setAgeText] = useState("");
  const [gender, setGender] = useState<GenderChoice | null>(null);
  const [language, setLanguage] = useState<AppLanguage>("nb");
  const [weightDirection, setWeightDirection] =
    useState<WeightDirection>("maintain");
  const [currentWeightText, setCurrentWeightText] = useState("");
  const [goalWeightText, setGoalWeightText] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [goalDate, setGoalDate] = useState<Date | null>(
    toSafeDate(getFutureUtcNoonIsoDate(84))
  );
  const [calorieGoalText, setCalorieGoalText] = useState("");
  const [proteinGoalText, setProteinGoalText] = useState("");
  const [carbGoalText, setCarbGoalText] = useState("");
  const [fatGoalText, setFatGoalText] = useState("");
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [showValidation, setShowValidation] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [
    hasCompletedForcedRegistrationThisOpen,
    setHasCompletedForcedRegistrationThisOpen,
  ] = useState(false);

  const shouldForceExpoGoRegistration =
    FORCE_EXPO_GO_REGISTRATION_ON_EACH_OPEN &&
    Constants.appOwnership === "expo" &&
    !hasCompletedForcedRegistrationThisOpen;

  const visible =
    authReady &&
    !!token &&
    hasLoadedUserSettings &&
    (!userSettings.hasCompletedRegistration || shouldForceExpoGoRegistration);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, () =>
      setIsKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener(hideEvent, () =>
      setIsKeyboardVisible(false)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!visible) setIsKeyboardVisible(false);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    const savedStartDate = toSafeDate(userSettings.cutStartDateUtc);
    const savedGoalDate = toSafeDate(userSettings.weightGoalTimeUtc);
    const savedStartWeight =
      userSettings.cutStartWeightKg ?? userSettings.weightGoalKg;

    setAgeText(userSettings.age ? String(userSettings.age) : "");
    setGender(userSettings.gender);
    setLanguage(userSettings.language);
    setWeightDirection(userSettings.weightDirection ?? "maintain");
    setCurrentWeightText(savedStartWeight ? String(savedStartWeight) : "");
    setGoalWeightText(
      userSettings.weightGoalKg ? String(userSettings.weightGoalKg) : ""
    );
    setStartDate(savedStartDate ?? new Date());
    setGoalDate(savedGoalDate ?? addDays(new Date(), 84));
    setCalorieGoalText(String(userSettings.calorieGoal));
    setProteinGoalText(String(userSettings.proteinGoal));
    setCarbGoalText(String(userSettings.carbGoal));
    setFatGoalText(String(userSettings.fatGoal));
    setShowSuggestion(false);
    setStepIndex(0);
    setShowValidation(false);
  }, [
    userSettings.age,
    userSettings.gender,
    userSettings.language,
    userSettings.weightDirection,
    userSettings.cutStartWeightKg,
    userSettings.weightGoalKg,
    userSettings.weightGoalTimeUtc,
    userSettings.cutStartDateUtc,
    userSettings.calorieGoal,
    userSettings.proteinGoal,
    userSettings.carbGoal,
    userSettings.fatGoal,
    visible,
  ]);

  const age = useMemo(() => parseAge(ageText), [ageText]);
  const currentWeight = useMemo(
    () => parsePositiveNumber(currentWeightText),
    [currentWeightText]
  );
  const goalWeight = useMemo(
    () => parsePositiveNumber(goalWeightText),
    [goalWeightText]
  );
  const calorieGoal = useMemo(
    () => parsePositiveNumber(calorieGoalText),
    [calorieGoalText]
  );
  const proteinGoal = useMemo(
    () => parsePositiveNumber(proteinGoalText),
    [proteinGoalText]
  );
  const carbGoal = useMemo(
    () => parsePositiveNumber(carbGoalText),
    [carbGoalText]
  );
  const fatGoal = useMemo(
    () => parsePositiveNumber(fatGoalText),
    [fatGoalText]
  );
  const step = STEP_ORDER[stepIndex];
  const isLastStep = stepIndex === STEP_ORDER.length - 1;
  const progress = ((stepIndex + 1) / STEP_ORDER.length) * 100;

  const totalWeightChange =
    currentWeight != null && goalWeight != null
      ? Math.abs(goalWeight - currentWeight)
      : null;
  const weekCount =
    startDate && goalDate
      ? Math.max((goalDate.getTime() - startDate.getTime()) / 604800000, 0)
      : 0;
  const weeklyWeightChange =
    totalWeightChange != null && weekCount > 0
      ? totalWeightChange / weekCount
      : null;

  const paceWarning = useMemo(() => {
    if (weeklyWeightChange == null || weeklyWeightChange <= 1) return null;
    if (weeklyWeightChange > 2) {
      return {
        title: language === "en" ? "Very high pace" : "Svært høyt tempo",
        body:
          language === "en"
            ? "The goal requires more than 2 kg per week. There is a high chance this is too much, so consider adding more time."
            : "Målet krever mer enn 2 kg per uke. Det er stor sjanse for at dette er for mye, og det kan være lurt å velge mer tid.",
        severe: true,
      };
    }

    return {
      title: language === "en" ? "High pace" : "Høyt tempo",
      body:
        language === "en"
          ? "The goal requires more than 1 kg per week. That can be too much for many people, so consider a calmer plan."
          : "Målet krever mer enn 1 kg per uke. Det kan være for mye for mange, så vurder en roligere plan.",
      severe: false,
    };
  }, [language, weeklyWeightChange]);

  const macroSuggestion = useMemo(
    () => buildMacroSuggestion(currentWeight, weightDirection),
    [currentWeight, weightDirection]
  );
  const macroCalories =
    proteinGoal != null && carbGoal != null && fatGoal != null
      ? proteinGoal * 4 + carbGoal * 4 + fatGoal * 9
      : null;
  const macroDiff =
    calorieGoal != null && macroCalories != null
      ? Math.round(calorieGoal - macroCalories)
      : null;
  const copy =
    language === "en"
      ? {
          age: "Age",
          gender: "Gender",
          male: "Male",
          female: "Female",
          other: "Other",
          language: "Language",
          currentWeight: "Current weight",
          targetWeight: "Target weight",
          startDate: "Start date",
          targetDate: "Target date",
          evaluationDate: "Evaluation date",
          totalChange: "Total change",
          weeks: "Weeks",
          perWeek: "Per week",
          coachSuggestionAvailable: "Smart suggestion available",
          basedOnWeightGoal: "Based on weight and goal",
          seeSuggestion: "View suggestion",
          recommendation: "Recommendation",
          optimizedFor: "Optimized for",
          useValues: "Use these values",
          calories: "Calories",
          calorieGoal: "Calorie goal",
          protein: "Protein",
          carbs: "Carbs",
          carbohydrates: "Carbohydrates",
          fat: "Fat",
          macrosMismatchTitle: "Macros do not fully match",
          macrosMismatchBody: (macroCaloriesValue: number, diff: number) =>
            `Macros equal ${macroCaloriesValue} kcal, which is ${diff} kcal away from your calorie goal.`,
          profileReady: "Profile is ready",
          finishBody:
            "The app uses this for goals, reports and daily overviews.",
          goal: "Goal",
          weightPlan: "Weight plan",
          macros: "Macros",
          weightPlanValue: (change: string, weeks: string) =>
            `${change} kg over ${weeks} weeks`,
          validation: "Fill in the fields correctly before continuing.",
          saveError: "Could not save settings right now.",
          step: (current: number, total: number) =>
            `Step ${current} of ${total}`,
          back: "Back",
          next: "Next",
          saving: "Saving",
          start: "Start",
        }
      : {
          age: "Alder",
          gender: "Kjønn",
          male: "Mann",
          female: "Kvinne",
          other: "Annet",
          language: "Språk",
          currentWeight: "Nåværende vekt",
          targetWeight: "Målvekt",
          startDate: "Startdato",
          targetDate: "Måldato",
          evaluationDate: "Evalueringsdato",
          totalChange: "Total endring",
          weeks: "Uker",
          perWeek: "Per uke",
          coachSuggestionAvailable: "Smart forslag tilgjengelig",
          basedOnWeightGoal: "Basert på vekt og mål",
          seeSuggestion: "Se forslag",
          recommendation: "Anbefaling",
          optimizedFor: "Optimalisert for",
          useValues: "Bruk disse verdiene",
          calories: "Kalorier",
          calorieGoal: "Kalorimål",
          protein: "Protein",
          carbs: "Karbo",
          carbohydrates: "Karbohydrater",
          fat: "Fett",
          macrosMismatchTitle: "Makroene stemmer ikke helt",
          macrosMismatchBody: (macroCaloriesValue: number, diff: number) =>
            `Makroene tilsvarer ${macroCaloriesValue} kcal, som er ${diff} kcal unna kalorimålet.`,
          profileReady: "Profilen er klar",
          finishBody:
            "Appen bruker dette til mål, rapporter og daglige oversikter.",
          goal: "Mål",
          weightPlan: "Vektplan",
          macros: "Makroer",
          weightPlanValue: (change: string, weeks: string) =>
            `${change} kg over ${weeks} uker`,
          validation: "Fyll ut feltene riktig før du går videre.",
          saveError: "Kunne ikke lagre innstillingene akkurat nå.",
          step: (current: number, total: number) =>
            `Steg ${current} av ${total}`,
          back: "Tilbake",
          next: "Neste",
          saving: "Lagrer",
          start: "Start",
        };

  const canContinue =
    (step === "profile" && !!age && !!gender && !!language) ||
    (step === "goal" && !!weightDirection) ||
    (step === "weight" &&
      currentWeight != null &&
      goalWeight != null &&
      !!startDate &&
      !!goalDate &&
      weekCount > 0) ||
    (step === "macros" &&
      calorieGoal != null &&
      proteinGoal != null &&
      carbGoal != null &&
      fatGoal != null) ||
    step === "finish";

  const applyMacroSuggestion = () => {
    setCalorieGoalText(String(macroSuggestion.calories));
    setProteinGoalText(String(macroSuggestion.protein));
    setCarbGoalText(String(macroSuggestion.carbs));
    setFatGoalText(String(macroSuggestion.fat));
    setShowSuggestion(false);
    setShowValidation(false);
  };

  const submitSettings = async () => {
    if (
      !age ||
      !gender ||
      !goalWeight ||
      !currentWeight ||
      !goalDate ||
      !startDate ||
      !calorieGoal ||
      !proteinGoal ||
      !carbGoal ||
      !fatGoal
    ) {
      return;
    }

    try {
      await saveUserSettingsNow(
        {
          ...userSettings,
          age,
          gender: gender === "other" ? null : gender,
          language,
          weightDirection,
          weightGoalKg: roundTo(goalWeight, 1),
          weightGoalTimeUtc:
            toUtcNoonIsoDate(goalDate) ?? userSettings.weightGoalTimeUtc,
          cutStartDateUtc: toUtcNoonIsoDate(startDate),
          cutStartWeightKg: roundTo(currentWeight, 1),
          calorieGoal: Math.round(calorieGoal),
          proteinGoal: Math.round(proteinGoal),
          carbGoal: Math.round(carbGoal),
          fatGoal: Math.round(fatGoal),
          hasCompletedRegistration: true,
          hasDismissedRegistrationOnboarding: true,
        },
        { requireRemoteSuccess: true }
      );
      setHasCompletedForcedRegistrationThisOpen(true);
    } catch {
      // The provider owns the visible error state.
    }
  };

  const handleContinue = () => {
    Keyboard.dismiss();
    setShowValidation(true);
    if (!canContinue) return;

    if (isLastStep) {
      void submitSettings();
      return;
    }

    setStepIndex((current) => current + 1);
    setShowValidation(false);
  };

  const renderNumberInput = (
    value: string,
    onChangeText: (value: string) => void,
    placeholder: string,
    suffix?: string,
    invalid?: boolean
  ) => (
    <View style={[styles.inputShell, invalid && styles.inputInvalid]}>
      <TextInput
        {...inputProps}
        value={value}
        onChangeText={(next) => {
          onChangeText(sanitizeNumberText(next));
          setShowValidation(false);
        }}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor="rgba(148,163,184,0.62)"
        style={styles.input}
        onSubmitEditing={handleContinue}
      />
      {suffix ? <Text style={styles.inputSuffix}>{suffix}</Text> : null}
    </View>
  );

  const renderProfileStep = () => (
    <>
      <Text style={styles.sectionLabel}>{copy.age}</Text>
      {renderNumberInput(
        ageText,
        setAgeText,
        "25",
        undefined,
        showValidation && !age
      )}

      <Text style={styles.sectionLabel}>{copy.gender}</Text>
      <View style={styles.threeColumnGrid}>
        {[
          { value: "male" as const, label: copy.male, icon: "male" as const },
          {
            value: "female" as const,
            label: copy.female,
            icon: "female" as const,
          },
          { value: "other" as const, label: copy.other, icon: "ellipse" as const },
        ].map((option) => {
          const active = gender === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => {
                setGender(option.value);
                setShowValidation(false);
              }}
              style={({ pressed }) => [
                styles.compactOption,
                active && styles.optionActive,
                pressed && styles.pressed,
              ]}
            >
              {active ? <View style={styles.optionGlowLine} /> : null}
              <Ionicons
                name={option.icon}
                size={20}
                color={active ? "#11D6C0" : "rgba(226,232,240,0.75)"}
              />
              <Text
                style={[styles.compactOptionText, active && styles.activeText]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>{copy.language}</Text>
      <View style={styles.twoColumnGrid}>
        {[
          { value: "nb" as const, label: "NO" },
          { value: "en" as const, label: "EN" },
        ].map((option) => {
          const active = language === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => {
                setLanguage(option.value);
                setShowValidation(false);
              }}
              style={({ pressed }) => [
                styles.languageOption,
                active && styles.optionActive,
                pressed && styles.pressed,
              ]}
            >
              {active ? <View style={styles.optionGlowLine} /> : null}
              <Text style={[styles.languageText, active && styles.activeText]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );

  const renderGoalStep = () => (
    <View style={styles.optionList}>
      {GOAL_OPTIONS.map((option) => {
        const active = weightDirection === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              setWeightDirection(option.value);
              setShowValidation(false);
            }}
            style={({ pressed }) => [
              styles.goalOption,
              active && styles.goalOptionActive,
              active && {
                borderColor: option.color,
                backgroundColor: option.background,
              },
              pressed && styles.pressed,
            ]}
          >
            <LinearGradient
              colors={
                active
                  ? option.gradient
                  : ["rgba(15,23,42,0.76)", "rgba(30,41,59,0.62)"]
              }
              style={styles.iconBox}
            >
              <Ionicons
                name={option.icon}
                size={24}
                color={active ? "#FFFFFF" : "rgba(226,232,240,0.72)"}
              />
            </LinearGradient>
            <View style={styles.optionCopy}>
              <Text style={[styles.optionTitle, active && styles.activeText]}>
                {option.title}
              </Text>
              <Text style={styles.optionSubtitle}>
                {language === "en" ? option.subtitleEn : option.subtitle}
              </Text>
            </View>
            {active ? (
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={option.color}
              />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );

  const renderWeightStep = () => (
    <>
      <View style={styles.fieldGroup}>
        <View style={styles.labelRow}>
          <Ionicons name="scale-outline" size={15} color="#10D9E6" />
          <Text style={styles.sectionLabelInline}>{copy.currentWeight}</Text>
        </View>
        {renderNumberInput(
          currentWeightText,
          setCurrentWeightText,
          "85",
          "kg",
          showValidation && currentWeight == null
        )}
      </View>

      <View style={styles.fieldGroup}>
        <View style={styles.labelRow}>
          <Ionicons name="radio-button-on-outline" size={15} color="#11D6C0" />
          <Text style={styles.sectionLabelInline}>{copy.targetWeight}</Text>
        </View>
        {renderNumberInput(
          goalWeightText,
          setGoalWeightText,
          "80",
          "kg",
          showValidation && goalWeight == null
        )}
      </View>

      <View style={styles.dateGrid}>
        <View style={styles.dateItem}>
          <AppDateTimePicker
            label={copy.startDate}
            mode="date"
            compact
            value={startDate}
            onChange={setStartDate}
          />
        </View>
        <View style={styles.dateItem}>
          <AppDateTimePicker
            label={
              weightDirection === "maintain"
                ? copy.evaluationDate
                : copy.targetDate
            }
            mode="date"
            compact
            value={goalDate}
            onChange={setGoalDate}
          />
        </View>
      </View>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryValue}>
            {formatNumber(totalWeightChange, 1)} kg
          </Text>
          <Text style={styles.summaryLabel}>{copy.totalChange}</Text>
        </View>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryValue}>{formatNumber(weekCount, 0)}</Text>
          <Text style={styles.summaryLabel}>{copy.weeks}</Text>
        </View>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryValue}>
            {formatNumber(weeklyWeightChange, 2)} kg
          </Text>
          <Text style={styles.summaryLabel}>{copy.perWeek}</Text>
        </View>
      </View>

      {paceWarning ? (
        <View
          style={[
            styles.warningBox,
            paceWarning.severe && styles.warningBoxSevere,
          ]}
        >
          <Ionicons
            name="warning-outline"
            size={18}
            color={paceWarning.severe ? "#FB7185" : "#FACC15"}
          />
          <View style={styles.warningCopy}>
            <Text
              style={[
                styles.warningTitle,
                paceWarning.severe && styles.warningTitleSevere,
              ]}
            >
              {paceWarning.title}
            </Text>
            <Text style={styles.warningBody}>{paceWarning.body}</Text>
          </View>
        </View>
      ) : null}
    </>
  );

  const renderMacrosStep = () => (
    <>
      {!showSuggestion ? (
        <Pressable
          onPress={() => setShowSuggestion(true)}
          style={({ pressed }) => [
            styles.suggestionCollapsed,
            pressed && styles.pressed,
          ]}
        >
          <LinearGradient
            colors={["#A855F7", "#EC4899"]}
            style={styles.suggestionIcon}
          >
            <Ionicons name="sparkles-outline" size={20} color="#FFFFFF" />
          </LinearGradient>
          <View style={styles.optionCopy}>
            <Text style={styles.suggestionTitle}>
              {copy.coachSuggestionAvailable}
            </Text>
            <Text style={styles.optionSubtitle}>{copy.basedOnWeightGoal}</Text>
          </View>
          <Text style={styles.suggestionLink}>{copy.seeSuggestion}</Text>
        </Pressable>
      ) : (
        <View style={styles.suggestionExpanded}>
          <View style={styles.suggestionHeader}>
            <View>
              <Text style={styles.suggestionTitle}>{copy.recommendation}</Text>
              <Text style={styles.optionSubtitle}>
                {copy.optimizedFor}{" "}
                {weightDirection === "lose"
                  ? "cut"
                  : weightDirection === "gain"
                  ? "bulk"
                  : language === "en"
                  ? "maintenance"
                  : "vedlikehold"}
              </Text>
            </View>
            <Pressable onPress={() => setShowSuggestion(false)} hitSlop={10}>
              <Ionicons name="close" size={20} color="rgba(226,232,240,0.72)" />
            </Pressable>
          </View>
          <View style={styles.suggestionGrid}>
            <View style={styles.suggestionMetric}>
              <Text style={styles.metricLabel}>{copy.calories}</Text>
              <Text style={styles.metricValue}>{macroSuggestion.calories}</Text>
            </View>
            <View style={styles.suggestionMetric}>
              <Text style={styles.metricLabel}>{copy.protein}</Text>
              <Text style={styles.metricValue}>{macroSuggestion.protein}g</Text>
            </View>
            <View style={styles.suggestionMetric}>
              <Text style={styles.metricLabel}>{copy.carbohydrates}</Text>
              <Text style={styles.metricValue}>{macroSuggestion.carbs}g</Text>
            </View>
            <View style={styles.suggestionMetric}>
              <Text style={styles.metricLabel}>{copy.fat}</Text>
              <Text style={styles.metricValue}>{macroSuggestion.fat}g</Text>
            </View>
          </View>
          <Pressable
            onPress={applyMacroSuggestion}
            style={({ pressed }) => [
              styles.suggestionButton,
              pressed && styles.pressed,
            ]}
          >
            <LinearGradient
              colors={["#A855F7", "#EC4899"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.suggestionButtonGradient}
            >
              <Text style={styles.suggestionButtonText}>
                {copy.useValues}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}

      <View style={styles.fieldGroup}>
        <View style={styles.labelRow}>
          <Ionicons name="flame-outline" size={15} color="#F97316" />
          <Text style={styles.sectionLabelInline}>{copy.calorieGoal}</Text>
        </View>
        {renderNumberInput(
          calorieGoalText,
          setCalorieGoalText,
          "2500",
          "kcal",
          showValidation && calorieGoal == null
        )}
      </View>

      <View style={styles.macroGrid}>
        <View style={[styles.fieldGroup, styles.macroField]}>
          <Text style={styles.sectionLabelInline}>{copy.protein}</Text>
          {renderNumberInput(
            proteinGoalText,
            setProteinGoalText,
            "150",
            "g",
            showValidation && proteinGoal == null
          )}
        </View>
        <View style={[styles.fieldGroup, styles.macroField]}>
          <Text style={styles.sectionLabelInline}>{copy.carbs}</Text>
          {renderNumberInput(
            carbGoalText,
            setCarbGoalText,
            "250",
            "g",
            showValidation && carbGoal == null
          )}
        </View>
        <View style={[styles.fieldGroup, styles.macroField]}>
          <Text style={styles.sectionLabelInline}>{copy.fat}</Text>
          {renderNumberInput(
            fatGoalText,
            setFatGoalText,
            "80",
            "g",
            showValidation && fatGoal == null
          )}
        </View>
      </View>

      {macroDiff != null && Math.abs(macroDiff) > 100 ? (
        <View style={styles.warningBox}>
          <Ionicons name="warning-outline" size={18} color="#FACC15" />
          <View style={styles.warningCopy}>
            <Text style={styles.warningTitle}>{copy.macrosMismatchTitle}</Text>
            <Text style={styles.warningBody}>
              {copy.macrosMismatchBody(
                Math.round(macroCalories ?? 0),
                Math.abs(macroDiff)
              )}
            </Text>
          </View>
        </View>
      ) : null}
    </>
  );

  const renderFinishStep = () => (
    <View style={styles.finishList}>
      <LinearGradient
        colors={["rgba(17,214,192,0.22)", "rgba(163,230,53,0.12)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.finishHero}
      >
        <Ionicons name="checkmark-circle" size={34} color="#11D6C0" />
        <View style={styles.optionCopy}>
          <Text style={styles.finishTitle}>{copy.profileReady}</Text>
          <Text style={styles.optionSubtitle}>
            {copy.finishBody}
          </Text>
        </View>
      </LinearGradient>
      <View style={styles.finishRow}>
        <Text style={styles.finishLabel}>{copy.goal}</Text>
        <Text style={styles.finishValue}>
          {GOAL_OPTIONS.find((item) => item.value === weightDirection)?.title}
        </Text>
      </View>
      <View style={styles.finishRow}>
        <Text style={styles.finishLabel}>{copy.weightPlan}</Text>
        <Text style={styles.finishValue}>
          {copy.weightPlanValue(
            formatNumber(totalWeightChange, 1),
            formatNumber(weekCount, 0)
          )}
        </Text>
      </View>
      <View style={styles.finishRow}>
        <Text style={styles.finishLabel}>{copy.macros}</Text>
        <Text style={styles.finishValue}>
          {Math.round(calorieGoal ?? 0)} kcal · {Math.round(proteinGoal ?? 0)}g
          protein
        </Text>
      </View>
      <View style={styles.finishRow}>
        <Text style={styles.finishLabel}>{copy.language}</Text>
        <Text style={styles.finishValue}>
          {language === "nb" ? "NO" : "EN"}
        </Text>
      </View>
    </View>
  );

  const titleByStep: Record<StepKey, string> =
    language === "en"
      ? {
          profile: "Personal information",
          goal: "Choose your goal",
          weight: "Weight details",
          macros: "Macro goals",
          finish: "Ready to start",
        }
      : {
          profile: "Personlig informasjon",
          goal: "Velg ditt mål",
          weight: "Vektdetaljer",
          macros: "Makromål",
          finish: "Klar til start",
        };

  const subtitleByStep: Record<StepKey, string> =
    language === "en"
      ? {
          profile: "Let us get to know you",
          goal: "What do you want to achieve?",
          weight: "Set a realistic pace for your goal",
          macros: "Choose daily goals for energy and nutrition",
          finish: "Review the setup before you start",
        }
      : {
          profile: "La oss bli kjent med deg",
          goal: "Hva ønsker du å oppnå?",
          weight: "Sett et realistisk tempo for målet ditt",
          macros: "Velg daglige mål for energi og næring",
          finish: "Se over oppsettet før du starter",
        };
  const stepMeta = STEP_META[step];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => {}}
    >
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
          style={[styles.flex, isKeyboardVisible && styles.flexKeyboard]}
        >
          <View style={styles.progressHeader}>
            <Text style={styles.progressStep}>
              {copy.step(stepIndex + 1, STEP_ORDER.length)}
            </Text>
            <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={["#10D9E6", "#11D6C0", "#A855F7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${progress}%` }]}
            />
          </View>

          <ScrollView
            ref={scrollViewRef}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              isKeyboardVisible && styles.scrollContentKeyboard,
            ]}
          >
            <View
              style={[styles.panel, isKeyboardVisible && styles.panelKeyboard]}
            >
              <View
                style={[
                  styles.panelHead,
                  isKeyboardVisible && styles.panelHeadKeyboard,
                ]}
              >
                <LinearGradient
                  colors={stepMeta.colors}
                  style={[
                    styles.stepBadge,
                    isKeyboardVisible && styles.stepBadgeKeyboard,
                  ]}
                >
                  <Ionicons name={stepMeta.icon} size={24} color="#07111F" />
                </LinearGradient>
                <View style={styles.optionCopy}>
                  <Text
                    style={[
                      styles.title,
                      isKeyboardVisible && styles.titleKeyboard,
                    ]}
                  >
                    {titleByStep[step]}
                  </Text>
                  <Text
                    style={[
                      styles.subtitle,
                      isKeyboardVisible && styles.subtitleKeyboard,
                    ]}
                  >
                    {subtitleByStep[step]}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.stepContent,
                  isKeyboardVisible && styles.stepContentKeyboard,
                ]}
              >
                {step === "profile" ? renderProfileStep() : null}
                {step === "goal" ? renderGoalStep() : null}
                {step === "weight" ? renderWeightStep() : null}
                {step === "macros" ? renderMacrosStep() : null}
                {step === "finish" ? renderFinishStep() : null}

                {showValidation && !canContinue ? (
                  <Text style={styles.errorText}>
                    {copy.validation}
                  </Text>
                ) : null}

                {userSettingsError ? (
                  <Text style={styles.errorText}>
                    {copy.saveError}
                  </Text>
                ) : null}
              </View>
            </View>
          </ScrollView>

          <View
            style={[styles.footer, isKeyboardVisible && styles.footerKeyboard]}
          >
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
                <Text style={styles.secondaryButtonText}>{copy.back}</Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={handleContinue}
              disabled={isSavingUserSettings}
              style={({ pressed }) => [
                styles.primaryButton,
                stepIndex === 0 && styles.primaryButtonFull,
                isSavingUserSettings && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <LinearGradient
                colors={["#11D6C0", "#10D9E6", "#A3E635"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButtonGradient}
              >
                <Text style={styles.primaryButtonText}>
                  {isSavingUserSettings
                    ? copy.saving
                    : isLastStep
                    ? copy.start
                    : copy.next}
                </Text>
              </LinearGradient>
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
    backgroundColor: "#050B16",
  },
  flex: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  flexKeyboard: {
    paddingTop: 12,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
    marginBottom: 7,
  },
  progressStep: {
    color: "rgba(226,232,240,0.74)",
    fontSize: 12,
    fontWeight: "500",
  },
  progressPercent: {
    color: "#10D9E6",
    fontSize: 12,
    fontWeight: "800",
  },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(30,41,59,0.72)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.08)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 28,
  },
  scrollContentKeyboard: {
    justifyContent: "flex-start",
    paddingTop: 18,
    paddingBottom: 18,
  },
  panel: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    backgroundColor: "#121B2A",
    padding: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.3,
    shadowRadius: 28,
    elevation: 10,
  },
  panelKeyboard: {
    padding: 18,
  },
  panelHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  panelHeadKeyboard: {
    alignItems: "flex-start",
    gap: 10,
  },
  stepBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeKeyboard: {
    width: 42,
    height: 42,
    borderRadius: 13,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
  },
  titleKeyboard: {
    fontSize: 20,
    lineHeight: 25,
  },
  subtitle: {
    color: "rgba(203,213,225,0.76)",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  subtitleKeyboard: {
    fontSize: 12,
    lineHeight: 17,
  },
  stepContent: {
    marginTop: 24,
    gap: 14,
  },
  stepContentKeyboard: {
    marginTop: 18,
    gap: 12,
  },
  sectionLabel: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  sectionLabelInline: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "700",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputShell: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    backgroundColor: "#202B3A",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    minHeight: 44,
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "600",
  },
  inputSuffix: {
    color: "rgba(203,213,225,0.72)",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 8,
  },
  inputInvalid: {
    borderColor: "rgba(248,113,113,0.8)",
  },
  twoColumnGrid: {
    flexDirection: "row",
    gap: 10,
  },
  threeColumnGrid: {
    flexDirection: "row",
    gap: 10,
  },
  compactOption: {
    flex: 1,
    minHeight: 76,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    backgroundColor: "#202B3A",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    overflow: "hidden",
  },
  compactOptionText: {
    color: "rgba(226,232,240,0.78)",
    fontSize: 12,
    fontWeight: "700",
  },
  languageOption: {
    flex: 1,
    minHeight: 76,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    backgroundColor: "#202B3A",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  languageText: {
    color: "rgba(226,232,240,0.78)",
    fontSize: 16,
    fontWeight: "800",
  },
  optionActive: {
    borderColor: "rgba(17,214,192,0.64)",
    backgroundColor: "rgba(17,214,192,0.1)",
  },
  optionGlowLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#11D6C0",
  },
  activeText: {
    color: "#F8FAFC",
  },
  optionList: {
    gap: 10,
  },
  goalOption: {
    minHeight: 82,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    backgroundColor: "#202B3A",
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    overflow: "hidden",
  },
  goalOptionActive: {
    borderColor: "rgba(17,214,192,0.64)",
    backgroundColor: "rgba(17,214,192,0.09)",
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxActive: {
    backgroundColor: "rgba(17,214,192,0.14)",
  },
  optionCopy: {
    flex: 1,
    gap: 5,
  },
  optionTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "800",
  },
  optionSubtitle: {
    color: "rgba(203,213,225,0.74)",
    fontSize: 12,
    lineHeight: 18,
  },
  fieldGroup: {
    gap: 8,
  },
  dateGrid: {
    flexDirection: "row",
    gap: 10,
  },
  dateItem: {
    flex: 1,
    minWidth: 0,
  },
  summaryGrid: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.24)",
    backgroundColor: "rgba(17,214,192,0.11)",
    paddingVertical: 14,
    paddingHorizontal: 10,
    flexDirection: "row",
  },
  summaryCell: {
    flex: 1,
    alignItems: "center",
    gap: 5,
  },
  summaryValue: {
    color: "#11D6C0",
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "900",
  },
  summaryLabel: {
    color: "rgba(203,213,225,0.76)",
    fontSize: 11,
    fontWeight: "600",
  },
  warningBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(250,204,21,0.38)",
    backgroundColor: "rgba(250,204,21,0.1)",
    padding: 12,
    flexDirection: "row",
    gap: 10,
  },
  warningBoxSevere: {
    borderColor: "rgba(251,113,133,0.48)",
    backgroundColor: "rgba(251,113,133,0.1)",
  },
  warningCopy: {
    flex: 1,
    gap: 4,
  },
  warningTitle: {
    color: "#FACC15",
    fontSize: 13,
    fontWeight: "800",
  },
  warningTitleSevere: {
    color: "#FB7185",
  },
  warningBody: {
    color: "rgba(226,232,240,0.78)",
    fontSize: 12,
    lineHeight: 18,
  },
  suggestionCollapsed: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(168,85,247,0.32)",
    backgroundColor: "rgba(88,28,135,0.38)",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  suggestionIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EC4899",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.26,
    shadowRadius: 14,
  },
  suggestionTitle: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "800",
  },
  suggestionLink: {
    color: "#D8B4FE",
    fontSize: 12,
    fontWeight: "800",
  },
  suggestionExpanded: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(168,85,247,0.34)",
    backgroundColor: "rgba(88,28,135,0.45)",
    padding: 15,
    gap: 12,
  },
  suggestionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  suggestionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  suggestionMetric: {
    width: "48%",
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: 10,
    gap: 6,
  },
  metricLabel: {
    color: "rgba(226,232,240,0.72)",
    fontSize: 11,
    fontWeight: "600",
  },
  metricValue: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "900",
  },
  suggestionButton: {
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  suggestionButtonGradient: {
    minHeight: 44,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionButtonText: {
    color: "#06251F",
    fontSize: 14,
    fontWeight: "900",
  },
  macroGrid: {
    flexDirection: "row",
    gap: 8,
  },
  macroField: {
    flex: 1,
    minWidth: 0,
  },
  togglePill: {
    width: 46,
    height: 26,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.8)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.26)",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  togglePillActive: {
    backgroundColor: "rgba(17,214,192,0.22)",
    borderColor: "rgba(17,214,192,0.7)",
  },
  toggleDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(226,232,240,0.68)",
  },
  toggleDotActive: {
    alignSelf: "flex-end",
    backgroundColor: "#11D6C0",
  },
  helperText: {
    color: "rgba(203,213,225,0.68)",
    fontSize: 12,
    lineHeight: 18,
  },
  finishList: {
    gap: 12,
  },
  finishHero: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(17,214,192,0.42)",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  finishTitle: {
    color: "#F8FAFC",
    fontSize: 17,
    fontWeight: "900",
  },
  finishRow: {
    minHeight: 44,
    borderRadius: 11,
    backgroundColor: "#202B3A",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  finishLabel: {
    color: "rgba(203,213,225,0.7)",
    fontSize: 12,
    fontWeight: "700",
  },
  finishValue: {
    color: "#F8FAFC",
    flex: 1,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "800",
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    lineHeight: 19,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingBottom: 30,
  },
  footerKeyboard: {
    paddingBottom: 16,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    backgroundColor: "#202B3A",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "800",
  },
  primaryButton: {
    flex: 2.2,
    minHeight: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#11D6C0",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
  },
  primaryButtonFull: {
    flex: 1,
  },
  primaryButtonText: {
    color: "#06251F",
    fontSize: 14,
    fontWeight: "900",
  },
  primaryButtonGradient: {
    minHeight: 46,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.88,
  },
});
