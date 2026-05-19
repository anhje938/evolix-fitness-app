import { clearStoredAuthSession } from "@/api/authSession";
import CloseIcon from "@/assets/icons/white-x.svg";
import {
  GLOBAL_IOS_KEYBOARD_ACCESSORY_ID,
  GlobalKeyboardAccessory,
} from "@/components/common/GlobalKeyboardAccessory";
import { AppDateTimePicker } from "@/components/date/AppDateTimePicker";
import { MODAL_MAX_HEIGHT } from "@/config/modalTheme";
import { typography } from "@/config/typography";
import { useSubscription } from "@/context/SubscriptionProvider";
import { useTranslation } from "@/i18n/translations";
import {
  ADVANCED_MUSCLE_FILTERS,
  type AdvancedMuscleFilterValue,
} from "@/types/muscles";
import {
  type AppLanguage,
  type HomeGoalTile,
  type HomeSectionKey,
  type RecoveryMapMuscleKey,
  type UserSettings,
} from "@/types/userSettings";
import { getFutureUtcNoonIsoDate, toUtcNoonIsoDate } from "@/utils/date";
import Constants from "expo-constants";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  type AlertButton,
  View,
} from "react-native";
import DraggableFlatList, {
  type RenderItemParams,
} from "react-native-draggable-flatlist";

type TabKey = "general" | "user";
const TERMS_URL = "https://evolix.no/terms";
const PRIVACY_URL = "https://evolix.no/privacy";
const SUPPORT_EMAIL = "evolixfitness@hotmail.com";
const APPLE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";

const INITIAL_SETTINGS: UserSettings = {
  age: null,
  gender: null,
  language: "nb",
  hasCompletedRegistration: false,
  hasDismissedRegistrationOnboarding: false,
  calorieGoal: 2500,
  proteinGoal: 180,
  fatGoal: 70,
  carbGoal: 220,
  showOnlyCustomTrainingContent: false,
  muscleFilter: "advanced",
  recoveryMapHiddenMuscles: [],
  homeGoalTiles: ["calories", "protein", "carbs", "fat"],
  homeSectionOrder: ["quickStart", "goals", "weight", "recoveryMap"],
  useFoodCoach: true,
  useWorkoutCoach: true,
  foodCoachExcludedDateKeys: [],
  weightGoalKg: 84,
  weightGoalTimeUtc: getFutureUtcNoonIsoDate(84),
  cutStartDateUtc: null,
  cutStartWeightKg: null,
  weightDirection: "maintain",
};

type Props = {
  visible: boolean;
  setVisible: (value: boolean) => void;

  userSettings?: UserSettings;
  onChangeUserSettings?: (next: UserSettings) => void;
  onSaveUserSettingsNow?: (next: UserSettings) => Promise<void> | void;
  onRefreshUserSettings?: () => Promise<void> | void;
  isLoadingUserSettings?: boolean;
  isSavingUserSettings?: boolean;
  userSettingsError?: string | null;

  onLogout?: () => Promise<void> | void;
  onDeleteAccount?: () => Promise<void> | void;
};

const DELETE_CONFIRM_WORD = "SLETT";
const ALL_HOME_SECTIONS: HomeSectionKey[] = [
  "quickStart",
  "goals",
  "weight",
  "recoveryMap",
];
const ALL_RECOVERY_MUSCLES: RecoveryMapMuscleKey[] =
  ADVANCED_MUSCLE_FILTERS.filter((item) => item.value !== "ALL").map(
    (item) => item.value as RecoveryMapMuscleKey
  );
const LANGUAGE_OPTIONS: { value: AppLanguage; label: string }[] = [
  { value: "nb", label: "Norsk" },
  { value: "en", label: "English" },
];

const settingsInputProps = {
  inputAccessoryViewID: GLOBAL_IOS_KEYBOARD_ACCESSORY_ID,
  returnKeyType: "done" as const,
  submitBehavior: "blurAndSubmit" as const,
  onSubmitEditing: () => Keyboard.dismiss(),
};

const settingsLightTheme = {
  backdrop: "rgba(15,23,42,0.42)",
  surface: "#F8FAFC",
  surfaceSoft: "#EEF4FA",
  item: "#FFFFFF",
  itemSoft: "#F1F5F9",
  border: "rgba(148,163,184,0.34)",
  borderSoft: "rgba(148,163,184,0.22)",
  text: "#0F172A",
  textSoft: "#334155",
  muted: "#64748B",
  accent: "#2563EB",
  accentSoft: "rgba(37,99,235,0.10)",
  success: "#15803D",
  successSoft: "rgba(34,197,94,0.10)",
  danger: "#DC2626",
  dangerSoft: "rgba(248,113,113,0.10)",
};

function clampInt(value: string, fallback: number) {
  const cleaned = value.replace(",", ".").trim();
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n));
}

function clampOptionalWeight(value: string): number | null {
  const cleaned = value.replace(",", ".").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.max(20, Math.min(500, Number(n.toFixed(1))));
}

function clampOptionalAge(value: string) {
  const cleaned = value.replace(",", ".").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < 18) return null;
  return Math.min(120, rounded);
}

function toSafeDate(value: string | null | undefined) {
  const date = new Date(value ?? "");
  return Number.isFinite(date.getTime()) ? date : null;
}

function toggleTile(list: HomeGoalTile[], tile: HomeGoalTile) {
  const has = list.includes(tile);
  if (has) {
    const next = list.filter((t) => t !== tile);
    return next.length > 0 ? next : list;
  }
  return [...list, tile];
}

function normalizeHomeSectionOrder(input: unknown): HomeSectionKey[] {
  if (!Array.isArray(input)) return [...ALL_HOME_SECTIONS];

  const next: HomeSectionKey[] = [];
  const seen = new Set<HomeSectionKey>();

  for (const raw of input) {
    if (typeof raw !== "string") continue;
    if (!ALL_HOME_SECTIONS.includes(raw as HomeSectionKey)) continue;
    const key = raw as HomeSectionKey;
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(key);
  }

  if (next.length !== ALL_HOME_SECTIONS.length) {
    for (const key of ALL_HOME_SECTIONS) {
      if (!seen.has(key)) next.push(key);
    }
  }

  return next;
}

function normalizeRecoveryMapHiddenMuscles(
  input: unknown
): RecoveryMapMuscleKey[] {
  if (!Array.isArray(input)) return [];

  const next: RecoveryMapMuscleKey[] = [];
  const seen = new Set<RecoveryMapMuscleKey>();

  for (const raw of input) {
    if (typeof raw !== "string") continue;
    if (!ALL_RECOVERY_MUSCLES.includes(raw as RecoveryMapMuscleKey)) continue;
    const muscle = raw as RecoveryMapMuscleKey;
    if (seen.has(muscle)) continue;
    seen.add(muscle);
    next.push(muscle);
  }

  return next;
}

function toggleRecoveryMuscleVisibility(
  hidden: RecoveryMapMuscleKey[],
  muscle: RecoveryMapMuscleKey
) {
  if (hidden.includes(muscle)) {
    return hidden.filter((m) => m !== muscle);
  }
  return [...hidden, muscle];
}

function toRecoveryMuscleLabel(value: AdvancedMuscleFilterValue): string {
  const fromConfig = ADVANCED_MUSCLE_FILTERS.find(
    (item) => item.value === value
  );
  return fromConfig?.label ?? String(value);
}

export default function SettingsModal({
  visible,
  setVisible,
  userSettings,
  onChangeUserSettings,
  onSaveUserSettingsNow,
  onRefreshUserSettings,
  isLoadingUserSettings = false,
  isSavingUserSettings = false,
  userSettingsError = null,
  onLogout,
  onDeleteAccount,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("general");
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isRestoringPurchases, setIsRestoringPurchases] = useState(false);
  const [isRefreshingSubscription, setIsRefreshingSubscription] =
    useState(false);
  const subscription = useSubscription();
  const { t } = useTranslation();

  const isControlled = !!userSettings && !!onChangeUserSettings;

  const [localSettings, setLocalSettings] = useState<UserSettings>(
    userSettings ?? INITIAL_SETTINGS
  );
  const genderOptions = useMemo(
    () => [
      { value: "male" as const, label: t("settingsGenderMale") },
      { value: "female" as const, label: t("settingsGenderFemale") },
    ],
    [t]
  );

  useEffect(() => {
    if (userSettings) setLocalSettings(userSettings);
  }, [userSettings]);

  const settings = isControlled
    ? (userSettings as UserSettings)
    : localSettings;

  useEffect(() => {
    if (!visible) return;
    onRefreshUserSettings?.();
  }, [onRefreshUserSettings, visible]);

  const updateSettings = (patch: Partial<UserSettings>) => {
    const next = { ...settings, ...patch };
    if (isControlled) onChangeUserSettings?.(next);
    else setLocalSettings(next);
  };

  const saveSettingsNow = (patch: Partial<UserSettings>) => {
    const next = { ...settings, ...patch };
    if (isControlled) {
      if (onSaveUserSettingsNow) onSaveUserSettingsNow(next);
      else onChangeUserSettings?.(next);
      return;
    }
    setLocalSettings(next);
  };

  const tileLabels = useMemo(
    () =>
      [
        { key: "calories" as const, label: t("homeCalories") },
        { key: "protein" as const, label: t("homeProtein") },
        { key: "carbs" as const, label: t("homeCarbsShort") },
        { key: "fat" as const, label: t("homeFat") },
      ] satisfies { key: HomeGoalTile; label: string }[],
    [t]
  );

  const sectionLabels = useMemo(
    () =>
      ({
        quickStart: t("settingsQuickStart"),
        goals: t("settingsTodayGoals"),
        weight: t("settingsWeightOverview"),
        recoveryMap: t("homeRecoveryMap"),
      } satisfies Record<HomeSectionKey, string>),
    [t]
  );

  const sectionOrderItems = useMemo(
    () =>
      normalizeHomeSectionOrder(settings.homeSectionOrder).map((key) => ({
        key,
        label: sectionLabels[key],
      })),
    [sectionLabels, settings.homeSectionOrder]
  );

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const subscriptionStatusText = subscription.isPremium
    ? t("settingsPremiumActive")
    : subscription.isLoading
    ? t("settingsPremiumChecking")
    : t("settingsPremiumInactive");
  const showDeleteSubscriptionWarning = subscription.isPremium;

  const hiddenRecoveryMuscles = useMemo(
    () => normalizeRecoveryMapHiddenMuscles(settings.recoveryMapHiddenMuscles),
    [settings.recoveryMapHiddenMuscles]
  );

  const renderSectionOrderItem = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<{ key: HomeSectionKey; label: string }>) => (
    <Pressable
      onLongPress={drag}
      delayLongPress={120}
      style={[styles.orderRow, isActive && styles.orderRowActive]}
    >
      <Text style={[typography.body, styles.orderLabel]}>{item.label}</Text>
      <Text style={[typography.bodyBold, styles.orderHandle]}>=</Text>
    </Pressable>
  );

  const handleLogout = () => {
    if (isDeletingAccount) return;

    Alert.alert(
      t("settingsLogout"),
      t("settingsLogoutBody"),
      [
        { text: t("commonCancel"), style: "cancel" },
        {
          text: t("settingsLogout"),
          style: "destructive",
          onPress: async () => {
            try {
              // Close modal first (feels snappier)
              setVisible(false);

              if (onLogout) {
                await onLogout();
                return;
              }

              // Fallback: delete locally stored JWT
              await clearStoredAuthSession();
            } catch {
              // Keep it quiet, but you can add toast if you want
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDeleteAccount = () => {
    if (isDeletingAccount) return;

    Alert.alert(
      t("settingsDeleteAccount"),
      t("settingsDeleteBody"),
      [
        { text: t("commonCancel"), style: "cancel" },
        {
          text: t("settingsDeleteAccount"),
          style: "destructive",
          onPress: async () => {
            if (!onDeleteAccount) {
              Alert.alert(
                t("commonError"),
                t("settingsDeleteNotAvailable")
              );
              return;
            }

            try {
              setIsDeletingAccount(true);
              await onDeleteAccount();
              setVisible(false);
            } catch (error) {
              const message =
                error instanceof Error && error.message.trim().length > 0
                  ? error.message
                  : t("settingsDeleteFailedBody");
              Alert.alert(t("settingsDeleteFailed"), message);
            } finally {
              setIsDeletingAccount(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleDeleteAccountWithText = () => {
    if (isDeletingAccount) return;

    const buttons: AlertButton[] = [{ text: t("commonCancel"), style: "cancel" }];

    if (showDeleteSubscriptionWarning) {
      buttons.push({
        text: t("settingsManageSubscription"),
        onPress: () => {
          void handleManageSubscription();
        },
      });
    }

    buttons.push({
      text: t("commonContinue"),
      style: "destructive",
      onPress: () => {
        setDeleteConfirmInput("");
        setDeleteConfirmVisible(true);
      },
    });

    Alert.alert(
      t("settingsDeleteAccount"),
      showDeleteSubscriptionWarning
        ? t("settingsDeleteWarning")
        : t("settingsDeleteWarningShort"),
      buttons,
      { cancelable: true }
    );
  };

  const confirmDeleteAccount = async () => {
    if (isDeletingAccount) return;

    if (!onDeleteAccount) {
      Alert.alert(t("commonError"), t("settingsDeleteNotAvailable"));
      return;
    }

    if (deleteConfirmInput.trim().toUpperCase() !== DELETE_CONFIRM_WORD) {
      Alert.alert(
        t("settingsDeleteInvalidTitle"),
        t("settingsDeleteInvalidBody", { word: DELETE_CONFIRM_WORD })
      );
      return;
    }

    try {
      setIsDeletingAccount(true);
      await onDeleteAccount();
      setDeleteConfirmVisible(false);
      setDeleteConfirmInput("");
      setVisible(false);
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : t("settingsDeleteFailedBody");
      Alert.alert(t("settingsDeleteFailed"), message);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleRestorePurchases = async () => {
    if (isRestoringPurchases) return;

    try {
      setIsRestoringPurchases(true);
      const result = await subscription.restorePurchases();
      Alert.alert(
        result.status === "restored"
          ? t("settingsRestoreActiveTitle")
          : t("settingsRestoreEmptyTitle"),
        result.status === "restored"
          ? t("settingsRestoreActiveBody")
          : t("settingsRestoreEmptyBody")
      );
    } catch {
      Alert.alert(t("settingsRestoreFailedTitle"), t("settingsTryAgainLater"));
    } finally {
      setIsRestoringPurchases(false);
    }
  };

  const handleRefreshSubscription = async () => {
    if (isRefreshingSubscription) return;

    try {
      setIsRefreshingSubscription(true);
      await subscription.refreshCustomerInfo();
    } catch {
      Alert.alert(t("settingsRefreshFailedTitle"), t("settingsTryAgainLater"));
    } finally {
      setIsRefreshingSubscription(false);
    }
  };

  const handleManageSubscription = async () => {
    if (subscription.managementURL) {
      await subscription.openManageSubscription();
      return;
    }

    await Linking.openURL(APPLE_SUBSCRIPTIONS_URL);
  };

  const openExternalUrl = async (url: string) => {
    await Linking.openURL(url);
  };

  const openSupportEmail = async () => {
    await Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=EvoliX%20support`
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.kb}
        >
          <View style={styles.container}>
            <View style={styles.headerRow}>
              <Text style={[typography.h2, styles.title]}>{t("settingsTitle")}</Text>

              <TouchableOpacity
                onPress={() => setVisible(false)}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Lukk"
              >
                <CloseIcon height={20} width={20} />
              </TouchableOpacity>
            </View>

            <View style={styles.tabRow}>
              <Pressable
                onPress={() => setActiveTab("general")}
                style={({ pressed }) => [
                  styles.tabPill,
                  activeTab === "general" && styles.tabPillActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    typography.bodyBold,
                    styles.tabText,
                    activeTab === "general" && styles.tabTextActive,
                  ]}
                >
                  {t("settingsGeneral")}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab("user")}
                style={({ pressed }) => [
                  styles.tabPill,
                  activeTab === "user" && styles.tabPillActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    typography.bodyBold,
                    styles.tabText,
                    activeTab === "user" && styles.tabTextActive,
                  ]}
                >
                  {t("settingsUser")}
                </Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {activeTab === "general" ? (
                <>
                  <View style={styles.section}>
                    <Text style={[typography.bodyBold, styles.sectionTitle]}>
                      {t("settingsPrivacy")}
                    </Text>

                    <TouchableOpacity
                      style={styles.settingsItemBox}
                      onPress={() => {
                        void openExternalUrl(PRIVACY_URL);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Åpne personvernerklæring"
                    >
                      <View style={styles.itemTextBox}>
                        <Text style={[typography.body, styles.itemText]}>
                          {t("settingsPrivacyPolicy")}
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          {t("settingsPrivacyDescription")}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.settingsItemBox}
                      onPress={() => {
                        void openExternalUrl(TERMS_URL);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Åpne vilkår for bruk"
                    >
                      <View style={styles.itemTextBox}>
                        <Text style={[typography.body, styles.itemText]}>
                          {t("settingsTerms")}
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          {t("settingsTermsDescription")}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.section}>
                    <Text style={[typography.bodyBold, styles.sectionTitle]}>
                      {t("settingsSubscription")}
                    </Text>

                    <View style={[styles.settingsItemBox, styles.stackItem]}>
                      <View style={styles.subscriptionStatusRow}>
                        <View style={styles.itemTextBox}>
                          <Text style={[typography.body, styles.itemText]}>
                            {t("settingsPremiumStatus")}
                          </Text>
                          <Text style={[typography.body, styles.itemSubtext]}>
                            {subscriptionStatusText}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.subscriptionBadge,
                            subscription.isPremium &&
                              styles.subscriptionBadgeActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.subscriptionBadgeText,
                              subscription.isPremium &&
                                styles.subscriptionBadgeTextActive,
                            ]}
                          >
                            {subscription.isPremium
                              ? t("settingsActive")
                              : t("settingsInactive")}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.subscriptionActions}>
                        <Pressable
                          onPress={handleRestorePurchases}
                          disabled={isRestoringPurchases}
                          style={({ pressed }) => [
                            styles.subscriptionActionBtn,
                            pressed && styles.pressed,
                            isRestoringPurchases && styles.disabledAction,
                          ]}
                        >
                          <Text style={styles.subscriptionActionText}>
                            {isRestoringPurchases
                              ? t("premiumRestoring")
                              : t("settingsRestorePurchases")}
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={handleManageSubscription}
                          style={({ pressed }) => [
                            styles.subscriptionActionBtn,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text style={styles.subscriptionActionText}>
                            {t("settingsManageSubscription")}
                          </Text>
                        </Pressable>
                      </View>

                      <Pressable
                        onPress={handleRefreshSubscription}
                        disabled={isRefreshingSubscription}
                        style={({ pressed }) => [
                          styles.subscriptionRefreshBtn,
                          pressed && styles.pressed,
                          isRefreshingSubscription && styles.disabledAction,
                        ]}
                      >
                        <Text style={styles.subscriptionRefreshText}>
                          {isRefreshingSubscription
                            ? t("commonLoading")
                            : t("settingsRefreshStatus")}
                        </Text>
                      </Pressable>

                      <Text style={[typography.body, styles.supportInfoText]}>
                        {`Support: userId ${
                          subscription.appUserId ?? t("settingsUnknown")
                        }  `}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.section}>
                    <Text style={[typography.bodyBold, styles.sectionTitle]}>
                      {t("settingsAboutApp")}
                    </Text>

                    <TouchableOpacity style={styles.settingsItemBox}>
                      <View style={styles.itemTextBox}>
                        <Text style={[typography.body, styles.itemText]}>
                          {t("settingsAboutEvolix")}
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          {t("settingsAboutDescription")}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingsItemBox}>
                      <View style={styles.itemTextBox}>
                        <Text style={[typography.body, styles.itemText]}>
                          {t("settingsVersion")}
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          {t("settingsCurrentVersion")}
                        </Text>
                      </View>
                      <Text style={[typography.body, styles.valueText]}>
                        v{appVersion}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.section}>
                    <Text style={[typography.bodyBold, styles.sectionTitle]}>
                      {t("settingsHelpSupport")}
                    </Text>

                    <TouchableOpacity
                      style={styles.settingsItemBox}
                      onPress={() => {
                        void openSupportEmail();
                      }}
                    >
                      <View style={styles.itemTextBox}>
                        <Text style={[typography.body, styles.itemText]}>
                          {t("settingsContactSupport")}
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          {t("settingsContactSupportDescription")}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.section}>
                    <TouchableOpacity
                      style={styles.logoutBox}
                      onPress={handleLogout}
                      disabled={isDeletingAccount}
                    >
                      <Text style={[typography.bodyBold, styles.logoutText]}>
                          {t("settingsLogout")}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.deleteAccountBox,
                        isDeletingAccount && styles.disabledAction,
                      ]}
                      onPress={handleDeleteAccountWithText}
                      disabled={isDeletingAccount}
                    >
                      <Text
                        style={[typography.bodyBold, styles.deleteAccountText]}
                      >
                        {isDeletingAccount
                          ? t("settingsDeletingAccount")
                          : t("settingsDeleteAccount")}
                      </Text>
                      <Text
                        style={[typography.body, styles.deleteAccountSubtext]}
                      >
                        {t("settingsDeleteCannotUndo")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  {(isLoadingUserSettings || !!userSettingsError) && (
                    <View
                      style={[
                        styles.syncInfoBox,
                        !!userSettingsError && styles.syncInfoBoxError,
                      ]}
                    >
                      <Text
                        style={[
                          typography.body,
                          styles.syncInfoText,
                          !!userSettingsError && styles.syncInfoTextError,
                        ]}
                      >
                        {userSettingsError
                          ? t("settingsSyncFailed")
                          : t("settingsLoadingUserSettings")}
                      </Text>
                    </View>
                  )}
                  {!isLoadingUserSettings && !userSettingsError && (
                    <View style={styles.syncHintBox}>
                      <Text style={[typography.body, styles.syncHintText]}>
                        {t("settingsAutoSave")}
                      </Text>
                    </View>
                  )}

                  <View style={styles.section}>
                    <Text style={[typography.bodyBold, styles.sectionTitle]}>
                      {t("settingsUser")}
                    </Text>

                    <View style={styles.settingsItemBox}>
                      <View style={styles.itemTextBox}>
                        <Text style={[typography.body, styles.itemText]}>
                          {t("onboardingAgeLabel")}
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          {t("settingsAgeDescription")}
                        </Text>
                      </View>

                      <GlobalKeyboardAccessory />
                      <TextInput
                        {...settingsInputProps}
                        value={settings.age ? String(settings.age) : ""}
                        onChangeText={(t) =>
                          updateSettings({
                            age: clampOptionalAge(t),
                          })
                        }
                        onEndEditing={() =>
                          saveSettingsNow({ age: settings.age })
                        }
                        keyboardType="number-pad"
                        style={[typography.body, styles.inputValue]}
                        placeholder="18"
                        placeholderTextColor="rgba(148,163,184,0.6)"
                        inputAccessoryViewID={GLOBAL_IOS_KEYBOARD_ACCESSORY_ID}
                      />
                    </View>

                    <View style={[styles.settingsItemBox, styles.stackItem]}>
                      <View style={styles.itemTextBox}>
                        <Text style={[typography.body, styles.itemText]}>
                          {t("settingsGender")}
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          {t("settingsCanChangeAnytime")}
                        </Text>
                      </View>

                      <View style={styles.chipRow}>
                        {genderOptions.map((option) => {
                          const active = settings.gender === option.value;
                          return (
                            <Pressable
                              key={option.value}
                              onPress={() =>
                                saveSettingsNow({ gender: option.value })
                              }
                              style={({ pressed }) => [
                                styles.chip,
                                active && styles.chipActive,
                                pressed && styles.pressed,
                              ]}
                            >
                              <Text
                                style={[
                                  typography.bodyBold,
                                  styles.chipText,
                                  active && styles.chipTextActive,
                                ]}
                              >
                                {option.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    <View style={[styles.settingsItemBox, styles.stackItem]}>
                      <View style={styles.itemTextBox}>
                        <Text style={[typography.body, styles.itemText]}>
                          {t("settingsLanguage")}
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          {t("settingsSavedInProfile")}
                        </Text>
                      </View>

                      <View style={styles.segment}>
                        {LANGUAGE_OPTIONS.map((option) => {
                          const active = settings.language === option.value;
                          return (
                            <Pressable
                              key={option.value}
                              onPress={() =>
                                saveSettingsNow({ language: option.value })
                              }
                              style={({ pressed }) => [
                                styles.segmentBtn,
                                active && styles.segmentBtnActive,
                                pressed && styles.pressed,
                              ]}
                            >
                              <Text
                                style={[
                                  typography.bodyBold,
                                  styles.segmentText,
                                  active && styles.segmentTextActive,
                                ]}
                              >
                                {option.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    <View style={styles.settingsItemBox}>
                      <View style={styles.itemTextBox}>
                        <Text style={[typography.body, styles.itemText]}>
                          {t("settingsCalorieGoal")}
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          Daglig mål (kcal)
                        </Text>
                      </View>

                      <TextInput
                        {...settingsInputProps}
                        value={String(settings.calorieGoal)}
                        onChangeText={(t) =>
                          updateSettings({
                            calorieGoal: clampInt(t, settings.calorieGoal),
                          })
                        }
                        keyboardType="number-pad"
                        style={[typography.body, styles.inputValue]}
                        placeholder="0"
                        placeholderTextColor="rgba(148,163,184,0.6)"
                      />
                    </View>

                    <View style={styles.settingsItemBox}>
                      <View style={styles.itemTextBox}>
                        <Text style={[typography.body, styles.itemText]}>
                          {t("settingsProteinGoal")}
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          Daglig mål (g)
                        </Text>
                      </View>

                      <TextInput
                        {...settingsInputProps}
                        value={String(settings.proteinGoal)}
                        onChangeText={(t) =>
                          updateSettings({
                            proteinGoal: clampInt(t, settings.proteinGoal),
                          })
                        }
                        keyboardType="number-pad"
                        style={[typography.body, styles.inputValue]}
                        placeholder="0"
                        placeholderTextColor="rgba(148,163,184,0.6)"
                      />
                    </View>

                    <View style={styles.settingsItemBox}>
                      <View style={styles.itemTextBox}>
                        <Text style={[typography.body, styles.itemText]}>
                          {t("settingsFatGoal")}
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          Daglig mål (g)
                        </Text>
                      </View>

                      <TextInput
                        {...settingsInputProps}
                        value={String(settings.fatGoal)}
                        onChangeText={(t) =>
                          updateSettings({
                            fatGoal: clampInt(t, settings.fatGoal),
                          })
                        }
                        keyboardType="number-pad"
                        style={[typography.body, styles.inputValue]}
                        placeholder="0"
                        placeholderTextColor="rgba(148,163,184,0.6)"
                      />
                    </View>

                    <View style={styles.settingsItemBox}>
                      <View style={styles.itemTextBox}>
                        <Text style={[typography.body, styles.itemText]}>
                          {t("settingsCarbGoal")}
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          Daglig mål (g)
                        </Text>
                      </View>

                      <TextInput
                        {...settingsInputProps}
                        value={String(settings.carbGoal)}
                        onChangeText={(t) =>
                          updateSettings({
                            carbGoal: clampInt(t, settings.carbGoal),
                          })
                        }
                        keyboardType="number-pad"
                        style={[typography.body, styles.inputValue]}
                        placeholder="0"
                        placeholderTextColor="rgba(148,163,184,0.6)"
                      />
                    </View>

                    <View style={styles.settingsItemBox}>
                      <View style={styles.itemTextBox}>
                        <Text style={[typography.body, styles.itemText]}>
                          {t("settingsWeightGoal")}
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          {t("settingsTargetWeightKg")}
                        </Text>
                      </View>

                      <TextInput
                        {...settingsInputProps}
                        value={String(settings.weightGoalKg)}
                        onChangeText={(t) =>
                          updateSettings({
                            weightGoalKg: clampInt(t, settings.weightGoalKg),
                          })
                        }
                        keyboardType="number-pad"
                        style={[typography.body, styles.inputValue]}
                        placeholder="0"
                        placeholderTextColor="rgba(148,163,184,0.6)"
                      />
                    </View>

                    <View style={[styles.settingsItemBox, styles.stackItem]}>
                      <View style={styles.itemTextBox}>
                        <Text style={[typography.body, styles.itemText]}>
                          {"Dato for vekt\u00e5l"}
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          {
                            "N\u00e5r vil du at m\u00e5lvekten skal v\u00e6re n\u00e5dd?"
                          }
                        </Text>
                      </View>

                      <AppDateTimePicker
                        label={"M\u00e5ldato"}
                        mode="date"
                        compact
                        value={toSafeDate(settings.weightGoalTimeUtc)}
                        onChange={(date) =>
                          updateSettings({
                            weightGoalTimeUtc:
                              toUtcNoonIsoDate(date ?? new Date()) ??
                              settings.weightGoalTimeUtc,
                          })
                        }
                      />
                    </View>

                    <View style={[styles.settingsItemBox, styles.stackItem]}>
                      <View style={styles.itemTextBox}>
                        <Text style={[typography.body, styles.itemText]}>
                          {t("settingsCutStart")}
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          {t("settingsCutStartDescription")}
                        </Text>
                      </View>

                      <View style={styles.segment}>
                        <Pressable
                          onPress={() =>
                            updateSettings({
                              weightDirection: "lose",
                              cutStartDateUtc:
                                toUtcNoonIsoDate(new Date()) ??
                                settings.cutStartDateUtc,
                              cutStartWeightKg:
                                settings.cutStartWeightKg ??
                                settings.weightGoalKg,
                            })
                          }
                          style={({ pressed }) => [
                            styles.segmentBtn,
                            settings.weightDirection === "lose" &&
                              styles.segmentBtnActive,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text
                            style={[
                              typography.bodyBold,
                              styles.segmentText,
                              settings.weightDirection === "lose" &&
                                styles.segmentTextActive,
                            ]}
                          >
                            Aktiv cut
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() =>
                            updateSettings({ weightDirection: "maintain" })
                          }
                          style={({ pressed }) => [
                            styles.segmentBtn,
                            settings.weightDirection !== "lose" &&
                              styles.segmentBtnActive,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text
                            style={[
                              typography.bodyBold,
                              styles.segmentText,
                              settings.weightDirection !== "lose" &&
                                styles.segmentTextActive,
                            ]}
                          >
                            Ikke cut
                          </Text>
                        </Pressable>
                      </View>

                      <AppDateTimePicker
                        label="Startdato"
                        mode="date"
                        compact
                        value={toSafeDate(settings.cutStartDateUtc)}
                        onChange={(date) =>
                          updateSettings({
                            cutStartDateUtc: date
                              ? toUtcNoonIsoDate(date)
                              : settings.cutStartDateUtc,
                            weightDirection: "lose",
                          })
                        }
                      />

                      <View style={styles.inlineInputRow}>
                        <Text style={[typography.body, styles.inlineLabel]}>
                          Startvekt
                        </Text>
                        <TextInput
                          {...settingsInputProps}
                          value={
                            settings.cutStartWeightKg == null
                              ? ""
                              : String(settings.cutStartWeightKg)
                          }
                          onChangeText={(value) =>
                            updateSettings({
                              cutStartWeightKg: clampOptionalWeight(value),
                              weightDirection: "lose",
                            })
                          }
                          keyboardType="decimal-pad"
                          style={[typography.body, styles.inputValue]}
                          placeholder="kg"
                          placeholderTextColor="rgba(148,163,184,0.6)"
                        />
                      </View>
                    </View>

                    <View style={[styles.settingsItemBox, styles.stackItem]}>
                      <View style={styles.itemTextBox}>
                        <Text style={[typography.body, styles.itemText]}>
                          Muskel-filter
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          {t("settingsMuscleFilterDescription")}
                        </Text>
                      </View>

                      <View style={styles.segment}>
                        <Pressable
                          onPress={() =>
                            updateSettings({ muscleFilter: "basic" })
                          }
                          style={({ pressed }) => [
                            styles.segmentBtn,
                            settings.muscleFilter === "basic" &&
                              styles.segmentBtnActive,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text
                            style={[
                              typography.bodyBold,
                              styles.segmentText,
                              settings.muscleFilter === "basic" &&
                                styles.segmentTextActive,
                            ]}
                          >
                            Enkelt
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() =>
                            updateSettings({ muscleFilter: "advanced" })
                          }
                          style={({ pressed }) => [
                            styles.segmentBtn,
                            settings.muscleFilter === "advanced" &&
                              styles.segmentBtnActive,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text
                            style={[
                              typography.bodyBold,
                              styles.segmentText,
                              settings.muscleFilter === "advanced" &&
                                styles.segmentTextActive,
                            ]}
                          >
                            Avansert
                          </Text>
                        </Pressable>
                      </View>
                    </View>

                    <View style={[styles.settingsItemBox, styles.stackItem]}>
                      <View style={styles.itemTextBox}>
                        <Text style={[typography.body, styles.itemText]}>
                          Egne treningsdata
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          Vis alle eller bare selvlagde øvelser, økter og
                          program
                        </Text>
                      </View>

                      <View style={styles.segment}>
                        <Pressable
                          onPress={() =>
                            updateSettings({
                              showOnlyCustomTrainingContent: false,
                            })
                          }
                          style={({ pressed }) => [
                            styles.segmentBtn,
                            !settings.showOnlyCustomTrainingContent &&
                              styles.segmentBtnActive,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text
                            style={[
                              typography.bodyBold,
                              styles.segmentText,
                              !settings.showOnlyCustomTrainingContent &&
                                styles.segmentTextActive,
                            ]}
                          >
                            Alle
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() =>
                            updateSettings({
                              showOnlyCustomTrainingContent: true,
                            })
                          }
                          style={({ pressed }) => [
                            styles.segmentBtn,
                            settings.showOnlyCustomTrainingContent &&
                              styles.segmentBtnActive,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text
                            style={[
                              typography.bodyBold,
                              styles.segmentText,
                              settings.showOnlyCustomTrainingContent &&
                                styles.segmentTextActive,
                            ]}
                          >
                            Kun selvlagde
                          </Text>
                        </Pressable>
                      </View>
                    </View>

                    <View style={[styles.settingsItemBox, styles.stackItem]}>
                      <View style={styles.itemTextBox}>
                        <Text style={[typography.body, styles.itemText]}>
                          {t("settingsFoodCoach")}
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          {
                            "Bruk matcoach for kalorir\u00e5d mot vektm\u00e5let"
                          }
                        </Text>
                      </View>

                      <View style={styles.segment}>
                        <Pressable
                          onPress={() => updateSettings({ useFoodCoach: true })}
                          style={({ pressed }) => [
                            styles.segmentBtn,
                            settings.useFoodCoach && styles.segmentBtnActive,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text
                            style={[
                              typography.bodyBold,
                              styles.segmentText,
                              settings.useFoodCoach && styles.segmentTextActive,
                            ]}
                          >
                            Ja
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() =>
                            updateSettings({ useFoodCoach: false })
                          }
                          style={({ pressed }) => [
                            styles.segmentBtn,
                            !settings.useFoodCoach && styles.segmentBtnActive,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text
                            style={[
                              typography.bodyBold,
                              styles.segmentText,
                              !settings.useFoodCoach &&
                                styles.segmentTextActive,
                            ]}
                          >
                            Nei
                          </Text>
                        </Pressable>
                      </View>
                    </View>

                    <View style={[styles.settingsItemBox, styles.stackItem]}>
                      <View style={styles.itemTextBox}>
                        <Text style={[typography.body, styles.itemText]}>
                          Treningscoach
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          {
                            "Vis coach i \u00f8ktloggingen med forslag per \u00f8velse"
                          }
                        </Text>
                      </View>

                      <View style={styles.segment}>
                        <Pressable
                          onPress={() =>
                            updateSettings({ useWorkoutCoach: true })
                          }
                          style={({ pressed }) => [
                            styles.segmentBtn,
                            settings.useWorkoutCoach && styles.segmentBtnActive,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text
                            style={[
                              typography.bodyBold,
                              styles.segmentText,
                              settings.useWorkoutCoach &&
                                styles.segmentTextActive,
                            ]}
                          >
                            Ja
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() =>
                            updateSettings({ useWorkoutCoach: false })
                          }
                          style={({ pressed }) => [
                            styles.segmentBtn,
                            !settings.useWorkoutCoach &&
                              styles.segmentBtnActive,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text
                            style={[
                              typography.bodyBold,
                              styles.segmentText,
                              !settings.useWorkoutCoach &&
                                styles.segmentTextActive,
                            ]}
                          >
                            Nei
                          </Text>
                        </Pressable>
                      </View>
                    </View>

                    <View style={[styles.settingsItemBox, styles.stackItem]}>
                      <View style={styles.itemTextBox}>
                        <Text style={[typography.body, styles.itemText]}>
                          Muskler i restitusjonskart
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          Standard er alle. Trykk for å skjule eller vise
                          muskler.
                        </Text>
                      </View>

                      <View style={styles.recoveryActionsRow}>
                        <Pressable
                          onPress={() =>
                            updateSettings({ recoveryMapHiddenMuscles: [] })
                          }
                          style={({ pressed }) => [
                            styles.recoveryActionBtn,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text
                            style={[
                              typography.bodyBold,
                              styles.recoveryActionText,
                            ]}
                          >
                            Vis alle
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() =>
                            updateSettings({
                              recoveryMapHiddenMuscles: [
                                ...ALL_RECOVERY_MUSCLES,
                              ],
                            })
                          }
                          style={({ pressed }) => [
                            styles.recoveryActionBtn,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text
                            style={[
                              typography.bodyBold,
                              styles.recoveryActionText,
                            ]}
                          >
                            Skjul alle
                          </Text>
                        </Pressable>
                      </View>

                      <View style={styles.chipRow}>
                        {ALL_RECOVERY_MUSCLES.map((muscle) => {
                          const isVisible =
                            !hiddenRecoveryMuscles.includes(muscle);

                          return (
                            <Pressable
                              key={muscle}
                              onPress={() =>
                                updateSettings({
                                  recoveryMapHiddenMuscles:
                                    toggleRecoveryMuscleVisibility(
                                      hiddenRecoveryMuscles,
                                      muscle
                                    ),
                                })
                              }
                              style={({ pressed }) => [
                                styles.chip,
                                isVisible && styles.chipActive,
                                pressed && styles.pressed,
                              ]}
                            >
                              <Text
                                style={[
                                  typography.bodyBold,
                                  styles.chipText,
                                  isVisible && styles.chipTextActive,
                                ]}
                              >
                                {toRecoveryMuscleLabel(muscle)}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    <View style={[styles.settingsItemBox, styles.stackItem]}>
                      <View style={styles.itemTextBox}>
                        <Text style={[typography.body, styles.itemText]}>
                          Næringsmål på hjemskjermen
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          Velg hvilke mål som vises på hjemskjermen
                        </Text>
                      </View>

                      <View style={styles.chipRow}>
                        {tileLabels.map((t) => {
                          const active = settings.homeGoalTiles.includes(t.key);
                          return (
                            <Pressable
                              key={t.key}
                              onPress={() =>
                                updateSettings({
                                  homeGoalTiles: toggleTile(
                                    settings.homeGoalTiles,
                                    t.key
                                  ),
                                })
                              }
                              style={({ pressed }) => [
                                styles.chip,
                                active && styles.chipActive,
                                pressed && styles.pressed,
                              ]}
                            >
                              <Text
                                style={[
                                  typography.bodyBold,
                                  styles.chipText,
                                  active && styles.chipTextActive,
                                ]}
                              >
                                {t.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    <View style={[styles.settingsItemBox, styles.stackItem]}>
                      <View style={styles.itemTextBox}>
                        <Text style={[typography.body, styles.itemText]}>
                          Rekkefølge på hjemskjerm
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          Hold inne og dra for å endre seksjonsrekkefølge
                        </Text>
                      </View>

                      <DraggableFlatList
                        data={sectionOrderItems}
                        keyExtractor={(item) => item.key}
                        renderItem={renderSectionOrderItem}
                        onDragEnd={({ data }) =>
                          updateSettings({
                            homeSectionOrder: data.map((x) => x.key),
                          })
                        }
                        scrollEnabled={false}
                      />
                    </View>
                  </View>

                  <View style={styles.section}>
                    <TouchableOpacity
                      style={[
                        styles.logoutBox,
                        isDeletingAccount && styles.disabledAction,
                      ]}
                      onPress={handleLogout}
                      disabled={isDeletingAccount}
                    >
                      <Text style={[typography.bodyBold, styles.logoutText]}>
                        {t("settingsLogout")}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.deleteAccountBox,
                        isDeletingAccount && styles.disabledAction,
                      ]}
                      onPress={handleDeleteAccountWithText}
                      disabled={isDeletingAccount}
                    >
                      <Text
                        style={[typography.bodyBold, styles.deleteAccountText]}
                      >
                        {isDeletingAccount
                          ? t("settingsDeletingAccount")
                          : t("settingsDeleteAccount")}
                      </Text>
                      <Text
                        style={[typography.body, styles.deleteAccountSubtext]}
                      >
                        {t("settingsDeleteCannotUndo")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>

        <Modal
          visible={deleteConfirmVisible}
          animationType="fade"
          transparent
          onRequestClose={() => {
            if (isDeletingAccount) return;
            setDeleteConfirmVisible(false);
            setDeleteConfirmInput("");
          }}
        >
          <View style={styles.overlay}>
            <View style={[styles.container, styles.deleteConfirmContainer]}>
              <Text style={[typography.h2, styles.title]}>
                {t("settingsDeleteConfirmTitle")}
              </Text>
              <Text style={[typography.body, styles.deleteConfirmBody]}>
                {t("settingsDeleteConfirmBody", {
                  word: DELETE_CONFIRM_WORD,
                })}
              </Text>

              {showDeleteSubscriptionWarning && (
                <View style={styles.deleteSubscriptionWarning}>
                  <Text
                    style={[
                      typography.bodyBold,
                      styles.deleteSubscriptionWarningTitle,
                    ]}
                  >
                    {t("settingsDeleteSubscriptionTitle")}
                  </Text>
                  <Text
                    style={[
                      typography.body,
                      styles.deleteSubscriptionWarningText,
                    ]}
                  >
                    {t("settingsDeleteSubscriptionBody")}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.deleteSubscriptionManageBtn,
                      isDeletingAccount && styles.disabledAction,
                    ]}
                    onPress={() => {
                      void handleManageSubscription();
                    }}
                    disabled={isDeletingAccount}
                  >
                    <Text
                      style={[
                        typography.bodyBold,
                        styles.deleteSubscriptionManageText,
                      ]}
                    >
                      {t("settingsDeleteSubscriptionAction")}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <TextInput
                {...settingsInputProps}
                value={deleteConfirmInput}
                onChangeText={setDeleteConfirmInput}
                editable={!isDeletingAccount}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder={DELETE_CONFIRM_WORD}
                placeholderTextColor="rgba(148,163,184,0.6)"
                style={[typography.body, styles.deleteConfirmInput]}
              />

              <View style={styles.deleteConfirmActions}>
                <TouchableOpacity
                  style={[
                    styles.deleteConfirmActionBtn,
                    styles.deleteConfirmCancelBtn,
                    isDeletingAccount && styles.disabledAction,
                  ]}
                  onPress={() => {
                    if (isDeletingAccount) return;
                    setDeleteConfirmVisible(false);
                    setDeleteConfirmInput("");
                  }}
                  disabled={isDeletingAccount}
                >
                  <Text
                    style={[
                      typography.bodyBold,
                      styles.deleteConfirmCancelText,
                    ]}
                  >
                    {t("commonCancel")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.deleteConfirmActionBtn,
                    styles.deleteConfirmSubmitBtn,
                    (isDeletingAccount ||
                      deleteConfirmInput.trim().toUpperCase() !==
                        DELETE_CONFIRM_WORD) &&
                      styles.disabledAction,
                  ]}
                  onPress={confirmDeleteAccount}
                  disabled={
                    isDeletingAccount ||
                    deleteConfirmInput.trim().toUpperCase() !==
                      DELETE_CONFIRM_WORD
                  }
                >
                  <Text
                    style={[
                      typography.bodyBold,
                      styles.deleteConfirmSubmitText,
                    ]}
                  >
                    {isDeletingAccount
                      ? t("settingsDeletingAccount")
                      : t("settingsDeleteAccount")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: settingsLightTheme.backdrop,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 24,
  },
  kb: {
    flex: 1,
    justifyContent: "center",
  },
  container: {
    backgroundColor: settingsLightTheme.surface,
    width: "100%",
    maxWidth: 640,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: settingsLightTheme.border,
    maxHeight: MODAL_MAX_HEIGHT,
    shadowColor: "#0F172A",
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  legalContainer: {
    maxHeight: MODAL_MAX_HEIGHT,
  },
  deleteConfirmContainer: {
    maxHeight: MODAL_MAX_HEIGHT,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  title: {
    flex: 1,
    marginRight: 12,
    color: settingsLightTheme.text,
  },
  closeButton: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.12)",
  },

  tabRow: {
    flexDirection: "row",
    gap: 10,
    padding: 6,
    borderRadius: 14,
    backgroundColor: settingsLightTheme.surfaceSoft,
    borderWidth: 1,
    borderColor: settingsLightTheme.borderSoft,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: 1,
    borderColor: settingsLightTheme.borderSoft,
  },
  tabPillActive: {
    backgroundColor: settingsLightTheme.accentSoft,
    borderColor: "rgba(37,99,235,0.28)",
  },
  tabText: {
    fontSize: 13,
    opacity: 0.85,
    color: settingsLightTheme.muted,
  },
  tabTextActive: {
    opacity: 1,
    color: settingsLightTheme.accent,
  },
  pressed: {
    opacity: 0.9,
  },

  scroll: {
    marginTop: 10,
  },
  scrollContent: {
    paddingBottom: 10,
  },
  legalScrollContent: {
    paddingBottom: 16,
  },
  legalMeta: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 12,
    opacity: 0.75,
    color: settingsLightTheme.muted,
  },
  legalSection: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: settingsLightTheme.item,
    borderWidth: 1,
    borderColor: settingsLightTheme.borderSoft,
    gap: 8,
  },
  legalSectionTitle: {
    fontSize: 14,
    color: settingsLightTheme.text,
  },
  legalParagraph: {
    fontSize: 13,
    lineHeight: 20,
    opacity: 0.92,
    color: settingsLightTheme.textSoft,
  },
  deleteConfirmBody: {
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 20,
    opacity: 0.9,
    color: settingsLightTheme.textSoft,
  },
  deleteSubscriptionWarning: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(217,119,6,0.24)",
    backgroundColor: "rgba(245,158,11,0.10)",
    padding: 12,
    gap: 8,
  },
  deleteSubscriptionWarningTitle: {
    color: "#92400E",
    fontSize: 14,
  },
  deleteSubscriptionWarningText: {
    color: "#78350F",
    fontSize: 12.5,
    lineHeight: 18,
  },
  deleteSubscriptionManageBtn: {
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(217,119,6,0.24)",
    backgroundColor: "rgba(245,158,11,0.10)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  deleteSubscriptionManageText: {
    color: "#92400E",
    fontSize: 12.5,
    textAlign: "center",
  },
  deleteConfirmInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.28)",
    backgroundColor: settingsLightTheme.dangerSoft,
    color: settingsLightTheme.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  deleteConfirmActions: {
    flexDirection: "row",
    gap: 10,
  },
  deleteConfirmActionBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  deleteConfirmCancelBtn: {
    backgroundColor: settingsLightTheme.itemSoft,
    borderColor: settingsLightTheme.borderSoft,
  },
  deleteConfirmSubmitBtn: {
    backgroundColor: settingsLightTheme.dangerSoft,
    borderColor: "rgba(248,113,113,0.32)",
  },
  deleteConfirmCancelText: {
    fontSize: 14,
    color: settingsLightTheme.textSoft,
  },
  deleteConfirmSubmitText: {
    fontSize: 14,
    color: settingsLightTheme.danger,
  },

  syncInfoBox: {
    marginTop: 12,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(14,165,233,0.24)",
    backgroundColor: "rgba(14,165,233,0.08)",
  },
  syncInfoBoxError: {
    borderColor: "rgba(248,113,113,0.28)",
    backgroundColor: settingsLightTheme.dangerSoft,
  },
  syncInfoText: {
    fontSize: 12,
    color: "#0369A1",
  },
  syncInfoTextError: {
    color: settingsLightTheme.danger,
  },
  syncHintBox: {
    marginTop: 12,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: settingsLightTheme.borderSoft,
    backgroundColor: settingsLightTheme.itemSoft,
  },
  syncHintText: {
    fontSize: 12,
    color: settingsLightTheme.muted,
  },

  section: {
    marginTop: 14,
  },
  sectionTitle: {
    opacity: 0.8,
    marginBottom: 8,
    fontSize: 14,
    color: settingsLightTheme.textSoft,
  },

  settingsItemBox: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: settingsLightTheme.item,
    borderWidth: 1,
    borderColor: settingsLightTheme.borderSoft,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subscriptionStatusRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  subscriptionBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: settingsLightTheme.borderSoft,
    backgroundColor: settingsLightTheme.itemSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  subscriptionBadgeActive: {
    borderColor: "rgba(34,197,94,0.24)",
    backgroundColor: settingsLightTheme.successSoft,
  },
  subscriptionBadgeText: {
    color: settingsLightTheme.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  subscriptionBadgeTextActive: {
    color: settingsLightTheme.success,
  },
  subscriptionActions: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
  },
  subscriptionActionBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.20)",
    backgroundColor: settingsLightTheme.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  subscriptionActionText: {
    color: settingsLightTheme.accent,
    fontSize: 12.5,
    fontWeight: "800",
  },
  subscriptionRefreshBtn: {
    minHeight: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: settingsLightTheme.borderSoft,
    backgroundColor: settingsLightTheme.itemSoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  subscriptionRefreshText: {
    color: settingsLightTheme.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  supportInfoText: {
    color: settingsLightTheme.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  stackItem: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 10,
  },

  itemTextBox: {
    flex: 1,
    marginRight: 12,
  },
  itemText: {
    fontSize: 15,
    marginBottom: 2,
    color: settingsLightTheme.text,
  },
  itemSubtext: {
    fontSize: 12,
    opacity: 0.7,
    color: settingsLightTheme.muted,
  },

  valueText: {
    fontSize: 14,
    opacity: 0.9,
    color: settingsLightTheme.textSoft,
  },

  inputValue: {
    minWidth: 82,
    textAlign: "right",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: settingsLightTheme.itemSoft,
    borderWidth: 1,
    borderColor: settingsLightTheme.borderSoft,
    color: settingsLightTheme.text,
    fontSize: 13,
  },
  inlineInputRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  inlineLabel: {
    flex: 1,
    color: settingsLightTheme.textSoft,
    fontSize: 13,
  },

  segment: {
    flexDirection: "row",
    gap: 10,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: settingsLightTheme.itemSoft,
    borderWidth: 1,
    borderColor: settingsLightTheme.borderSoft,
  },
  segmentBtnActive: {
    backgroundColor: settingsLightTheme.successSoft,
    borderColor: "rgba(34,197,94,0.26)",
  },
  segmentText: {
    fontSize: 13,
    opacity: 0.85,
    color: settingsLightTheme.muted,
  },
  segmentTextActive: {
    opacity: 1,
    color: settingsLightTheme.success,
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  recoveryActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  recoveryActionBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: settingsLightTheme.borderSoft,
    backgroundColor: settingsLightTheme.itemSoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  recoveryActionText: {
    fontSize: 12,
    color: settingsLightTheme.textSoft,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: settingsLightTheme.itemSoft,
    borderWidth: 1,
    borderColor: settingsLightTheme.borderSoft,
  },
  chipActive: {
    backgroundColor: settingsLightTheme.accentSoft,
    borderColor: "rgba(37,99,235,0.30)",
  },
  chipText: {
    fontSize: 12,
    opacity: 0.85,
    color: settingsLightTheme.muted,
  },
  chipTextActive: {
    opacity: 1,
    color: settingsLightTheme.accent,
  },

  orderRow: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: settingsLightTheme.borderSoft,
    backgroundColor: settingsLightTheme.item,
    paddingHorizontal: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderRowActive: {
    backgroundColor: settingsLightTheme.accentSoft,
    borderColor: "rgba(37,99,235,0.32)",
  },
  orderLabel: {
    fontSize: 13,
    color: settingsLightTheme.text,
  },
  orderHandle: {
    fontSize: 18,
    color: settingsLightTheme.muted,
    lineHeight: 20,
  },

  developmentActionBox: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: settingsLightTheme.successSoft,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  developmentActionText: {
    fontSize: 15,
    color: settingsLightTheme.success,
  },
  developmentActionSubtext: {
    marginTop: 2,
    fontSize: 12,
    color: "#166534",
  },

  logoutBox: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 4,
    borderRadius: 12,
    backgroundColor: settingsLightTheme.item,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.32)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    fontSize: 15,
    color: settingsLightTheme.danger,
  },
  deleteAccountBox: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: settingsLightTheme.dangerSoft,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.32)",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteAccountText: {
    fontSize: 15,
    color: settingsLightTheme.danger,
  },
  deleteAccountSubtext: {
    marginTop: 2,
    fontSize: 12,
    color: "#991B1B",
  },
  disabledAction: {
    opacity: 0.65,
  },
});
