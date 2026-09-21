import { describe, test, expect, beforeEach } from "bun:test";
import { resolveLocationToCoordinates } from "@/lib/locationUtils";
import { mapJourneyToRouteOption } from "@/lib/journeyAdapter";
import { RouterService } from "@/services/router";
import { JourneyStateService } from "@/services/journeyStateService";
import { useMengedStore } from "@/store/useMengedStore";
import { ActiveJourneyState, GPSLocation } from "@/types/navigation";

describe("Phase 4 Task 2 FSM & Journey Companion Integration", () => {
  beforeEach(() => {
    // Reset store before each test
    useMengedStore.getState().cancelJourney();
  });

  test("A. Route selection sets activeJourney matching selectedRoute.id", async () => {
    const store = useMengedStore.getState();
    const bole = resolveLocationToCoordinates("Bole Medhanialem")!;
    const piassa = resolveLocationToCoordinates("Piassa Arada")!;

    const journeys = await RouterService.findJourneys({
      origin: bole,
      destination: piassa,
      preferences: { maxWalkingMeters: 1000, maxTransfers: 1 },
    });

    const routeOptions = journeys.map(mapJourneyToRouteOption);

    // Populate store
    useMengedStore.setState({ rawJourneys: journeys, routes: routeOptions });

    // Select second route if available, or first
    const selected = routeOptions[0];
    store.setSelectedRoute(selected);

    const updatedState = useMengedStore.getState();
    expect(updatedState.selectedRoute?.id).toBe(selected.id);
    expect(updatedState.activeJourney?.id).toBe(selected.id);
    expect(updatedState.journeyState).toBe("ROUTE_SELECTED");
  }, 15000);

  test("B. Start journey initializes activeJourneyState with PLANNED", async () => {
    const bole = resolveLocationToCoordinates("Bole Medhanialem")!;
    const piassa = resolveLocationToCoordinates("Piassa Arada")!;
    const journeys = await RouterService.findJourneys({
      origin: bole,
      destination: piassa,
      preferences: { maxWalkingMeters: 1000, maxTransfers: 1 },
    });

    const routeOptions = journeys.map(mapJourneyToRouteOption);
    useMengedStore.setState({ rawJourneys: journeys, routes: routeOptions });
    useMengedStore.getState().setSelectedRoute(routeOptions[0]);

    useMengedStore.getState().startJourney();

    const state = useMengedStore.getState();
    expect(state.isNavigating).toBe(true);
    expect(state.activeJourneyState).not.toBeNull();
    expect(state.activeJourneyState?.currentState).toBe("PLANNED");
    expect(state.journeyState).toBe("WALKING_TO_STOP");
  }, 15000);

  test("H. Golden Corridor (Bole -> Piassa) FSM Progression with real coordinates", async () => {
    const bole = resolveLocationToCoordinates("Bole Medhanialem")!;
    const piassa = resolveLocationToCoordinates("Piassa Arada")!;
    const journeys = await RouterService.findJourneys({
      origin: bole,
      destination: piassa,
      preferences: { maxWalkingMeters: 1000, maxTransfers: 1 },
    });

    const journey = journeys[0];
    const transitLeg = journey.legs.find((l) => l.type === "TRANSIT") as any;

    let activeState: ActiveJourneyState = {
      journeyId: journey.id,
      currentState: "PLANNED",
      currentLegIndex: 0,
      boardingConfirmed: false,
      lastLocation: null,
      activeInstruction: "Planned",
      voicePrompt: "Planned",
    };

    // 1. PLANNED -> WALKING_TO_STOP (Near origin)
    const pos1: GPSLocation = {
      latitude: bole.latitude,
      longitude: bole.longitude,
      speed: 1.2,
      heading: 0,
      accuracy: 5,
      timestamp: Date.now(),
    };
    let eval1 = JourneyStateService.evaluateState(activeState, pos1, journey);
    expect(eval1.nextState.currentState).toBe("WALKING_TO_STOP");
    activeState = eval1.nextState;

    // 2. WALKING_TO_STOP -> AT_STOP (Within threshold of boarding stop)
    const pos2: GPSLocation = {
      latitude: transitLeg.boardingStop.latitude,
      longitude: transitLeg.boardingStop.longitude,
      speed: 0,
      heading: 0,
      accuracy: 5,
      timestamp: Date.now() + 5000,
    };
    let eval2 = JourneyStateService.evaluateState(activeState, pos2, journey);
    expect(eval2.nextState.currentState).toBe("AT_STOP");
    activeState = eval2.nextState;

    // 3. AT_STOP -> TRANSIT_LEG (After confirmBoarding)
    activeState.boardingConfirmed = true;
    let eval3 = JourneyStateService.evaluateState(activeState, pos2, journey);
    expect(eval3.nextState.currentState).toBe("TRANSIT_LEG");
    activeState = eval3.nextState;

    // 4. TRANSIT_LEG -> APPROACHING_ALIGHTING_STOP (Near alighting stop)
    const pos4: GPSLocation = {
      latitude: transitLeg.alightingStop.latitude + 0.0008, // ~90m away
      longitude: transitLeg.alightingStop.longitude,
      speed: 8.5,
      heading: 0,
      accuracy: 5,
      timestamp: Date.now() + 10000,
    };
    let eval4 = JourneyStateService.evaluateState(activeState, pos4, journey);
    expect(eval4.nextState.currentState).toBe("APPROACHING_ALIGHTING_STOP");
    activeState = eval4.nextState;

    // 5. APPROACHING_ALIGHTING_STOP -> ALIGHTED
    const pos5: GPSLocation = {
      latitude: transitLeg.alightingStop.latitude,
      longitude: transitLeg.alightingStop.longitude,
      speed: 0,
      heading: 0,
      accuracy: 5,
      timestamp: Date.now() + 15000,
    };
    let eval5 = JourneyStateService.evaluateState(activeState, pos5, journey);
    expect(eval5.nextState.currentState).toBe("ALIGHTED");
    activeState = eval5.nextState;

    // 6. ALIGHTED -> WALKING_TO_STOP (because Journey 1 has a transfer leg to Route C17) or WALKING_TO_DESTINATION
    let eval6 = JourneyStateService.evaluateState(activeState, pos5, journey);
    const expectedNextState = eval6.nextState.currentState;
    expect(expectedNextState === "WALKING_TO_STOP" || expectedNextState === "WALKING_TO_DESTINATION").toBe(true);
    activeState = eval6.nextState;

    // 7. Progress to final destination
    const pos7: GPSLocation = {
      latitude: journey.destination.latitude,
      longitude: journey.destination.longitude,
      speed: 0,
      heading: 0,
      accuracy: 5,
      timestamp: Date.now() + 20000,
    };
    activeState.currentState = "WALKING_TO_DESTINATION";
    let eval7 = JourneyStateService.evaluateState(activeState, pos7, journey);
    expect(eval7.nextState.currentState).toBe("ARRIVED");
  });

  test("I. Multi-Leg (Bole -> Ayat Chefe) preserves transfer and leg index progression", async () => {
    const bole = resolveLocationToCoordinates("Bole Medhanialem")!;
    const ayat = resolveLocationToCoordinates("Ayat Chefe")!;

    const journeys = await RouterService.findJourneys({
      origin: bole,
      destination: ayat,
      preferences: { maxWalkingMeters: 1000, maxTransfers: 1 },
    });

    const multiLegJourney = journeys.find((j) => j.legs.filter((l) => l.type === "TRANSIT").length >= 2);
    expect(multiLegJourney).not.toBeUndefined();

    const j = multiLegJourney!;
    expect(j.legs.length).toBeGreaterThanOrEqual(4);

    let activeState: ActiveJourneyState = {
      journeyId: j.id,
      currentState: "PLANNED",
      currentLegIndex: 0,
      boardingConfirmed: false,
      lastLocation: null,
      activeInstruction: "Start",
      voicePrompt: "Start",
    };

    // First leg: walk to stop
    const firstTransit = j.legs.find((l) => l.type === "TRANSIT") as any;
    const posAtFirstStop: GPSLocation = {
      latitude: firstTransit.boardingStop.latitude,
      longitude: firstTransit.boardingStop.longitude,
      speed: 0,
      heading: 0,
      accuracy: 5,
      timestamp: Date.now(),
    };

    let step1 = JourneyStateService.evaluateState(activeState, posAtFirstStop, j);
    expect(step1.nextState.currentState).toBe("WALKING_TO_STOP");
    activeState = step1.nextState;

    let step2 = JourneyStateService.evaluateState(activeState, posAtFirstStop, j);
    expect(step2.nextState.currentState).toBe("AT_STOP");
    activeState = step2.nextState;

    activeState.boardingConfirmed = true;
    let step3 = JourneyStateService.evaluateState(activeState, posAtFirstStop, j);
    expect(step3.nextState.currentState).toBe("TRANSIT_LEG");
    activeState = step3.nextState;

    // Approach first alighting stop
    const posAtAlighting1: GPSLocation = {
      latitude: firstTransit.alightingStop.latitude,
      longitude: firstTransit.alightingStop.longitude,
      speed: 0,
      heading: 0,
      accuracy: 5,
      timestamp: Date.now() + 5000,
    };
    let step4 = JourneyStateService.evaluateState(activeState, posAtAlighting1, j);
    expect(step4.nextState.currentState).toBe("APPROACHING_ALIGHTING_STOP");
    activeState = step4.nextState;

    let step5 = JourneyStateService.evaluateState(activeState, posAtAlighting1, j);
    expect(step5.nextState.currentState).toBe("ALIGHTED");
    activeState = step5.nextState;

    // After alighting first leg, transitioning into next leg (transfer / walking to second stop)
    let step6 = JourneyStateService.evaluateState(activeState, posAtAlighting1, j);
    expect(step6.nextState.currentState).toBe("WALKING_TO_STOP");
    expect(step6.nextState.boardingConfirmed).toBe(false); // Reset boarding for second leg!
    expect(step6.nextState.currentLegIndex).toBeGreaterThan(0);
  });

  test("J. ARRIVED state prevents further navigation state mutations", () => {
    const journey: any = {
      id: "j-test",
      legs: [{ type: "WALK", from: { latitude: 9, longitude: 38 }, to: { latitude: 9.01, longitude: 38.01 } }],
      destination: { latitude: 9.01, longitude: 38.01 },
    };

    const arrivedState: ActiveJourneyState = {
      journeyId: "j-test",
      currentState: "ARRIVED",
      currentLegIndex: 0,
      boardingConfirmed: true,
      lastLocation: null,
      activeInstruction: "You have arrived.",
      voicePrompt: "You have arrived.",
    };

    const randomPos: GPSLocation = {
      latitude: 8.5,
      longitude: 37.5,
      speed: 10,
      heading: 180,
      accuracy: 5,
      timestamp: Date.now(),
    };

    const result = JourneyStateService.evaluateState(arrivedState, randomPos, journey);
    expect(result.nextState.currentState).toBe("ARRIVED");
    expect(result.stateChanged).toBe(false);
  });
});
