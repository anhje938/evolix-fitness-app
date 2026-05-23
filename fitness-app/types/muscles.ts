
import type { AppLanguage } from "./userSettings";

export type MuscleFilterValue =
  | "ALL"
  | "Bryst"
  | "Rygg"
  | "Bein"
  | "Skuldre"
  | "Armer"
  | "Core";

type LocalizedMuscleFilter<TValue extends string> = {
  label: string;
  labelEn: string;
  value: TValue;
};

export const MUSCLE_FILTERS: LocalizedMuscleFilter<MuscleFilterValue>[] = [
  { label: "Alle", labelEn: "All", value: "ALL" },
  { label: "Bryst", labelEn: "Chest", value: "Bryst" },
  { label: "Rygg", labelEn: "Back", value: "Rygg" },
  { label: "Bein", labelEn: "Legs", value: "Bein" },
  { label: "Skuldre", labelEn: "Shoulders", value: "Skuldre" },
  { label: "Armer", labelEn: "Arms", value: "Armer" },
  { label: "Core", labelEn: "Core", value: "Core" },
];

export type AdvancedMuscleFilterValue =
  | "ALL"

  // Bryst
  | "Bryst"

  // Skuldre
  | "Fremre skulder"
  | "Sideskulder"
  | "Bakre skulder"

  // Rygg
  | "Øvre rygg"
  | "Nedre rygg"
  | "Lats"
  | "Traps"

  // Armer
  | "Biceps"
  | "Triceps"
  | "Brachialis"
  | "Brachioradialis"
  | "Underarm"

  // Core
  | "Abs"
  | "Obliques"

  // Bein
  | "Quadriceps"
  | "Hamstrings"
  | "Rumpe"
  | "Innside lår"
  | "Utside lår"
  | "Bakside legg"
  | "Framside legg";

export const ADVANCED_MUSCLE_FILTERS: LocalizedMuscleFilter<AdvancedMuscleFilterValue>[] = [
  { label: "Alle", labelEn: "All", value: "ALL" },
  { label: "Bryst", labelEn: "Chest", value: "Bryst" },
  { label: "Fremre skulder", labelEn: "Front delts", value: "Fremre skulder" },
  { label: "Sideskulder", labelEn: "Side delts", value: "Sideskulder" },
  { label: "Bakre skulder", labelEn: "Rear delts", value: "Bakre skulder" },
  { label: "Øvre rygg", labelEn: "Upper back", value: "Øvre rygg" },
  { label: "Nedre rygg", labelEn: "Lower back", value: "Nedre rygg" },
  { label: "Lats", labelEn: "Lats", value: "Lats" },
  { label: "Traps", labelEn: "Traps", value: "Traps" },
  { label: "Biceps", labelEn: "Biceps", value: "Biceps" },
  { label: "Triceps", labelEn: "Triceps", value: "Triceps" },
  { label: "Brachialis", labelEn: "Brachialis", value: "Brachialis" },
  {
    label: "Brachioradialis",
    labelEn: "Brachioradialis",
    value: "Brachioradialis",
  },
  { label: "Underarm", labelEn: "Forearms", value: "Underarm" },
  { label: "Mage", labelEn: "Abs", value: "Abs" },
  { label: "Skrå magemuskler", labelEn: "Obliques", value: "Obliques" },
  { label: "Quadriceps", labelEn: "Quadriceps", value: "Quadriceps" },
  { label: "Hamstrings", labelEn: "Hamstrings", value: "Hamstrings" },
  { label: "Rumpe", labelEn: "Glutes", value: "Rumpe" },
  { label: "Innside lår", labelEn: "Adductors", value: "Innside lår" },
  { label: "Utside lår", labelEn: "Abductors", value: "Utside lår" },
  { label: "Bakside legg", labelEn: "Calves", value: "Bakside legg" },
  { label: "Framside legg", labelEn: "Tibialis", value: "Framside legg" },
];

const MUSCLE_LABEL_BY_VALUE = new Map<string, { nb: string; en: string }>(
  [...MUSCLE_FILTERS, ...ADVANCED_MUSCLE_FILTERS].map((item) => [
    item.value,
    { nb: item.label, en: item.labelEn },
  ])
);

export function getMuscleLabel(
  value: string | null | undefined,
  language: AppLanguage
) {
  if (!value) return "";
  const labels = MUSCLE_LABEL_BY_VALUE.get(value);
  if (!labels) return value;
  return language === "en" ? labels.en : labels.nb;
}

export function getLocalizedMuscleFilters<TValue extends string>(
  filters: LocalizedMuscleFilter<TValue>[],
  language: AppLanguage
) {
  return filters.map((item) => ({
    ...item,
    label: language === "en" ? item.labelEn : item.label,
  }));
}
