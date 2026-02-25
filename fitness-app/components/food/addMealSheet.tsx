import { generalStyles } from "@/config/styles";
import { typography } from "@/config/typography";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Platform,
  Dimensions,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import XIcon from "../../assets/icons/white-x.svg";
import { ToggleModeButtons } from "./toggleModeButtons";
import { AppDateTimePicker } from "../date/AppDateTimePicker";
import { FoodDto } from "@/types/meal";

type AddMealSheetProps = {
  isOpen: boolean;
  mode: "manual" | "qr";
  setMode: (mode: "manual" | "qr") => void;
  onClose: () => void;
  onSubmit: (values: FoodDto) => Promise<void> | void;
};

const SHEET_MAX_HEIGHT = Dimensions.get("window").height * 0.85;

type FieldErrors = {
  title?: string;
  calories?: string;
  proteins?: string;
  carbs?: string;
  fats?: string;
};

export function AddMealSheet({
  isOpen,
  onClose,
  setMode,
  mode,
  onSubmit,
}: AddMealSheetProps) {
  const [title, setTitle] = useState("");
  const [calories, setCalories] = useState("");
  const [proteins, setProteins] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [timestampUtc, setTimestampUtc] = useState<Date | null>(new Date());

  const [errors, setErrors] = useState<FieldErrors>({});

  // If sheet is closed, render nothing to avoid blocking touches/scroll
  if (!isOpen) return null;

  const handleSave = () => {
    // Basic front-end validation for required fields
    const newErrors: FieldErrors = {};

    if (!title.trim()) {
      newErrors.title = "Tittel mangler";
    }
    if (!calories.trim()) {
      newErrors.calories = "Kalorier mangler";
    }
    if (!proteins.trim()) {
      newErrors.proteins = "Proteiner mangler";
    }
    if (!carbs.trim()) {
      newErrors.carbs = "Karbs mangler";
    }
    if (!fats.trim()) {
      newErrors.fats = "Fett mangler";
    }

    // If any error exists, update state and abort submit
    if (
      newErrors.title ||
      newErrors.calories ||
      newErrors.proteins ||
      newErrors.carbs ||
      newErrors.fats
    ) {
      setErrors(newErrors);
      return;
    }

    // Clear errors if everything is valid
    setErrors({});

    const payload: FoodDto = {
      title: title.trim(),
      calories: Number(calories) || 0,
      proteins: Number(proteins) || 0,
      carbs: Number(carbs) || 0,
      fats: Number(fats) || 0,
      timestampUtc: (timestampUtc ?? new Date()).toISOString(),
    };

    try {
      console.log(payload);
      onSubmit(payload);
    } catch (error) {
      console.log("Couldnt save meal", error);
    }
  };

  return (
    // absolute wrapper so sheet always covers the whole screen
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
                  {/* header */}
                  <View style={styles.headerRow}>
                    <Text style={[typography.h2, styles.title]}>
                      Legg til måltid
                    </Text>
                    <TouchableOpacity
                      onPress={onClose}
                      style={styles.closeButton}
                    >
                      <XIcon height={18} width={18} />
                    </TouchableOpacity>
                  </View>

                  {/* toggle manual / QR */}
                  <View style={styles.toggleWrapper}>
                    <ToggleModeButtons setMode={setMode} mode={mode} />
                  </View>

                  {/* meal title */}
                  <View style={styles.section}>
                    <Text style={[typography.bodyBlack, styles.label]}>
                      Måltidsnavn
                    </Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="F.eks. Middag"
                      value={title}
                      onChangeText={setTitle}
                      placeholderTextColor="rgba(148,163,184,0.8)"
                      returnKeyType="done"
                    />
                    {errors.title && (
                      <Text style={styles.errorText}>{errors.title}</Text>
                    )}
                  </View>

                  {/* calories – same pattern as meal title, just with accent border and icon */}
                  <View style={styles.section}>
                    <Text style={[typography.bodyBlack, styles.label]}>
                      Kalorier
                    </Text>
                    <View style={styles.calorieContainer}>
                      <TextInput
                        style={[styles.textInput, styles.calorieInput]}
                        placeholder="0"
                        value={calories}
                        onChangeText={setCalories}
                        placeholderTextColor="rgba(148,163,184,0.8)"
                        keyboardType="numeric"
                        returnKeyType="done"
                      />
                      <Ionicons
                        name="flame-outline"
                        size={18}
                        color="rgba(148,163,184,0.9)"
                        style={styles.calorieIcon}
                        pointerEvents="none" // icon should never steal focus
                      />
                    </View>
                    {errors.calories && (
                      <Text style={styles.errorText}>{errors.calories}</Text>
                    )}
                  </View>

                  {/* macros row */}
                  <View style={[styles.section, styles.macroRow]}>
                    {/* Protein */}
                    <View style={styles.macroWrapper}>
                      <Text style={[typography.bodyBlack, styles.macroLabel]}>
                        Protein (g)
                      </Text>
                      <TextInput
                        style={styles.macroInput}
                        placeholder="40"
                        value={proteins}
                        onChangeText={setProteins}
                        placeholderTextColor="rgba(148,163,184,0.8)"
                        keyboardType="numeric"
                        returnKeyType="done"
                      />
                      {errors.proteins && (
                        <Text style={styles.errorTextCenter}>
                          {errors.proteins}
                        </Text>
                      )}
                    </View>

                    {/* Carbs */}
                    <View style={styles.macroWrapper}>
                      <Text style={[typography.bodyBlack, styles.macroLabel]}>
                        Karbs (g)
                      </Text>
                      <TextInput
                        style={styles.macroInput}
                        placeholder="50"
                        value={carbs}
                        onChangeText={setCarbs}
                        placeholderTextColor="rgba(148,163,184,0.8)"
                        keyboardType="numeric"
                        returnKeyType="done"
                      />
                      {errors.carbs && (
                        <Text style={styles.errorTextCenter}>
                          {errors.carbs}
                        </Text>
                      )}
                    </View>

                    {/* Fats */}
                    <View style={styles.macroWrapper}>
                      <Text style={[typography.bodyBlack, styles.macroLabel]}>
                        Fett (g)
                      </Text>
                      <TextInput
                        style={styles.macroInput}
                        placeholder="20"
                        value={fats}
                        onChangeText={setFats}
                        placeholderTextColor="rgba(148,163,184,0.8)"
                        keyboardType="numeric"
                        returnKeyType="done"
                      />
                      {errors.fats && (
                        <Text style={styles.errorTextCenter}>
                          {errors.fats}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* time picker */}
                  <View style={styles.section}>
                    <Text style={[typography.bodyBlack, styles.label]}>
                      Tidspunkt
                    </Text>
                    <AppDateTimePicker
                      label=""
                      mode="time"
                      value={timestampUtc}
                      onChange={setTimestampUtc}
                    />
                  </View>

                  {/* tip card */}
                  <View style={styles.tipCard}>
                    <View style={styles.tipIconWrapper}>
                      <Ionicons
                        name="restaurant-outline"
                        size={16}
                        color="#22D3EE"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tipTitle}>
                        Tips for nøyaktig logging
                      </Text>
                      <Text style={styles.tipText}>
                        Vei maten din for mest nøyaktige resultater. Logg
                        måltidene dine rett etter at du spiser for bedre
                        oversikt.
                      </Text>
                    </View>
                  </View>

                  {/* confirm meal button */}
                  <TouchableOpacity
                    onPress={handleSave}
                    style={styles.saveWrapper}
                  >
                    <LinearGradient
                      colors={["#00C98B", "#00E0B5"]}
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
                      <Text style={styles.saveText}>Lagre måltid</Text>
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
  // modal overlay above the whole screen
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
  section: {
    marginTop: 16,
  },
  label: {
    fontSize: 13,
    color: "rgba(148,163,184,0.95)",
    marginBottom: 6,
  },
  textInput: {
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(30,64,175,0.7)",
    color: "#E5ECFF",
  },

  // calories: same behavior as textInput, but with accent border and an icon inside
  calorieContainer: {
    position: "relative",
    width: "100%",
  },
  calorieInput: {
    borderWidth: 2,
    borderRadius: 18,
    borderColor: "rgba(34,211,238,0.7)",
    paddingRight: 40, // space for the icon
  },
  calorieIcon: {
    position: "absolute",
    right: 14,
    top: "50%",
    marginTop: -9, // half of icon size (18 / 2)
  },

  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  macroWrapper: {
    width: "30%",
  },
  macroLabel: {
    fontSize: 12,
    color: "rgba(148,163,184,0.95)",
    textAlign: "center",
    marginBottom: 6,
  },
  macroInput: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(51,65,85,0.9)",
    textAlign: "center",
    fontSize: 16,
    color: "#E5ECFF",
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
  },
  errorText: {
    ...typography.bodyBlack,
    fontSize: 11,
    color: "#F97373",
    marginTop: 4,
  },
  errorTextCenter: {
    ...typography.bodyBlack,
    fontSize: 11,
    color: "#F97373",
    marginTop: 4,
    textAlign: "center",
  },
});
