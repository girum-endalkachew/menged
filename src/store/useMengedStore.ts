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
  
  setIsListening: (listening: boolean) => void;
  setTranscript: (text: string) => void;
  setOrigin: (origin: string) => void;
  setDestination: (destination: string) => void;
  setLanguage: (lang: "en" | "am") => void;
  setPreference: (pref: "cheapest" | "fastest" | "least_walking" | "balanced") => void;
  setSelectedRoute: (route: RouteOption | null) => void;
  filterRoutes: () => void;
}

export const useMengedStore = create<MengedState>((set, get) => ({
  isListening: false,
  transcript: "",
  origin: "Bole",
  destination: "Piassa",
  budgetETB: null,
  preference: "cheapest",
  routes: MOCK_ROUTES,
  selectedRoute: MOCK_ROUTES[0],
  language: "am",

  setIsListening: (listening) => set({ isListening: listening }),
  setTranscript: (transcript) => set({ transcript }),
  setOrigin: (origin) => set({ origin }),
  setDestination: (destination) => set({ destination }),
  setLanguage: (language) => set({ language }),
  setPreference: (preference) => {
    set({ preference });
    get().filterRoutes();
  },
  setSelectedRoute: (selectedRoute) => set({ selectedRoute }),
  filterRoutes: () => {
    const { preference } = get();
    let sorted = [...MOCK_ROUTES];
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
