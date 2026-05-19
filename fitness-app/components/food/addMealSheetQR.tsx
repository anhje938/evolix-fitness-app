import { FetchFoodFromBarcode } from "@/api/food";
import { generalStyles } from "@/config/styles";
import { MODAL_MAX_HEIGHT, modalGradientColors, modalTheme } from "@/config/modalTheme";
import { typography } from "@/config/typography";
import { useAuth } from "@/context/AuthProvider";
import { useTranslation } from "@/i18n/translations";
import { FoodDto, FoodFromBarcode } from "@/types/meal";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import XIcon from "../../assets/icons/white-x.svg";
import QRScanner from "./QRScanner";
import { ToggleModeButtons } from "./toggleModeButtons";

type AddMealSheetQRProps = {
  isOpen: boolean;
  mode: "manual" | "qr";
  setMode: (mode: "manual" | "qr") => void;
  onClose: () => void;
  onSubmit: (values: FoodDto) => Promise<void> | void;
  onScanned: (value: string) => void;
};

const SHEET_MAX_HEIGHT = MODAL_MAX_HEIGHT;
const ENTER_DURATION = 220;
const EXIT_DURATION = 170;

export function AddMealSheetQR({
  isOpen,
  onClose,
  setMode,
  mode,
  onScanned,
  onSubmit,
}: AddMealSheetQRProps) {
  const isClosingRef = useRef(false);
  const isMountedRef = useRef(true);
  const activeLookupIdRef = useRef(0);
  const lookupAbortRef = useRef<AbortController | null>(null);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(28)).current;
  const sheetScale = useRef(new Animated.Value(0.985)).current;

  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [productName, setProductName] = useState<string | null>(null);
  const [grams, setGrams] = useState("100");
  const [isResolvingScan, setIsResolvingScan] = useState(false);

  const { t } = useTranslation();
  const { token } = useAuth();

  const [macrosPer100g, setMacrosPer100g] = useState({
    calories: 0,
    proteins: 0,
    carbs: 0,
    fats: 0,
  });

  const abortActiveLookup = useCallback(() => {
    activeLookupIdRef.current += 1;
    lookupAbortRef.current?.abort();
    lookupAbortRef.current = null;

    if (isMountedRef.current) {
      setIsResolvingScan(false);
    }
  }, []);

  const clearResolvedProduct = useCallback((resetGrams = true) => {
    setScannedCode(null);
    setProductName(null);
    setMacrosPer100g({
      calories: 0,
      proteins: 0,
      carbs: 0,
      fats: 0,
    });

    if (resetGrams) {
      setGrams("100");
    }
  }, []);

  const resetScanState = useCallback(
    (options?: { resetGrams?: boolean }) => {
      abortActiveLookup();

      if (!isMountedRef.current) return;

      clearResolvedProduct(options?.resetGrams ?? true);
    },
    [abortActiveLookup, clearResolvedProduct]
  );

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      lookupAbortRef.current?.abort();
      lookupAbortRef.current = null;
      activeLookupIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (isOpen && mode === "qr") return;

    resetScanState();
    backdropOpacity.setValue(0);
    sheetOpacity.setValue(0);
    sheetTranslateY.setValue(28);
    sheetScale.setValue(0.985);
    isClosingRef.current = false;
  }, [
    backdropOpacity,
    isOpen,
    mode,
    resetScanState,
    sheetOpacity,
    sheetScale,
    sheetTranslateY,
  ]);

  useEffect(() => {
    if (!isOpen || mode !== "qr") return;

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: ENTER_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(sheetOpacity, {
        toValue: 1,
        duration: ENTER_DURATION,
        useNativeDriver: true,
      }),
      Animated.spring(sheetTranslateY, {
        toValue: 0,
        damping: 20,
        mass: 0.95,
        stiffness: 220,
        useNativeDriver: true,
      }),
      Animated.spring(sheetScale, {
        toValue: 1,
        damping: 18,
        mass: 0.9,
        stiffness: 240,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, isOpen, mode, sheetOpacity, sheetScale, sheetTranslateY]);

  if (!isOpen || mode !== "qr") return null;

  const runExitAnimation = (callback: () => void) => {
    if (isClosingRef.current) return;

    isClosingRef.current = true;
    Keyboard.dismiss();

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: EXIT_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(sheetOpacity, {
        toValue: 0,
        duration: EXIT_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 24,
        duration: EXIT_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(sheetScale, {
        toValue: 0.985,
        duration: EXIT_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      isClosingRef.current = false;
      callback();
    });
  };

  const handleRequestClose = () => {
    abortActiveLookup();
    runExitAnimation(() => {
      resetScanState();
      onClose();
    });
  };

  const handleModeChange = (nextMode: "manual" | "qr") => {
    if (nextMode === mode) return;
    abortActiveLookup();
    runExitAnimation(() => {
      resetScanState();
      setMode(nextMode);
    });
  };

  const handleScannerResult = async (value: string) => {
    const normalizedValue = value.trim();
    if (!normalizedValue) {
      if (__DEV__) console.log("No barcode value received");
      return;
    }

    if (!token) {
      resetScanState();
      Alert.alert("Mangler innlogging", "Logg inn pa nytt og prov igjen.");
      return;
    }

    lookupAbortRef.current?.abort();
    const controller = new AbortController();
    lookupAbortRef.current = controller;
    activeLookupIdRef.current += 1;
    const lookupId = activeLookupIdRef.current;

    setIsResolvingScan(true);
    setScannedCode(normalizedValue);
    setProductName(null);
    setMacrosPer100g({
      calories: 0,
      proteins: 0,
      carbs: 0,
      fats: 0,
    });

    try {
      onScanned(normalizedValue);
    } catch (error) {
      if (__DEV__) console.log("onScanned callback failed", error);
    }

    try {
      const data: FoodFromBarcode = await FetchFoodFromBarcode(
        token,
        normalizedValue,
        { signal: controller.signal }
      );

      if (!isMountedRef.current || activeLookupIdRef.current !== lookupId) {
        return;
      }

      setProductName(data.title);
      setMacrosPer100g({
        calories: data.caloriesPr100,
        proteins: data.proteinsPr100,
        carbs: data.carbsPr100,
        fats: data.fatsPr100,
      });
    } catch (error) {
      if (
        controller.signal.aborted ||
        !isMountedRef.current ||
        activeLookupIdRef.current !== lookupId
      ) {
        return;
      }

      if (__DEV__) console.log("Lookup failed for barcode:", normalizedValue, error);
      resetScanState();
      Alert.alert(
        "Fant ikke produkt",
        "Kunne ikke hente produktdata fra strekkoden. Prøv igjen eller legg inn manuelt."
      );
    } finally {
      if (
        !isMountedRef.current ||
        activeLookupIdRef.current !== lookupId ||
        lookupAbortRef.current !== controller
      ) {
        return;
      }

      lookupAbortRef.current = null;
      setIsResolvingScan(false);
    }
  };

  const g = Number.parseFloat(grams.replace(",", "."));
  const totals =
    Number.isFinite(g) && g > 0
      ? {
          calories: Math.round(macrosPer100g.calories * (g / 100)),
          proteins: +(macrosPer100g.proteins * (g / 100)).toFixed(1),
          carbs: +(macrosPer100g.carbs * (g / 100)).toFixed(1),
          fats: +(macrosPer100g.fats * (g / 100)).toFixed(1),
        }
      : {
          calories: 0,
          proteins: 0,
          carbs: 0,
          fats: 0,
        };
  const canSaveScannedMeal =
    !!scannedCode && !!productName && !isResolvingScan;

  const handleSave = async () => {
    if (!scannedCode || !productName || isResolvingScan) {
      Alert.alert("Mangler produkt", "Skann et produkt før du lagrer.");
      return;
    }

    const payload: FoodDto = {
      title: productName,
      calories: Math.round(totals.calories),
      proteins: Math.round(totals.proteins),
      carbs: Math.round(totals.carbs),
      fats: Math.round(totals.fats),
      timestampUtc: new Date().toISOString(),
    };

    try {
      await onSubmit(payload);
      onClose();
    } catch (error) {
      if (__DEV__) console.log("Could not submit scanned meal", error);
      Alert.alert("Kunne ikke lagre måltid", "Prøv igjen om et øyeblikk.");
    }
  };

  return (
    <Modal
      visible={isOpen}
      animationType="none"
      transparent
      hardwareAccelerated
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={handleRequestClose}
    >
      <View style={styles.modalRoot}>
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
          pointerEvents="box-none"
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleRequestClose}
            accessibilityRole="button"
            accessibilityLabel="Lukk skann måltid"
          />
        </Animated.View>

        <View style={styles.sheetFrame} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.sheetAnimationWrap,
              {
                opacity: sheetOpacity,
                transform: [
                  { translateY: sheetTranslateY },
                  { scale: sheetScale },
                ],
              },
            ]}
          >
            <View
              style={[
                generalStyles.newCard,
                styles.sheet,
                { maxHeight: SHEET_MAX_HEIGHT },
              ]}
            >
              <LinearGradient
                pointerEvents="none"
                colors={modalGradientColors}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View pointerEvents="none" style={styles.orbTop} />
              <View pointerEvents="none" style={styles.orbBottom} />

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sheetContent}
                keyboardShouldPersistTaps="always"
              >
                <View style={styles.headerRow}>
                  <Text style={[typography.h2, styles.title]}>
                    Skann måltid
                  </Text>
                  <TouchableOpacity
                    onPress={handleRequestClose}
                    style={styles.closeButton}
                    activeOpacity={0.82}
                  >
                    <XIcon height={18} width={18} />
                  </TouchableOpacity>
                </View>

                <View style={styles.toggleWrapper}>
                  <ToggleModeButtons setMode={handleModeChange} mode={mode} />
                </View>

                {!scannedCode && (
                  <View style={styles.scannerCard}>
                    <Text style={styles.scannerLabel}>
                      {t("mealScanFrameLabel")}
                    </Text>
                    <View style={styles.scannerFrame}>
                      <QRScanner
                        onScanned={handleScannerResult}
                        title=""
                        enabled={!isResolvingScan}
                      />
                    </View>
                    <Text style={styles.scannerHint}>
                      {t("mealScanHint")}
                    </Text>
                  </View>
                )}

                {scannedCode && (
                  <View style={styles.section}>
                    <Text style={styles.scannedTitle}>
                      {t("mealScanProductScanned")}
                    </Text>

                    <View style={styles.scannedCard}>
                      <View style={styles.scannedRow}>
                        <View style={styles.scannedCopy}>
                          <Text style={styles.scannedName}>
                            {isResolvingScan
                              ? t("mealScanFetchingProduct")
                              : productName ?? t("mealScanUnknownProduct")}
                          </Text>
                          <Text style={styles.scannedMeta}>
                            {isResolvingScan
                              ? `${scannedCode} • ${t("mealScanFetchingData")}`
                              : scannedCode}
                          </Text>
                        </View>

                        <TouchableOpacity
                          onPress={() => resetScanState()}
                          style={styles.rescanButton}
                          activeOpacity={0.86}
                        >
                          <Ionicons
                            name="scan-outline"
                            size={16}
                            color="#67E8F9"
                          />
                          <Text style={styles.rescanText}>Skann på nytt</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.gramsSection}>
                        <Text style={[typography.bodyBlack, styles.label]}>
                          Mengde (gram)
                        </Text>
                        <View style={styles.gramsRow}>
                          <TextInput
                            style={styles.gramsInput}
                            placeholder="100"
                            value={grams}
                            onChangeText={setGrams}
                            placeholderTextColor="rgba(148,163,184,0.72)"
                            keyboardType="numeric"
                            returnKeyType="done"
                          />
                          <Text style={styles.gramsSuffix}>g</Text>
                        </View>
                      </View>

                      <View style={styles.macroTotalsCard}>
                        <Text style={styles.macroTotalsTitle}>
                          Beregnet næring
                        </Text>

                        <View style={styles.macroTotalsRow}>
                          <View style={styles.macroTotalsCol}>
                            <Text style={styles.macroTotalsLabel}>
                              Kalorier
                            </Text>
                            <Text style={styles.macroTotalsValue}>
                              {totals.calories} kcal
                            </Text>
                          </View>
                        </View>

                        <View style={styles.macroChipRow}>
                          <View style={styles.macroChip}>
                            <Text style={styles.macroChipLabel}>Protein</Text>
                            <Text style={styles.macroChipValue}>
                              {totals.proteins} g
                            </Text>
                          </View>

                          <View style={styles.macroChip}>
                            <Text style={styles.macroChipLabel}>Karbs</Text>
                            <Text style={styles.macroChipValue}>
                              {totals.carbs} g
                            </Text>
                          </View>

                          <View style={styles.macroChip}>
                            <Text style={styles.macroChipLabel}>Fett</Text>
                            <Text style={styles.macroChipValue}>
                              {totals.fats} g
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {scannedCode && (
                  <View style={styles.tipCard}>
                    <View style={styles.tipIconWrapper}>
                      <Ionicons
                        name="nutrition-outline"
                        size={16}
                        color="#67E8F9"
                      />
                    </View>
                    <View style={styles.tipCopy}>
                      <Text style={styles.tipTitle}>
                        Tips for scanning og gram
                      </Text>
                      <Text style={styles.tipText}>
                        Skann først, juster deretter gram etter mengden du vil
                        registrere. Det gir en langt renere logg.
                      </Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  onPress={() => {
                    void handleSave();
                  }}
                  style={styles.saveWrapper}
                  disabled={!canSaveScannedMeal}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={
                      canSaveScannedMeal
                        ? ["#06B6D4", "#2563EB"]
                        : ["rgba(30,41,59,0.96)", "rgba(15,23,42,0.98)"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.saveButton}
                  >
                    <LinearGradient
                      pointerEvents="none"
                      colors={[
                        "rgba(255,255,255,0.18)",
                        "rgba(255,255,255,0.04)",
                        "rgba(255,255,255,0)",
                      ]}
                      start={{ x: 0.15, y: 0 }}
                      end={{ x: 0.85, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <Ionicons
                      name="save-outline"
                      size={18}
                      color="#FFFFFF"
                      style={styles.saveIcon}
                    />
                    <Text style={styles.saveText}>
                      {isResolvingScan
                        ? t("mealScanFetchingProduct")
                        : canSaveScannedMeal
                          ? t("mealSave")
                          : t("mealScanProductFirst")}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: modalTheme.backdrop,
  },
  sheetFrame: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 24,
  },
  sheetAnimationWrap: {
    width: "100%",
    alignItems: "center",
  },
  sheet: {
    position: "relative",
    overflow: "hidden",
    width: "100%",
    maxWidth: 520,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: modalTheme.surface,
    borderWidth: 1,
    borderColor: modalTheme.border,
    shadowColor: modalTheme.shadow,
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  orbTop: {
    position: "absolute",
    top: -56,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: modalTheme.orbTop,
  },
  orbBottom: {
    position: "absolute",
    left: -36,
    bottom: -72,
    width: 146,
    height: 146,
    borderRadius: 999,
    backgroundColor: modalTheme.orbBottom,
  },
  sheetContent: {
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: -0.35,
  },
  closeButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleWrapper: {
    marginTop: 4,
    marginBottom: 14,
  },
  scannerCard: {
    marginTop: 12,
    borderRadius: 22,
    padding: 14,
    backgroundColor: "rgba(3,7,18,0.42)",
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.1)",
  },
  scannerLabel: {
    ...typography.bodyBlack,
    fontSize: 12,
    color: "rgba(191,219,254,0.72)",
    marginBottom: 10,
  },
  scannerFrame: {
    borderRadius: 18,
    overflow: "hidden",
    height: 400,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.12)",
    backgroundColor: "rgba(8,15,28,0.7)",
  },
  scannerHint: {
    ...typography.bodyBlack,
    fontSize: 11,
    lineHeight: 16,
    color: "rgba(191,219,254,0.64)",
  },
  section: {
    marginTop: 19,
  },
  label: {
    fontSize: 11.5,
    color: "rgba(191,219,254,0.72)",
    marginBottom: 7,
    letterSpacing: 0.14,
  },
  scannedTitle: {
    ...typography.bodyBlack,
    fontSize: 11.5,
    color: "rgba(191,219,254,0.72)",
    marginBottom: 8,
    letterSpacing: 0.14,
  },
  scannedCard: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: "rgba(3,7,18,0.42)",
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.1)",
  },
  scannedRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    columnGap: 10,
  },
  scannedCopy: {
    flex: 1,
  },
  scannedName: {
    ...typography.bodyBlack,
    fontSize: 15,
    color: "#E5ECFF",
    fontWeight: "600",
  },
  scannedMeta: {
    ...typography.bodyBlack,
    fontSize: 10.5,
    color: "rgba(191,219,254,0.58)",
    marginTop: 3,
  },
  rescanButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: "rgba(8,47,73,0.34)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.18)",
  },
  rescanText: {
    ...typography.bodyBlack,
    fontSize: 11,
    color: "#BAE6FD",
    marginLeft: 5,
    fontWeight: "600",
  },
  gramsSection: {
    marginTop: 6,
  },
  gramsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: "rgba(8,15,28,0.72)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  gramsInput: {
    flex: 1,
    color: "#E5ECFF",
    fontSize: 15,
    marginRight: 4,
  },
  gramsSuffix: {
    ...typography.bodyBlack,
    fontSize: 13,
    color: "rgba(191,219,254,0.68)",
  },
  macroTotalsCard: {
    marginTop: 18,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: "rgba(8,15,28,0.62)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.14)",
  },
  macroTotalsTitle: {
    ...typography.bodyBlack,
    fontSize: 12.5,
    color: "#E5ECFF",
    marginBottom: 10,
    fontWeight: "600",
  },
  macroTotalsRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  macroTotalsCol: {
    flex: 1,
  },
  macroTotalsLabel: {
    ...typography.bodyBlack,
    fontSize: 11,
    color: "rgba(191,219,254,0.64)",
  },
  macroTotalsValue: {
    ...typography.bodyBlack,
    fontSize: 18,
    color: "#E5ECFF",
    fontWeight: "600",
    marginTop: 3,
  },
  macroChipRow: {
    flexDirection: "row",
    marginTop: 4,
    justifyContent: "space-between",
    columnGap: 8,
  },
  macroChip: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 10,
    backgroundColor: "rgba(2,6,23,0.72)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.1)",
    alignItems: "center",
  },
  macroChipLabel: {
    ...typography.bodyBlack,
    fontSize: 10.5,
    color: "rgba(191,219,254,0.58)",
  },
  macroChipValue: {
    ...typography.bodyBlack,
    fontSize: 13,
    color: "#E5ECFF",
    fontWeight: "600",
    marginTop: 3,
  },
  tipCard: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(8,47,73,0.32)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.18)",
  },
  tipIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(2,6,23,0.74)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  tipCopy: {
    flex: 1,
  },
  tipTitle: {
    ...typography.bodyBlack,
    fontSize: 12.5,
    color: "#E5ECFF",
    fontWeight: "600",
    marginBottom: 4,
  },
  tipText: {
    ...typography.bodyBlack,
    fontSize: 11,
    lineHeight: 16,
    color: "rgba(191,219,254,0.66)",
  },
  saveWrapper: {
    marginTop: 26,
  },
  saveButton: {
    position: "relative",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 18,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 5,
  },
  saveIcon: {
    marginRight: 8,
  },
  saveText: {
    ...typography.bodyBlack,
    fontSize: 15,
    color: "#FFFFFF",
    fontWeight: "600",
    textAlign: "center",
  },
});
