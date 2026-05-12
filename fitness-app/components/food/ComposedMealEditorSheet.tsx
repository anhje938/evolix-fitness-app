import { FetchFoodFromBarcode } from "@/api/food";
import { MODAL_MAX_HEIGHT, modalGradientColors, modalTheme } from "@/config/modalTheme";
import { generalStyles } from "@/config/styles";
import { typography } from "@/config/typography";
import { useAuth } from "@/context/AuthProvider";
import { useKeyboardAwareSheetScroll } from "@/hooks/useKeyboardAwareSheetScroll";
import {
  ComposedMeal,
  FoodFromBarcode,
  UpsertComposedMealDto,
  UpsertComposedMealIngredientDto,
} from "@/types/meal";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { TextInput as RNTextInput } from "react-native";
import {
  Alert,
  Keyboard,
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
import QRScanner from "./QRScanner";

const SHEET_MAX_HEIGHT = MODAL_MAX_HEIGHT;

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
  const inputRefs = useRef<Record<string, RNTextInput | null>>({});
  const isMountedRef = useRef(true);
  const ingredientScanRequestIdRef = useRef(0);
  const ingredientScanAbortRef = useRef<AbortController | null>(null);
  const activeIngredientScanKeyRef = useRef<string | null>(null);
  const {
    handleInputFocus,
    handleScroll,
    keyboardInsetHeight,
    reset,
    scrollRef,
  } = useKeyboardAwareSheetScroll();

  const abortActiveIngredientScan = useCallback(() => {
    ingredientScanRequestIdRef.current += 1;
    ingredientScanAbortRef.current?.abort();
    ingredientScanAbortRef.current = null;
    activeIngredientScanKeyRef.current = null;

    if (isMountedRef.current) {
      setScanLoadingKey(null);
    }
  }, []);

  const closeIngredientScanner = useCallback(() => {
    activeIngredientScanKeyRef.current = null;
    setScanTargetKey(null);
    setScanLoadingKey(null);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      ingredientScanAbortRef.current?.abort();
      ingredientScanAbortRef.current = null;
      ingredientScanRequestIdRef.current += 1;
      activeIngredientScanKeyRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      abortActiveIngredientScan();
      closeIngredientScanner();
      reset();
      return;
    }

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

    closeIngredientScanner();
    setErrorText(null);
    setIsSaving(false);
  }, [abortActiveIngredientScan, closeIngredientScanner, initialMeal, isOpen, reset]);

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

  const mealNameInputKey = "mealName";

  const ingredientInputKey = useCallback(
    (
      ingredientKey: string,
      field: "name" | keyof UpsertComposedMealIngredientDto
    ) => `ingredient:${ingredientKey}:${field}`,
    []
  );

  const getIngredientInputKeys = useCallback(
    (ingredient: EditorIngredient) => {
      const keys = [
        ingredientInputKey(ingredient.key, "name"),
        ingredientInputKey(ingredient.key, "amountGrams"),
      ];

      if (!ingredient.scannedPer100) {
        keys.push(
          ingredientInputKey(ingredient.key, "calories"),
          ingredientInputKey(ingredient.key, "proteins"),
          ingredientInputKey(ingredient.key, "carbs"),
          ingredientInputKey(ingredient.key, "fats")
        );
      }

      return keys;
    },
    [ingredientInputKey]
  );

  const orderedInputKeys = useMemo(() => {
    const keys = [mealNameInputKey];

    for (const ingredient of ingredients) {
      keys.push(...getIngredientInputKeys(ingredient));
    }

    return keys;
  }, [getIngredientInputKeys, ingredients]);

  const setInputRef = useCallback((key: string, input: RNTextInput | null) => {
    if (input) {
      inputRefs.current[key] = input;
      return;
    }

    delete inputRefs.current[key];
  }, []);

  const getNextInputKey = useCallback(
    (currentKey: string) => {
      const currentIndex = orderedInputKeys.indexOf(currentKey);
      if (currentIndex < 0) return null;
      return orderedInputKeys[currentIndex + 1] ?? null;
    },
    [orderedInputKeys]
  );

  const focusNextInput = useCallback(
    (currentKey: string) => {
      const nextKey = getNextInputKey(currentKey);
      if (!nextKey) {
        Keyboard.dismiss();
        return;
      }

      const nextInput = inputRefs.current[nextKey];
      if (nextInput) {
        nextInput.focus();
        return;
      }

      requestAnimationFrame(() => {
        const fallbackInput = inputRefs.current[nextKey];
        if (fallbackInput) {
          fallbackInput.focus();
          return;
        }

        Keyboard.dismiss();
      });
    },
    [getNextInputKey]
  );

  const getReturnKeyTypeForKey = useCallback(
    (currentKey: string) => (getNextInputKey(currentKey) ? "next" : "done"),
    [getNextInputKey]
  );

  const getSubmitBehaviorForKey = useCallback(
    (currentKey: string) =>
      getNextInputKey(currentKey) ? "submit" : "blurAndSubmit",
    [getNextInputKey]
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
    if (activeIngredientScanKeyRef.current === key) {
      abortActiveIngredientScan();
    }

    setIngredients((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((x) => x.key !== key);
    });
    setScanTargetKey((prev) => (prev === key ? null : prev));
    setScanLoadingKey((prev) => (prev === key ? null : prev));
  };

  const toggleIngredientScanner = (ingredientKey: string) => {
    setScanTargetKey((prev) => {
      const nextKey = prev === ingredientKey ? null : ingredientKey;

      if (nextKey === null || prev !== ingredientKey) {
        abortActiveIngredientScan();
      }

      activeIngredientScanKeyRef.current = nextKey;
      return nextKey;
    });
  };

  const handleScanIngredient = async (
    ingredientKey: string,
    scannedValue: string
  ) => {
    const normalizedValue = scannedValue.trim();
    if (!normalizedValue) return;

    if (!token) {
      closeIngredientScanner();
      Alert.alert("Mangler innlogging", "Logg inn på nytt og prøv igjen.");
      return;
    }

    ingredientScanAbortRef.current?.abort();
    const controller = new AbortController();
    ingredientScanAbortRef.current = controller;
    ingredientScanRequestIdRef.current += 1;
    const requestId = ingredientScanRequestIdRef.current;
    activeIngredientScanKeyRef.current = ingredientKey;

    setScanTargetKey(ingredientKey);
    setScanLoadingKey(ingredientKey);

    try {
      const data: FoodFromBarcode = await FetchFoodFromBarcode(
        token,
        normalizedValue,
        { signal: controller.signal }
      );

      if (
        !isMountedRef.current ||
        ingredientScanRequestIdRef.current !== requestId ||
        activeIngredientScanKeyRef.current !== ingredientKey
      ) {
        return;
      }

      const per100Values: Macros = {
        calories: Number(data.caloriesPr100 || 0),
        proteins: Number(data.proteinsPr100 || 0),
        carbs: Number(data.carbsPr100 || 0),
        fats: Number(data.fatsPr100 || 0),
      };

      setIngredients((prev) =>
        prev.map((ing) => {
          if (ing.key !== ingredientKey) return ing;
          const grams =
            Number(ing.amountGrams || 0) > 0 ? Number(ing.amountGrams) : 100;

          return {
            ...ing,
            name: data.title || ing.name,
            amountGrams: grams,
            ...scaleMacros(per100Values, grams),
            scannedPer100: per100Values,
          };
        })
      );
      closeIngredientScanner();
    } catch (error) {
      if (
        controller.signal.aborted ||
        !isMountedRef.current ||
        ingredientScanRequestIdRef.current !== requestId
      ) {
        return;
      }

      if (__DEV__) console.log("Could not scan ingredient barcode", error);
      closeIngredientScanner();
      Alert.alert(
        "Fant ikke produkt",
        "Kunne ikke hente produktdata fra strekkoden. Prøv igjen eller legg inn manuelt."
      );
    } finally {
      if (
        !isMountedRef.current ||
        ingredientScanRequestIdRef.current !== requestId ||
        ingredientScanAbortRef.current !== controller
      ) {
        return;
      }

      ingredientScanAbortRef.current = null;
      activeIngredientScanKeyRef.current = null;
      setScanLoadingKey((prev) => (prev === ingredientKey ? null : prev));
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
    <Modal
      visible={isOpen}
      animationType="none"
      transparent
      hardwareAccelerated
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Lukk ny rett"
        />
        <View style={styles.sheetWrapper} pointerEvents="box-none">
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
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View pointerEvents="none" style={styles.orbTop} />
              <View pointerEvents="none" style={styles.orbBottom} />

              <ScrollView
                ref={scrollRef}
                style={styles.sheetScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                  styles.sheetContent,
                  {
                    paddingBottom: Math.max(24, keyboardInsetHeight + 24),
                  },
                ]}
                keyboardShouldPersistTaps="always"
                keyboardDismissMode={
                  Platform.OS === "ios" ? "interactive" : "on-drag"
                }
                nestedScrollEnabled
                scrollEventThrottle={16}
                removeClippedSubviews={false}
                onScroll={handleScroll}
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
                <Text style={[typography.bodyBlack, styles.label]}>
                  Navn på rett
                </Text>
                <TextInput
                  ref={(input) => setInputRef(mealNameInputKey, input)}
                  value={name}
                  onChangeText={setName}
                  onFocus={() =>
                    handleInputFocus(
                      inputRefs.current[mealNameInputKey] ?? null
                    )
                  }
                  placeholder="F.eks. Kylling med ris"
                  placeholderTextColor="rgba(148,163,184,0.82)"
                  style={styles.input}
                  returnKeyType="done"
                  submitBehavior="blurAndSubmit"
                  onSubmitEditing={Keyboard.dismiss}
                />
              </View>

              <View style={styles.favoriteRow}>
                <Text style={[typography.bodyBlack, styles.label]}>
                  Favoritt
                </Text>
                <TouchableOpacity
                  onPress={() => setIsFavorite((v) => !v)}
                  style={[
                    styles.favoriteBtn,
                    isFavorite && styles.favoriteBtnActive,
                  ]}
                >
                  <Ionicons
                    name={isFavorite ? "star" : "star-outline"}
                    size={15}
                    color={isFavorite ? "#111827" : "#E2E8F0"}
                  />
                  <Text
                    style={[
                      styles.favoriteText,
                      isFavorite && styles.favoriteTextActive,
                    ]}
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
                    <Ionicons
                      name="barbell-outline"
                      size={12}
                      color="#BAE6FD"
                    />
                    <Text style={styles.metaInfoText}>
                      {Math.round(totals.totalGrams)} g totalt
                    </Text>
                  </View>
                  <View style={styles.metaInfoChip}>
                    <Ionicons name="list-outline" size={12} color="#BAE6FD" />
                    <Text style={styles.metaInfoText}>
                      {activeIngredientCount} ingredienser
                    </Text>
                  </View>
                </View>

                <View style={styles.totalsPillsRow}>
                  <View style={[styles.totalPill, styles.totalPillCalories]}>
                    <Text style={styles.totalPillLabel}>Hele retten</Text>
                    <Text style={styles.totalPillValue}>
                      {Math.round(totals.calories)} kcal
                    </Text>
                    <Text style={styles.totalPillSub}>
                      P {Math.round(totals.proteins)} g | C{" "}
                      {Math.round(totals.carbs)} g | F {Math.round(totals.fats)}{" "}
                      g
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
                <Text style={[typography.bodyBlack, styles.sectionTitle]}>
                  Ingredienser
                </Text>
                <TouchableOpacity
                  onPress={handleAddIngredient}
                  style={styles.addIngredientBtn}
                >
                  <Ionicons name="add" size={14} color="#E6FFFB" />
                  <Text style={styles.addIngredientText}>Legg til</Text>
                </TouchableOpacity>
              </View>

              {ingredients.map((ing, idx) => (
                <View key={ing.key} style={styles.ingredientCard}>
                  <View style={styles.ingredientHeader}>
                    <Text
                      style={[typography.bodyBlack, styles.ingredientTitle]}
                    >
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
                      <Ionicons
                        name="trash-outline"
                        size={14}
                        color="#FCA5A5"
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.scanRow}>
                    <TouchableOpacity
                      onPress={() => toggleIngredientScanner(ing.key)}
                      style={[
                        styles.scanBtn,
                        scanTargetKey === ing.key && styles.scanBtnActive,
                      ]}
                    >
                      <Ionicons name="scan-outline" size={14} color="#22D3EE" />
                      <Text style={styles.scanBtnText}>
                        {ing.scannedPer100 ? "Skann på nytt" : "Skann produkt"}
                      </Text>
                    </TouchableOpacity>

                    {ing.scannedPer100 && (
                      <View style={styles.scanBadge}>
                        <Ionicons
                          name="checkmark-circle"
                          size={13}
                          color="#86EFAC"
                        />
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
                          scanBoxSize={132}
                          enabled={scanLoadingKey !== ing.key}
                        />
                      </View>
                    </View>
                  )}

                  <TextInput
                    ref={(input) =>
                      setInputRef(ingredientInputKey(ing.key, "name"), input)
                    }
                    value={ing.name}
                    onChangeText={(v) => setIngredientField(ing.key, "name", v)}
                    onFocus={() =>
                      handleInputFocus(
                        inputRefs.current[
                          ingredientInputKey(ing.key, "name")
                        ] ?? null
                      )
                    }
                    placeholder="Navn på ingrediens"
                    placeholderTextColor="rgba(148,163,184,0.82)"
                    style={[styles.input, styles.ingredientInput]}
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() =>
                      inputRefs.current[
                        ingredientInputKey(ing.key, "amountGrams")
                      ]?.focus()
                    }
                  />

                  <View style={styles.gridRow}>
                    <View style={styles.gridCell}>
                      <Text style={styles.smallLabel}>Gram</Text>
                      <TextInput
                        ref={(input) =>
                          setInputRef(
                            ingredientInputKey(ing.key, "amountGrams"),
                            input
                          )
                        }
                        value={String(ing.amountGrams || "")}
                        onChangeText={(v) =>
                          setIngredientField(ing.key, "amountGrams", v)
                        }
                        onFocus={() =>
                          handleInputFocus(
                            inputRefs.current[
                              ingredientInputKey(ing.key, "amountGrams")
                            ] ?? null
                          )
                        }
                        keyboardType="decimal-pad"
                        style={styles.smallInput}
                        returnKeyType={getReturnKeyTypeForKey(
                          ingredientInputKey(ing.key, "amountGrams")
                        )}
                        submitBehavior={getSubmitBehaviorForKey(
                          ingredientInputKey(ing.key, "amountGrams")
                        )}
                        onSubmitEditing={() =>
                          focusNextInput(
                            ingredientInputKey(ing.key, "amountGrams")
                          )
                        }
                      />
                    </View>
                    <View style={styles.gridCell}>
                      <Text style={styles.smallLabel}>Kcal</Text>
                      <TextInput
                        ref={(input) =>
                          setInputRef(
                            ingredientInputKey(ing.key, "calories"),
                            input
                          )
                        }
                        value={String(ing.calories || "")}
                        onChangeText={(v) =>
                          setIngredientField(ing.key, "calories", v)
                        }
                        onFocus={() =>
                          handleInputFocus(
                            inputRefs.current[
                              ingredientInputKey(ing.key, "calories")
                            ] ?? null
                          )
                        }
                        keyboardType="decimal-pad"
                        editable={!ing.scannedPer100}
                        style={[
                          styles.smallInput,
                          ing.scannedPer100 && styles.smallInputDisabled,
                        ]}
                        returnKeyType={getReturnKeyTypeForKey(
                          ingredientInputKey(ing.key, "calories")
                        )}
                        submitBehavior={getSubmitBehaviorForKey(
                          ingredientInputKey(ing.key, "calories")
                        )}
                        onSubmitEditing={() =>
                          focusNextInput(
                            ingredientInputKey(ing.key, "calories")
                          )
                        }
                      />
                    </View>
                    <View style={styles.gridCell}>
                      <Text style={styles.smallLabel}>Protein</Text>
                      <TextInput
                        ref={(input) =>
                          setInputRef(
                            ingredientInputKey(ing.key, "proteins"),
                            input
                          )
                        }
                        value={String(ing.proteins || "")}
                        onChangeText={(v) =>
                          setIngredientField(ing.key, "proteins", v)
                        }
                        onFocus={() =>
                          handleInputFocus(
                            inputRefs.current[
                              ingredientInputKey(ing.key, "proteins")
                            ] ?? null
                          )
                        }
                        keyboardType="decimal-pad"
                        editable={!ing.scannedPer100}
                        style={[
                          styles.smallInput,
                          ing.scannedPer100 && styles.smallInputDisabled,
                        ]}
                        returnKeyType={getReturnKeyTypeForKey(
                          ingredientInputKey(ing.key, "proteins")
                        )}
                        submitBehavior={getSubmitBehaviorForKey(
                          ingredientInputKey(ing.key, "proteins")
                        )}
                        onSubmitEditing={() =>
                          focusNextInput(
                            ingredientInputKey(ing.key, "proteins")
                          )
                        }
                      />
                    </View>
                    <View style={styles.gridCell}>
                      <Text style={styles.smallLabel}>Karbo</Text>
                      <TextInput
                        ref={(input) =>
                          setInputRef(
                            ingredientInputKey(ing.key, "carbs"),
                            input
                          )
                        }
                        value={String(ing.carbs || "")}
                        onChangeText={(v) =>
                          setIngredientField(ing.key, "carbs", v)
                        }
                        onFocus={() =>
                          handleInputFocus(
                            inputRefs.current[
                              ingredientInputKey(ing.key, "carbs")
                            ] ?? null
                          )
                        }
                        keyboardType="decimal-pad"
                        editable={!ing.scannedPer100}
                        style={[
                          styles.smallInput,
                          ing.scannedPer100 && styles.smallInputDisabled,
                        ]}
                        returnKeyType={getReturnKeyTypeForKey(
                          ingredientInputKey(ing.key, "carbs")
                        )}
                        submitBehavior={getSubmitBehaviorForKey(
                          ingredientInputKey(ing.key, "carbs")
                        )}
                        onSubmitEditing={() =>
                          focusNextInput(ingredientInputKey(ing.key, "carbs"))
                        }
                      />
                    </View>
                    <View style={styles.gridCell}>
                      <Text style={styles.smallLabel}>Fett</Text>
                      <TextInput
                        ref={(input) =>
                          setInputRef(
                            ingredientInputKey(ing.key, "fats"),
                            input
                          )
                        }
                        value={String(ing.fats || "")}
                        onChangeText={(v) =>
                          setIngredientField(ing.key, "fats", v)
                        }
                        onFocus={() =>
                          handleInputFocus(
                            inputRefs.current[
                              ingredientInputKey(ing.key, "fats")
                            ] ?? null
                          )
                        }
                        keyboardType="decimal-pad"
                        editable={!ing.scannedPer100}
                        style={[
                          styles.smallInput,
                          ing.scannedPer100 && styles.smallInputDisabled,
                        ]}
                        returnKeyType="done"
                        submitBehavior="blurAndSubmit"
                        onSubmitEditing={Keyboard.dismiss}
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
                    colors={
                      isSaving ? ["#0B4C5D", "#0B4C5D"] : ["#0891B2", "#22D3EE"]
                    }
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
  sheetWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 24,
  },
  sheet: {
    position: "relative",
    width: "100%",
    maxWidth: 560,
    borderRadius: 28,
    paddingHorizontal: 14,
    paddingVertical: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: modalTheme.border,
    backgroundColor: modalTheme.surface,
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
  sheetScroll: {
    width: "100%",
  },
  sheetContent: {
    paddingTop: 4,
    paddingBottom: 24,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    color: modalTheme.text,
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: -0.35,
  },
  subtitle: {
    marginTop: 4,
    color: modalTheme.muted,
    fontSize: 12,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: modalTheme.borderSoft,
    backgroundColor: modalTheme.surfaceSoft,
  },
  section: {
    gap: 5,
  },
  label: {
    color: modalTheme.label,
    fontSize: 11.5,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: modalTheme.inputBorder,
    backgroundColor: modalTheme.surfaceMuted,
    color: modalTheme.textStrong,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
  },
  favoriteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  favoriteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(6,182,212,0.22)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "rgba(6,182,212,0.1)",
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
    gap: 8,
  },
  totalsTitle: {
    color: "#EAF7FF",
    fontSize: 13,
    marginBottom: 0,
  },
  metaInfoRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  metaInfoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(15,23,42,0.7)",
  },
  metaInfoText: {
    color: "rgba(224,242,254,0.92)",
    fontSize: 10,
    fontWeight: "500",
  },
  totalsPillsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
  },
  totalPill: {
    flex: 1,
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(15,23,42,0.7)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: "center",
  },
  totalPillCalories: {
    borderColor: "rgba(6,182,212,0.22)",
    backgroundColor: "rgba(6,182,212,0.12)",
  },
  totalPillLabel: {
    color: "rgba(191,219,254,0.82)",
    fontSize: 10.5,
    fontWeight: "500",
    marginBottom: 4,
  },
  totalPillValue: {
    color: "#F0F9FF",
    fontSize: 14,
    fontWeight: "600",
  },
  totalPillSub: {
    color: "rgba(224,242,254,0.84)",
    fontSize: 10.5,
    fontWeight: "500",
    marginTop: 2,
  },
  sectionTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sectionTitle: {
    color: "#EAF7FF",
    fontSize: 14,
  },
  addIngredientBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(6,182,212,0.22)",
    backgroundColor: "rgba(6,182,212,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addIngredientText: {
    color: "#E5ECFF",
    fontSize: 12.5,
    fontWeight: "600",
  },
  ingredientCard: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 12,
    gap: 8,
  },
  ingredientHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ingredientTitle: {
    color: "#F0F9FF",
    fontSize: 13,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.32)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(127,29,29,0.28)",
  },
  ingredientInput: {
    paddingVertical: 11,
  },
  scanRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    flexWrap: "wrap",
    gap: 8,
  },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(6,182,212,0.22)",
    backgroundColor: "rgba(6,182,212,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scanBtnActive: {
    borderColor: "rgba(6,182,212,0.34)",
    backgroundColor: "rgba(6,182,212,0.16)",
  },
  scanBtnText: {
    color: "#E5ECFF",
    fontSize: 12,
    fontWeight: "600",
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(15,23,42,0.72)",
    padding: 8,
    gap: 6,
  },
  scannerLabel: {
    color: "rgba(148,163,184,0.95)",
    fontSize: 11,
  },
  scannerFrame: {
    height: 156,
    borderRadius: 12,
    overflow: "hidden",
  },
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 6,
    rowGap: 8,
  },
  gridCell: {
    flexBasis: "18%",
    flexGrow: 1,
    minWidth: 56,
  },
  smallLabel: {
    color: "rgba(191,219,254,0.82)",
    fontSize: 10,
    marginBottom: 4,
    textAlign: "center",
  },
  smallInput: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
    backgroundColor: "rgba(8,15,28,0.72)",
    color: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 13,
    textAlign: "center",
  },
  smallInputDisabled: {
    opacity: 0.72,
    borderColor: "rgba(45,212,191,0.22)",
    backgroundColor: "rgba(15,23,42,0.56)",
  },
  scannedHint: {
    color: "rgba(191,219,254,0.82)",
    fontSize: 11,
    lineHeight: 14,
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 11,
    fontWeight: "500",
  },
  saveWrap: {
    marginTop: 6,
    marginBottom: 2,
    alignItems: "flex-end",
  },
  saveBtn: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 18,
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
