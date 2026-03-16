import { AppDateTimePicker } from "@/components/date/AppDateTimePicker";
import { generalStyles } from "@/config/styles";
import { typography } from "@/config/typography";
import type { ComposedMeal, ComposedMealIngredient } from "@/types/meal";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Keyboard,
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

const SHEET_MAX_HEIGHT = Dimensions.get("window").height * 0.88;
const QUICK_SERVINGS = [0.5, 1, 1.5, 2];

type MacroTotals = {
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
};

type LogIngredientDraft = {
  key: string;
  kind: "base" | "custom";
  sourceIngredientId: string | null;
  name: string;
  gramsText: string;
  baseGrams: number;
  baseMacros: MacroTotals;
  caloriesText: string;
  proteinsText: string;
  carbsText: string;
  fatsText: string;
};

type ComposedMealLogSheetProps = {
  isOpen: boolean;
  meal: ComposedMeal | null;
  defaultServings?: number;
  onClose: () => void;
  onSubmit: (payload: {
    servings: number;
    timestampUtc: string;
    totals: {
      calories: number;
      proteins: number;
      carbs: number;
      fats: number;
    };
    isCustomized: boolean;
  }) => Promise<void> | void;
};

function toNumber(raw: string): number {
  const normalized = raw.replace(",", ".").trim();
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

function sanitizeServings(raw: string): number {
  const value = toNumber(raw);
  if (value <= 0) return 1;
  return Math.min(50, Math.max(0.1, Number(value.toFixed(2))));
}

function combineDateAndTime(dateValue: Date, timeValue: Date): Date {
  const next = new Date(dateValue);
  next.setHours(timeValue.getHours(), timeValue.getMinutes(), 0, 0);
  return next;
}

function formatNumberInput(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < 0.01) return String(rounded);
  return value.toFixed(1).replace(".", ",");
}

function formatDisplay(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < 0.05) return String(rounded);
  return value.toFixed(1).replace(".", ",");
}

function scaleMacros(macros: MacroTotals, ratio: number): MacroTotals {
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return { calories: 0, proteins: 0, carbs: 0, fats: 0 };
  }

  return {
    calories: macros.calories * ratio,
    proteins: macros.proteins * ratio,
    carbs: macros.carbs * ratio,
    fats: macros.fats * ratio,
  };
}

function createBaseDraft(
  ingredient: ComposedMealIngredient,
  servings: number
): LogIngredientDraft {
  return {
    key: `base-${ingredient.id}`,
    kind: "base",
    sourceIngredientId: String(ingredient.id),
    name: ingredient.name ?? "",
    gramsText: formatNumberInput(
      Number(ingredient.amountGrams ?? 0) * servings
    ),
    baseGrams: Number(ingredient.amountGrams ?? 0),
    baseMacros: {
      calories: Number(ingredient.calories ?? 0),
      proteins: Number(ingredient.proteins ?? 0),
      carbs: Number(ingredient.carbs ?? 0),
      fats: Number(ingredient.fats ?? 0),
    },
    caloriesText: "",
    proteinsText: "",
    carbsText: "",
    fatsText: "",
  };
}

function createCustomDraft(seed = 0): LogIngredientDraft {
  return {
    key: `custom-${Date.now()}-${Math.random()}-${seed}`,
    kind: "custom",
    sourceIngredientId: null,
    name: "",
    gramsText: "0",
    baseGrams: 0,
    baseMacros: { calories: 0, proteins: 0, carbs: 0, fats: 0 },
    caloriesText: "0",
    proteinsText: "0",
    carbsText: "0",
    fatsText: "0",
  };
}

function deriveDraftTotals(draft: LogIngredientDraft): MacroTotals {
  if (draft.kind === "base") {
    const grams = toNumber(draft.gramsText);
    if (draft.baseGrams <= 0 || grams <= 0) {
      return { calories: 0, proteins: 0, carbs: 0, fats: 0 };
    }
    return scaleMacros(draft.baseMacros, grams / draft.baseGrams);
  }

  return {
    calories: toNumber(draft.caloriesText),
    proteins: toNumber(draft.proteinsText),
    carbs: toNumber(draft.carbsText),
    fats: toNumber(draft.fatsText),
  };
}

function scaleDraft(
  draft: LogIngredientDraft,
  ratio: number
): LogIngredientDraft {
  if (!Number.isFinite(ratio) || ratio <= 0) return draft;

  if (draft.kind === "base") {
    return {
      ...draft,
      gramsText: formatNumberInput(toNumber(draft.gramsText) * ratio),
    };
  }

  return {
    ...draft,
    gramsText: formatNumberInput(toNumber(draft.gramsText) * ratio),
    caloriesText: formatNumberInput(toNumber(draft.caloriesText) * ratio),
    proteinsText: formatNumberInput(toNumber(draft.proteinsText) * ratio),
    carbsText: formatNumberInput(toNumber(draft.carbsText) * ratio),
    fatsText: formatNumberInput(toNumber(draft.fatsText) * ratio),
  };
}

function sortIngredients(meal: ComposedMeal | null) {
  return [...(meal?.ingredients ?? [])].sort(
    (a, b) => Number(a.sortOrder) - Number(b.sortOrder)
  );
}

function isMeaningfulCustomDraft(draft: LogIngredientDraft) {
  if (draft.kind !== "custom") return false;
  return (
    draft.name.trim().length > 0 ||
    toNumber(draft.gramsText) > 0 ||
    toNumber(draft.caloriesText) > 0 ||
    toNumber(draft.proteinsText) > 0 ||
    toNumber(draft.carbsText) > 0 ||
    toNumber(draft.fatsText) > 0
  );
}

export function ComposedMealLogSheet({
  isOpen,
  meal,
  defaultServings = 1,
  onClose,
  onSubmit,
}: ComposedMealLogSheetProps) {
  const [servingsText, setServingsText] = useState(
    formatNumberInput(defaultServings)
  );
  const [appliedServings, setAppliedServings] = useState(defaultServings);
  const [ingredientDrafts, setIngredientDrafts] = useState<
    LogIngredientDraft[]
  >([]);
  const [dateValue, setDateValue] = useState<Date | null>(new Date());
  const [timeValue, setTimeValue] = useState<Date | null>(new Date());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !meal) return;

    const safeServings = sanitizeServings(String(defaultServings));
    const now = new Date();
    setServingsText(formatNumberInput(safeServings));
    setAppliedServings(safeServings);
    setIngredientDrafts(
      sortIngredients(meal).map((ingredient) =>
        createBaseDraft(ingredient, safeServings)
      )
    );
    setDateValue(now);
    setTimeValue(now);
    setIsSaving(false);
  }, [defaultServings, isOpen, meal]);

  const selectedDateTime = combineDateAndTime(
    dateValue ?? new Date(),
    timeValue ?? new Date()
  );

  const totals = useMemo(() => {
    return ingredientDrafts.reduce<MacroTotals>(
      (acc, draft) => {
        const next = deriveDraftTotals(draft);
        acc.calories += next.calories;
        acc.proteins += next.proteins;
        acc.carbs += next.carbs;
        acc.fats += next.fats;
        return acc;
      },
      { calories: 0, proteins: 0, carbs: 0, fats: 0 }
    );
  }, [ingredientDrafts]);

  const isCustomized = useMemo(() => {
    if (!meal) return false;

    const originals = sortIngredients(meal);
    const baseDraftMap = new Map(
      ingredientDrafts
        .filter((draft) => draft.kind === "base")
        .map((draft) => [String(draft.sourceIngredientId), draft])
    );

    if (ingredientDrafts.some(isMeaningfulCustomDraft)) {
      return true;
    }

    for (const ingredient of originals) {
      const draft = baseDraftMap.get(String(ingredient.id));
      if (!draft) return true;
      const expectedGrams =
        Number(ingredient.amountGrams ?? 0) * appliedServings;
      if (Math.abs(toNumber(draft.gramsText) - expectedGrams) > 0.05) {
        return true;
      }
    }

    return baseDraftMap.size !== originals.length;
  }, [appliedServings, ingredientDrafts, meal]);

  if (!isOpen || !meal) return null;

  const applyServings = (nextServings: number) => {
    const safeNext = sanitizeServings(String(nextServings));
    const ratio = appliedServings > 0 ? safeNext / appliedServings : safeNext;

    setIngredientDrafts((prev) =>
      prev.map((draft) => scaleDraft(draft, ratio))
    );
    setAppliedServings(safeNext);
    setServingsText(formatNumberInput(safeNext));
  };

  const commitServingsText = () => {
    const next = sanitizeServings(servingsText);
    if (Math.abs(next - appliedServings) > 0.001) {
      applyServings(next);
      return;
    }
    setServingsText(formatNumberInput(appliedServings));
  };

  const updateDraft = (
    key: string,
    updater: (draft: LogIngredientDraft) => LogIngredientDraft
  ) => {
    setIngredientDrafts((prev) =>
      prev.map((draft) => (draft.key === key ? updater(draft) : draft))
    );
  };

  const handleSave = async () => {
    const targetServings = sanitizeServings(servingsText);
    const ratio =
      appliedServings > 0 ? targetServings / appliedServings : targetServings;
    const nextDrafts =
      Math.abs(targetServings - appliedServings) > 0.001
        ? ingredientDrafts.map((draft) => scaleDraft(draft, ratio))
        : ingredientDrafts;
    const effectiveDrafts = nextDrafts.filter(
      (draft) => draft.kind === "base" || isMeaningfulCustomDraft(draft)
    );
    const nextTotals = effectiveDrafts.reduce<MacroTotals>(
      (acc, draft) => {
        const next = deriveDraftTotals(draft);
        acc.calories += next.calories;
        acc.proteins += next.proteins;
        acc.carbs += next.carbs;
        acc.fats += next.fats;
        return acc;
      },
      { calories: 0, proteins: 0, carbs: 0, fats: 0 }
    );

    if (Math.abs(targetServings - appliedServings) > 0.001) {
      setIngredientDrafts(effectiveDrafts);
      setAppliedServings(targetServings);
      setServingsText(formatNumberInput(targetServings));
    } else {
      setServingsText(formatNumberInput(appliedServings));
    }

    setIsSaving(true);

    try {
      await onSubmit({
        servings: targetServings,
        timestampUtc: selectedDateTime.toISOString(),
        totals: nextTotals,
        isCustomized:
          effectiveDrafts.some(isMeaningfulCustomDraft) ||
          sortIngredients(meal).some((ingredient) => {
            const draft = effectiveDrafts.find(
              (item) =>
                item.kind === "base" &&
                String(item.sourceIngredientId) === String(ingredient.id)
            );

            if (!draft) return true;
            return (
              Math.abs(
                toNumber(draft.gramsText) -
                  Number(ingredient.amountGrams ?? 0) * targetServings
              ) > 0.05
            );
          }) ||
          effectiveDrafts.filter((draft) => draft.kind === "base").length !==
            sortIngredients(meal).length,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.absoluteWrapper} pointerEvents="box-none">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <View style={styles.overlay}>
          <View style={styles.sheetWrapper}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
                    "rgba(34,211,238,0.14)",
                    "rgba(14,116,144,0.08)",
                    "rgba(2,6,23,0)",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.sheetContent}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={styles.headerRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.h2, styles.title]}>
                        Logg rett
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[typography.body, styles.subtitle]}
                      >
                        {meal.name}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
                      <Ionicons name="close" size={18} color="#E2E8F0" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.section}>
                    <Text style={[typography.bodyBlack, styles.label]}>
                      Porsjoner
                    </Text>
                    <View style={styles.servingsRow}>
                      <TouchableOpacity
                        onPress={() =>
                          applyServings(Math.max(0.1, appliedServings - 0.5))
                        }
                        style={styles.stepperBtn}
                      >
                        <Ionicons name="remove" size={16} color="#E2E8F0" />
                      </TouchableOpacity>

                      <TextInput
                        value={servingsText}
                        onChangeText={setServingsText}
                        onBlur={commitServingsText}
                        keyboardType="decimal-pad"
                        style={styles.servingsInput}
                      />

                      <Text style={styles.servingsSuffix}>x</Text>

                      <TouchableOpacity
                        onPress={() => applyServings(appliedServings + 0.5)}
                        style={styles.stepperBtn}
                      >
                        <Ionicons name="add" size={16} color="#E2E8F0" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.quickRow}>
                      {QUICK_SERVINGS.map((value) => {
                        const active = Math.abs(appliedServings - value) < 0.01;
                        return (
                          <TouchableOpacity
                            key={value}
                            onPress={() => applyServings(value)}
                            style={[
                              styles.quickBtn,
                              active && styles.quickBtnActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.quickBtnText,
                                active && styles.quickBtnTextActive,
                              ]}
                            >
                              {formatDisplay(value)}x
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <View>
                        <Text style={[typography.bodyBlack, styles.label]}>
                          Ingredienser
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() =>
                          setIngredientDrafts((prev) => [
                            ...prev,
                            createCustomDraft(prev.length),
                          ])
                        }
                        style={styles.addBtn}
                      >
                        <Ionicons name="add" size={15} color="#E6FFFB" />
                        <Text style={styles.addBtnText}>Ingrediens</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.ingredientList}>
                      {ingredientDrafts.length === 0 ? (
                        <View style={styles.emptyIngredientState}>
                          <Text style={styles.emptyIngredientText}>
                            Ingen ingredienser ennå.
                          </Text>
                        </View>
                      ) : (
                        ingredientDrafts.map((draft, index) => {
                          const draftTotals = deriveDraftTotals(draft);

                          return (
                            <View key={draft.key} style={styles.ingredientCard}>
                              <View style={styles.ingredientHeader}>
                                <View style={{ flex: 1 }}>
                                  {draft.kind === "base" ? (
                                    <>
                                      <Text style={styles.ingredientName}>
                                        {draft.name || "Ingrediens"}
                                      </Text>
                                      <Text style={styles.ingredientMeta}>
                                        Fra lagret oppskrift
                                      </Text>
                                    </>
                                  ) : (
                                    <>
                                      <Text style={styles.ingredientMeta}>
                                        Ny ingrediens
                                      </Text>
                                      <TextInput
                                        value={draft.name}
                                        onChangeText={(value) =>
                                          updateDraft(draft.key, (current) => ({
                                            ...current,
                                            name: value,
                                          }))
                                        }
                                        placeholder={`Ingrediens ${index + 1}`}
                                        placeholderTextColor="rgba(148,163,184,0.72)"
                                        style={styles.nameInput}
                                      />
                                    </>
                                  )}
                                </View>

                                <TouchableOpacity
                                  onPress={() =>
                                    setIngredientDrafts((prev) =>
                                      prev.filter(
                                        (item) => item.key !== draft.key
                                      )
                                    )
                                  }
                                  style={styles.removeBtn}
                                >
                                  <Ionicons
                                    name="trash-outline"
                                    size={16}
                                    color="#FCA5A5"
                                  />
                                </TouchableOpacity>
                              </View>

                              <View style={styles.gramsRow}>
                                <Text style={styles.inputLabel}>Gram</Text>
                                <TextInput
                                  value={draft.gramsText}
                                  onChangeText={(value) =>
                                    updateDraft(draft.key, (current) => ({
                                      ...current,
                                      gramsText: value,
                                    }))
                                  }
                                  keyboardType="decimal-pad"
                                  placeholder="0"
                                  placeholderTextColor="rgba(148,163,184,0.72)"
                                  style={styles.gramsInput}
                                />
                              </View>

                              {draft.kind === "custom" ? (
                                <View style={styles.customMacroGrid}>
                                  <View style={styles.customMacroCell}>
                                    <Text style={styles.inputLabel}>Kcal</Text>
                                    <TextInput
                                      value={draft.caloriesText}
                                      onChangeText={(value) =>
                                        updateDraft(draft.key, (current) => ({
                                          ...current,
                                          caloriesText: value,
                                        }))
                                      }
                                      keyboardType="decimal-pad"
                                      style={styles.miniInput}
                                    />
                                  </View>
                                  <View style={styles.customMacroCell}>
                                    <Text style={styles.inputLabel}>
                                      Protein
                                    </Text>
                                    <TextInput
                                      value={draft.proteinsText}
                                      onChangeText={(value) =>
                                        updateDraft(draft.key, (current) => ({
                                          ...current,
                                          proteinsText: value,
                                        }))
                                      }
                                      keyboardType="decimal-pad"
                                      style={styles.miniInput}
                                    />
                                  </View>
                                  <View style={styles.customMacroCell}>
                                    <Text style={styles.inputLabel}>Karbo</Text>
                                    <TextInput
                                      value={draft.carbsText}
                                      onChangeText={(value) =>
                                        updateDraft(draft.key, (current) => ({
                                          ...current,
                                          carbsText: value,
                                        }))
                                      }
                                      keyboardType="decimal-pad"
                                      style={styles.miniInput}
                                    />
                                  </View>
                                  <View style={styles.customMacroCell}>
                                    <Text style={styles.inputLabel}>Fett</Text>
                                    <TextInput
                                      value={draft.fatsText}
                                      onChangeText={(value) =>
                                        updateDraft(draft.key, (current) => ({
                                          ...current,
                                          fatsText: value,
                                        }))
                                      }
                                      keyboardType="decimal-pad"
                                      style={styles.miniInput}
                                    />
                                  </View>
                                </View>
                              ) : (
                                <View style={styles.macroBadgeRow}>
                                  <Text style={styles.macroBadge}>
                                    Kcal {formatDisplay(draftTotals.calories)}
                                  </Text>
                                  <Text style={styles.macroBadge}>
                                    P {formatDisplay(draftTotals.proteins)} g
                                  </Text>
                                  <Text style={styles.macroBadge}>
                                    K {formatDisplay(draftTotals.carbs)} g
                                  </Text>
                                  <Text style={styles.macroBadge}>
                                    F {formatDisplay(draftTotals.fats)} g
                                  </Text>
                                </View>
                              )}
                            </View>
                          );
                        })
                      )}
                    </View>
                  </View>

                  <View style={styles.section}>
                    <Text style={[typography.bodyBlack, styles.label]}>
                      Dato
                    </Text>
                    <AppDateTimePicker
                      label=""
                      mode="date"
                      value={dateValue}
                      onChange={setDateValue}
                    />
                  </View>

                  <View style={styles.section}>
                    <Text style={[typography.bodyBlack, styles.label]}>
                      Tidspunkt
                    </Text>
                    <AppDateTimePicker
                      label=""
                      mode="time"
                      value={timeValue}
                      onChange={setTimeValue}
                    />
                  </View>

                  <View style={styles.totalsCard}>
                    <View style={styles.totalsHeader}>
                      <View>
                        <Text
                          style={[typography.bodyBlack, styles.totalsTitle]}
                        >
                          Beregnet ernaring
                        </Text>
                      </View>
                      {isCustomized && (
                        <View style={styles.customizedPill}>
                          <Text style={styles.customizedPillText}>
                            Tilpasset
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.energyRow}>
                      <Text style={styles.totalMain}>
                        {Math.round(totals.calories)}
                      </Text>
                      <Text style={styles.totalUnit}>kcal</Text>
                    </View>
                    <View style={styles.macroRow}>
                      <View style={styles.macroMetric}>
                        <Text style={styles.macroMetricLabel}>Protein</Text>
                        <Text style={styles.macroMetricValue}>
                          {formatDisplay(totals.proteins)} g
                        </Text>
                      </View>
                      <View style={styles.macroMetric}>
                        <Text style={styles.macroMetricLabel}>Karbo</Text>
                        <Text style={styles.macroMetricValue}>
                          {formatDisplay(totals.carbs)} g
                        </Text>
                      </View>
                      <View style={styles.macroMetric}>
                        <Text style={styles.macroMetricLabel}>Fett</Text>
                        <Text style={styles.macroMetricValue}>
                          {formatDisplay(totals.fats)} g
                        </Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={handleSave}
                    style={styles.saveWrap}
                    disabled={isSaving}
                  >
                    <LinearGradient
                      colors={
                        isSaving
                          ? ["#0B4C5D", "#0B4C5D"]
                          : ["#0891B2", "#22D3EE"]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.saveBtn}
                    >
                      <Ionicons name="flash-outline" size={16} color="white" />
                      <Text style={styles.saveText}>
                        {isSaving ? "Logger..." : "Logg maltid"}
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
  absoluteWrapper: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 90,
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
    paddingTop: 44,
    paddingBottom: 12,
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
  sheetContent: {
    gap: 14,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  label: {
    color: "rgba(226,242,255,0.96)",
    fontSize: 12,
  },
  servingsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.34)",
    backgroundColor: "rgba(12,44,70,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  stepperBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(12,44,70,0.52)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.26)",
  },
  servingsInput: {
    flex: 1,
    color: "#F0F9FF",
    fontSize: 16,
    fontWeight: "500",
    paddingVertical: 0,
    textAlign: "center",
  },
  servingsSuffix: {
    color: "rgba(224,242,254,0.9)",
    fontSize: 14,
    fontWeight: "500",
  },
  quickRow: {
    flexDirection: "row",
    gap: 8,
  },
  quickBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.3)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(15,51,75,0.55)",
  },
  quickBtnActive: {
    borderColor: "rgba(56,189,248,0.42)",
    backgroundColor: "rgba(14,116,144,0.62)",
  },
  quickBtnText: {
    color: "rgba(224,242,254,0.95)",
    fontSize: 11,
    fontWeight: "500",
  },
  quickBtnTextActive: {
    color: "#E0F2FE",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.42)",
    backgroundColor: "rgba(14,116,144,0.82)",
  },
  addBtnText: {
    color: "#E6FFFB",
    fontSize: 12,
    fontWeight: "500",
  },
  ingredientList: {
    gap: 10,
  },
  emptyIngredientState: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.24)",
    backgroundColor: "rgba(11,39,63,0.5)",
    padding: 14,
  },
  emptyIngredientText: {
    color: "rgba(148,163,184,0.9)",
    fontSize: 12,
  },
  ingredientCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.3)",
    backgroundColor: "rgba(12,44,70,0.62)",
    padding: 12,
    gap: 10,
  },
  ingredientHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  ingredientName: {
    color: "#F0F9FF",
    fontSize: 14,
    fontWeight: "500",
  },
  ingredientMeta: {
    color: "rgba(191,219,254,0.8)",
    fontSize: 11,
  },
  nameInput: {
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.34)",
    backgroundColor: "rgba(12,44,70,0.52)",
    color: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "400",
  },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(127,29,29,0.25)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.22)",
  },
  gramsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inputLabel: {
    color: "rgba(191,219,254,0.88)",
    fontSize: 11,
    fontWeight: "500",
    minWidth: 48,
  },
  gramsInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.34)",
    backgroundColor: "rgba(12,44,70,0.52)",
    color: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "400",
  },
  customMacroGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  customMacroCell: {
    width: "47%",
    gap: 6,
  },
  miniInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.34)",
    backgroundColor: "rgba(12,44,70,0.52)",
    color: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: "400",
  },
  macroBadgeRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  macroBadge: {
    color: "#E2E8F0",
    fontSize: 11,
    fontWeight: "500",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(15,51,75,0.52)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.26)",
  },
  totalsCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.2)",
    backgroundColor: "rgba(11,39,63,0.42)",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  totalsHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  totalsTitle: {
    color: "#E0F2FE",
    fontSize: 12,
    fontWeight: "500",
  },
  totalsSubtitle: {
    marginTop: 3,
    color: "rgba(191,219,254,0.72)",
    fontSize: 11,
  },
  customizedPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.08)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
  },
  customizedPillText: {
    color: "rgba(226,232,240,0.78)",
    fontSize: 10,
    fontWeight: "400",
  },
  energyRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  totalMain: {
    color: "#F0F9FF",
    fontWeight: "500",
    fontSize: 28,
    lineHeight: 30,
  },
  totalUnit: {
    color: "rgba(191,219,254,0.7)",
    fontSize: 12,
    fontWeight: "400",
  },
  macroRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  macroMetric: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: "rgba(125,211,252,0.14)",
    paddingTop: 10,
  },
  macroMetricLabel: {
    color: "rgba(191,219,254,0.68)",
    fontSize: 10,
    fontWeight: "400",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  macroMetricValue: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "500",
  },
  saveWrap: {
    marginTop: 4,
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
