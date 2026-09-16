import { describe, expect, test } from "bun:test";
import { RouterService } from "../router";
import { RouteRequest, TransitLeg } from "@/types/journey";

describe("RouterService Unit & Integration Tests", () => {
  test("Golden Corridor (Bole -> Piassa) derives Route 10410198 (AB009) with populated orderedStops", async () => {
    const request: RouteRequest = {
      origin: { latitude: 8.9983386, longitude: 38.7860596 },
      destination: { latitude: 9.0365871, longitude: 38.7522029 },
    };

    const journeys = await RouterService.findJourneys(request);
    expect(journeys.length).toBeGreaterThan(0);

    const topJourney = journeys[0];
    expect(topJourney.transfersCount).toBe(0);
    expect(topJourney.trust.transit).toBe("VERIFIED");

    const transitLeg = topJourney.legs.find((l) => l.type === "TRANSIT") as TransitLeg | undefined;
    expect(transitLeg).toBeDefined();
    if (transitLeg) {
      expect(transitLeg.routeId).toBe("10410198");
      expect(transitLeg.routeShortName).toBe("AB009");
      expect(transitLeg.boardingStop.name).toBe("Bole Medhanialem");
      expect(transitLeg.alightingStop.name).toBe("Piassa Arada");

      // Verify P0-01 directionality invariants
      expect(transitLeg.boardingSequence).toBeLessThan(transitLeg.alightingSequence);
      expect(transitLeg.orderedStops.length).toBeGreaterThan(0);
      expect(transitLeg.orderedStops[0].id).toBe(transitLeg.boardingStop.id);
      expect(transitLeg.orderedStops[transitLeg.orderedStops.length - 1].id).toBe(transitLeg.alightingStop.id);
    }
  }, 10000);

  test("1-Transfer Search (Bole -> Ayat Chefe) derives 1-transfer journey with verified sequences", async () => {
    const request: RouteRequest = {
      origin: { latitude: 8.9983386, longitude: 38.7860596 },
      destination: { latitude: 9.0212283, longitude: 38.8717948 },
      preferences: { maxTransfers: 1 },
    };

    const journeys = await RouterService.findJourneys(request);
    expect(journeys.length).toBeGreaterThan(0);

    const transferJourney = journeys.find((j) => j.transfersCount === 1);
    expect(transferJourney).toBeDefined();
    if (transferJourney) {
      expect(transferJourney.transfersCount).toBe(1);
      const legsTypes = transferJourney.legs.map((l) => l.type);
      expect(legsTypes).toEqual(["WALK", "TRANSIT", "TRANSFER", "TRANSIT", "WALK"]);

      const transitLegs = transferJourney.legs.filter((l) => l.type === "TRANSIT") as TransitLeg[];
      expect(transitLegs.length).toBe(2);

      // Verify sequence directionality on both transit legs
      for (const leg of transitLegs) {
        expect(leg.boardingSequence).toBeLessThan(leg.alightingSequence);
        expect(leg.orderedStops.length).toBeGreaterThan(0);
      }
    }
  }, 10000);

  test("Negative Case: Unserved location returns 0 direct routes without fabricating data", async () => {
    const request: RouteRequest = {
      origin: { latitude: 8.9983386, longitude: 38.7860596 },
      destination: { latitude: 9.06, longitude: 38.65 },
      preferences: { maxTransfers: 0 },
    };

    const journeys = await RouterService.findJourneys(request);
    expect(journeys.length).toBe(0);
  }, 10000);

  test("P0-01 Regression: Reverse-direction candidate where boarding sequence >= alighting sequence is strictly rejected", async () => {
    // Reverse direction request from Piassa Arada to Bole Medhanialem
    const reverseRequest: RouteRequest = {
      origin: { latitude: 9.0365871, longitude: 38.7522029 }, // Piassa
      destination: { latitude: 8.9983386, longitude: 38.7860596 }, // Bole
    };

    const journeys = await RouterService.findJourneys(reverseRequest);
    for (const j of journeys) {
      const transitLegs = j.legs.filter((l) => l.type === "TRANSIT") as TransitLeg[];
      for (const leg of transitLegs) {
        expect(leg.boardingSequence).toBeLessThan(leg.alightingSequence);
      }
    }
  }, 10000);

  test("Adversarial Input Matrix: Invalid, NaN, Infinity, out of range coordinates, and Origin=Destination return empty without throwing", async () => {
    // 1. NaN coordinates
    const nanReq: RouteRequest = {
      origin: { latitude: NaN, longitude: 38.786 },
      destination: { latitude: 9.036, longitude: 38.752 },
    };
    const nanRes = await RouterService.findJourneys(nanReq);
    expect(nanRes).toEqual([]);

    // 2. Infinity coordinates
    const infReq: RouteRequest = {
      origin: { latitude: 8.998, longitude: Infinity },
      destination: { latitude: 9.036, longitude: 38.752 },
    };
    const infRes = await RouterService.findJourneys(infReq);
    expect(infRes).toEqual([]);

    // 3. Out-of-range latitude (> 90)
    const outOfBoundsReq: RouteRequest = {
      origin: { latitude: 120.0, longitude: 38.786 },
      destination: { latitude: 9.036, longitude: 38.752 },
    };
    const outRes = await RouterService.findJourneys(outOfBoundsReq);
    expect(outRes).toEqual([]);

    // 4. Origin == Destination
    const sameLocReq: RouteRequest = {
      origin: { latitude: 8.9983386, longitude: 38.7860596 },
      destination: { latitude: 8.9983386, longitude: 38.7860596 },
    };
    const sameRes = await RouterService.findJourneys(sameLocReq);
    expect(sameRes).toEqual([]);
  }, 10000);

  test("Router Diagnostics Telemetry: Measures SQL query count and execution timings accurately", async () => {
    const request: RouteRequest = {
      origin: { latitude: 8.9983386, longitude: 38.7860596 },
      destination: { latitude: 9.0365871, longitude: 38.7522029 },
    };

    const { journeys, diagnostics } = await RouterService.findJourneysWithDiagnostics(request);
    expect(journeys.length).toBeGreaterThan(0);
    expect(diagnostics.serviceCalls).toBeGreaterThan(0);
    expect(diagnostics.sqlQueries).toBeGreaterThan(0);
    expect(diagnostics.totalRequestTimeMs).toBeGreaterThan(0);
    expect(diagnostics.candidateOriginStopsCount).toBeGreaterThan(0);
    expect(diagnostics.candidateDestStopsCount).toBeGreaterThan(0);
  }, 10000);
});
