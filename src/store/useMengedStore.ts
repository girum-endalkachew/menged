import { create } from 'zustand';
import { RouteOption, MOCK_ROUTES } from '@/types/transit';

export type JourneyState = 
  | "PLANNING"
  | "ROUTE_SELECTED"
  | "PREPARING"
  | "WALKING_TO_STOP"
  | "AT_STOP"
  | "WAITING_FOR_TRANSPORT"
  | "BOARDING"
  | "ONBOARD"
  | "APPROACHING_STOP"
  | "TRANSFER"
  | "WALKING_TO_DESTINATION"
  | "ARRIVED"
  | "CANCELLED"
  | "ERROR";

interface MengedState {
  // Navigation & Core States
  view: "landing" | "app";
  journeyState: JourneyState;
  language: "en" | "am";
  
  // Voice States
  isListening: boolean;
  transcript: string;
  
  // Trip Planning Context
  origin: string;
  destination: string;
  budgetETB: number | null;
  preference: "cheapest" | "fastest" | "least_walking" | "balanced";
  
  // Data
  routes: RouteOption[];
  selectedRoute: RouteOption | null;

  // Actions
  setView: (v: "landing" | "app") => void;
  setJourneyState: (state: JourneyState) => void;
  setLanguage: (v: "en" | "am") => void;
  setIsListening: (v: boolean) => void;
  setTranscript: (v: string) => void;
  setOrigin: (v: string) => void;
  setDestination: (v: string) => void;
  setBudget: (v: number | null) => void;
  setPreference: (v: "cheapest" | "fastest" | "least_walking" | "balanced") => void;
  setSelectedRoute: (v: RouteOption | null) => void;
  filterRoutes: () => void;
  
  // Journey Actions (Frontend stubs awaiting Frío's API)
  startJourney: () => void;
  cancelJourney: () => void;
}

export const useMengedStore = create<MengedState>((set, get) => ({
  view: "landing",
  journeyState: "PLANNING",
  language: "en",
  isListening: false,
  transcript: "",
  origin: "",
  destination: "",
  budgetETB: null,
  preference: "balanced",
  routes: MOCK_ROUTES,
  selectedRoute: null,

  setView: (view) => set({ view }),
  setJourneyState: (journeyState) => set({ journeyState }),
  setLanguage: (language) => set({ language }),
  setIsListening: (isListening) => set({ isListening }),
  setTranscript: (transcript) => set({ transcript }),
  setOrigin: (origin) => set({ origin }),
  setDestination: (destination) => set({ destination }),
  setBudget: (budgetETB) => set({ budgetETB }),
  setPreference: (preference) => {
    set({ preference });
    get().filterRoutes();
  },
  setSelectedRoute: (selectedRoute) => set({ selectedRoute, journeyState: "ROUTE_SELECTED" }),
  
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

    set({ routes: sorted, selectedRoute: null, journeyState: "PLANNING" });
  },

  startJourney: () => {
    // In the future, this will call POST /api/v1/journeys (Frío's backend)
    set({ journeyState: "PREPARING" });
    
    // Simulate frontend progression for UI development
    setTimeout(() => {
      set({ journeyState: "WALKING_TO_STOP" });
    }, 2000);
  },

  cancelJourney: () => {
    // In the future, this will call POST /api/v1/journeys/:id/cancel
    set({ journeyState: "PLANNING", selectedRoute: null });
  }
}));