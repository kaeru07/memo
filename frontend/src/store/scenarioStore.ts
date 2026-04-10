// ============================================================
// scenarioStore — シナリオ一覧・選択
// ============================================================
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Scenario, ScenarioObjective } from "../types/lab";

interface ScenarioState {
  scenarios: Scenario[];
  selectedScenario: Scenario | null;

  setScenarios: (scenarios: Scenario[]) => void;
  selectScenario: (id: string) => void;
  clearSelection: () => void;
  updateObjective: (scenarioId: string, objectiveId: string, completed: boolean) => void;
  resetScenarioObjectives: (scenarioId: string) => void;
}

export const useScenarioStore = create<ScenarioState>()(
  devtools(
    (set, get) => ({
      scenarios: [],
      selectedScenario: null,

      setScenarios: (scenarios) => set({ scenarios }),

      selectScenario: (id) => {
        const scenario = get().scenarios.find((s) => s.id === id) ?? null;
        set({ selectedScenario: scenario });
      },

      clearSelection: () => set({ selectedScenario: null }),

      resetScenarioObjectives: (scenarioId) =>
        set((s) => ({
          scenarios: s.scenarios.map((sc) =>
            sc.id === scenarioId
              ? { ...sc, objectives: sc.objectives.map((obj: ScenarioObjective) => ({ ...obj, completed: false })) }
              : sc
          ),
          selectedScenario:
            s.selectedScenario?.id === scenarioId
              ? { ...s.selectedScenario, objectives: s.selectedScenario.objectives.map((obj: ScenarioObjective) => ({ ...obj, completed: false })) }
              : s.selectedScenario,
        })),

      updateObjective: (scenarioId, objectiveId, completed) =>
        set((s) => ({
          scenarios: s.scenarios.map((sc) =>
            sc.id === scenarioId
              ? {
                  ...sc,
                  objectives: sc.objectives.map((obj: ScenarioObjective) =>
                    obj.id === objectiveId ? { ...obj, completed } : obj
                  ),
                }
              : sc
          ),
          selectedScenario:
            s.selectedScenario?.id === scenarioId
              ? {
                  ...s.selectedScenario,
                  objectives: s.selectedScenario.objectives.map((obj: ScenarioObjective) =>
                    obj.id === objectiveId ? { ...obj, completed } : obj
                  ),
                }
              : s.selectedScenario,
        })),
    }),
    { name: "scenarioStore" }
  )
);
