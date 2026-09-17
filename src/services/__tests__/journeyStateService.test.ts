import { describe, expect, test } from "bun:test";
import { JourneyStateService } from "../journeyStateService";
import { ActiveJourneyState, GPSLocation } from "@/types/navigation";
import { Journey } from "@/types/journey";

const testJourneyFixture: Journey = {
  id: "journey_bole_piassa_test",
  origin: { latitude: 8.9983386, longitude: 38.7860596 },
  destination: { latitude: 9.0365871, longitude: 38.7522029 },
  totalWalkingMeters: 200,
  transfersCount: 0,
  estimatedDurationMinutes: 25,
  score: 30,
  trust: { transit: "VERIFIED", fare: "UNAVAILABLE", realtime: "UNAVAILABLE" },
  legs: [
    {
      type: "WALK",
      from: { name: "Origin", latitude: 8.9983386, longitude: 38.7860596 },
      to: { name: "Bole Medhanialem Stop", latitude: 8.9984, longitude: 38.7861, stopId: "node/7037142424" },
      distanceMeters: 20,
      estimatedMinutes: 1,
    },
    {
      type: "TRANSIT",
      routeId: "10410198",
      routeShortName: "AB009",
      routeLongName: "Piassa Arada ↔ Brass Clinic (Bole)",
      routeType: 3,
      boardingStop: { id: "node/7037142424", name: "Bole Medhanialem Stop", latitude: 8.9984, longitude: 38.7861 },
      alightingStop: { id: "node/7041071579", name: "Piassa Arada Stop", latitude: 9.0365, longitude: 38.7522 },
      boardingSequence: 2,
      alightingSequence: 6,
      stopsCount: 4,
      orderedStops: [],
    },
    {
      type: "WALK",
      from: { name: "Piassa Arada Stop", latitude: 9.0365, longitude: 38.7522, stopId: "node/7041071579" },
      to: { name: "Destination", latitude: 9.0365871, longitude: 38.7522029 },
      distanceMeters: 15,
      estimatedMinutes: 1,
    },
  ],
};

function createInitialState(): ActiveJourneyState {
  return {
    journeyId: testJourneyFixture.id,
    currentState: "PLANNED",
    currentLegIndex: 0,
    boardingConfirmed: false,
    lastLocation: null,
    activeInstruction: "Journey planned",
    voicePrompt: "Journey planned",
  };
}

describe("JourneyStateService FSM Transitions", () => {
  test("PLANNED -> WALKING_TO_STOP when navigation starts", () => {
    const initialState = createInitialState();
    const posStart: GPSLocation = { latitude: 8.9983386, longitude: 38.7860596, speed: 1.2, heading: null, accuracy: 5, timestamp: Date.now() };
    const res = JourneyStateService.evaluateState(initialState, posStart, testJourneyFixture);
    expect(res.nextState.currentState).toBe("WALKING_TO_STOP");
    expect(res.stateChanged).toBe(true);
  });

  test("WALKING_TO_STOP -> AT_STOP when within 35m of boarding stop", () => {
    let state: ActiveJourneyState = { ...createInitialState(), currentState: "WALKING_TO_STOP" };
    const posAtStop: GPSLocation = { latitude: 8.9984, longitude: 38.7861, speed: 0.5, heading: null, accuracy: 5, timestamp: Date.now() };
    const res = JourneyStateService.evaluateState(state, posAtStop, testJourneyFixture);
    expect(res.nextState.currentState).toBe("AT_STOP");
    expect(res.stateChanged).toBe(true);
  });

  test("AT_STOP without boarding confirmation MUST REMAIN AT_STOP", () => {
    const state: ActiveJourneyState = { ...createInitialState(), currentState: "AT_STOP" };
    const posAtStop: GPSLocation = { latitude: 8.9984, longitude: 38.7861, speed: 0.5, heading: null, accuracy: 5, timestamp: Date.now() };
    const res = JourneyStateService.evaluateState(state, posAtStop, testJourneyFixture);
    expect(res.nextState.currentState).toBe("AT_STOP");
    expect(res.stateChanged).toBe(false);
  });

  test("AT_STOP with boarding confirmation -> TRANSIT_LEG", () => {
    const state: ActiveJourneyState = { ...createInitialState(), currentState: "AT_STOP", boardingConfirmed: true };
    const posTransit: GPSLocation = { latitude: 9.0100, longitude: 38.7700, speed: 6.5, heading: 300, accuracy: 5, timestamp: Date.now() };
    const res = JourneyStateService.evaluateState(state, posTransit, testJourneyFixture);
    expect(res.nextState.currentState).toBe("TRANSIT_LEG");
    expect(res.stateChanged).toBe(true);
  });

  test("TRANSIT_LEG -> APPROACHING_ALIGHTING_STOP when within 120m of alighting stop", () => {
    const state: ActiveJourneyState = { ...createInitialState(), currentState: "TRANSIT_LEG", currentLegIndex: 1, boardingConfirmed: true };
    const posApproaching: GPSLocation = { latitude: 9.0358, longitude: 38.7525, speed: 5.0, heading: 320, accuracy: 5, timestamp: Date.now() };
    const res = JourneyStateService.evaluateState(state, posApproaching, testJourneyFixture);
    expect(res.nextState.currentState).toBe("APPROACHING_ALIGHTING_STOP");
    expect(res.stateChanged).toBe(true);
  });

  test("APPROACHING_ALIGHTING_STOP -> ALIGHTED when within 30m of alighting stop", () => {
    const state: ActiveJourneyState = { ...createInitialState(), currentState: "APPROACHING_ALIGHTING_STOP", currentLegIndex: 1 };
    const posAlighted: GPSLocation = { latitude: 9.0365, longitude: 38.7522, speed: 1.0, heading: null, accuracy: 5, timestamp: Date.now() };
    const res = JourneyStateService.evaluateState(state, posAlighted, testJourneyFixture);
    expect(res.nextState.currentState).toBe("ALIGHTED");
    expect(res.stateChanged).toBe(true);
  });

  test("WALKING_TO_DESTINATION -> ARRIVED when within 25m of destination", () => {
    const state: ActiveJourneyState = { ...createInitialState(), currentState: "WALKING_TO_DESTINATION", currentLegIndex: 2 };
    const posArrived: GPSLocation = { latitude: 9.0365871, longitude: 38.7522029, speed: 0.0, heading: null, accuracy: 5, timestamp: Date.now() };
    const res = JourneyStateService.evaluateState(state, posArrived, testJourneyFixture);
    expect(res.nextState.currentState).toBe("ARRIVED");
    expect(res.stateChanged).toBe(true);
  });

  test("ARRIVED state remains stable on further GPS updates", () => {
    const state: ActiveJourneyState = { ...createInitialState(), currentState: "ARRIVED", currentLegIndex: 2 };
    const posAfter: GPSLocation = { latitude: 9.0366, longitude: 38.7523, speed: 0.5, heading: null, accuracy: 5, timestamp: Date.now() };
    const res = JourneyStateService.evaluateState(state, posAfter, testJourneyFixture);
    expect(res.nextState.currentState).toBe("ARRIVED");
    expect(res.stateChanged).toBe(false);
  });

  test("P0-02 Multi-leg FSM: Sequentially progresses through 5 legs [WALK, TRANSIT, TRANSFER, TRANSIT, WALK] with index tracking and boarding reset", () => {
    const multiLegFixture: Journey = {
      id: "journey_multileg_5_legs_test",
      origin: { latitude: 8.9983, longitude: 38.7860 },
      destination: { latitude: 9.0212, longitude: 38.8717 },
      totalWalkingMeters: 400,
      transfersCount: 1,
      estimatedDurationMinutes: 45,
      score: 50,
      trust: { transit: "VERIFIED", fare: "UNAVAILABLE", realtime: "UNAVAILABLE" },
      legs: [
        {
          type: "WALK",
          from: { name: "Origin", latitude: 8.9983, longitude: 38.7860 },
          to: { name: "Stop A1", latitude: 8.9984, longitude: 38.7861, stopId: "stop_a1" },
          distanceMeters: 20,
          estimatedMinutes: 1,
        },
        {
          type: "TRANSIT",
          routeId: "route_1",
          routeShortName: "R1",
          routeLongName: "Route 1",
          routeType: 3,
          boardingStop: { id: "stop_a1", name: "Stop A1", latitude: 8.9984, longitude: 38.7861 },
          alightingStop: { id: "stop_b1", name: "Stop B1", latitude: 9.0100, longitude: 38.8000 },
          boardingSequence: 1,
          alightingSequence: 5,
          stopsCount: 4,
          orderedStops: [],
        },
        {
          type: "TRANSFER",
          fromStop: { id: "stop_b1", name: "Stop B1", latitude: 9.0100, longitude: 38.8000 },
          toStop: { id: "stop_b2", name: "Stop B2", latitude: 9.0105, longitude: 38.8005 },
          distanceMeters: 60,
          estimatedMinutes: 2,
        },
        {
          type: "TRANSIT",
          routeId: "route_2",
          routeShortName: "R2",
          routeLongName: "Route 2",
          routeType: 3,
          boardingStop: { id: "stop_b2", name: "Stop B2", latitude: 9.0105, longitude: 38.8005 },
          alightingStop: { id: "stop_c1", name: "Stop C1", latitude: 9.0210, longitude: 38.8715 },
          boardingSequence: 1,
          alightingSequence: 8,
          stopsCount: 7,
          orderedStops: [],
        },
        {
          type: "WALK",
          from: { name: "Stop C1", latitude: 9.0210, longitude: 38.8715, stopId: "stop_c1" },
          to: { name: "Destination", latitude: 9.0212, longitude: 38.8717 },
          distanceMeters: 30,
          estimatedMinutes: 1,
        },
      ],
    };

    let state: ActiveJourneyState = {
      journeyId: multiLegFixture.id,
      currentState: "PLANNED",
      currentLegIndex: 0,
      boardingConfirmed: false,
      lastLocation: null,
      activeInstruction: "Planned",
      voicePrompt: "Planned",
    };

    // Step 1: PLANNED -> WALKING_TO_STOP (Leg 0)
    let res = JourneyStateService.evaluateState(state, { latitude: 8.9983, longitude: 38.7860, speed: 1.0, heading: null, accuracy: 5, timestamp: Date.now() }, multiLegFixture);
    state = res.nextState;
    expect(state.currentState).toBe("WALKING_TO_STOP");
    expect(state.currentLegIndex).toBe(0);

    // Step 2: WALKING_TO_STOP -> AT_STOP (Boarding Stop A1)
    res = JourneyStateService.evaluateState(state, { latitude: 8.9984, longitude: 38.7861, speed: 0.1, heading: null, accuracy: 5, timestamp: Date.now() }, multiLegFixture);
    state = res.nextState;
    expect(state.currentState).toBe("AT_STOP");
    expect(state.boardingConfirmed).toBe(false);

    // Step 3: Boarding confirmed -> TRANSIT_LEG #1 (Leg 1)
    state.boardingConfirmed = true;
    res = JourneyStateService.evaluateState(state, { latitude: 9.0000, longitude: 38.7900, speed: 8.0, heading: null, accuracy: 5, timestamp: Date.now() }, multiLegFixture);
    state = res.nextState;
    expect(state.currentState).toBe("TRANSIT_LEG");
    expect(state.currentLegIndex).toBe(1);

    // Step 4: Approaching Alighting Stop B1 -> APPROACHING_ALIGHTING_STOP
    res = JourneyStateService.evaluateState(state, { latitude: 9.0095, longitude: 38.7995, speed: 5.0, heading: null, accuracy: 5, timestamp: Date.now() }, multiLegFixture);
    state = res.nextState;
    expect(state.currentState).toBe("APPROACHING_ALIGHTING_STOP");

    // Step 5: Alighted at B1 -> ALIGHTED (Advances currentLegIndex to 2, TRANSFER)
    res = JourneyStateService.evaluateState(state, { latitude: 9.0100, longitude: 38.8000, speed: 0.5, heading: null, accuracy: 5, timestamp: Date.now() }, multiLegFixture);
    state = res.nextState;
    expect(state.currentState).toBe("ALIGHTED");
    expect(state.currentLegIndex).toBe(2);

    // Step 6: Transition from ALIGHTED -> WALKING_TO_STOP (Targeting Stop B2 for Leg 3, resetting boardingConfirmed)
    res = JourneyStateService.evaluateState(state, { latitude: 9.0101, longitude: 38.8001, speed: 1.1, heading: null, accuracy: 5, timestamp: Date.now() }, multiLegFixture);
    state = res.nextState;
    expect(state.currentState).toBe("WALKING_TO_STOP");
    expect(state.currentLegIndex).toBe(2);
    expect(state.boardingConfirmed).toBe(false); // Boarding confirmation reset to false

    // Step 7: Arrive at Stop B2 -> AT_STOP
    res = JourneyStateService.evaluateState(state, { latitude: 9.0105, longitude: 38.8005, speed: 0.2, heading: null, accuracy: 5, timestamp: Date.now() }, multiLegFixture);
    state = res.nextState;
    expect(state.currentState).toBe("AT_STOP");
    expect(state.boardingConfirmed).toBe(false);

    // Step 8: Confirm boarding for Leg 3 (TRANSIT #2) -> TRANSIT_LEG (Leg 3)
    state.boardingConfirmed = true;
    res = JourneyStateService.evaluateState(state, { latitude: 9.0150, longitude: 38.8300, speed: 9.0, heading: null, accuracy: 5, timestamp: Date.now() }, multiLegFixture);
    state = res.nextState;
    expect(state.currentState).toBe("TRANSIT_LEG");
    expect(state.currentLegIndex).toBe(3);

    // Step 9: Approach Stop C1 -> APPROACHING_ALIGHTING_STOP
    res = JourneyStateService.evaluateState(state, { latitude: 9.0205, longitude: 38.8710, speed: 4.0, heading: null, accuracy: 5, timestamp: Date.now() }, multiLegFixture);
    state = res.nextState;
    expect(state.currentState).toBe("APPROACHING_ALIGHTING_STOP");

    // Step 10: Alight at Stop C1 -> ALIGHTED (Advances currentLegIndex to 4, final WALK)
    res = JourneyStateService.evaluateState(state, { latitude: 9.0210, longitude: 38.8715, speed: 0.5, heading: null, accuracy: 5, timestamp: Date.now() }, multiLegFixture);
    state = res.nextState;
    expect(state.currentState).toBe("ALIGHTED");
    expect(state.currentLegIndex).toBe(4);

    // Step 11: Transition from ALIGHTED -> WALKING_TO_DESTINATION
    res = JourneyStateService.evaluateState(state, { latitude: 9.0211, longitude: 38.8716, speed: 1.2, heading: null, accuracy: 5, timestamp: Date.now() }, multiLegFixture);
    state = res.nextState;
    expect(state.currentState).toBe("WALKING_TO_DESTINATION");
    expect(state.currentLegIndex).toBe(4);

    // Step 12: Arrive at destination -> ARRIVED
    res = JourneyStateService.evaluateState(state, { latitude: 9.0212, longitude: 38.8717, speed: 0.0, heading: null, accuracy: 5, timestamp: Date.now() }, multiLegFixture);
    state = res.nextState;
    expect(state.currentState).toBe("ARRIVED");
    expect(state.currentLegIndex).toBe(4);
  });

  test("Scenario 3 & 4: Early boarding confirmation while WALKING_TO_STOP is preserved upon reaching AT_STOP and when moving away", () => {
    let state: ActiveJourneyState = {
      ...createInitialState(),
      currentState: "WALKING_TO_STOP",
      boardingConfirmed: true, // User confirms early while walking
    };
    // 1. Move far away (100m away from boarding stop)
    const posFar: GPSLocation = { latitude: 8.9990, longitude: 38.7870, speed: 1.2, heading: null, accuracy: 5, timestamp: Date.now() };
    let res = JourneyStateService.evaluateState(state, posFar, testJourneyFixture);
    expect(res.nextState.currentState).toBe("WALKING_TO_STOP");
    expect(res.nextState.boardingConfirmed).toBe(true); // Confirmation preserved

    // 2. Arrive at stop (within 35m)
    const posAtStop: GPSLocation = { latitude: 8.9984, longitude: 38.7861, speed: 0.2, heading: null, accuracy: 5, timestamp: Date.now() };
    res = JourneyStateService.evaluateState(res.nextState, posAtStop, testJourneyFixture);
    expect(res.nextState.currentState).toBe("AT_STOP");
    expect(res.nextState.boardingConfirmed).toBe(true); // MUST NOT be reset to false!

    // 3. Next tick while AT_STOP + boardingConfirmed=true -> TRANSIT_LEG
    res = JourneyStateService.evaluateState(res.nextState, posAtStop, testJourneyFixture);
    expect(res.nextState.currentState).toBe("TRANSIT_LEG");
  });

  test("Scenario 4b: Moving away from stop while AT_STOP without confirmation transitions back to WALKING_TO_STOP", () => {
    const state: ActiveJourneyState = {
      ...createInitialState(),
      currentState: "AT_STOP",
      boardingConfirmed: false,
    };
    const posAway: GPSLocation = { latitude: 8.9999, longitude: 38.7880, speed: 1.5, heading: null, accuracy: 5, timestamp: Date.now() };
    const res = JourneyStateService.evaluateState(state, posAway, testJourneyFixture);
    expect(res.nextState.currentState).toBe("WALKING_TO_STOP");
    expect(res.stateChanged).toBe(true);
  });

  test("Scenario 9 & 10 & 11: Edge cases - Invalid leg index, missing leg, and malformed inputs", () => {
    const stateWithNegativeIndex: ActiveJourneyState = {
      ...createInitialState(),
      currentLegIndex: -5,
    };
    const pos: GPSLocation = { latitude: 8.9983, longitude: 38.7860, speed: 1.0, heading: null, accuracy: 5, timestamp: Date.now() };
    const res = JourneyStateService.evaluateState(stateWithNegativeIndex, pos, testJourneyFixture);
    expect(res.nextState.currentLegIndex).toBe(0);

    const stateWithOutOfBoundsIndex: ActiveJourneyState = {
      ...createInitialState(),
      currentState: "WALKING_TO_STOP",
      currentLegIndex: 99,
    };
    const resBounds = JourneyStateService.evaluateState(stateWithOutOfBoundsIndex, pos, testJourneyFixture);
    expect(resBounds.nextState.currentLegIndex).toBe(testJourneyFixture.legs.length - 1);

    expect(() => {
      JourneyStateService.evaluateState(null as any, pos, testJourneyFixture);
    }).toThrow("Invalid activeState");

    expect(() => {
      JourneyStateService.evaluateState(createInitialState(), pos, null as any);
    }).toThrow("Invalid journey");
  });

  test("Finding 3 Regression: GPS jump past 120m threshold up to 300m does NOT trap user in TRANSIT_LEG", () => {
    const stateInTransit: ActiveJourneyState = {
      ...createInitialState(),
      currentState: "TRANSIT_LEG",
      currentLegIndex: 1,
      boardingConfirmed: true,
    };

    // Alighting stop is at (9.0365, 38.7522).
    // GPS update jumps to 150m past alighting stop towards destination (9.0368, 38.7520).
    const posJumpedPast: GPSLocation = {
      latitude: 9.0368,
      longitude: 38.7520,
      speed: 6.0,
      heading: 320,
      accuracy: 5,
      timestamp: Date.now(),
    };

    const res = JourneyStateService.evaluateState(stateInTransit, posJumpedPast, testJourneyFixture);
    expect(res.nextState.currentState).toBe("APPROACHING_ALIGHTING_STOP");
    expect(res.stateChanged).toBe(true);

    // Next tick advances to ALIGHTED
    const res2 = JourneyStateService.evaluateState(res.nextState, posJumpedPast, testJourneyFixture);
    expect(res2.nextState.currentState).toBe("ALIGHTED");
    expect(res2.stateChanged).toBe(true);
  });

  test("Finding 3 Regression: Normal GPS jitter at 500m before stop does NOT falsely trigger alighting", () => {
    const stateInTransit: ActiveJourneyState = {
      ...createInitialState(),
      currentState: "TRANSIT_LEG",
      currentLegIndex: 1,
      boardingConfirmed: true,
    };

    // GPS location 500m away from alighting stop
    const posJitter: GPSLocation = {
      latitude: 9.0320,
      longitude: 38.7550,
      speed: 8.0,
      heading: 300,
      accuracy: 15,
      timestamp: Date.now(),
    };

    const res = JourneyStateService.evaluateState(stateInTransit, posJitter, testJourneyFixture);
    expect(res.nextState.currentState).toBe("TRANSIT_LEG");
    expect(res.stateChanged).toBe(false);
  });
});
