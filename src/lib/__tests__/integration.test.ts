import { describe, test, expect } from "bun:test";
import { resolveLocationToCoordinates } from "@/lib/locationUtils";
import { mapJourneyToRouteOption } from "@/lib/journeyAdapter";
import { RouterService } from "@/services/router";

describe("Phase 4 Task 1 Integration Verification", () => {
  test("Resolves location names into WGS84 coordinates", () => {
    const bole = resolveLocationToCoordinates("Bole Medhanialem");
    const piassa = resolveLocationToCoordinates("Piassa Arada");
    const ayat = resolveLocationToCoordinates("Ayat Chefe");
    const invalid = resolveLocationToCoordinates("Unknown Nowhere Location 12345");

    expect(bole).not.toBeNull();
    expect(bole?.latitude).toBeCloseTo(8.9984, 3);
    expect(bole?.longitude).toBeCloseTo(38.7861, 3);

    expect(piassa).not.toBeNull();
    expect(piassa?.latitude).toBeCloseTo(9.0365, 3);

    expect(ayat).not.toBeNull();
    expect(ayat?.longitude).toBeCloseTo(38.8717, 3);

    expect(invalid).toBeNull();
  });

  test("Golden Corridor (Bole -> Piassa) returns real backend Journey and converts to RouteOption", async () => {
    const bole = resolveLocationToCoordinates("Bole Medhanialem")!;
    const piassa = resolveLocationToCoordinates("Piassa Arada")!;

    const journeys = await RouterService.findJourneys({
      origin: bole,
      destination: piassa,
      preferences: { maxWalkingMeters: 1000, maxTransfers: 1 },
    });

    expect(journeys.length).toBeGreaterThan(0);
    const j = journeys[0];

    const routeOption = mapJourneyToRouteOption(j);
    expect(routeOption.id).toBe(j.id);
    expect(routeOption.transfers).toBe(j.transfersCount);
    expect(routeOption.estimatedMinutes).toBe(j.estimatedDurationMinutes);
    expect(routeOption.trust?.transit).toBe("VERIFIED");
    expect(routeOption.trust?.fare).toBe("UNAVAILABLE");
    expect(routeOption.fareStatus).toBe("UNAVAILABLE");
    expect(routeOption.pathCoordinates.length).toBeGreaterThan(0);
    expect(routeOption.steps.length).toBeGreaterThan(0);
  });

  test("Transfer Journey (Bole -> Ayat Chefe) preserves multi-leg GTFS structure and steps", async () => {
    const bole = resolveLocationToCoordinates("Bole Medhanialem")!;
    const ayat = resolveLocationToCoordinates("Ayat Chefe")!;

    const journeys = await RouterService.findJourneys({
      origin: bole,
      destination: ayat,
      preferences: { maxWalkingMeters: 1000, maxTransfers: 1 },
    });

    expect(journeys.length).toBeGreaterThan(0);
    const j = journeys[0];

    const routeOption = mapJourneyToRouteOption(j);
    expect(routeOption.transfers).toBeGreaterThanOrEqual(1);
    expect(routeOption.steps.length).toBeGreaterThanOrEqual(3); // WALK + TRANSIT + TRANSFER/TRANSIT + WALK
    expect(routeOption.trust?.transit).toBe("VERIFIED");
  });
});
