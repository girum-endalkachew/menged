import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { resolveLocationToCoordinates } from "@/lib/locationUtils";
import { mapJourneyToRouteOption, mapJourneyToMapRenderData } from "@/lib/journeyAdapter";
import { RouterService } from "@/services/router";
import { JourneyStateService } from "@/services/journeyStateService";
import { useMengedStore } from "@/store/useMengedStore";
import { GPSLocation } from "@/types/navigation";
import { POST as handleJourneyStatePost } from "@/app/api/journey/state/route";
import { POST as handleRoutesPost } from "@/app/api/routes/route";

describe("Journey Companion Complete User Flow Integration Tests", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    useMengedStore.getState().cancelJourney();
    useMengedStore.setState({ routes: [], rawJourneys: [], selectedRoute: null, activeJourney: null, activeJourneyState: null });

    // Mock fetch for relative API endpoints in unit test environment
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (urlStr.includes("/api/journey/state")) {
        const req = new Request("http://localhost:3000/api/journey/state", init);
        return handleJourneyStatePost(req);
      }
      if (urlStr.includes("/api/routes")) {
        const req = new Request("http://localhost:3000/api/routes", init);
        return handleRoutesPost(req);
      }
      return originalFetch(input, init);
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("1. Route search results flow into planning state", async () => {
    const bole = resolveLocationToCoordinates("Bole Medhanialem")!;
    const piassa = resolveLocationToCoordinates("Piassa Arada")!;

    useMengedStore.setState({
      originType: "place",
      originName: "Bole Medhanialem",
      originCoordinates: bole,
      destinationName: "Piassa Arada",
      destinationCoordinates: piassa,
    });

    const success = await useMengedStore.getState().fetchRoutes(bole, piassa);
    expect(success).toBe(true);

    const state = useMengedStore.getState();
    expect(state.routes.length).toBeGreaterThan(0);
    expect(state.rawJourneys.length).toBeGreaterThan(0);
    expect(state.journeyState).toBe("ROUTE_SELECTED");
  });

  test("2. Selecting a journey sets selectedRoute", async () => {
    const bole = resolveLocationToCoordinates("Bole Medhanialem")!;
    const piassa = resolveLocationToCoordinates("Piassa Arada")!;

    await useMengedStore.getState().fetchRoutes(bole, piassa);
    const store = useMengedStore.getState();

    const routeToSelect = store.routes[store.routes.length - 1];
    store.setSelectedRoute(routeToSelect);

    const updated = useMengedStore.getState();
    expect(updated.selectedRoute?.id).toBe(routeToSelect.id);
    expect(updated.activeJourney?.id).toBe(routeToSelect.id);
    expect(updated.journeyState).toBe("ROUTE_SELECTED");
  });

  test("3. Starting a journey sets activeJourney", async () => {
    const bole = resolveLocationToCoordinates("Bole Medhanialem")!;
    const piassa = resolveLocationToCoordinates("Piassa Arada")!;

    await useMengedStore.getState().fetchRoutes(bole, piassa);
    const selected = useMengedStore.getState().routes[0];
    useMengedStore.getState().setSelectedRoute(selected);

    useMengedStore.getState().startJourney();

    const state = useMengedStore.getState();
    expect(state.activeJourney).not.toBeNull();
    expect(state.activeJourney?.id).toBe(selected.id);
    expect(state.isNavigating).toBe(true);
  });

  test("4. Starting navigation initializes the FSM", async () => {
    const bole = resolveLocationToCoordinates("Bole Medhanialem")!;
    const piassa = resolveLocationToCoordinates("Piassa Arada")!;

    await useMengedStore.getState().fetchRoutes(bole, piassa);
    const selected = useMengedStore.getState().routes[0];
    useMengedStore.getState().setSelectedRoute(selected);

    useMengedStore.getState().startJourney();

    const state = useMengedStore.getState();
    expect(state.activeJourneyState).not.toBeNull();
    expect(state.activeJourneyState?.currentState).toBe("PLANNED");
    expect(state.activeJourneyState?.currentLegIndex).toBe(0);
    expect(state.activeJourneyState?.boardingConfirmed).toBe(false);
    expect(state.journeyState).toBe("WALKING_TO_STOP");
  });

  test("5. GPS state updates reach the FSM", async () => {
    const bole = resolveLocationToCoordinates("Bole Medhanialem")!;
    const piassa = resolveLocationToCoordinates("Piassa Arada")!;

    const journeys = await RouterService.findJourneys({
      origin: bole,
      destination: piassa,
      preferences: { maxWalkingMeters: 1000, maxTransfers: 1 },
    });

    const journey = journeys[0];
    const initialActiveState = {
      journeyId: journey.id,
      currentState: "PLANNED" as const,
      currentLegIndex: 0,
      boardingConfirmed: false,
      lastLocation: null,
      activeInstruction: "Start",
      voicePrompt: "Start",
    };

    const location: GPSLocation = {
      latitude: bole.latitude,
      longitude: bole.longitude,
      speed: 1.0,
      heading: 0,
      accuracy: 5,
      timestamp: Date.now(),
    };

    const result = JourneyStateService.evaluateState(initialActiveState, location, journey);
    expect(result.nextState.currentState).toBe("WALKING_TO_STOP");
    expect(result.nextState.lastLocation?.latitude).toBe(bole.latitude);
    expect(result.stateChanged).toBe(true);
  });

  test("6. FSM state changes are reflected in the active journey UI/state", async () => {
    const bole = resolveLocationToCoordinates("Bole Medhanialem")!;
    const piassa = resolveLocationToCoordinates("Piassa Arada")!;

    const journeys = await RouterService.findJourneys({
      origin: bole,
      destination: piassa,
      preferences: { maxWalkingMeters: 1000, maxTransfers: 1 },
    });

    const journey = journeys[0];
    const transitLeg = journey.legs.find((l) => l.type === "TRANSIT") as any;

    useMengedStore.setState({
      rawJourneys: journeys,
      routes: journeys.map(mapJourneyToRouteOption),
      activeJourney: journey,
      activeJourneyState: {
        journeyId: journey.id,
        currentState: "WALKING_TO_STOP",
        currentLegIndex: 0,
        boardingConfirmed: false,
        lastLocation: null,
        activeInstruction: "Walk to stop",
        voicePrompt: "Walk to stop",
      },
      isNavigating: true,
      journeyState: "WALKING_TO_STOP",
    });

    // Simulate location arriving at boarding stop
    const atBoardingStopPos: GPSLocation = {
      latitude: transitLeg.boardingStop.latitude,
      longitude: transitLeg.boardingStop.longitude,
      speed: 0,
      heading: 0,
      accuracy: 5,
      timestamp: Date.now(),
    };

    await useMengedStore.getState().simulateLocationUpdate(atBoardingStopPos);

    const updated = useMengedStore.getState();
    expect(updated.activeJourneyState?.currentState).toBe("AT_STOP");
    expect(updated.journeyState).toBe("AT_STOP");

    // Boarding confirmation
    await useMengedStore.getState().confirmBoarding();

    const afterBoarding = useMengedStore.getState();
    expect(afterBoarding.activeJourneyState?.currentState).toBe("TRANSIT_LEG");
    expect(afterBoarding.journeyState).toBe("ONBOARD");
  });

  test("7. Planning map uses selectedRoute", async () => {
    const bole = resolveLocationToCoordinates("Bole Medhanialem")!;
    const piassa = resolveLocationToCoordinates("Piassa Arada")!;

    const journeys = await RouterService.findJourneys({
      origin: bole,
      destination: piassa,
      preferences: { maxWalkingMeters: 1000, maxTransfers: 1 },
    });

    const mapped = journeys.map(mapJourneyToRouteOption);
    useMengedStore.setState({
      rawJourneys: journeys,
      routes: mapped,
      selectedRoute: mapped[0],
      activeJourney: journeys[0],
      isNavigating: false,
    });

    const selectedJourney = journeys.find((j) => j.id === mapped[0].id)!;
    const mapData = mapJourneyToMapRenderData(selectedJourney, bole);

    expect(mapData.markers.length).toBeGreaterThan(0);
    expect(mapData.polylines.length).toBeGreaterThan(0);
  });

  test("8. Navigation map uses activeJourney", async () => {
    const bole = resolveLocationToCoordinates("Bole Medhanialem")!;
    const piassa = resolveLocationToCoordinates("Piassa Arada")!;

    const journeys = await RouterService.findJourneys({
      origin: bole,
      destination: piassa,
      preferences: { maxWalkingMeters: 1000, maxTransfers: 1 },
    });

    const mapped = journeys.map(mapJourneyToRouteOption);
    const activeJ = journeys[0];

    useMengedStore.setState({
      rawJourneys: journeys,
      routes: mapped,
      selectedRoute: mapped[0],
      activeJourney: activeJ,
      isNavigating: true,
      journeyState: "WALKING_TO_STOP",
    });

    const mapData = mapJourneyToMapRenderData(activeJ, bole);
    expect(mapData.polylines.some((p) => p.type === "transit" || p.type === "walk")).toBe(true);
  });

  test("9. ARRIVED is terminal", () => {
    const journey: any = {
      id: "j-terminal",
      legs: [{ type: "WALK", from: { latitude: 9, longitude: 38 }, to: { latitude: 9.01, longitude: 38.01 } }],
      destination: { latitude: 9.01, longitude: 38.01 },
    };

    const arrivedState = {
      journeyId: "j-terminal",
      currentState: "ARRIVED" as const,
      currentLegIndex: 0,
      boardingConfirmed: true,
      lastLocation: null,
      activeInstruction: "You have arrived.",
      voicePrompt: "You have arrived.",
    };

    const dummyGps: GPSLocation = {
      latitude: 9.5,
      longitude: 38.5,
      speed: 0,
      heading: 0,
      accuracy: 5,
      timestamp: Date.now(),
    };

    const evalResult = JourneyStateService.evaluateState(arrivedState, dummyGps, journey);
    expect(evalResult.nextState.currentState).toBe("ARRIVED");
    expect(evalResult.stateChanged).toBe(false);
  });

  test("10. No mock/static route data is involved", async () => {
    const bole = resolveLocationToCoordinates("Bole Medhanialem")!;
    const piassa = resolveLocationToCoordinates("Piassa Arada")!;

    const journeys = await RouterService.findJourneys({
      origin: bole,
      destination: piassa,
      preferences: { maxWalkingMeters: 1000, maxTransfers: 1 },
    });

    expect(journeys.length).toBeGreaterThan(0);
    for (const j of journeys) {
      expect(j.trust.transit).toBe("VERIFIED");
      expect(j.trust.realtime).toBe("UNAVAILABLE");
      expect(j.legs.length).toBeGreaterThan(0);
    }
  });
});
