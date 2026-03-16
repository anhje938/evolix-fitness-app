import { FetchFoodFromBarcode } from "@/api/food";
import { generalStyles } from "@/config/styles";
import { typography } from "@/config/typography";
import { useAuth } from "@/context/AuthProvider";
import {
  ComposedMeal,
  FoodFromBarcode,
  UpsertComposedMealDto,
  UpsertComposedMealIngredientDto,
} from "@/types/meal";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import QRScanner from "./QRScanner";

const SHEET_MAX_HEIGHT = Dimensions.get("window").height * 0.88;

type Macros = {
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
};

type EditorIngredient = UpsertComposedMealIngredientDto & {
  key: string;
  scannedPer100?: Macros | null;
};

type ComposedMealEditorSheetProps = {
  isOpen: boolean;
  initialMeal?: ComposedMeal | null;
  onClose: () => void;
  onSubmit: (dto: UpsertComposedMealDto) => Promise<void> | void;
};

function createIngredient(sortOrder: number): EditorIngredient {
  return {
    key: `${Date.now()}-${Math.random()}`,
    name: "",
    amountGrams: 0,
    calories: 0,
    proteins: 0,
    carbs: 0,
    fats: 0,
    sortOrder,
    scannedPer100: null,
  };
}

function toNumber(raw: string): number {
  const n = Number(raw.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function toIntMacro(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

function scaleMacros(per100: Macros, grams: number): Macros {
  const factor = grams / 100;
  return {
    calories: +(per100.calories * factor).toFixed(1),
    proteins: +(per100.proteins * factor).toFixed(1),
    carbs: +(per100.carbs * factor).toFixed(1),
    fats: +(per100.fats * factor).toFixed(1),
  };
}

export function ComposedMealEditorSheet({
  isOpen,
  initialMeal,
  onClose,
  onSubmit,
}: ComposedMealEditorSheetProps) {
  const isEdit = !!initialMeal;
  const { token } = useAuth();

  const [name, setName] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [ingredients, setIngredients] = useState<EditorIngredient[]>([
    createIngredient(0),
    createIngredient(1),
  ]);
  const [scanTargetKey, setScanTargetKey] = useState<string | null>(null);
  const [scanLoadingKey, setScanLoadingKey] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (initialMeal) {
      setName(initialMeal.name ?? "");
      setIsFavorite(!!initialMeal.isFavorite);
      const next = (initialMeal.ingredients ?? []).map((x, idx) => ({
        key: `${x.id || idx}-${Date.now()}`,
        name: x.name ?? "",
        amountGrams: Number(x.amountGrams ?? 0),
        calories: Number(x.calories ?? 0),
        proteins: Number(x.proteins ?? 0),
        carbs: Number(x.carbs ?? 0),
        fats: Number(x.fats ?? 0),
        sortOrder: idx,
        scannedPer100: null,
      }));
      setIngredients(
        next.length > 0 ? next : [createIngredient(0), createIngredient(1)]
      );
    } else {
      setName("");
      setIsFavorite(false);
      setIngredients([createIngredient(0), createIngredient(1)]);
    }

    setScanTargetKey(null);
    setScanLoadingKey(null);
    setErrorText(null);
    setIsSaving(false);
  }, [initialMeal, isOpen]);

  const totals = useMemo(() => {
    let calories = 0;
    let proteins = 0;
    let carbs = 0;
    let fats = 0;
    let totalGrams = 0;

    for (const ing of ingredients) {
      calories += Number(ing.calories || 0);
      proteins += Number(ing.proteins || 0);
      carbs += Number(ing.carbs || 0);
      fats += Number(ing.fats || 0);
      totalGrams += Number(ing.amountGrams || 0);
    }

    return { calories, proteins, carbs, fats, totalGrams };
  }, [ingredients]);

  const per100 = useMemo(() => {
    if (totals.totalGrams <= 0) return null;
    const factor = 100 / totals.totalGrams;
    return {
      calories: Math.round(totals.calories * factor),
      proteins: Math.round(totals.proteins * factor),
      carbs: Math.round(totals.carbs * factor),
      fats: Math.round(totals.fats * factor),
    };
  }, [totals]);

  const activeIngredientCount = useMemo(
    () => ingredients.filter((x) => x.name.trim().length > 0).length,
    [ingredients]
  );

  if (!isOpen) return null;

  const setIngredientField = (
    key: string,
    field: keyof UpsertComposedMealIngredientDto,
    value: string
  ) => {
    setIngredients((prev) =>
      prev.map((ing) => {
        if (ing.key !== key) return ing;
        if (field === "name") return { ...ing, name: value };
        const parsedValue = toNumber(value);

        if (field === "amountGrams" && ing.scannedPer100) {
          return {
            ...ing,
            amountGrams: parsedValue,
            ...scaleMacros(ing.scannedPer100, parsedValue),
          };
        }

        if (ing.scannedPer100 && field !== "amountGrams") {
          return {
            ...ing,
            [field]: parsedValue,
            scannedPer100: null,
          };
        }

        return { ...ing, [field]: parsedValue };
      })
    );
  };

  const handleAddIngredient = () => {
    setIngredients((prev) => [...prev, createIngredient(prev.length)]);
  };

  const handleRemoveIngredient = (key: string) => {
    setIngredients((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((x) => x.key !== key);
    });
    setScanTargetKey((prev) => (prev === key ? null : prev));
    setScanLoadingKey((prev) => (prev === key ? null : prev));
  };

  const handleScanIngredient = async (
    ingredientKey: string,
    scannedValue: string
  ) => {
    if (!scannedValue) return;

    if (!token) {
      setScanTargetKey(null);
      Alert.alert("Mangler innlogging", "Logg inn på nytt og prøv igjen.");
      return;
    }

    setScanLoadingKey(ingredientKey);
    const loadingGuard = setTimeout(() => {
      setScanLoadingKey((prev) => (prev === ingredientKey ? null : prev));
      setScanTargetKey((prev) => (prev === ingredientKey ? null : prev));
    }, 10000);

    try {
      const data: FoodFromBarcode = await FetchFoodFromBarcode(token, scannedValue);
      const per100Values: Macros = {
        calories: Number(data.caloriesPr100 || 0),
        proteins: Number(data.proteinsPr100 || 0),
        carbs: Number(data.carbsPr100 || 0),
        fats: Number(data.fatsPr100 || 0),
      };

      setIngredients((prev) =>
        prev.map((ing) => {
          if (ing.key !== ingredientKey) return ing;
          const grams = Number(ing.amountGrams || 0) > 0 ? Number(ing.amountGrams) : 100;

          return {
            ...ing,
            name: data.title || ing.name,
            amountGrams: grams,
            ...scaleMacros(per100Values, grams),
            scannedPer100: per100Values,
          };
        })
      );
      setScanTargetKey(null);
    } catch (error) {
      console.log("Could not scan ingredient barcode", error);
      setScanTargetKey(null);
      Alert.alert(
        "Fant ikke produkt",
        "Kunne ikke hente produktdata fra strekkoden. Prøv igjen eller legg inn manuelt."
      );
    } finally {
      clearTimeout(loadingGuard);
      setScanLoadingKey(null);
    }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorText("Retten må ha et navn.");
      return;
    }

    const normalizedIngredients = ingredients
      .map((ing, idx) => ({
        name: ing.name.trim(),
        amountGrams: Number(ing.amountGrams || 0),
        calories: toIntMacro(ing.calories),
        proteins: toIntMacro(ing.proteins),
        carbs: toIntMacro(ing.carbs),
        fats: toIntMacro(ing.fats),
        sortOrder: idx,
      }))
      .filter((ing) => ing.name.length > 0);

    if (normalizedIngredients.length === 0) {
      setErrorText("Legg til minst en ingrediens med navn.");
      return;
    }

    if (normalizedIngredients.some((ing) => ing.amountGrams <= 0)) {
      setErrorText("Alle ingredienser må ha gram over 0.");
      return;
    }

    if (totals.calories <= 0) {
      setErrorText("Retten må ha mer enn 0 kcal for å lagres.");
      return;
    }

    setErrorText(null);
    setIsSaving(true);
    try {
      await onSubmit({
        name: trimmedName,
        isFavorite,
        ingredients: normalizedIngredients,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.absoluteWrapper}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 56 : 0}
      >
        <View style={styles.overlay}>
          <View style={styles.sheetWrapper}>
            <View
              style={[
                generalStyles.newCard,
                styles.sheet,
                { maxHeight: SHEET_MAX_HEIGHT },
              ]}
            >
              <LinearGradient
                pointerEvents="none"
                colors={[
                  "rgba(56,189,248,0.2)",
                  "rgba(14,116,144,0.14)",
                  "rgba(2,6,23,0)",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />

              <ScrollView
                style={styles.sheetScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sheetContent}
                keyboardShouldPersistTaps="always"
                keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                nestedScrollEnabled
                scrollEventThrottle={16}
                removeClippedSubviews={false}
              >
                  <View style={styles.headerRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.h2, styles.title]}>
                        {isEdit ? "Rediger rett" : "Ny rett"}
                      </Text>
                      <Text style={[typography.body, styles.subtitle]}>
                        Legg inn ingredienser med gram for realistisk logging
                      </Text>
                    </View>

                    <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
                      <Ionicons name="close" size={18} color="#E2E8F0" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.section}>
                    <Text style={[typography.bodyBlack, styles.label]}>Navn på rett</Text>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="F.eks. Kylling med ris"
                      placeholderTextColor="rgba(148,163,184,0.82)"
                      style={styles.input}
                    />
                  </View>

                  <View style={styles.favoriteRow}>
                    <Text style={[typography.bodyBlack, styles.label]}>Favoritt</Text>
                    <TouchableOpacity
                      onPress={() => setIsFavorite((v) => !v)}
                      style={[styles.favoriteBtn, isFavorite && styles.favoriteBtnActive]}
                    >
                      <Ionicons
                        name={isFavorite ? "star" : "star-outline"}
                        size={15}
                        color={isFavorite ? "#111827" : "#E2E8F0"}
                      />
                      <Text
                        style={[styles.favoriteText, isFavorite && styles.favoriteTextActive]}
                      >
                        Favoritt
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.totalsCard}>
                    <Text style={[typography.bodyBlack, styles.totalsTitle]}>
                      Næringsoversikt
                    </Text>

                    <View style={styles.metaInfoRow}>
                      <View style={styles.metaInfoChip}>
                        <Ionicons name="barbell-outline" size={12} color="#BAE6FD" />
                        <Text style={styles.metaInfoText}>{Math.round(totals.totalGrams)} g totalt</Text>
                      </View>
                      <View style={styles.metaInfoChip}>
                        <Ionicons name="list-outline" size={12} color="#BAE6FD" />
                        <Text style={styles.metaInfoText}>{activeIngredientCount} ingredienser</Text>
                      </View>
                    </View>

                    <View style={styles.totalsPillsRow}>
                      <View style={[styles.totalPill, styles.totalPillCalories]}>
                        <Text style={styles.totalPillLabel}>Hele retten</Text>
                        <Text style={styles.totalPillValue}>{Math.round(totals.calories)} kcal</Text>
                        <Text style={styles.totalPillSub}>
                          P {Math.round(totals.proteins)} g | C {Math.round(totals.carbs)} g | F {Math.round(totals.fats)} g
                        </Text>
                      </View>

                      <View style={styles.totalPill}>
                        <Text style={styles.totalPillLabel}>Per 100 g</Text>
                        <Text style={styles.totalPillValue}>
                          {per100 ? `${per100.calories} kcal` : "-"}
                        </Text>
                        <Text style={styles.totalPillSub}>
                          {per100
                            ? `P ${per100.proteins} g | C ${per100.carbs} g | F ${per100.fats} g`
                            : "Legg inn gram for beregning"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.sectionTop}>
                    <Text style={[typography.bodyBlack, styles.sectionTitle]}>Ingredienser</Text>
                    <TouchableOpacity onPress={handleAddIngredient} style={styles.addIngredientBtn}>
                      <Ionicons name="add" size={14} color="#E6FFFB" />
                      <Text style={styles.addIngredientText}>Legg til</Text>
                    </TouchableOpacity>
                  </View>

                  {ingredients.map((ing, idx) => (
                    <View key={ing.key} style={styles.ingredientCard}>
                      <View style={styles.ingredientHeader}>
                        <Text style={[typography.bodyBlack, styles.ingredientTitle]}>
                          Ingrediens {idx + 1}
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleRemoveIngredient(ing.key)}
                          disabled={ingredients.length <= 1}
                          style={[
                            styles.removeBtn,
                            ingredients.length <= 1 && { opacity: 0.4 },
                          ]}
                        >
                          <Ionicons name="trash-outline" size={14} color="#FCA5A5" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.scanRow}>
                        <TouchableOpacity
                          onPress={() =>
                            setScanTargetKey((prev) => (prev === ing.key ? null : ing.key))
                          }
                          style={[styles.scanBtn, scanTargetKey === ing.key && styles.scanBtnActive]}
                        >
                          <Ionicons name="scan-outline" size={14} color="#22D3EE" />
                          <Text style={styles.scanBtnText}>
                            {ing.scannedPer100 ? "Skann på nytt" : "Skann produkt"}
                          </Text>
                        </TouchableOpacity>

                        {ing.scannedPer100 && (
                          <View style={styles.scanBadge}>
                            <Ionicons name="checkmark-circle" size={13} color="#86EFAC" />
                            <Text style={styles.scanBadgeText}>Auto-beregnet</Text>
                          </View>
                        )}
                      </View>

                      {scanTargetKey === ing.key && (
                        <View style={styles.scannerCard}>
                          <Text style={styles.scannerLabel}>
                            {scanLoadingKey === ing.key
                              ? "Henter produkt..."
                              : "Hold strekkoden innenfor rammen"}
                          </Text>
                          <View style={styles.scannerFrame}>
                            <QRScanner
                              onScanned={(value) => {
                                void handleScanIngredient(ing.key, value);
                              }}
                              title=""
                            />
                          </View>
                        </View>
                      )}

                      <TextInput
                        value={ing.name}
                        onChangeText={(v) => setIngredientField(ing.key, "name", v)}
                        placeholder="Navn på ingrediens"
                        placeholderTextColor="rgba(148,163,184,0.82)"
                        style={[styles.input, styles.ingredientInput]}
                      />

                      <View style={styles.gridRow}>
                        <View style={styles.gridCell}>
                          <Text style={styles.smallLabel}>Gram</Text>
                          <TextInput
                            value={String(ing.amountGrams || "")}
                            onChangeText={(v) => setIngredientField(ing.key, "amountGrams", v)}
                            keyboardType="decimal-pad"
                            style={styles.smallInput}
                          />
                        </View>
                        <View style={styles.gridCell}>
                          <Text style={styles.smallLabel}>Kcal</Text>
                          <TextInput
                            value={String(ing.calories || "")}
                            onChangeText={(v) => setIngredientField(ing.key, "calories", v)}
                            keyboardType="decimal-pad"
                            editable={!ing.scannedPer100}
                            style={[styles.smallInput, ing.scannedPer100 && styles.smallInputDisabled]}
                          />
                        </View>
                        <View style={styles.gridCell}>
                          <Text style={styles.smallLabel}>Protein</Text>
                          <TextInput
                            value={String(ing.proteins || "")}
                            onChangeText={(v) => setIngredientField(ing.key, "proteins", v)}
                            keyboardType="decimal-pad"
                            editable={!ing.scannedPer100}
                            style={[styles.smallInput, ing.scannedPer100 && styles.smallInputDisabled]}
                          />
                        </View>
                        <View style={styles.gridCell}>
                          <Text style={styles.smallLabel}>Karbo</Text>
                          <TextInput
                            value={String(ing.carbs || "")}
                            onChangeText={(v) => setIngredientField(ing.key, "carbs", v)}
                            keyboardType="decimal-pad"
                            editable={!ing.scannedPer100}
                            style={[styles.smallInput, ing.scannedPer100 && styles.smallInputDisabled]}
                          />
                        </View>
                        <View style={styles.gridCell}>
                          <Text style={styles.smallLabel}>Fett</Text>
                          <TextInput
                            value={String(ing.fats || "")}
                            onChangeText={(v) => setIngredientField(ing.key, "fats", v)}
                            keyboardType="decimal-pad"
                            editable={!ing.scannedPer100}
                            style={[styles.smallInput, ing.scannedPer100 && styles.smallInputDisabled]}
                          />
                        </View>
                      </View>

                      {ing.scannedPer100 && (
                        <Text style={styles.scannedHint}>
                          Næringsverdier oppdateres automatisk når du endrer gram.
                        </Text>
                      )}
                    </View>
                  ))}

                  {errorText && <Text style={styles.errorText}>{errorText}</Text>}

                  <TouchableOpacity
                    onPress={handleSave}
                    style={styles.saveWrap}
                    disabled={isSaving}
                  >
                    <LinearGradient
                      colors={isSaving ? ["#0B4C5D", "#0B4C5D"] : ["#0891B2", "#22D3EE"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.saveBtn}
                    >
                      <Ionicons name="save-outline" size={17} color="white" />
                      <Text style={styles.saveText}>
                        {isSaving
                          ? "Lagrer..."
                          : isEdit
                            ? "Oppdater rett"
                            : "Lagre rett"}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
              </ScrollView>
            </View>
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
    zIndex: 80,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(3,7,18,0.64)",
  },
  sheetWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sheet: {
    width: "100%",
    maxWidth: 620,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.3)",
    backgroundColor: "rgba(11,30,52,0.96)",
  },
  sheetScroll: {
    width: "100%",
  },
  sheetContent: {
    paddingBottom: 24,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: "#F0F9FF",
    fontSize: 21,
  },
  subtitle: {
    marginTop: 2,
    color: "rgba(191,219,254,0.9)",
    fontSize: 12,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.32)",
    backgroundColor: "rgba(8,47,73,0.72)",
  },
  section: {
    gap: 6,
  },
  label: {
    color: "rgba(226,242,255,0.96)",
    fontSize: 12,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.34)",
    backgroundColor: "rgba(12,44,70,0.5)",
    color: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
  },
  favoriteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  favoriteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.34)",
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: "rgba(12,44,70,0.52)",
  },
  favoriteBtnActive: {
    borderColor: "rgba(250,204,21,0.4)",
    backgroundColor: "#FACC15",
  },
  favoriteText: {
    color: "#E2E8F0",
    fontSize: 11,
    fontWeight: "500",
  },
  favoriteTextActive: {
    color: "#111827",
  },
  totalsCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.3)",
    backgroundColor: "rgba(14,116,144,0.24)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  totalsTitle: {
    color: "#D6F3FF",
    fontSize: 12,
    marginBottom: 6,
  },
  metaInfoRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  metaInfoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.3)",
    backgroundColor: "rgba(15,51,75,0.55)",
  },
  metaInfoText: {
    color: "rgba(224,242,254,0.95)",
    fontSize: 10,
    fontWeight: "500",
  },
  totalsPillsRow: {
    flexDirection: "column",
    gap: 6,
  },
  totalPill: {
    minHeight: 52,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.26)",
    backgroundColor: "rgba(15,51,75,0.52)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: "center",
  },
  totalPillCalories: {
    borderColor: "rgba(34,211,238,0.46)",
    backgroundColor: "rgba(14,116,144,0.8)",
  },
  totalPillLabel: {
    color: "rgba(191,219,254,0.95)",
    fontSize: 10,
    fontWeight: "500",
    marginBottom: 4,
  },
  totalPillValue: {
    color: "#F0F9FF",
    fontSize: 13,
    fontWeight: "600",
  },
  totalPillSub: {
    color: "rgba(224,242,254,0.9)",
    fontSize: 10,
    fontWeight: "500",
    marginTop: 3,
  },
  sectionTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: "#EAF7FF",
    fontSize: 14,
  },
  addIngredientBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.42)",
    backgroundColor: "rgba(14,116,144,0.82)",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  addIngredientText: {
    color: "#ECFEFF",
    fontSize: 11,
    fontWeight: "500",
  },
  ingredientCard: {
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.24)",
    backgroundColor: "rgba(11,39,63,0.5)",
    padding: 10,
    gap: 8,
  },
  ingredientHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ingredientTitle: {
    color: "#F0F9FF",
    fontSize: 12,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.32)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(127,29,29,0.28)",
  },
  ingredientInput: {
    paddingVertical: 10,
  },
  scanRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.42)",
    backgroundColor: "rgba(14,116,144,0.62)",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  scanBtnActive: {
    borderColor: "rgba(125,211,252,0.7)",
    backgroundColor: "rgba(8,145,178,0.8)",
  },
  scanBtnText: {
    color: "#E0F2FE",
    fontSize: 11,
    fontWeight: "500",
  },
  scanBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.35)",
    backgroundColor: "rgba(20,83,45,0.28)",
  },
  scanBadgeText: {
    color: "#BBF7D0",
    fontSize: 10,
    fontWeight: "500",
  },
  scannerCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.34)",
    backgroundColor: "rgba(12,44,70,0.52)",
    padding: 8,
    gap: 6,
  },
  scannerLabel: {
    color: "rgba(148,163,184,0.95)",
    fontSize: 11,
  },
  scannerFrame: {
    height: 220,
    borderRadius: 10,
    overflow: "hidden",
  },
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gridCell: {
    width: "18%",
    minWidth: 58,
  },
  smallLabel: {
    color: "rgba(191,219,254,0.9)",
    fontSize: 10,
    marginBottom: 3,
  },
  smallInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.3)",
    backgroundColor: "rgba(12,44,70,0.62)",
    color: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 12,
    textAlign: "center",
  },
  smallInputDisabled: {
    opacity: 0.75,
    borderColor: "rgba(45,212,191,0.5)",
    backgroundColor: "rgba(12,44,70,0.46)",
  },
  scannedHint: {
    color: "rgba(191,219,254,0.9)",
    fontSize: 10,
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 11,
    fontWeight: "500",
  },
  saveWrap: {
    marginTop: 6,
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
});

