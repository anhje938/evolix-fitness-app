
//BASIC MUSCLE FILTERS 
export type MuscleFilterValue =
  | "ALL"
  | "Bryst"
  | "Rygg"
  | "Bein"
  | "Skuldre"
  | "Armer"
  | "Core";

export const MUSCLE_FILTERS: { label: string; value: MuscleFilterValue }[] = [
  { label: "Alle", value: "ALL" },
  { label: "Bryst", value: "Bryst" },
  { label: "Rygg", value: "Rygg" },
  { label: "Bein", value: "Bein" },
  { label: "Skuldre", value: "Skuldre" },
  { label: "Armer", value: "Armer" },
  { label: "Core", value: "Core" },
];

//ADVANCED MUSCLE FILTERS

// ADVANCED MUSCLE FILTERS

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

  export const ADVANCED_MUSCLE_FILTERS: {
    label: string;
    value: AdvancedMuscleFilterValue;
  }[] = [
    { label: "Alle", value: "ALL" },
  
    // Bryst
    { label: "Bryst", value: "Bryst" },
  
    // Skuldre
    { label: "Fremre skulder", value: "Fremre skulder" },
    { label: "Sideskulder", value: "Sideskulder" },
    { label: "Bakre skulder", value: "Bakre skulder" },
  
    // Rygg
    { label: "Øvre rygg", value: "Øvre rygg" },
    { label: "Nedre rygg", value: "Nedre rygg" },
    { label: "Lats", value: "Lats" },
    { label: "Traps", value: "Traps" },
  
    // Armer
    { label: "Biceps", value: "Biceps" },
    { label: "Triceps", value: "Triceps" },
    { label: "Brachialis", value: "Brachialis" },
    { label: "Brachioradialis", value: "Brachioradialis" },
    { label: "Underarm", value: "Underarm" },
  
    // Core
    { label: "Mage", value: "Abs" },
    { label: "Skrå magemuskler", value: "Obliques" },
  
    // Bein
    { label: "Quadriceps", value: "Quadriceps" },
    { label: "Hamstrings", value: "Hamstrings" },
    { label: "Rumpe", value: "Rumpe" },
    { label: "Innside lår", value: "Innside lår" },
    { label: "Utside lår", value: "Utside lår" },
    { label: "Bakside legg", value: "Bakside legg" },
    { label: "Framside legg", value: "Framside legg" },
  ];
  