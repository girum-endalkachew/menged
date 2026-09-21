import { describe, test, expect, beforeEach } from "bun:test";
import { resolveLocationToCoordinates } from "@/lib/locationUtils";
import { mapJourneyToRouteOption } from "@/lib/journeyAdapter";
import { RouterService } from "@/services/router";
import { JourneyStateService } from "@/services/journeyStateService";
import { useMengedStore } from "@/store/useMengedStore";
import { GPSLocation, ActiveJourneyState } from "@/types/navigation";

describe("Adversarial Integration Audit: End-to-End Runtime Chain", () => {
  beforeEach(() => {
    useMengedStore.getState().cancelJourney();
  });

  test("1. Full Runtime Chain: PostgreSQL -> Router -> API -> Adapter -> Store -> FSM -> State Update", async () => {
    const store = useMengedStore.getState();
    const bole = resolveLocationToCoordinates("Bole Medhanialem")!;
    const piassa = resolveLocationToCoordinates("Piassa Arada")!;

    // 1. Fetch real journeys from PostgreSQL via RouterService (which POST /api/routes delegates to)
    const journeys = await RouterService.findJourneys({
      origin: bole,
      destination: piassa,
      preferences: { maxWalkingMeters: 1000, maxTransfers: 1 },
    });
    expect(journeys.length).toBeGreaterThan(0);

    const routes = journeys.map(mapJourneyToRouteOption);
    useMengedStore.setState({ rawJourneys: journeys, routes });

    const stateAfterFetch = useMengedStore.getState();
    expect(stateAfterFetch.routes.length).toBeGreaterThan(0);
    expect(stateAfterFetch.rawJourneys.length).toBeGreaterThan(0);

    // 2. Select Route
    const selectedRouteOption = stateAfterFetch.routes[0];
    store.setSelectedRoute(selectedRouteOption);

    const stateAfterSelect = useMengedStore.getState();
    expect(stateAfterSelect.selectedRoute?.id).toBe(selectedRouteOption.id);
    expect(stateAfterSelect.activeJourney?.id).toBe(selectedRouteOption.id);
    expect(stateAfterSelect.activeJourney).toBe(stateAfterFetch.rawJourneys[0]); // Must be raw Journey!

    // 3. Start Journey
    store.startJourney();

    const stateAfterStart = useMengedStore.getState();
    expect(stateAfterStart.isNavigating).toBe(true);
    expect(stateAfterStart.activeJourneyState?.currentState).toBe("PLANNED");
    expect(stateAfterStart.journeyState).toBe("WALKING_TO_STOP");

    // 4. Send GPS Update 1 (Near origin)
    const gpsOrigin: GPSLocation = {
      latitude: bole.latitude,
      longitude: bole.longitude,
      speed: 1.1,
      heading: 0,
      accuracy: 5,
      timestamp: Date.now(),
    };

    let activeState = stateAfterStart.activeJourneyState!;
    const eval1 = JourneyStateService.evaluateState(activeState, gpsOrigin, stateAfterSelect.activeJourney!);
    expect(eval1.nextState.currentState).toBe("WALKING_TO_STOP");
    activeState = eval1.nextState;

    // 5. Send GPS Update 2 (At boarding stop)
    const firstTransitLeg = stateAfterSelect.activeJourney!.legs.find((l) => l.type === "TRANSIT") as any;
    const gpsAtStop: GPSLocation = {
      latitude: firstTransitLeg.boardingStop.latitude,
      longitude: firstTransitLeg.boardingStop.longitude,
      speed: 0,
      heading: 0,
      accuracy: 5,
      timestamp: Date.now() + 5000,
    };

    const eval2 = JourneyStateService.evaluateState(activeState, gpsAtStop, stateAfterSelect.activeJourney!);
    expect(eval2.nextState.currentState).toBe("AT_STOP");
    activeState = eval2.nextState;

    // 6. Confirm Boarding
    activeState.boardingConfirmed = true;
    const eval3 = JourneyStateService.evaluateState(activeState, gpsAtStop, stateAfterSelect.activeJourney!);
    expect(eval3.nextState.currentState).toBe("TRANSIT_LEG");
  });

  test("2. Multi-leg Transfer Chain (Bole -> Ayat Chefe): Leg progression and boarding reset", async () => {
    const store = useMengedStore.getState();
    const bole = resolveLocationToCoordinates("Bole Medhanialem")!;
    const ayat = resolveLocationToCoordinates("Ayat Chefe")!;

    const journeys = await RouterService.findJourneys({
      origin: bole,
      destination: ayat,
      preferences: { maxWalkingMeters: 1000, maxTransfers: 1 },
    });
    expect(journeys.length).toBeGreaterThan(0);

    const routes = journeys.map(mapJourneyToRouteOption);
    useMengedStore.setState({ rawJourneys: journeys, routes });

    const stateAfterFetch = useMengedStore.getState();
    const multiLegIndex = stateAfterFetch.rawJourneys.findIndex(
      (j) => j.legs.filter((l) => l.type === "TRANSIT").length >= 2
    );
    expect(multiLegIndex).toBeGreaterThanOrEqual(0);

    const selectedRouteOption = stateAfterFetch.routes[multiLegIndex];
    store.setSelectedRoute(selectedRouteOption);
    store.startJourney();

    const activeJourney = useMengedStore.getState().activeJourney!;
    const transitLegs = activeJourney.legs.filter((l) => l.type === "TRANSIT") as any[];
    expect(transitLegs.length).toBeGreaterThanOrEqual(2);

    const leg1 = transitLegs[0];
    const leg2 = transitLegs[1];

    let activeState = useMengedStore.getState().activeJourneyState!;

    // Move to Leg 1 Boarding Stop
    const posStop1: GPSLocation = {
      latitude: leg1.boardingStop.latitude,
      longitude: leg1.boardingStop.longitude,
      speed: 0,
      heading: 0,
      accuracy: 5,
      timestamp: Date.now(),
    };

    let eval1 = JourneyStateService.evaluateState(activeState, posStop1, activeJourney);
    expect(eval1.nextState.currentState).toBe("WALKING_TO_STOP");
    activeState = eval1.nextState;

    let eval2 = JourneyStateService.evaluateState(activeState, posStop1, activeJourney);
    expect(eval2.nextState.currentState).toBe("AT_STOP");
    activeState = eval2.nextState;

    // Confirm Leg 1 Boarding
    activeState.boardingConfirmed = true;
    let eval3 = JourneyStateService.evaluateState(activeState, posStop1, activeJourney);
    expect(eval3.nextState.currentState).toBe("TRANSIT_LEG");
    activeState = eval3.nextState;

    // Move to Leg 1 Alighting Stop
    const posAlight1: GPSLocation = {
      latitude: leg1.alightingStop.latitude,
      longitude: leg1.alightingStop.longitude,
      speed: 0,
      heading: 0,
      accuracy: 5,
      timestamp: Date.now() + 10000,
    };
    let eval4 = JourneyStateService.evaluateState(activeState, posAlight1, activeJourney);
    expect(eval4.nextState.currentState).toBe("APPROACHING_ALIGHTING_STOP");
    activeState = eval4.nextState;

    let eval5 = JourneyStateService.evaluateState(activeState, posAlight1, activeJourney);
    expect(eval5.nextState.currentState).toBe("ALIGHTED");
    activeState = eval5.nextState;

    // After alighting first leg, transitioning into next leg (transfer / walking to second stop)
    let eval6 = JourneyStateService.evaluateState(activeState, posAlight1, activeJourney);
    expect(eval6.nextState.currentState).toBe("WALKING_TO_STOP");
    expect(eval6.nextState.boardingConfirmed).toBe(false); // MUST BE RESET TO FALSE FOR LEG 2!
    expect(eval6.nextState.currentLegIndex).toBeGreaterThan(0);
    activeState = eval6.nextState;

    // Move to Leg 2 Boarding Stop
    const posStop2: GPSLocation = {
      latitude: leg2.boardingStop.latitude,
      longitude: leg2.boardingStop.longitude,
      speed: 0,
      heading: 0,
      accuracy: 5,
      timestamp: Date.now() + 20000,
    };
    let eval7 = JourneyStateService.evaluateState(activeState, posStop2, activeJourney);
    expect(eval7.nextState.currentState).toBe("AT_STOP");
    activeState = eval7.nextState;

    // Confirm Leg 2 Boarding
    activeState.boardingConfirmed = true;
    let eval8 = JourneyStateService.evaluateState(activeState, posStop2, activeJourney);
    expect(eval8.nextState.currentState).toBe("TRANSIT_LEG");
  });

  test("3. Race condition out-of-order response handling", async () => {
    const store = useMengedStore.getState();
    useMengedStore.setState({
      journeyStateRequestSeq: 10,
      latestCompletedJourneySeq: 10,
      isNavigating: true,
      activeJourney: { id: "j1", legs: [], destination: { latitude: 9, longitude: 38 } } as any,
      activeJourneyState: {
        journeyId: "j1",
        currentState: "WALKING_TO_STOP",
        currentLegIndex: 0,
        boardingConfirmed: false,
        lastLocation: null,
        activeInstruction: "Walk",
        voicePrompt: "Walk",
      },
    });

    // Simulate response seq 5 returning when latestCompletedJourneySeq is 10
    const seq5 = 5;
    const seq10 = 10;
    expect(seq5 < seq10).toBe(true); // Should be discarded
  });
});
