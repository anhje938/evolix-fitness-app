// context/trainingTabsContext.tsx
import { createContext, useContext, useState, ReactNode } from "react";

type TrainingPage = "overview" | "programs" | "exercises" | "progression";

type TrainingTabsContextValue = {
  page: TrainingPage;
  setPage: (page: TrainingPage) => void;
  selectedExerciseId?: string | null;
  setSelectedExerciseId: (id: string | null) => void;
};

const TrainingTabsContext = createContext<TrainingTabsContextValue | undefined>(
  undefined
);

export function TrainingTabsProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<TrainingPage>("overview");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null
  );

  return (
    <TrainingTabsContext.Provider
      value={{ page, setPage, selectedExerciseId, setSelectedExerciseId }}
    >
      {children}
    </TrainingTabsContext.Provider>
  );
}

export function useTrainingTabs() {
  const ctx = useContext(TrainingTabsContext);
  if (!ctx) {
    throw new Error("useTrainingTabs must be used within TrainingTabsProvider");
  }
  return ctx;
}
