'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { scenarios, getScenarioById, type Scenario } from '@/data/scenarios';

interface ScenarioContextValue {
  scenario: Scenario;
  setScenarioById: (id: string) => void;
  allScenarios: Scenario[];
}

const ScenarioContext = createContext<ScenarioContextValue | null>(null);

export function ScenarioProvider({ children }: { children: ReactNode }) {
  const [scenario, setScenario] = useState<Scenario>(scenarios[0]);

  const setScenarioById = useCallback((id: string) => {
    setScenario(getScenarioById(id));
  }, []);

  return (
    <ScenarioContext.Provider value={{ scenario, setScenarioById, allScenarios: scenarios }}>
      {children}
    </ScenarioContext.Provider>
  );
}

export function useScenario(): ScenarioContextValue {
  const ctx = useContext(ScenarioContext);
  if (!ctx) {
    throw new Error('useScenario must be used within ScenarioProvider');
  }
  return ctx;
}
