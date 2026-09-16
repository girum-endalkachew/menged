import { create } from 'zustand';
import { RouteOption, MOCK_ROUTES } from '@/types/transit';

interface MengedState {
  isListening: boolean;
  transcript: string;
  origin: string;
  destination: string;
  budgetETB: number | null;
  preference: "cheapest" | "fastest" | "least_walking" | "balanced";
  routes: RouteOption[];
  selectedRoute: RouteOption | null;
  language: "en" | "am";
  view: "landing" | "planner" | "listening" | "understanding" | "results" | "detail";

  setIsListening: (v: boolean) => void;
  setTranscript: (v: string) => void;
  setOrigin: (v: string) => void;
  setDestination: (v: string) => void;
  setBudget: (v: number | null) => void;
  setLanguage: (v: "en" | "am") => void;
  setView: (v: MengedState["view"]) => void;
  setPreference: (v: "cheapest" | "fastest" | "least_walking" | "balanced") => void;
  setSelectedRoute: (v: RouteOption | null) => void;
  filterRoutes: () => void;
}

export const useMengedStore = create<MengedState>((set, get) => ({
  isListening: false,
  transcript: "",
  origin: "",
  destination: "",
  budgetETB: null,
  preference: "balanced",
  routes: MOCK_ROUTES,
  selectedRoute: null,
  language: "en",
  view: "landing",

  setIsListening: (isListening) => set({ isListening }),
  setTranscript: (transcript) => set({ transcript }),
  setOrigin: (origin) => set({ origin }),
  setDestination: (destination) => set({ destination }),
  setBudget: (budgetETB) => set({ budgetETB }),
  setLanguage: (language) => set({ language }),
  setView: (view) => set({ view }),
  setPreference: (preference) => {
    set({ preference });
    get().filterRoutes();
  },
  setSelectedRoute: (selectedRoute) => set({ selectedRoute }),
  filterRoutes: () => {
    const { preference, budgetETB } = get();
    let sorted = [...MOCK_ROUTES];

    if (budgetETB !== null) {
      sorted = sorted.filter((r) => r.totalCostETB <= budgetETB);
    }

    if (preference === "cheapest") {
      sorted.sort((a, b) => a.totalCostETB - b.totalCostETB);
    } else if (preference === "fastest") {
      sorted.sort((a, b) => a.estimatedMinutes - b.estimatedMinutes);
    } else if (preference === "least_walking") {
      sorted.sort((a, b) => a.walkingMinutes - b.walkingMinutes);
    }

    set({ routes: sorted, selectedRoute: sorted[0] || null });
  },
}));
