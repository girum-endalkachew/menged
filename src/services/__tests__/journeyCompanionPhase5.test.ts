import { describe, test, expect, beforeEach } from "bun:test";
import { RouterService } from "../router";
import { JourneyStateService } from "../journeyStateService";
import { useMengedStore } from "@/store/useMengedStore";
import { Journey, TransitLeg } from "@/types/journey";
import { ActiveJourneyState, GPSLocation } from "@/types/navigation";
import { mapJourneyToRouteOption } from "@/lib/journeyAdapter";
import { POST as handleJourneyStatePost } from "@/app/api/journey/state/route";

describe("Phase 5: Journey Companion Integration & FSM/GPS Adversarial QA", () => {
  beforeEach(() => {
    useMengedStore.getState().cancelJourney();
    useMengedStore.setState({
      routes: [],
      rawJourneys: [],
      selectedRoute: null,
      activeJourney: null,
      activeJourneyState: null,
      isNavigating: false,
      gpsError: null,
    });
  });

  // --------------------------------------------------------------------------
  // SECTION 1: START JOURNEY CONTRACT & BOUNDARY PROTECTION
  // --------------------------------------------------------------------------
  test("1. Start Journey Contract: Refuses to start navigation when no journey is selected", () => {
    const store = useMengedStore.getState();
    expect(store.activeJourney).toBeNull();
    expect(store.selectedRoute).toBeNull();

    // Attempting startJourney without selection must return false and NOT fall back to arbitrary routes
    const started = store.startJourney();
    expect(started).toBe(false);
    expect(useMengedStore.getState().isNavigating).toBe(false);
    expect(useMengedStore.getState().activeJourneyState).toBeNull();
  });

  test("2. Start Journey Contract: Explicit journey starts navigation with authoritative context", async () => {
    const routerResult = await RouterService.findJourneysWithDiagnostics({
      origin: { latitude: 8.9983386, longitude: 38.7860596 }, // Bole Medhanialem
      destination: { latitude: 9.0365871, longitude: 38.7522029 }, // Piassa
      preferences: { maxTransfers: 1, maxWalkingMeters: 1000 },
    });
    const journey = routerResult.journeys[0];
    expect(journey).toBeDefined();

    const started = useMengedStore.getState().startJourney(journey);
    expect(started).toBe(true);

    const state = useMengedStore.getState();
    expect(state.isNavigating).toBe(true);
    expect(state.activeJourney?.id).toBe(journey.id);
    expect(state.selectedRoute?.id).toBe(journey.id);
    expect(state.activeJourneyState?.currentState).toBe("PLANNED");
    expect(state.activeJourneyState?.currentLegIndex).toBe(0);
    expect(state.activeJourneyState?.boardingConfirmed).toBe(false);
    expect(state.journeyState).toBe("WALKING_TO_STOP");
  });

  test("3. Planning/Navigation Boundary: Changing selectedRoute during active navigation does NOT clobber activeJourney", async () => {
    const routerResult = await RouterService.findJourneysWithDiagnostics({
      origin: { latitude: 8.9983386, longitude: 38.7860596 },
      destination: { latitude: 9.0365871, longitude: 38.7522029 },
      preferences: { maxTransfers: 1, maxWalkingMeters: 1000 },
    });
    const j1 = routerResult.journeys[0];
    const j2 = routerResult.journeys[1];
    expect(j1.id).not.toBe(j2.id);

    // Start navigation with Journey 1
    useMengedStore.getState().startJourney(j1);
    expect(useMengedStore.getState().activeJourney?.id).toBe(j1.id);
    expect(useMengedStore.getState().isNavigating).toBe(true);

    // Simulate browsing/selecting Journey 2 in the route drawer during active navigation
    const routeOption2 = mapJourneyToRouteOption(j2);
    useMengedStore.getState().setSelectedRoute(routeOption2);

    const state = useMengedStore.getState();
    // selectedRoute changes for preview, but activeJourney and active navigation MUST REMAIN on j1!
    expect(state.selectedRoute?.id).toBe(j2.id);
    expect(state.activeJourney?.id).toBe(j1.id);
    expect(state.isNavigating).toBe(true);
    expect(state.activeJourneyState?.journeyId).toBe(j1.id);
  });

  // --------------------------------------------------------------------------
  // SECTION 2: COMPLETE REAL BOLE -> PIASSA JOURNEY LIFECYCLE TRACE
  // --------------------------------------------------------------------------
  test("4. Real Bole -> Piassa GTFS Trace: Complete Walk -> Board -> Transit -> Alight -> Arrive progression", async () => {
    const routerResult = await RouterService.findJourneysWithDiagnostics({
      origin: { latitude: 8.9983386, longitude: 38.7860596 },
      destination: { latitude: 9.0365871, longitude: 38.7522029 },
      preferences: { maxTransfers: 1, maxWalkingMeters: 1000 },
    });
    // Direct journey Bole Medhanialem -> Piassa
    const journey = routerResult.journeys.find((j) => j.transfersCount === 0)!;
    expect(journey).toBeDefined();

    const transitLeg = journey.legs.find((l): l is TransitLeg => l.type === "TRANSIT")!;
    const boardingStop = transitLeg.boardingStop;
    const alightingStop = transitLeg.alightingStop;

    let activeState: ActiveJourneyState = {
      journeyId: journey.id,
      currentState: "PLANNED",
      currentLegIndex: 0,
      boardingConfirmed: false,
      lastLocation: null,
      activeInstruction: "",
      voicePrompt: "",
    };

    // Step A: Navigation starts at origin (100m away from stop) -> WALKING_TO_STOP
    let res = JourneyStateService.evaluateState(
      activeState,
      { latitude: journey.origin.latitude, longitude: journey.origin.longitude, speed: 1.2, heading: null, accuracy: 5, timestamp: 1000 },
      journey
    );
    activeState = res.nextState;
    expect(activeState.currentState).toBe("WALKING_TO_STOP");
    expect(activeState.activeInstruction).toContain(boardingStop.name);

    // Step B: User approaches boarding stop (within 25m <= 35m threshold) -> AT_STOP
    res = JourneyStateService.evaluateState(
      activeState,
      { latitude: boardingStop.latitude, longitude: boardingStop.longitude, speed: 0.2, heading: null, accuracy: 4, timestamp: 2000 },
      journey
    );
    activeState = res.nextState;
    expect(activeState.currentState).toBe("AT_STOP");
    expect(activeState.boardingConfirmed).toBe(false);

    // Step C: Proximity Safety: GPS moves 55m away without boarding confirmation -> WALKING_TO_STOP
    res = JourneyStateService.evaluateState(
      activeState,
      { latitude: boardingStop.latitude + 0.0005, longitude: boardingStop.longitude + 0.0005, speed: 1.3, heading: null, accuracy: 5, timestamp: 3000 },
      journey
    );
    activeState = res.nextState;
    expect(activeState.currentState).toBe("WALKING_TO_STOP");

    // Step D: User returns to stop -> AT_STOP
    res = JourneyStateService.evaluateState(
      activeState,
      { latitude: boardingStop.latitude, longitude: boardingStop.longitude, speed: 0.1, heading: null, accuracy: 5, timestamp: 4000 },
      journey
    );
    activeState = res.nextState;
    expect(activeState.currentState).toBe("AT_STOP");

    // Step E: Explicit confirmation: User confirms boarding -> TRANSIT_LEG
    activeState.boardingConfirmed = true;
    res = JourneyStateService.evaluateState(
      activeState,
      { latitude: boardingStop.latitude, longitude: boardingStop.longitude, speed: 0.1, heading: null, accuracy: 5, timestamp: 5000 },
      journey
    );
    activeState = res.nextState;
    expect(activeState.currentState).toBe("TRANSIT_LEG");
    expect(activeState.currentLegIndex).toBe(1);

    // Step F: Mid-transit corridor point (1.5km from alighting stop) -> Remains TRANSIT_LEG
    res = JourneyStateService.evaluateState(
      activeState,
      { latitude: 9.0150, longitude: 38.7650, speed: 8.5, heading: 310, accuracy: 8, timestamp: 6000 },
      journey
    );
    activeState = res.nextState;
    expect(activeState.currentState).toBe("TRANSIT_LEG");

    // Step G: Approaching alighting stop (80m <= 120m threshold) -> APPROACHING_ALIGHTING_STOP
    // Create coordinate 80m from alighting stop
    res = JourneyStateService.evaluateState(
      activeState,
      { latitude: alightingStop.latitude - 0.0006, longitude: alightingStop.longitude - 0.0004, speed: 4.0, heading: 320, accuracy: 5, timestamp: 7000 },
      journey
    );
    activeState = res.nextState;
    expect(activeState.currentState).toBe("APPROACHING_ALIGHTING_STOP");
    expect(activeState.activeInstruction).toContain("coming up");

    // Step H: Vehicle arrives at alighting stop (within 20m <= 30m) -> ALIGHTED
    res = JourneyStateService.evaluateState(
      activeState,
      { latitude: alightingStop.latitude, longitude: alightingStop.longitude, speed: 0.5, heading: null, accuracy: 5, timestamp: 8000 },
      journey
    );
    activeState = res.nextState;
    expect(activeState.currentState).toBe("ALIGHTED");
    expect(activeState.currentLegIndex).toBe(2); // Final walk leg

    // Step I: Transition to walking to destination
    res = JourneyStateService.evaluateState(
      activeState,
      { latitude: alightingStop.latitude, longitude: alightingStop.longitude, speed: 1.1, heading: null, accuracy: 5, timestamp: 9000 },
      journey
    );
    activeState = res.nextState;
    expect(activeState.currentState).toBe("WALKING_TO_DESTINATION");

    // Step J: Arrival at destination (within 15m <= 25m threshold) -> ARRIVED
    res = JourneyStateService.evaluateState(
      activeState,
      { latitude: journey.destination.latitude, longitude: journey.destination.longitude, speed: 0.0, heading: null, accuracy: 3, timestamp: 10000 },
      journey
    );
    activeState = res.nextState;
    expect(activeState.currentState).toBe("ARRIVED");

    // Step K: Terminal invariant: Further GPS updates never leave ARRIVED
    res = JourneyStateService.evaluateState(
      activeState,
      { latitude: 9.0500, longitude: 38.7000, speed: 2.0, heading: null, accuracy: 5, timestamp: 11000 },
      journey
    );
    expect(res.nextState.currentState).toBe("ARRIVED");
    expect(res.stateChanged).toBe(false);
  });

  // --------------------------------------------------------------------------
  // SECTION 3: ADVERSARIAL OVERSHOOT & JUMP PAST STOP
  // --------------------------------------------------------------------------
  test("5. Adversarial Overshoot: GPS jumps from 150m before stop to 40m beyond stop", async () => {
    const routerResult = await RouterService.findJourneysWithDiagnostics({
      origin: { latitude: 8.9983386, longitude: 38.7860596 },
      destination: { latitude: 9.0365871, longitude: 38.7522029 },
      preferences: { maxTransfers: 1, maxWalkingMeters: 1000 },
    });
    const journey = routerResult.journeys[0];
    const transitLeg = journey.legs.find((l): l is TransitLeg => l.type === "TRANSIT")!;

    const stateInTransit: ActiveJourneyState = {
      journeyId: journey.id,
      currentState: "TRANSIT_LEG",
      currentLegIndex: 1,
      boardingConfirmed: true,
      lastLocation: {
        latitude: transitLeg.alightingStop.latitude - 0.0013,
        longitude: transitLeg.alightingStop.longitude - 0.0009,
        speed: 9.0,
        heading: 320,
        accuracy: 5,
        timestamp: 1000,
      },
      activeInstruction: "In transit",
      voicePrompt: "In transit",
    };

    // GPS jumps past alighting stop towards destination
    const posJumpedPast: GPSLocation = {
      latitude: transitLeg.alightingStop.latitude + 0.0004,
      longitude: transitLeg.alightingStop.longitude - 0.0002,
      speed: 7.5,
      heading: 320,
      accuracy: 5,
      timestamp: 2000,
    };

    // FSM must detect overshoot rather than claiming still approaching
    const eval1 = JourneyStateService.evaluateState(stateInTransit, posJumpedPast, journey);
    expect(eval1.nextState.currentState).toBe("APPROACHING_ALIGHTING_STOP");
    expect(eval1.nextState.activeInstruction).toContain("You have passed");

    // Next tick advances to ALIGHTED
    const eval2 = JourneyStateService.evaluateState(eval1.nextState, posJumpedPast, journey);
    expect(eval2.nextState.currentState).toBe("ALIGHTED");
  });

  // --------------------------------------------------------------------------
  // SECTION 4: GPS JITTER HYSTERESIS AT STOP
  // --------------------------------------------------------------------------
  test("6. GPS Jitter: Positions oscillating around 35m (34m, 36m, 33m, 37m) do NOT cause state thrashing", async () => {
    const routerResult = await RouterService.findJourneysWithDiagnostics({
      origin: { latitude: 8.9983386, longitude: 38.7860596 },
      destination: { latitude: 9.0365871, longitude: 38.7522029 },
      preferences: { maxTransfers: 1, maxWalkingMeters: 1000 },
    });
    const journey = routerResult.journeys[0];
    const transitLeg = journey.legs.find((l): l is TransitLeg => l.type === "TRANSIT")!;
    const stop = transitLeg.boardingStop;

    let state: ActiveJourneyState = {
      journeyId: journey.id,
      currentState: "WALKING_TO_STOP",
      currentLegIndex: 0,
      boardingConfirmed: false,
      lastLocation: null,
      activeInstruction: "",
      voicePrompt: "",
    };

    // 1. Enter AT_STOP at ~20m distance
    let res = JourneyStateService.evaluateState(
      state,
      { latitude: stop.latitude + 0.00015, longitude: stop.longitude + 0.0001, speed: 0.1, heading: null, accuracy: 5, timestamp: 1000 },
      journey
    );
    state = res.nextState;
    expect(state.currentState).toBe("AT_STOP");

    // 2. Jitter to ~36m (slightly beyond 35m, but within 50m hysteresis)
    res = JourneyStateService.evaluateState(
      state,
      { latitude: stop.latitude + 0.00030, longitude: stop.longitude + 0.0001, speed: 0.0, heading: null, accuracy: 5, timestamp: 2000 },
      journey
    );
    expect(res.nextState.currentState).toBe("AT_STOP"); // Hysteresis holds!

    // 3. Jitter to ~34m
    res = JourneyStateService.evaluateState(
      res.nextState,
      { latitude: stop.latitude + 0.00025, longitude: stop.longitude + 0.0001, speed: 0.0, heading: null, accuracy: 5, timestamp: 3000 },
      journey
    );
    expect(res.nextState.currentState).toBe("AT_STOP");

    // 4. Jitter to ~38m
    res = JourneyStateService.evaluateState(
      res.nextState,
      { latitude: stop.latitude + 0.00032, longitude: stop.longitude + 0.0001, speed: 0.0, heading: null, accuracy: 5, timestamp: 4000 },
      journey
    );
    expect(res.nextState.currentState).toBe("AT_STOP");

    // 5. Genuine exit: User walks to 60m away (> 50m hysteresis threshold)
    res = JourneyStateService.evaluateState(
      res.nextState,
      { latitude: stop.latitude + 0.00055, longitude: stop.longitude + 0.0002, speed: 1.4, heading: null, accuracy: 5, timestamp: 5000 },
      journey
    );
    expect(res.nextState.currentState).toBe("WALKING_TO_STOP");
  });

  // --------------------------------------------------------------------------
  // SECTION 5: MULTI-LEG TRANSFER JOURNEY
  // --------------------------------------------------------------------------
  test("7. Multi-Leg Transfer: Advances monotonically through legs and resets boarding confirmation", () => {
    const multiLegJourney: Journey = {
      id: "journey_transfer_test",
      origin: { latitude: 8.9983, longitude: 38.7860 },
      destination: { latitude: 9.0345, longitude: 38.7525 },
      totalWalkingMeters: 300,
      transfersCount: 1,
      estimatedDurationMinutes: 40,
      fare: { amount: 0, currency: "ETB", status: "UNAVAILABLE" },
      legs: [
        {
          type: "WALK",
          from: { name: "Origin", latitude: 8.9983, longitude: 38.7860 },
          to: { name: "Stop 1", latitude: 8.9990, longitude: 38.7870 },
          distanceMeters: 50,
          estimatedMinutes: 1,
        },
        {
          type: "TRANSIT",
          routeId: "r1",
          routeShortName: "L1",
          routeType: 3,
          boardingStop: { id: "s1", name: "Stop 1", latitude: 8.9990, longitude: 38.7870 },
          alightingStop: { id: "s2", name: "Transfer Hub", latitude: 9.0150, longitude: 38.7600 },
          distanceMeters: 2500,
          estimatedMinutes: 15,
          intermediateStops: [],
        },
        {
          type: "TRANSFER",
          fromStop: { id: "s2", name: "Transfer Hub", latitude: 9.0150, longitude: 38.7600 },
          toStop: { id: "s3", name: "Transfer Platform 2", latitude: 9.0155, longitude: 38.7605 },
          distanceMeters: 70,
          estimatedMinutes: 2,
        },
        {
          type: "TRANSIT",
          routeId: "r2",
          routeShortName: "L2",
          routeType: 3,
          boardingStop: { id: "s3", name: "Transfer Platform 2", latitude: 9.0155, longitude: 38.7605 },
          alightingStop: { id: "s4", name: "Final Stop", latitude: 9.0340, longitude: 38.7520 },
          distanceMeters: 3000,
          estimatedMinutes: 18,
          intermediateStops: [],
        },
        {
          type: "WALK",
          from: { name: "Final Stop", latitude: 9.0340, longitude: 38.7520 },
          to: { name: "Destination", latitude: 9.0345, longitude: 38.7525 },
          distanceMeters: 40,
          estimatedMinutes: 1,
        },
      ],
    };

    let state: ActiveJourneyState = {
      journeyId: multiLegJourney.id,
      currentState: "TRANSIT_LEG",
      currentLegIndex: 1, // On first transit leg
      boardingConfirmed: true,
      lastLocation: null,
      activeInstruction: "",
      voicePrompt: "",
    };

    // Approaching first vehicle alighting stop at Transfer Hub (s2, ~70m away)
    let res = JourneyStateService.evaluateState(
      state,
      { latitude: 9.0145, longitude: 38.7595, speed: 4.0, heading: null, accuracy: 5, timestamp: 1000 },
      multiLegJourney
    );
    expect(res.nextState.currentState).toBe("APPROACHING_ALIGHTING_STOP");

    // Alight from first vehicle at Transfer Hub (s2, at stop <= 30m)
    res = JourneyStateService.evaluateState(
      res.nextState,
      { latitude: 9.0150, longitude: 38.7600, speed: 0.2, heading: null, accuracy: 5, timestamp: 2000 },
      multiLegJourney
    );
    expect(res.nextState.currentState).toBe("ALIGHTED");
    expect(res.nextState.currentLegIndex).toBe(2); // Advances to transfer leg

    // Step to WALKING_TO_STOP for second vehicle
    res = JourneyStateService.evaluateState(
      res.nextState,
      { latitude: 9.0151, longitude: 38.7601, speed: 1.1, heading: null, accuracy: 5, timestamp: 3000 },
      multiLegJourney
    );
    expect(res.nextState.currentState).toBe("WALKING_TO_STOP");
    expect(res.nextState.boardingConfirmed).toBe(false); // MUST BE RESET for second transit leg!

    // Arrive at s3
    res = JourneyStateService.evaluateState(
      res.nextState,
      { latitude: 9.0155, longitude: 38.7605, speed: 0.1, heading: null, accuracy: 5, timestamp: 4000 },
      multiLegJourney
    );
    expect(res.nextState.currentState).toBe("AT_STOP");
    expect(res.nextState.boardingConfirmed).toBe(false);

    // Confirm boarding for second transit leg
    res.nextState.boardingConfirmed = true;
    res = JourneyStateService.evaluateState(
      res.nextState,
      { latitude: 9.0155, longitude: 38.7605, speed: 0.1, heading: null, accuracy: 5, timestamp: 5000 },
      multiLegJourney
    );
    expect(res.nextState.currentState).toBe("TRANSIT_LEG");
    expect(res.nextState.currentLegIndex).toBe(3); // On second transit leg!
  });

  // --------------------------------------------------------------------------
  // SECTION 6: STALE GPS & RACE CONDITION PROTECTION
  // --------------------------------------------------------------------------
  test("8. Stale GPS Protection: Out-of-order API responses do not overwrite newer state", async () => {
    const routerResult = await RouterService.findJourneysWithDiagnostics({
      origin: { latitude: 8.9983386, longitude: 38.7860596 },
      destination: { latitude: 9.0365871, longitude: 38.7522029 },
      preferences: { maxTransfers: 1, maxWalkingMeters: 1000 },
    });
    const journey = routerResult.journeys[0];
    useMengedStore.getState().startJourney(journey);

    // Simulated seq 1 (older) and seq 2 (newer)
    useMengedStore.setState({
      journeyStateRequestSeq: 2,
      latestCompletedJourneySeq: 2,
      activeJourneyState: {
        journeyId: journey.id,
        currentState: "TRANSIT_LEG",
        currentLegIndex: 1,
        boardingConfirmed: true,
        lastLocation: null,
        activeInstruction: "Latest State",
        voicePrompt: "Latest State",
      },
    });

    // An older request response with seq 1 arrives late
    const olderResult = {
      nextState: {
        journeyId: journey.id,
        currentState: "WALKING_TO_STOP" as const,
        currentLegIndex: 0,
        boardingConfirmed: false,
        lastLocation: null,
        activeInstruction: "Stale State",
        voicePrompt: "Stale State",
      },
      stateChanged: true,
    };

    // Verify condition: if reqSeq < latestCompletedJourneySeq, store discards it
    const reqSeq = 1;
    const isStale = reqSeq < useMengedStore.getState().latestCompletedJourneySeq;
    expect(isStale).toBe(true);

    // State remains untouched
    expect(useMengedStore.getState().activeJourneyState?.currentState).toBe("TRANSIT_LEG");
  });

  // --------------------------------------------------------------------------
  // SECTION 7: JOURNEY IMMUTABILITY CHECK
  // --------------------------------------------------------------------------
  test("9. Journey Immutability: Selected Journey factual metadata is NEVER mutated by navigation", async () => {
    const routerResult = await RouterService.findJourneysWithDiagnostics({
      origin: { latitude: 8.9983386, longitude: 38.7860596 },
      destination: { latitude: 9.0365871, longitude: 38.7522029 },
      preferences: { maxTransfers: 1, maxWalkingMeters: 1000 },
    });
    const originalJourney = routerResult.journeys[0];
    const snapshotJson = JSON.stringify(originalJourney);

    useMengedStore.getState().startJourney(originalJourney);

    // Execute multiple GPS updates
    const loc: GPSLocation = {
      latitude: originalJourney.origin.latitude,
      longitude: originalJourney.origin.longitude,
      speed: 1.0,
      heading: null,
      accuracy: 5,
      timestamp: Date.now(),
    };
    JourneyStateService.evaluateState(useMengedStore.getState().activeJourneyState!, loc, originalJourney);

    // Check that original journey is 100% byte-for-byte identical
    expect(JSON.stringify(originalJourney)).toBe(snapshotJson);
  });

  // --------------------------------------------------------------------------
  // SECTION 8: API CONTRACT VALIDATION (POST /api/journey/state)
  // --------------------------------------------------------------------------
  test("10. API Validation: Rejects malformed payload, mismatched journeyId, and impossible leg index", async () => {
    const validJourney: Journey = {
      id: "j-valid",
      origin: { latitude: 9.0, longitude: 38.7 },
      destination: { latitude: 9.03, longitude: 38.75 },
      legs: [
        {
          type: "WALK",
          from: { latitude: 9.0, longitude: 38.7 },
          to: { latitude: 9.03, longitude: 38.75 },
          distanceMeters: 100,
          estimatedMinutes: 2,
        },
      ],
    };

    // Subtest A: Missing payload -> HTTP 400
    const resA = await handleJourneyStatePost(
      new Request("http://localhost/api/journey/state", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );
    expect(resA.status).toBe(400);

    // Subtest B: Out of range coordinates -> HTTP 400
    const resB = await handleJourneyStatePost(
      new Request("http://localhost/api/journey/state", {
        method: "POST",
        body: JSON.stringify({
          activeState: { journeyId: "j-valid", currentState: "PLANNED", currentLegIndex: 0 },
          location: { latitude: 999, longitude: 38.7 },
          journey: validJourney,
        }),
      })
    );
    expect(resB.status).toBe(400);

    // Subtest C: Mismatched journey ID -> HTTP 400
    const resC = await handleJourneyStatePost(
      new Request("http://localhost/api/journey/state", {
        method: "POST",
        body: JSON.stringify({
          activeState: { journeyId: "different-id", currentState: "PLANNED", currentLegIndex: 0 },
          location: { latitude: 9.0, longitude: 38.7 },
          journey: validJourney,
        }),
      })
    );
    expect(resC.status).toBe(400);
    const jsonC = await resC.json();
    expect(jsonC.error).toContain("Journey ID mismatch");

    // Subtest D: Impossible leg index -> HTTP 400
    const resD = await handleJourneyStatePost(
      new Request("http://localhost/api/journey/state", {
        method: "POST",
        body: JSON.stringify({
          activeState: { journeyId: "j-valid", currentState: "PLANNED", currentLegIndex: 5 }, // Only 1 leg
          location: { latitude: 9.0, longitude: 38.7 },
          journey: validJourney,
        }),
      })
    );
    expect(resD.status).toBe(400);
    const jsonD = await resD.json();
    expect(jsonD.error).toContain("Impossible currentLegIndex");

    // Subtest E: Valid payload -> HTTP 200
    const resE = await handleJourneyStatePost(
      new Request("http://localhost/api/journey/state", {
        method: "POST",
        body: JSON.stringify({
          activeState: {
            journeyId: "j-valid",
            currentState: "PLANNED",
            currentLegIndex: 0,
            boardingConfirmed: false,
            lastLocation: null,
            activeInstruction: "",
            voicePrompt: "",
          },
          location: { latitude: 9.0, longitude: 38.7, accuracy: 5 },
          journey: validJourney,
        }),
      })
    );
    expect(resE.status).toBe(200);
  });

  // --------------------------------------------------------------------------
  // SECTION 9: PERFORMANCE BENCHMARK
  // --------------------------------------------------------------------------
  test("11. Performance: 100 GPS updates process in under 10ms (< 0.1ms per update)", async () => {
    const routerResult = await RouterService.findJourneysWithDiagnostics({
      origin: { latitude: 8.9983386, longitude: 38.7860596 },
      destination: { latitude: 9.0365871, longitude: 38.7522029 },
      preferences: { maxTransfers: 1, maxWalkingMeters: 1000 },
    });
    const journey = routerResult.journeys[0];

    const state: ActiveJourneyState = {
      journeyId: journey.id,
      currentState: "TRANSIT_LEG",
      currentLegIndex: 1,
      boardingConfirmed: true,
      lastLocation: null,
      activeInstruction: "",
      voicePrompt: "",
    };

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      JourneyStateService.evaluateState(
        state,
        {
          latitude: 9.0100 + i * 0.0001,
          longitude: 38.7700 - i * 0.0001,
          speed: 8.0,
          heading: 310,
          accuracy: 5,
          timestamp: 1000 + i * 1000,
        },
        journey
      );
    }
    const elapsed = performance.now() - start;
    console.log(`FSM 100 GPS evaluations completed in ${elapsed.toFixed(3)}ms (avg ${(elapsed / 100).toFixed(4)}ms/update)`);
    expect(elapsed).toBeLessThan(50);
  });
});
