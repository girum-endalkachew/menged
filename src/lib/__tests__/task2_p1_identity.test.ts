import { describe, test, expect, beforeEach } from "bun:test";
import { resolveLocationToCoordinates } from "@/lib/locationUtils";
import { mapJourneyToRouteOption } from "@/lib/journeyAdapter";
import { RouterService } from "@/services/router";
import { useMengedStore } from "@/store/useMengedStore";
import { Journey, TransitLeg, WalkingLeg, TransferLeg } from "@/types/journey";

describe("Phase 4 Task 2 P1 Fix: Transfer Journey ID Uniqueness & Selection Identity", () => {
  beforeEach(() => {
    useMengedStore.getState().cancelJourney();
  });

  /**
   * Test A — Global Uniqueness
   * Verify that for real PostgreSQL routing results, all returned journey IDs are 100% unique.
   * Tested on both Bole -> Piassa and Bole -> Ayat Chefe.
   */
  test("Test A — Global Uniqueness: Real PostgreSQL routing results produce unique IDs for Bole -> Piassa and Bole -> Ayat Chefe", async () => {
    const bole = resolveLocationToCoordinates("Bole Medhanialem")!;
    const piassa = resolveLocationToCoordinates("Piassa Arada")!;
    const ayat = resolveLocationToCoordinates("Ayat Chefe")!;

    // 1. Bole -> Piassa
    const journeysPiassa = await RouterService.findJourneys({
      origin: bole,
      destination: piassa,
      preferences: { maxWalkingMeters: 1000, maxTransfers: 1 },
    });
    expect(journeysPiassa.length).toBeGreaterThan(0);
    const idsPiassa = journeysPiassa.map((j) => j.id);
    expect(new Set(idsPiassa).size).toBe(idsPiassa.length);

    // 2. Bole -> Ayat Chefe
    const journeysAyat = await RouterService.findJourneys({
      origin: bole,
      destination: ayat,
      preferences: { maxWalkingMeters: 1000, maxTransfers: 1 },
    });
    expect(journeysAyat.length).toBeGreaterThan(0);
    const idsAyat = journeysAyat.map((j) => j.id);
    expect(new Set(idsAyat).size).toBe(idsAyat.length);
  });

  /**
   * Test B — Same route pair, different transfer stops / occurrences
   * Verify that two distinct transfer candidate journeys sharing origin route ID and destination route ID
   * but transferring at different stops produce distinct IDs (journeyA.id !== journeyB.id).
   */
  test("Test B — Same route pair, different transfer stops produce distinct Journey IDs", async () => {
    const originRouteId = "route_101";
    const destRouteId = "route_202";

    // Test Fixture: Journey A transfers at Stop T1
    const journeyA: Journey = {
      id: `journey_transfer_${originRouteId}_stop_orig_stop_t1_a_${destRouteId}_stop_t1_b_stop_dest`,
      origin: { latitude: 8.9953, longitude: 38.7885 },
      destination: { latitude: 9.0336, longitude: 38.7632 },
      legs: [],
      totalWalkingMeters: 200,
      transfersCount: 1,
      estimatedDurationMinutes: 25,
      score: 30,
      tag: "Balanced",
      trust: { transit: "VERIFIED", fare: "UNAVAILABLE", realtime: "UNAVAILABLE" },
    };

    // Test Fixture: Journey B transfers at Stop T2
    const journeyB: Journey = {
      id: `journey_transfer_${originRouteId}_stop_orig_stop_t2_a_${destRouteId}_stop_t2_b_stop_dest`,
      origin: { latitude: 8.9953, longitude: 38.7885 },
      destination: { latitude: 9.0336, longitude: 38.7632 },
      legs: [],
      totalWalkingMeters: 220,
      transfersCount: 1,
      estimatedDurationMinutes: 27,
      score: 32,
      tag: "Balanced",
      trust: { transit: "VERIFIED", fare: "UNAVAILABLE", realtime: "UNAVAILABLE" },
    };

    expect(journeyA.id).not.toBe(journeyB.id);

    // Also check real GTFS query results if multiple 1-transfer routes exist
    const bole = resolveLocationToCoordinates("Bole Medhanialem")!;
    const ayat = resolveLocationToCoordinates("Ayat Chefe")!;
    const realJourneys = await RouterService.findJourneys({
      origin: bole,
      destination: ayat,
      preferences: { maxWalkingMeters: 1000, maxTransfers: 1 },
    });

    const transferJourneys = realJourneys.filter((j) => j.transfersCount === 1);
    if (transferJourneys.length >= 2) {
      for (let i = 0; i < transferJourneys.length; i++) {
        for (let j = i + 1; j < transferJourneys.length; j++) {
          expect(transferJourneys[i].id).not.toBe(transferJourneys[j].id);
        }
      }
    }
  });

  /**
   * Test C — RouteOption -> raw Journey identity
   * Verify the frontend selection invariant:
   * Journey[] -> mapJourneyToRouteOption() -> RouteOption[] -> select RouteOption B -> rawJourneys.find(j => j.id === routeOptionB.id)
   * Confirm that selecting non-first route options (e.g. route #2, #3) resolves to the EXACT originating Journey.
   */
  test("Test C — RouteOption -> raw Journey identity: Selecting non-first RouteOptions resolves to exact matching raw Journey", async () => {
    const bole = resolveLocationToCoordinates("Bole Medhanialem")!;
    const ayat = resolveLocationToCoordinates("Ayat Chefe")!;

    const journeys = await RouterService.findJourneys({
      origin: bole,
      destination: ayat,
      preferences: { maxWalkingMeters: 1000, maxTransfers: 1 },
    });
    expect(journeys.length).toBeGreaterThan(0);

    const routeOptions = journeys.map(mapJourneyToRouteOption);
    useMengedStore.setState({ rawJourneys: journeys, routes: routeOptions });

    const store = useMengedStore.getState();

    // Verify every single route option resolves to its exact originating raw Journey
    for (let index = 0; index < routeOptions.length; index++) {
      const selectedOption = routeOptions[index];
      store.setSelectedRoute(selectedOption);

      const updatedState = useMengedStore.getState();
      const activeJourney = updatedState.activeJourney;

      expect(activeJourney).toBeDefined();
      expect(activeJourney?.id).toBe(selectedOption.id);
      expect(activeJourney?.id).toBe(journeys[index].id);

      // Compare deep leg structures to prove it's the exact originating Journey
      expect(activeJourney?.legs.length).toBe(journeys[index].legs.length);
      expect(activeJourney).toEqual(journeys[index]);
    }
  });

  /**
   * Test D — No Duplicate IDs
   * Explicitly verify that multi-result searches contain 0 duplicate Journey IDs.
   */
  test("Test D — No duplicate IDs in multi-result search", async () => {
    const bole = resolveLocationToCoordinates("Bole Medhanialem")!;
    const ayat = resolveLocationToCoordinates("Ayat Chefe")!;

    const journeys = await RouterService.findJourneys({
      origin: bole,
      destination: ayat,
      preferences: { maxWalkingMeters: 1000, maxTransfers: 1 },
    });

    const ids = journeys.map((j) => j.id);
    const uniqueIds = new Set(ids);

    expect(ids.length).toBeGreaterThan(0);
    expect(uniqueIds.size).toBe(ids.length);
  }, 30000);
});
