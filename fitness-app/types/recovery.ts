import type { AdvancedMuscleFilterValue } from "./muscles";

export type CompletedExerciseForRecovery = {
  // Work done for this exercise in the session (kg*reps or proxy).
  exerciseId?: string;
  volume: number;
  setsCount?: number;
  topSetWeightKg?: number | null;
  topSetReps?: number | null;
  bestSet1RmKg?: number | null;
  prProximity01?: number; // 0..1 (1 = matched own best)
  relativeLoad01?: number; // 0..1 (top weight / best e1RM)
  effortScore01?: number; // 0..1
  primaryMuscles: AdvancedMuscleFilterValue[];
  secondaryMuscles?: AdvancedMuscleFilterValue[];
};

export type CompletedWorkoutForRecovery = {
  id?: string;
  completedAtUtc: string; // ISO
  exercises: CompletedExerciseForRecovery[];
};

export type RecoveryEntry =
  | number
  | {
      value?: number;
      recovery?: number;
      value01?: number;
      fatigue?: number;
      readinessHours?: number;
      lastStimulusAtUtc?: string | null;
    }
  | {
      // Legacy shape still supported by conversion utilities.
      muscle: string;
      dose: number;
      lastTrainedAtUtc: string;
    };

export type RecoveryMap = Record<string, RecoveryEntry>;
