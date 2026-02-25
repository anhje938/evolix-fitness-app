import { generalStyles } from "@/config/styles";
import { typography } from "@/config/typography";
import { Food, FoodDto } from "@/types/meal";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
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
import { AppDateTimePicker } from "../date/AppDateTimePicker";

type EditMealSheetProps = {
  isOpen: boolean;
  onClose: () => void;

  // Meal to edit (prefill)
  meal: Food | null;

  // Submit updated values
  onSubmit: (mealId: string, values: FoodDto) => Promise<void> | void;
};

const SHEET_MAX_HEIGHT = Dimensions.get("window").height * 0.85;

type FieldErrors = {
  title?: string;
  calories?: string;
  proteins?: string;
  carbs?: string;
  fats?: string;
};

function toNumberString(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  return String(n);
}

export function EditMealSheet({
  isOpen,
  onClose,
  meal,
  onSubmit,
}: EditMealSheetProps) {
  const mealId = useMemo(() => (meal ? String(meal.id) : ""), [meal]);

  const [title, setTitle] = useState("");
  const [calories, setCalories] = useState("");
  const [proteins, setProteins] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [timestampUtc, setTimestampUtc] = useState<Date | null>(new Date());

  const [errors, setErrors] = useState<FieldErrors>({});

  // Prefill when opening / when meal changes
  useEffect(() => {
    if (!isOpen || !meal) return;

    setTitle(meal.title ?? "");
    setCalories(toNumberString(meal.calories));
    setProteins(toNumberString(meal.proteins));
    setCarbs(toNumberString(meal.carbs));
    setFats(toNumberString(meal.fats));

    const dt = meal.timestampUtc ? new Date(meal.timestampUtc) : new Date();
    setTimestampUtc(Number.isNaN(dt.getTime()) ? new Date() : dt);

    setErrors({});
  }, [isOpen, meal]);

  // If sheet is closed, render nothing to avoid blocking touches/scroll
  if (!isOpen) return null;

  // Safety: if open but meal missing, show nothing (or you can show a fallback)
  if (!meal) return null;

  const handleSave = () => {
    const newErrors: FieldErrors = {};

    if (!title.trim()) newErrors.title = "Tittel mangler";
    if (!calories.trim()) newErrors.calories = "Kalorier mangler";
    if (!proteins.trim()) newErrors.proteins = "Proteiner mangler";
    if (!carbs.trim()) newErrors.carbs = "Karbs mangler";
    if (!fats.trim()) newErrors.fats = "Fett mangler";

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
      onSubmit(mealId, payload);
    } catch (error) {
      console.log("Couldnt update meal", error);
    }
  };

  const handleReset = () => {
    // Reset to the values from the meal (premium UX)
    setTitle(meal.title ?? "");
    setCalories(toNumberString(meal.calories));
    setProteins(toNumberString(meal.proteins));
    setCarbs(toNumberString(meal.carbs));
    setFats(toNumberString(meal.fats));

    const dt = meal.timestampUtc ? new Date(meal.timestampUtc) : new Date();
    setTimestampUtc(Number.isNaN(dt.getTime()) ? new Date() : dt);

    setErrors({});
  };

  return (
    <View style={styles.absoluteWrapper} pointerEvents="box-none">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <View style={styles.overlay}>
          <View pointerEvents="box-none" style={styles.sheetWrapper}>
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
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.h2, styles.title]}>
                        Rediger måltid
                      </Text>
                      <Text style={styles.subtitle} numberOfLines={1}>
                        {meal.title?.trim() ? meal.title : "Måltid"}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={onClose}
                      style={styles.closeButton}
                    >
                      <XIcon height={18} width={18} />
                    </TouchableOpacity>
                  </View>

                  {/* quick actions (premium) */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      onPress={handleReset}
                      style={styles.actionBtn}
                    >
                      <Ionicons
                        name="refresh-outline"
                        size={16}
                        color="rgba(229,236,255,0.92)"
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.actionText}>Tilbakestill</Text>
                    </TouchableOpacity>

                    <View style={styles.actionDivider} />

                    <View style={styles.actionHint}>
                      <Ionicons
                        name="information-circle-outline"
                        size={16}
                        color="rgba(148,163,184,0.9)"
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.actionHintText}>
                        Endringer lagres når du trykker Oppdater.
                      </Text>
                    </View>
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

                  {/* calories */}
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
                        pointerEvents="none"
                      />
                    </View>
                    {errors.calories && (
                      <Text style={styles.errorText}>{errors.calories}</Text>
                    )}
                  </View>

                  {/* macros row */}
                  <View style={[styles.section, styles.macroRow]}>
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
                        name="create-outline"
                        size={16}
                        color="#22D3EE"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tipTitle}>Redigering</Text>
                      <Text style={styles.tipText}>
                        Oppdater gjerne tidspunktet hvis du logget feil.
                        Makroene kan justeres senere uten å endre historikken.
                      </Text>
                    </View>
                  </View>

                  {/* update button */}
                  <TouchableOpacity
                    onPress={handleSave}
                    style={styles.saveWrapper}
                  >
                    <LinearGradient
                      colors={["#3B82F6", "#22D3EE"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.saveButton}
                    >
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color="#FFFFFF"
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.saveText}>Oppdater måltid</Text>
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
    gap: 12,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(148,163,184,0.95)",
  },
  closeButton: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.9)",
  },

  actionRow: {
    marginTop: 8,
    marginBottom: 6,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(2,6,23,0.30)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  actionText: {
    ...typography.bodyBlack,
    fontSize: 13,
    color: "rgba(229,236,255,0.92)",
    fontWeight: "600",
  },
  actionDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginVertical: 10,
  },
  actionHint: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionHintText: {
    ...typography.bodyBlack,
    fontSize: 12,
    color: "rgba(148,163,184,0.95)",
    fontWeight: "500",
    flex: 1,
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

  calorieContainer: {
    position: "relative",
    width: "100%",
  },
  calorieInput: {
    borderWidth: 2,
    borderRadius: 18,
    borderColor: "rgba(34,211,238,0.7)",
    paddingRight: 40,
  },
  calorieIcon: {
    position: "absolute",
    right: 14,
    top: "50%",
    marginTop: -9,
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
