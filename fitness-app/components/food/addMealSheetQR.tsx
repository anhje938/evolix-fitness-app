// components/food/AddMealSheetQR.tsx
import { FetchFoodFromBarcode } from "@/api/food";
import { generalStyles } from "@/config/styles";
import { typography } from "@/config/typography";
import { useAuth } from "@/context/AuthProvider";
import { FoodDto, FoodFromBarcode } from "@/types/meal";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
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
  // Called when a barcode or QR code is scanned so parent can see the raw value
  onScanned: (value: string) => void;
};

const SHEET_MAX_HEIGHT = Dimensions.get("window").height * 0.85;

export function AddMealSheetQR({
  isOpen,
  onClose,
  setMode,
  mode,
  onScanned,
  onSubmit,
}: AddMealSheetQRProps) {
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [productName, setProductName] = useState<string | null>(null);
  const [grams, setGrams] = useState<string>("100");

  const { token } = useAuth();

  // Macros per 100g from scanned product
  const [macrosPer100g, setMacrosPer100g] = useState({
    calories: 0,
    proteins: 0,
    carbs: 0,
    fats: 0,
  });

  const handleScannerResult = async (value: string) => {
    // Safety: ignore empty scan
    if (!value) {
      console.log("No barcode value received");
      return;
    }

    // Notify parent + set local state
    onScanned(value);
    setScannedCode(value);

    try {
      if (!token) return;
      const data: FoodFromBarcode = await FetchFoodFromBarcode(token, value);

      setProductName(data.title);
      setMacrosPer100g({
        calories: data.caloriesPr100,
        proteins: data.proteinsPr100,
        carbs: data.carbsPr100,
        fats: data.fatsPr100,
      });
    } catch (error) {
      console.log("Lookup failed for barcode:", value, error);
    }
  };

  const g = parseFloat(grams.replace(",", "."));
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

  const handleSave = () => {
    // Do not submit if nothing is scanned or we do not have a product name
    if (!scannedCode || !productName) {
      console.log("Cannot save: missing scanned code or product name");
      return;
    }

    const payload: FoodDto = {
      title: productName ?? "Ukjent produkt",
      calories: Math.round(totals.calories),
      proteins: Math.round(totals.proteins),
      carbs: Math.round(totals.carbs),
      fats: Math.round(totals.fats),
      timestampUtc: new Date().toISOString(),
    };

    try {
      onSubmit(payload);
      onClose();
    } catch (error) {
      console.log("Could not submit scanned meal", error);
    }
  };

  // If sheet is closed or mode is not qr, render nothing
  if (!isOpen || mode !== "qr") return null;

  return (
    // Absolute wrapper so sheet always covers the whole screen
    <View style={styles.absoluteWrapper} pointerEvents="box-none">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        {/* Plain overlay behind the card */}
        <View style={styles.overlay}>
          <View pointerEvents="box-none" style={styles.sheetWrapper}>
            {/* Prevent touches inside card from bubbling out */}
            <TouchableWithoutFeedback onPress={() => {}}>
              <View
                style={[
                  generalStyles.newCard,
                  styles.sheet,
                  { maxHeight: SHEET_MAX_HEIGHT },
                ]}
              >
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.sheetContent}
                  keyboardShouldPersistTaps="always"
                >
                  {/* Header */}
                  <View style={styles.headerRow}>
                    <Text style={[typography.h2, styles.title]}>
                      Skann måltid
                    </Text>
                    <TouchableOpacity
                      onPress={onClose}
                      style={styles.closeButton}
                    >
                      <XIcon height={18} width={18} />
                    </TouchableOpacity>
                  </View>

                  {/* Toggle manual / QR */}
                  <View style={styles.toggleWrapper}>
                    <ToggleModeButtons setMode={setMode} mode={mode} />
                  </View>

                  {/* QR scanner view when nothing is scanned yet */}
                  {!scannedCode && (
                    <View style={styles.scannerCard}>
                      <Text style={styles.scannerLabel}>
                        Hold strekkoden innenfor rammen
                      </Text>
                      <View style={styles.scannerFrame}>
                        <QRScanner onScanned={handleScannerResult} title="" />
                      </View>
                      <Text style={styles.scannerHint}>
                        Når produktet er skannet, kan du justere gram og lagre
                        måltidet.
                      </Text>
                    </View>
                  )}

                  {/* Result + grams input when a code is scanned */}
                  {scannedCode && (
                    <View style={styles.section}>
                      <Text style={styles.scannedTitle}>Produkt scannet</Text>
                      <View style={styles.scannedRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.scannedName}>
                            {productName ?? "Ukjent produkt"}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            // Allow user to rescan if code was wrong
                            setScannedCode(null);
                            setProductName(null);
                            setMacrosPer100g({
                              calories: 0,
                              proteins: 0,
                              carbs: 0,
                              fats: 0,
                            });
                          }}
                          style={styles.rescanButton}
                        >
                          <Ionicons
                            name="scan-outline"
                            size={16}
                            color="#22D3EE"
                          />
                          <Text style={styles.rescanText}>Skann på nytt</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Grams input */}
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
                            placeholderTextColor="rgba(148,163,184,0.8)"
                            keyboardType="numeric"
                            returnKeyType="done"
                          />
                          <Text style={styles.gramsSuffix}>g</Text>
                        </View>
                      </View>

                      {/* Totals from grams * macros per 100g */}
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
                  )}

                  {/* Tip card – only show after a product is scanned */}
                  {scannedCode && (
                    <View style={styles.tipCard}>
                      <View style={styles.tipIconWrapper}>
                        <Ionicons
                          name="nutrition-outline"
                          size={16}
                          color="#22D3EE"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tipTitle}>
                          Tips for scanning og gram
                        </Text>
                        <Text style={styles.tipText}>
                          Skann strekkoden først, juster deretter gram etter
                          hvor mye du faktisk spiste. Backend kan senere hente
                          nøyaktige macros per 100 g for produktet.
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Confirm meal button (bottom) */}
                  <TouchableOpacity
                    onPress={handleSave}
                    style={styles.saveWrapper}
                    disabled={!scannedCode}
                  >
                    <LinearGradient
                      colors={
                        scannedCode
                          ? ["#00C98B", "#00E0B5"]
                          : ["rgba(30,64,175,0.6)", "rgba(15,23,42,0.9)"]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.saveButton}
                    >
                      <Ionicons
                        name="save-outline"
                        size={18}
                        color="#FFFFFF"
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.saveText}>
                        {scannedCode
                          ? "Lagre måltid"
                          : "Skann et produkt først"}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Modal overlay above the whole screen
  absoluteWrapper: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(3,7,18,0.75)",
  },
  sheetWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  sheet: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 22,
    backgroundColor: "rgba(15,23,42,0.98)",
  },
  sheetContent: {
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  toggleWrapper: {
    marginTop: 8,
    marginBottom: 8,
  },

  scannerCard: {
    marginTop: 8,
    borderRadius: 18,
    padding: 12,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(30,64,175,0.7)",
  },
  scannerLabel: {
    ...typography.bodyBlack,
    fontSize: 13,
    color: "rgba(148,163,184,0.95)",
    marginBottom: 8,
  },
  scannerFrame: {
    borderRadius: 16,
    overflow: "hidden",
    height: 400, // Taller scanner area
    marginBottom: 8,
  },
  scannerHint: {
    ...typography.bodyBlack,
    fontSize: 11,
    color: "rgba(148,163,184,0.9)",
  },

  section: {
    marginTop: 16,
  },
  label: {
    fontSize: 13,
    color: "rgba(148,163,184,0.95)",
    marginBottom: 6,
  },

  scannedTitle: {
    ...typography.bodyBlack,
    fontSize: 13,
    color: "rgba(148,163,184,0.9)",
    marginBottom: 6,
  },
  scannedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  scannedName: {
    ...typography.bodyBlack,
    fontSize: 15,
    color: "#E5ECFF",
    fontWeight: "500",
  },
  scannedCode: {
    ...typography.bodyBlack,
    fontSize: 11,
    color: "rgba(148,163,184,0.9)",
    marginTop: 2,
  },
  rescanButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.6)",
  },
  rescanText: {
    ...typography.bodyBlack,
    fontSize: 11,
    color: "#22D3EE",
    marginLeft: 4,
  },

  gramsSection: {
    marginTop: 4,
  },
  gramsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(30,64,175,0.7)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  gramsInput: {
    flex: 1,
    color: "#E5ECFF",
    fontSize: 16,
    marginRight: 4,
  },
  gramsSuffix: {
    ...typography.bodyBlack,
    fontSize: 14,
    color: "rgba(148,163,184,0.95)",
  },

  macroTotalsCard: {
    marginTop: 16,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(30,64,175,0.7)",
  },
  macroTotalsTitle: {
    ...typography.bodyBlack,
    fontSize: 13,
    color: "#E5ECFF",
    marginBottom: 10,
  },
  macroTotalsRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  macroTotalsCol: {
    flex: 1,
  },
  macroTotalsLabel: {
    ...typography.bodyBlack,
    fontSize: 12,
    color: "rgba(148,163,184,0.95)",
  },
  macroTotalsValue: {
    ...typography.bodyBlack,
    fontSize: 18,
    color: "#E5ECFF",
    fontWeight: "500",
    marginTop: 2,
  },
  macroChipRow: {
    flexDirection: "row",
    marginTop: 6,
    justifyContent: "space-between",
  },
  macroChip: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "rgba(15,23,42,0.95)",
    borderWidth: 1,
    borderColor: "rgba(51,65,85,0.9)",
    alignItems: "center",
  },
  macroChipLabel: {
    ...typography.bodyBlack,
    fontSize: 11,
    color: "rgba(148,163,184,0.95)",
  },
  macroChipValue: {
    ...typography.bodyBlack,
    fontSize: 13,
    color: "#E5ECFF",
    fontWeight: "500",
    marginTop: 2,
  },

  tipCard: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(8,47,73,0.95)",
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.5)",
  },
  tipIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.9)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  tipTitle: {
    ...typography.bodyBlack,
    fontSize: 13,
    color: "#E5ECFF",
    fontWeight: "500",
    marginBottom: 4,
  },
  tipText: {
    ...typography.bodyBlack,
    fontSize: 11,
    color: "rgba(148,163,184,0.95)",
  },

  saveWrapper: {
    marginTop: 22,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 18,
  },
  saveText: {
    ...typography.bodyBlack,
    fontSize: 15,
    color: "#FFFFFF",
    fontWeight: "600",
    textAlign: "center",
  },
});
