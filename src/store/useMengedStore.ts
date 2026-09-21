import { create } from 'zustand';
import { RouteOption, MOCK_ROUTES } from '@/types/transit';
import { Journey, RouteRequest, TransitLeg, Coordinate } from '@/types/journey';
import { ActiveJourneyState, GPSLocation, StateEvaluationResult } from '@/types/navigation';
import { mapJourneyToRouteOption } from '@/lib/journeyAdapter';

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
  gpsError: string | null;
  gpsAccuracy: number | null;
  devSimulatedLocation: GPSLocation | null;
  
  // Explicit Location & Coordinate Context for Route Planning
  originType: "gps" | "place" | "none";
  originName: string;
  originCoordinates: Coordinate | null;
  destinationName: string;
  destinationCoordinates: Coordinate | null;
  gpsStatus: "detecting" | "active" | "unavailable" | "denied";

  // Voice State Machine
  isListening: boolean;
  transcript: string;
  
  // Legacy string handles (synced with explicit fields for UI compatibility)
  origin: string;
  destination: string;
  budgetETB: number | null;
  preference: "cheapest" | "fastest" | "least_walking" | "balanced";
  
  // Data Collections (Authoritative Backend + Presentation Models)
  routes: RouteOption[];
  rawJourneys: Journey[];
  selectedRoute: RouteOption | null;
  activeJourney: Journey | null;
  activeJourneyState: ActiveJourneyState | null;
  isNavigating: boolean;
  isLoadingRoutes: boolean;
  routeError: string | null;
  journeyStateRequestSeq: number;
  latestCompletedJourneySeq: number;

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
  setGpsError: (err: string | null) => void;
  setIsListening: (v: boolean) => void;
  setTranscript: (v: string) => void;
  setOrigin: (v: string) => void;
  setDestination: (v: string) => void;
  setBudget: (v: number | null) => void;
  setPreference: (v: "cheapest" | "fastest" | "least_walking" | "balanced") => void;
  setSelectedRoute: (v: RouteOption | null) => void;
  filterRoutes: () => void;
  
  // Location & Geocoding Actions
  requestGPSLocation: () => Promise<void>;
  setManualOrigin: (place: { name: string; coordinates: Coordinate }) => void;
  setDestinationPlace: (place: { name: string; coordinates: Coordinate }) => void;

  // Real Backend API Actions
  fetchRoutes: (overrideOrigCoords?: Coordinate, overrideDestCoords?: Coordinate) => Promise<boolean>;
  evaluateJourneyState: (location: GPSLocation) => Promise<void>;
  simulateLocationUpdate: (location: GPSLocation) => Promise<void>;
  confirmBoarding: () => Promise<void>;

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

  userLocation: null,
  hasLocationPermission: false,
  gpsError: null,
  gpsAccuracy: null,
  devSimulatedLocation: null,

  originType: "none",
  originName: "",
  originCoordinates: null,
  destinationName: "",
  destinationCoordinates: null,
  gpsStatus: "detecting",

  isListening: false,
  transcript: "",
  origin: "",
  destination: "",
  budgetETB: null,
  preference: "balanced",
  routes: [],
  rawJourneys: [],
  selectedRoute: null,
  activeJourney: null,
  activeJourneyState: null,
  isNavigating: false,
  isLoadingRoutes: false,
  routeError: null,
  journeyStateRequestSeq: 0,
  latestCompletedJourneySeq: 0,

  savedPlaces: [
    { id: "sp-1", label: "Home", name: "Bole Atlas", address: "Bole Sub City, Woreda 03", coordinates: [38.7770, 9.0062] },
    { id: "sp-2", label: "Work", name: "Mexico Square", address: "Kirkos Sub City", coordinates: [38.7454, 9.0105] },
    { id: "sp-3", label: "School", name: "4 Kilo Campus", address: "Arada Sub City", coordinates: [38.7632, 9.0336] },
  ],

  savedRoutes: [MOCK_ROUTES[0]],

  tripHistory: [
    { id: "th-1", origin: "Bole Atlas", destination: "Piassa", date: "Today, 8:30 AM", durationMins: 35, costETB: 25, mode: "minibus", status: "completed" },
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
  setGpsError: (gpsError) => set({ gpsError }),
  setIsListening: (isListening) => set({ isListening }),
  setTranscript: (transcript) => set({ transcript }),
  setOrigin: (origin) => set({ origin }),
  setDestination: (destination) => set({ destination }),
  setBudget: (budgetETB) => set({ budgetETB }),
  setPreference: (preference) => {
    set({ preference });
    get().filterRoutes();
  },

  setSelectedRoute: (selectedRoute) => {
    const { rawJourneys } = get();
    const matchingJourney = rawJourneys.find((j) => j.id === selectedRoute?.id) || null;
    set({
      selectedRoute,
      activeJourney: matchingJourney,
      activeJourneyState: null,
      isNavigating: false,
      gpsError: null,
      journeyState: selectedRoute ? "ROUTE_SELECTED" : "PLANNING",
    });
  },
  
  filterRoutes: () => {
    const { preference, budgetETB, routes } = get();
    let sorted = [...routes];

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

    set({ routes: sorted, selectedRoute: null, activeJourney: null, activeJourneyState: null, isNavigating: false, journeyState: "PLANNING" });
  },

  requestGPSLocation: async () => {
    set({ gpsStatus: "detecting" });
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      set({
        gpsStatus: "unavailable",
        gpsError: "Geolocation is not supported by this browser.",
        originCoordinates: null,
      });
      return;
    }

    return new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const coords = { latitude: lat, longitude: lng };
          set({
            userLocation: { lat, lng, name: "Current Location" },
            hasLocationPermission: true,
            gpsStatus: "active",
            originType: "gps",
            originName: "Current Location",
            originCoordinates: coords,
            origin: "Current Location",
            gpsAccuracy: pos.coords.accuracy ?? null,
            gpsError: null,
          });
          resolve();
        },
        (err) => {
          const status = err.code === 1 ? "denied" : "unavailable"; // 1 = PERMISSION_DENIED
          set({
            hasLocationPermission: false,
            gpsStatus: status,
            gpsError: err.message || "Unable to acquire GPS location.",
            originCoordinates: get().originType === "gps" ? null : get().originCoordinates,
          });
          resolve();
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    });
  },

  setManualOrigin: (place) => {
    set({
      originType: "place",
      originName: place.name,
      originCoordinates: place.coordinates,
      origin: place.name,
    });
  },

  setDestinationPlace: (place) => {
    set({
      destinationName: place.name,
      destinationCoordinates: place.coordinates,
      destination: place.name,
    });
  },

  fetchRoutes: async (overrideOrigCoords?: Coordinate, overrideDestCoords?: Coordinate) => {
    const origCoords = overrideOrigCoords || get().originCoordinates;
    const destCoords = overrideDestCoords || get().destinationCoordinates;

    set({ isLoadingRoutes: true, routeError: null, routes: [], rawJourneys: [], selectedRoute: null, activeJourney: null, activeJourneyState: null, isNavigating: false });

    if (!origCoords || !destCoords) {
      const missing = !origCoords && !destCoords ? "origin and destination" : !origCoords ? "origin" : "destination";
      const errMsg = `Please select a valid ${missing} location before searching for routes.`;
      set({ isLoadingRoutes: false, routeError: errMsg });
      return false;
    }

    try {
      const payload: RouteRequest = {
        origin: origCoords,
        destination: destCoords,
        preferences: {
          maxWalkingMeters: 1000,
          maxTransfers: 1,
        },
      };

      const response = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        const errMsg = json.error || `Route search failed (HTTP ${response.status})`;
        set({ isLoadingRoutes: false, routeError: errMsg });
        return false;
      }

      const fetchedJourneys: Journey[] = json.data?.journeys || [];

      if (fetchedJourneys.length === 0) {
        set({
          isLoadingRoutes: false,
          routeError: `No direct or 1-transfer transit routes found between the selected locations.`,
          routes: [],
          rawJourneys: [],
        });
        return true;
      }

      const mappedOptions = fetchedJourneys.map(mapJourneyToRouteOption);

      set({
        isLoadingRoutes: false,
        routeError: null,
        rawJourneys: fetchedJourneys,
        routes: mappedOptions,
        selectedRoute: mappedOptions[0] || null,
        activeJourney: fetchedJourneys[0] || null,
        activeJourneyState: null,
        isNavigating: false,
        journeyState: mappedOptions[0] ? "ROUTE_SELECTED" : "PLANNING",
      });

      return true;
    } catch (err: any) {
      const errMsg = `Failed to connect to transit server: ${err?.message || "Network error"}`;
      set({ isLoadingRoutes: false, routeError: errMsg });
      return false;
    }
  },

  evaluateJourneyState: async (location: GPSLocation) => {
    const { activeJourney, activeJourneyState, isNavigating } = get();
    if (!activeJourney || !isNavigating || !activeJourneyState) return;

    if (activeJourneyState.currentState === "ARRIVED") return;

    const reqSeq = get().journeyStateRequestSeq + 1;
    set({ journeyStateRequestSeq: reqSeq });

    try {
      const response = await fetch("/api/journey/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activeState: activeJourneyState,
          location,
          journey: activeJourney,
        }),
      });

      const json = await response.json();
      if (!response.ok || !json.success || !json.data) return;

      if (reqSeq < get().latestCompletedJourneySeq) return;
      set({ latestCompletedJourneySeq: reqSeq });

      const result: StateEvaluationResult = json.data;
      const nextState = result.nextState;

      let nextUiState: JourneyState = "WALKING_TO_STOP";
      if (nextState.currentState === "AT_STOP") {
        nextUiState = "AT_STOP";
      } else if (nextState.currentState === "TRANSIT_LEG") {
        nextUiState = "ONBOARD";
      } else if (nextState.currentState === "APPROACHING_ALIGHTING_STOP") {
        nextUiState = "APPROACHING_STOP";
      } else if (nextState.currentState === "ALIGHTED") {
        const nextLeg = activeJourney.legs[nextState.currentLegIndex];
        nextUiState = nextLeg?.type === "TRANSIT" || nextLeg?.type === "TRANSFER" ? "TRANSFER" : "WALKING_TO_DESTINATION";
      } else if (nextState.currentState === "WALKING_TO_DESTINATION") {
        nextUiState = "WALKING_TO_DESTINATION";
      } else if (nextState.currentState === "ARRIVED") {
        nextUiState = "ARRIVED";
      }

      set({
        activeJourneyState: nextState,
        journeyState: nextUiState,
        isNavigating: nextState.currentState !== "ARRIVED",
      });
    } catch (err) {
      console.error("[evaluateJourneyState] Error evaluating state:", err);
    }
  },

  simulateLocationUpdate: async (location: GPSLocation) => {
    set({ devSimulatedLocation: location });
    await get().evaluateJourneyState(location);
  },

  confirmBoarding: async () => {
    const { activeJourneyState, activeJourney, evaluateJourneyState } = get();
    if (!activeJourneyState || !activeJourney) return;

    const updatedActiveState: ActiveJourneyState = {
      ...activeJourneyState,
      boardingConfirmed: true,
    };
    set({ activeJourneyState: updatedActiveState });

    if (updatedActiveState.lastLocation) {
      await evaluateJourneyState(updatedActiveState.lastLocation);
    }
  },

  addSavedPlace: (place) => set((s) => ({ savedPlaces: [...s.savedPlaces, place] })),
  removeSavedPlace: (id) => set((s) => ({ savedPlaces: s.savedPlaces.filter((p) => p.id !== id) })),
  saveCurrentRoute: (route) => set((s) => ({ savedRoutes: [...s.savedRoutes.filter((r) => r.id !== route.id), route] })),

  startJourney: () => {
    const { activeJourney } = get();
    if (!activeJourney) return;

    const firstTransitLeg = activeJourney.legs.find((l): l is TransitLeg => l.type === "TRANSIT");
    const stopName = firstTransitLeg?.boardingStop.name || "the transit stop";

    const initialActiveState: ActiveJourneyState = {
      journeyId: activeJourney.id,
      currentState: "PLANNED",
      currentLegIndex: 0,
      boardingConfirmed: false,
      lastLocation: null,
      activeInstruction: `First, walk to ${stopName}.`,
      voicePrompt: `First, walk to ${stopName}. I will guide you.`,
    };

    set({
      activeJourneyState: initialActiveState,
      isNavigating: true,
      gpsError: null,
      journeyState: "WALKING_TO_STOP",
      journeyStateRequestSeq: 0,
      latestCompletedJourneySeq: 0,
    });
  },

  cancelJourney: () => {
    set({
      journeyState: "PLANNING",
      selectedRoute: null,
      activeJourney: null,
      activeJourneyState: null,
      isNavigating: false,
      gpsError: null,
      devSimulatedLocation: null,
    });
  }
}));