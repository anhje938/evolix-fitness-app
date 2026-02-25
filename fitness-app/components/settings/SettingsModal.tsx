import CloseIcon from "@/assets/icons/white-x.svg";
import { typography } from "@/config/typography";
import { UserSettings } from "@/types/userSettings";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export type HomeGoalTile = "calories" | "protein" | "carbs" | "fat";

type TabKey = "general" | "user";
type LegalSection = {
  title: string;
  paragraphs: string[];
};

const PRIVACY_POLICY_LAST_UPDATED = "24. februar 2026";

const PRIVACY_POLICY_SECTIONS: LegalSection[] = [
  {
    title: "1. Hvem vi er",
    paragraphs: [
      "Evolix er en trenings- og progresjonsapp.",
      "Nettside: https://evolix.no",
      "Vi er behandlingsansvarlig for personopplysningene som behandles i appen.",
    ],
  },
  {
    title: "2. Hvilke opplysninger vi samler inn",
    paragraphs: [
      "Kontoopplysninger: Apple-brukeridentifikator ved innlogging med Sign in with Apple, og eventuell e-postadresse hvis den er tilgjengelig via Apple.",
      "Trenings- og helsedata: treningsøkter, øvelser, vekt og kroppsdata, kostholdsdata (kalorier og makronæringsstoffer), samt brukerinnstillinger og mål.",
      "Vi samler ikke inn sensitive helseopplysninger utover det du selv registrerer i appen.",
    ],
  },
  {
    title: "3. Hvordan vi bruker opplysningene",
    paragraphs: [
      "Opplysningene brukes for å gi deg tilgang til kontoen din, lagre og vise trenings- og progresjonsdata, forbedre funksjonalitet og brukeropplevelse, og sikre stabil og trygg drift av appen.",
      "Vi bruker ikke opplysningene dine til reklame eller videresalg.",
    ],
  },
  {
    title: "4. Lagring og sikkerhet",
    paragraphs: [
      "Opplysningene lagres på sikre servere med tilgangskontroll.",
      "Vi bruker kryptert kommunikasjon (HTTPS), autentisering via Apple Sign-In og tiltak for å beskytte mot uautorisert tilgang.",
    ],
  },
  {
    title: "5. Deling av informasjon",
    paragraphs: [
      "Vi deler ikke personopplysninger med tredjeparter, med mindre det er nødvendig for teknisk drift av tjenesten eller vi er lovpålagt å gjøre det.",
      "Vi selger aldri dine data.",
    ],
  },
  {
    title: "6. Dine rettigheter",
    paragraphs: [
      "Du har rett til å få innsyn i hvilke opplysninger vi lagrer, be om retting av feilaktige opplysninger og be om sletting av kontoen din og tilhørende data.",
      "Du kan slette kontoen din direkte i appen, eller via en senere kontaktkanal når den er publisert.",
    ],
  },
  {
    title: "7. Sletting av konto",
    paragraphs: [
      "Når du sletter kontoen din, vil lagrede treningsdata, kontoopplysninger og personlige innstillinger bli permanent slettet fra våre systemer innen rimelig tid.",
    ],
  },
  {
    title: "8. Endringer i personvernerklæringen",
    paragraphs: [
      "Vi kan oppdatere denne personvernerklæringen ved behov. Vesentlige endringer vil bli informert om i appen eller på nettsiden.",
    ],
  },
  {
    title: "9. Kontakt",
    paragraphs: [
      "Har du spørsmål om personvern, vil kontaktinformasjon publiseres i appen eller på nettsiden senere.",
    ],
  },
];

const INITIAL_SETTINGS: UserSettings = {
  calorieGoal: 2500,
  proteinGoal: 180,
  fatGoal: 70,
  carbGoal: 220,
  muscleFilter: "advanced",
  homeGoalTiles: ["calories", "protein", "carbs", "fat"],
  weightGoalKg: 84,
  weightDirection: "maintain",
};

type Props = {
  visible: boolean;
  setVisible: (value: boolean) => void;

  userSettings?: UserSettings;
  onChangeUserSettings?: (next: UserSettings) => void;
  onRefreshUserSettings?: () => Promise<void> | void;
  isLoadingUserSettings?: boolean;
  isSavingUserSettings?: boolean;
  userSettingsError?: string | null;

  onLogout?: () => Promise<void> | void;
  onDeleteAccount?: () => Promise<void> | void;
};

const AUTH_TOKEN_KEY = "token";
const DELETE_CONFIRM_WORD = "SLETT";

function clampInt(value: string, fallback: number) {
  const cleaned = value.replace(",", ".").trim();
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n));
}

function toggleTile(list: HomeGoalTile[], tile: HomeGoalTile) {
  const has = list.includes(tile);
  if (has) {
    const next = list.filter((t) => t !== tile);
    return next.length > 0 ? next : list;
  }
  return [...list, tile];
}

export default function SettingsModal({
  visible,
  setVisible,
  userSettings,
  onChangeUserSettings,
  onRefreshUserSettings,
  isLoadingUserSettings = false,
  isSavingUserSettings = false,
  userSettingsError = null,
  onLogout,
  onDeleteAccount,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("general");
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const isControlled = !!userSettings && !!onChangeUserSettings;

  const [localSettings, setLocalSettings] = useState<UserSettings>(
    userSettings ?? INITIAL_SETTINGS
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

  const tileLabels = useMemo(
    () =>
      [
        { key: "calories" as const, label: "Kalorier" },
        { key: "protein" as const, label: "Protein" },
        { key: "carbs" as const, label: "Karbo" },
        { key: "fat" as const, label: "Fett" },
      ] satisfies Array<{ key: HomeGoalTile; label: string }>,
    []
  );

  const handleLogout = () => {
    if (isDeletingAccount) return;

    Alert.alert(
      "Logg ut",
      "Vil du logge ut av kontoen din?",
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Logg ut",
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
              await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
            } catch {
              // Keep it quiet, but you can add toast if you want
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleDeleteAccount = () => {
    if (isDeletingAccount) return;

    Alert.alert(
      "Slett konto",
      "Er du sikker? Dette sletter kontoen og dataene dine permanent.",
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Slett konto",
          style: "destructive",
          onPress: async () => {
            if (!onDeleteAccount) {
              Alert.alert(
                "Feil",
                "Sletting av konto er ikke tilgjengelig ennå."
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
                  : "Kunne ikke slette konto. Prøv igjen.";
              Alert.alert("Kunne ikke slette konto", message);
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

    Alert.alert(
      "Slett konto",
      "Er du sikker?",
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Fortsett",
          style: "destructive",
          onPress: () => {
            setDeleteConfirmInput("");
            setDeleteConfirmVisible(true);
          },
        },
      ],
      { cancelable: true }
    );
  };

  const confirmDeleteAccount = async () => {
    if (isDeletingAccount) return;

    if (!onDeleteAccount) {
      Alert.alert("Feil", "Sletting av konto er ikke tilgjengelig ennå.");
      return;
    }

    if (deleteConfirmInput.trim().toUpperCase() !== DELETE_CONFIRM_WORD) {
      Alert.alert(
        "Feil bekreftelse",
        `Skriv ${DELETE_CONFIRM_WORD} for å fortsette.`
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
          : "Kunne ikke slette konto. Prøv igjen.";
      Alert.alert("Kunne ikke slette konto", message);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.kb}
        >
          <View style={styles.container}>
            {/* HEADER */}
            <View style={styles.headerRow}>
              <Text style={[typography.h2, styles.title]}>Innstillinger</Text>

              <TouchableOpacity
                onPress={() => setVisible(false)}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Lukk"
              >
                <CloseIcon height={20} width={20} />
              </TouchableOpacity>
            </View>

            {/* TABS */}
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
                  Generelt
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
                  Brukerinstillinger
                </Text>
              </Pressable>
            </View>

            {/* INNHOLD */}
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {activeTab === "general" ? (
                <>
                  {/* PERSONVERN */}
                  <View style={styles.section}>
                    <Text style={[typography.bodyBold, styles.sectionTitle]}>
                      Personvern
                    </Text>

                    <TouchableOpacity
                      style={styles.settingsItemBox}
                      onPress={() => setPrivacyModalVisible(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Åpne personvernerklæring"
                    >
                      <View style={styles.itemTextBox}>
                        <Text style={[typography.body, styles.itemText]}>
                          Personvernerklæring
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          Les hvordan dataene dine behandles
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* OM APPEN */}
                  <View style={styles.section}>
                    <Text style={[typography.bodyBold, styles.sectionTitle]}>
                      Om appen
                    </Text>

                    <TouchableOpacity style={styles.settingsItemBox}>
                      <View style={styles.itemTextBox}>
                        <Text style={[typography.body, styles.itemText]}>
                          Om Evolix
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          Kort om appen og formålet
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingsItemBox}>
                      <View style={styles.itemTextBox}>
                        <Text style={[typography.body, styles.itemText]}>
                          Versjon
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          Nåværende appversjon
                        </Text>
                      </View>
                      <Text style={[typography.body, styles.valueText]}>
                        v1.0.0
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* HJELP & SUPPORT */}
                  <View style={styles.section}>
                    <Text style={[typography.bodyBold, styles.sectionTitle]}>
                      Hjelp og support
                    </Text>

                    <TouchableOpacity style={styles.settingsItemBox}>
                      <View style={styles.itemTextBox}>
                        <Text style={[typography.body, styles.itemText]}>
                          Hjelpesenter / FAQ
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          Vanlige spørsmål og svar
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingsItemBox}>
                      <View style={styles.itemTextBox}>
                        <Text style={[typography.body, styles.itemText]}>
                          Kontakt support
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          Send inn feil, idéer og tilbakemeldinger
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* LOGG UT */}
                  <View style={styles.section}>
                    <TouchableOpacity
                      style={styles.logoutBox}
                      onPress={handleLogout}
                      disabled={isDeletingAccount}
                    >
                      <Text style={[typography.bodyBold, styles.logoutText]}>
                        Logg ut
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
                        {isDeletingAccount ? "Sletter konto..." : "Slett konto"}
                      </Text>
                      <Text
                        style={[typography.body, styles.deleteAccountSubtext]}
                      >
                        Dette kan ikke angres
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  {(isLoadingUserSettings ||
                    isSavingUserSettings ||
                    !!userSettingsError) && (
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
                          ? "Kunne ikke synkronisere innstillinger."
                          : isLoadingUserSettings
                          ? "Henter brukerinnstillinger..."
                          : "Lagrer endringer..."}
                      </Text>
                    </View>
                  )}

                  {/* BRUKERINNSTILLINGER */}
                  <View style={styles.section}>
                    <Text style={[typography.bodyBold, styles.sectionTitle]}>
                      Brukerinnstillinger
                    </Text>

                    {/* Goals */}
                    <View style={styles.settingsItemBox}>
                      <View style={styles.itemTextBox}>
                        <Text style={[typography.body, styles.itemText]}>
                          Kalorimål
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          Daglig mål (kcal)
                        </Text>
                      </View>

                      <TextInput
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
                          Proteinmål
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          Daglig mål (g)
                        </Text>
                      </View>

                      <TextInput
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
                          Fettmål
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          Daglig mål (g)
                        </Text>
                      </View>

                      <TextInput
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
                          Karbomål
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          Daglig mål (g)
                        </Text>
                      </View>

                      <TextInput
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
                          Vektmål
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          Målvekt (kg)
                        </Text>
                      </View>

                      <TextInput
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

                    {/* Muscle filter */}
                    <View style={[styles.settingsItemBox, styles.stackItem]}>
                      <View style={styles.itemTextBox}>
                        <Text style={[typography.body, styles.itemText]}>
                          Muskel-filter
                        </Text>
                        <Text style={[typography.body, styles.itemSubtext]}>
                          Velg detaljeringsnivå på muskelgrupper
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

                    {/* Home tiles */}
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
                  </View>

                  {/* LOGG UT – nederst i scrollen */}
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
                        Logg ut
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
                        {isDeletingAccount ? "Sletter konto..." : "Slett konto"}
                      </Text>
                      <Text
                        style={[typography.body, styles.deleteAccountSubtext]}
                      >
                        Dette kan ikke angres
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>

        <Modal
          visible={privacyModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setPrivacyModalVisible(false)}
        >
          <View style={styles.overlay}>
            <View style={[styles.container, styles.legalContainer]}>
              <View style={styles.headerRow}>
                <Text style={[typography.h2, styles.title]}>
                  Personvernerklæring for Evolix
                </Text>

                <TouchableOpacity
                  onPress={() => setPrivacyModalVisible(false)}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Lukk personvernerklæring"
                >
                  <CloseIcon height={20} width={20} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.legalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={[typography.body, styles.legalMeta]}>
                  Sist oppdatert: {PRIVACY_POLICY_LAST_UPDATED}
                </Text>

                {PRIVACY_POLICY_SECTIONS.map((section) => (
                  <View key={section.title} style={styles.legalSection}>
                    <Text
                      style={[typography.bodyBold, styles.legalSectionTitle]}
                    >
                      {section.title}
                    </Text>

                    {section.paragraphs.map((paragraph, index) => (
                      <Text
                        key={`${section.title}-${index}`}
                        style={[typography.body, styles.legalParagraph]}
                      >
                        {paragraph}
                      </Text>
                    ))}
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

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
                Bekreft sletting
              </Text>
              <Text style={[typography.body, styles.deleteConfirmBody]}>
                Skriv {DELETE_CONFIRM_WORD} for å slette kontoen permanent.
              </Text>

              <TextInput
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
                    Avbryt
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
                    {isDeletingAccount ? "Sletter..." : "Slett konto"}
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
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  kb: {
    flex: 1,
    justifyContent: "center",
  },
  container: {
    backgroundColor: "#111827",
    width: "100%",
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    maxHeight: "85%",
  },
  legalContainer: {
    maxHeight: "88%",
  },
  deleteConfirmContainer: {
    maxHeight: undefined,
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
  },
  closeButton: {
    padding: 4,
  },

  tabRow: {
    flexDirection: "row",
    gap: 10,
    padding: 6,
    borderRadius: 14,
    backgroundColor: "rgba(15,23,42,0.6)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  tabPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  tabPillActive: {
    backgroundColor: "rgba(59,130,246,0.14)",
    borderColor: "rgba(96,165,250,0.28)",
  },
  tabText: {
    fontSize: 13,
    opacity: 0.85,
  },
  tabTextActive: {
    opacity: 1,
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
  },
  legalSection: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(15,23,42,0.92)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    gap: 8,
  },
  legalSectionTitle: {
    fontSize: 14,
  },
  legalParagraph: {
    fontSize: 13,
    lineHeight: 20,
    opacity: 0.92,
  },
  deleteConfirmBody: {
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 20,
    opacity: 0.9,
  },
  deleteConfirmInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(252,165,165,0.28)",
    backgroundColor: "rgba(127,29,29,0.14)",
    color: "rgba(255,255,255,0.94)",
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
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: "rgba(148,163,184,0.18)",
  },
  deleteConfirmSubmitBtn: {
    backgroundColor: "rgba(185,28,28,0.28)",
    borderColor: "rgba(252,165,165,0.35)",
  },
  deleteConfirmCancelText: {
    fontSize: 14,
    color: "rgba(226,232,240,0.95)",
  },
  deleteConfirmSubmitText: {
    fontSize: 14,
    color: "#FECACA",
  },

  syncInfoBox: {
    marginTop: 12,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.3)",
    backgroundColor: "rgba(56,189,248,0.08)",
  },
  syncInfoBoxError: {
    borderColor: "rgba(248,113,113,0.35)",
    backgroundColor: "rgba(248,113,113,0.08)",
  },
  syncInfoText: {
    fontSize: 12,
    color: "rgba(186,230,253,0.95)",
  },
  syncInfoTextError: {
    color: "rgba(254,202,202,0.98)",
  },

  section: {
    marginTop: 14,
  },
  sectionTitle: {
    opacity: 0.8,
    marginBottom: 8,
    fontSize: 14,
  },

  settingsItemBox: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: "rgba(15,23,42,0.92)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  },
  itemSubtext: {
    fontSize: 12,
    opacity: 0.7,
  },

  valueText: {
    fontSize: 14,
    opacity: 0.9,
  },

  inputValue: {
    minWidth: 82,
    textAlign: "right",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.92)",
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
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  segmentBtnActive: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderColor: "rgba(74,222,128,0.26)",
  },
  segmentText: {
    fontSize: 13,
    opacity: 0.85,
  },
  segmentTextActive: {
    opacity: 1,
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  chipActive: {
    backgroundColor: "rgba(59,130,246,0.14)",
    borderColor: "rgba(96,165,250,0.30)",
  },
  chipText: {
    fontSize: 12,
    opacity: 0.85,
  },
  chipTextActive: {
    opacity: 1,
  },

  logoutBox: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 4,
    borderRadius: 12,
    backgroundColor: "rgba(30,64,175,0.06)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    fontSize: 15,
    color: "#F97373",
  },
  deleteAccountBox: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: "rgba(127,29,29,0.22)",
    borderWidth: 1,
    borderColor: "rgba(252,165,165,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteAccountText: {
    fontSize: 15,
    color: "#FCA5A5",
  },
  deleteAccountSubtext: {
    marginTop: 2,
    fontSize: 12,
    color: "rgba(254,226,226,0.82)",
  },
  disabledAction: {
    opacity: 0.65,
  },
});
