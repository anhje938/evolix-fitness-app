export type Exercise = {
    id: string,
    name: string,
    description: string,
    muscle: string,
    specificMuscleGroups: string[],
    equipment: string,
    userId: string,
}

export type Workout = {
  id: string;               
  name: string;
  description: string;
  dayLabel: string;         
  workoutProgramId?: string | null;
  exerciseIds: string[];    
  userId?: string | null;
  isCustom: boolean;
};


export type Program = {
  id: string;
  name: string;
  goal: string | null;
  level: string | null;
  isCustom: boolean;
  userId?: string | null;
};


export type CreateProgramRequest = {
  name: string;

}



// ------------------- TYPES FOR LOGGING MID-EXERCISE

export type SetEntry = {
    setIndex: number;   // 1, 2, 3 ...
    reps: number;
    weight: number;
    rir?: number;       // reps in reserve
  };
  
  export type LoggedExercise = {
    exerciseId: string;   
    title: string;        // snapshot (så navn-endringer ikke ødelegger historikk)
    sets: SetEntry[];
  };
  
  export type LoggedWorkoutSession = {
    id: string;
    userId: string;       // hvis du trenger det
    programId?: string;   
    workoutSessionId?: string; 
    performedAt: string;  // ISO-dato
    title?: string;       // f.eks. "Push dag A"
    exercises: LoggedExercise[];
    notes?: string;
  };
  

  // ------------------- TYPES FOR GRAF / HISTORIKK PER ØVELSE

// Ett punkt i historikken for en øvelse (brukes i mini-grafer osv.)
// types/exercise.ts

export type ExerciseHistoryPoint = {
  performedAt: string;          // ISO-dato
  topSetWeight: number | null;  // PR / toppsett i økten
  totalSets?: number;           // totalt antall sett i økten (valgfritt)
  totalVolumeKg?: number | null; // volum (sum weight * reps), valgfritt
};


// Map fra exerciseId -> liste med historikk-punkter
export type ExerciseHistoryById = Record<string, ExerciseHistoryPoint[]>;

// types/workoutSession.ts
// types/workoutSession.ts

export type SessionMode = "quick" | "program";

export type SessionSet = {
  id: string;
  reps: number | null;
  weight: number | null;
  completed: boolean;
};

export type SessionExercise = {
  id: string;           // lokal id i økten
  exerciseId: string;   // backend Exercise.Id
  name: string;
  muscle?: string | null;
  order: number;
  sets: SessionSet[];
};

export type WorkoutSession = {
  id?: string;
  mode: SessionMode;
  name: string;
  workoutProgramId?: string | null;
  workoutId?: string | null;
  startedAtUtc: string;
  finishedAtUtc?: string | null;
  exercises: SessionExercise[];
};
