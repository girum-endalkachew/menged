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

export type ActiveTab = "home" | "plan" | "journeys" | "saved" | "notifications" | "profile" | "settings";

export interface SavedPlace {
  id: string;
  label: "Home" | "Work" | "School" | "Custom";
  name: string;
  nameAmharic?: string;
  address: string;
  coordinates: [number, number];
}

export interface TripHistoryItem {
  id: string;
  origin: string;
  destination: string;
  date: string;
  durationMins: number;
  costETB: number;
  mode: string;
  status: "completed" | "cancelled";
}

interface MengedState {
  // Navigation & View Shell
  view: "landing" | "app";
  activeTab: ActiveTab;
  activeModal: "trip_understanding" | "report_issue" | null;
  journeyState: JourneyState;
  language: "en" | "am";
  theme: "dark" | "light";

  // Location & Context
  userLocation: { lat: number; lng: number; name: string } | null;
  hasLocationPermission: boolean;
  
  // Voice State Machine
  isListening: boolean;
  transcript: string;
  
  // Trip Planning Context
  origin: string;
  destination: string;
  budgetETB: number | null;
  preference: "cheapest" | "fastest" | "least_walking" | "balanced";
  
  // Data Collections
  routes: RouteOption[];
  selectedRoute: RouteOption | null;
  savedPlaces: SavedPlace[];
  savedRoutes: RouteOption[];
  tripHistory: TripHistoryItem[];

  // Actions
  setView: (v: "landing" | "app") => void;
  setActiveTab: (tab: ActiveTab) => void;
  setActiveModal: (modal: "trip_understanding" | "report_issue" | null) => void;
  setJourneyState: (state: JourneyState) => void;
  setLanguage: (v: "en" | "am") => void;
  setTheme: (v: "dark" | "light") => void;
  setUserLocation: (loc: { lat: number; lng: number; name: string } | null) => void;
  setHasLocationPermission: (has: boolean) => void;
  setIsListening: (v: boolean) => void;
  setTranscript: (v: string) => void;
  setOrigin: (v: string) => void;
  setDestination: (v: string) => void;
  setBudget: (v: number | null) => void;
  setPreference: (v: "cheapest" | "fastest" | "least_walking" | "balanced") => void;
  setSelectedRoute: (v: RouteOption | null) => void;
  filterRoutes: () => void;
  
  // Saved Places & Routes
  addSavedPlace: (place: SavedPlace) => void;
  removeSavedPlace: (id: string) => void;
  saveCurrentRoute: (route: RouteOption) => void;

  // Journey Lifecycle Actions
  startJourney: () => void;
  cancelJourney: () => void;
}

export const useMengedStore = create<MengedState>((set, get) => ({
  view: "landing",
  activeTab: "home",
  activeModal: null,
  journeyState: "PLANNING",
  language: "en",
  theme: "dark",

  userLocation: { lat: 8.9953, lng: 38.7885, name: "Bole Medhanialem" },
  hasLocationPermission: true,

  isListening: false,
  transcript: "",
  origin: "Bole Medhanialem",
  destination: "",
  budgetETB: null,
  preference: "balanced",
  routes: MOCK_ROUTES,
  selectedRoute: null,

  savedPlaces: [
    { id: "sp-1", label: "Home", name: "Bole Atlas", address: "Bole Sub City, Woreda 03", coordinates: [38.7770, 9.0062] },
    { id: "sp-2", label: "Work", name: "Mexico Square", address: "Kirkos Sub City", coordinates: [38.7454, 9.0105] },
    { id: "sp-3", label: "School", name: "4 Kilo Campus", address: "Arada Sub City", coordinates: [38.7632, 9.0336] },
  ],

  savedRoutes: [MOCK_ROUTES[0]],

  tripHistory: [
    { id: "th-1", origin: "Bole Medhanialem", destination: "Piassa", date: "Today, 8:30 AM", durationMins: 35, costETB: 25, mode: "minibus", status: "completed" },
    { id: "th-2", origin: "Mexico Square", destination: "Bole Atlas", date: "Yesterday, 5:15 PM", durationMins: 20, costETB: 15, mode: "minibus", status: "completed" },
    { id: "th-3", origin: "Meskel Square", destination: "Megenagna", date: "14 Sep 2026", durationMins: 25, costETB: 18, mode: "lrt", status: "completed" },
  ],

  setView: (view) => set({ view }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setActiveModal: (activeModal) => set({ activeModal }),
  setJourneyState: (journeyState) => set({ journeyState }),
  setLanguage: (language) => set({ language }),
  setTheme: (theme) => set({ theme }),
  setUserLocation: (userLocation) => set({ userLocation }),
  setHasLocationPermission: (hasLocationPermission) => set({ hasLocationPermission }),
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

  addSavedPlace: (place) => set((s) => ({ savedPlaces: [...s.savedPlaces, place] })),
  removeSavedPlace: (id) => set((s) => ({ savedPlaces: s.savedPlaces.filter((p) => p.id !== id) })),
  saveCurrentRoute: (route) => set((s) => ({ savedRoutes: [...s.savedRoutes.filter((r) => r.id !== route.id), route] })),

  startJourney: () => {
    set({ journeyState: "PREPARING" });
    setTimeout(() => {
      set({ journeyState: "WALKING_TO_STOP" });
    }, 2000);
  },

  cancelJourney: () => {
    set({ journeyState: "PLANNING", selectedRoute: null });
  }
}));