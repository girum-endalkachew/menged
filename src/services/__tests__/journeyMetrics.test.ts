import { describe, test, expect } from "bun:test";
import { Journey, Coordinate } from "@/types/journey";
import { JourneyMetricsService } from "../journeyMetrics";
import { RouterService } from "../router";

describe("JourneyMetricsService Unit & Integration Tests", () => {
  // Coordinate helpers for Addis Ababa region (~9°N, 38.75°E)
  const ORIGIN_A: Coordinate = { latitude: 9.0000, longitude: 38.7500 };
  const STOP_B: Coordinate = { latitude: 9.0100, longitude: 38.7500 };
  const DEST_C: Coordinate = { latitude: 9.0200, longitude: 38.7500 };

  test("CASE A — Directly toward destination", () => {
    const journey: Journey = {
      id: "case_a_direct",
      origin: ORIGIN_A,
      destination: DEST_C,
      totalWalkingMeters: 100,
      transfersCount: 0,
      estimatedDurationMinutes: 15,
      score: 50,
      trust: { transit: "VERIFIED", fare: "UNAVAILABLE", realtime: "UNAVAILABLE" },
      legs: [
        {
          type: "WALK",
          from: { name: "Origin A", ...ORIGIN_A },
          to: { name: "Boarding A", ...ORIGIN_A },
          distanceMeters: 50,
          estimatedMinutes: 1,
        },
        {
          type: "TRANSIT",
          routeId: "R1",
          routeShortName: "AB001",
          routeLongName: "Line 1",
          routeType: 3,
          boardingStop: { id: "sA", name: "Stop A", ...ORIGIN_A },
          alightingStop: { id: "sC", name: "Stop C", ...DEST_C },
          boardingSequence: 1,
          alightingSequence: 3,
          stopsCount: 3,
          orderedStops: [
            { id: "sA", name: "Stop A", stopSequence: 1, ...ORIGIN_A },
            { id: "sB", name: "Stop B", stopSequence: 2, ...STOP_B },
            { id: "sC", name: "Stop C", stopSequence: 3, ...DEST_C },
          ],
        },
        {
          type: "WALK",
          from: { name: "Alighting C", ...DEST_C },
          to: { name: "Dest C", ...DEST_C },
          distanceMeters: 50,
          estimatedMinutes: 1,
        },
      ],
    };

    const metrics = JourneyMetricsService.calculateMetrics(journey);

    expect(metrics.totalWalkingMeters).toBe(100);
    expect(metrics.transfersCount).toBe(0);
    expect(metrics.transitLegsCount).toBe(1);
    expect(metrics.totalBacktrackingMeters).toBeLessThan(0.1);
    expect(metrics.initialDirectionAlignment).toBeGreaterThan(0.99);
    expect(metrics.destinationProgressRatio).toBeGreaterThan(0.95);
    expect(Number.isFinite(metrics.journeyGeometryDistanceMeters)).toBeTrue();
  });

  test("CASE B — Temporary small detour", () => {
    // Stop B is slightly offset east (detour) before heading to C
    const DETOUR_B: Coordinate = { latitude: 9.0080, longitude: 38.7530 };

    const journey: Journey = {
      id: "case_b_small_detour",
      origin: ORIGIN_A,
      destination: DEST_C,
      totalWalkingMeters: 100,
      transfersCount: 0,
      estimatedDurationMinutes: 18,
      score: 60,
      trust: { transit: "VERIFIED", fare: "UNAVAILABLE", realtime: "UNAVAILABLE" },
      legs: [
        {
          type: "TRANSIT",
          routeId: "R1",
          routeShortName: "AB001",
          routeLongName: "Line 1",
          routeType: 3,
          boardingStop: { id: "sA", name: "Stop A", ...ORIGIN_A },
          alightingStop: { id: "sC", name: "Stop C", ...DEST_C },
          boardingSequence: 1,
          alightingSequence: 3,
          stopsCount: 3,
          orderedStops: [
            { id: "sA", name: "Stop A", stopSequence: 1, ...ORIGIN_A },
            { id: "sB", name: "Stop B (Detour)", stopSequence: 2, ...DETOUR_B },
            { id: "sC", name: "Stop C", stopSequence: 3, ...DEST_C },
          ],
        },
      ],
    };

    const metrics = JourneyMetricsService.calculateMetrics(journey);

    expect(metrics.totalBacktrackingMeters).toBeGreaterThanOrEqual(0);
    expect(metrics.destinationProgressRatio).toBeLessThan(1.0);
    expect(metrics.destinationProgressRatio).toBeGreaterThan(0.85); // Still sensible progress
    expect(Number.isFinite(metrics.initialDirectionAlignment)).toBeTrue();
  });

  test("CASE C — Obvious backtrack", () => {
    // Stop X goes SOUTH (away from Destination C which is NORTH)
    const STOP_X_SOUTH: Coordinate = { latitude: 8.9800, longitude: 38.7500 };

    const journeyBacktrack: Journey = {
      id: "case_c_backtrack",
      origin: ORIGIN_A,
      destination: DEST_C,
      totalWalkingMeters: 100,
      transfersCount: 0,
      estimatedDurationMinutes: 30,
      score: 120,
      trust: { transit: "VERIFIED", fare: "UNAVAILABLE", realtime: "UNAVAILABLE" },
      legs: [
        {
          type: "TRANSIT",
          routeId: "R2",
          routeShortName: "AB002",
          routeLongName: "Backtrack Line",
          routeType: 3,
          boardingStop: { id: "sA", name: "Stop A", ...ORIGIN_A },
          alightingStop: { id: "sC", name: "Stop C", ...DEST_C },
          boardingSequence: 1,
          alightingSequence: 3,
          stopsCount: 3,
          orderedStops: [
            { id: "sA", name: "Stop A", stopSequence: 1, ...ORIGIN_A },
            { id: "sX", name: "Stop X (South)", stopSequence: 2, ...STOP_X_SOUTH },
            { id: "sC", name: "Stop C", stopSequence: 3, ...DEST_C },
          ],
        },
      ],
    };

    const metrics = JourneyMetricsService.calculateMetrics(journeyBacktrack);

    // Origin to X goes 2.2km south away from Dest C
    expect(metrics.totalBacktrackingMeters).toBeGreaterThan(2000);
    expect(metrics.destinationProgressRatio).toBeLessThan(0.60);
  });

  test("CASE D — Transfer journey geometry combining", () => {
    const TRANSFER_STOP_1: Coordinate = { latitude: 9.0100, longitude: 38.7500 };
    const TRANSFER_STOP_2: Coordinate = { latitude: 9.0105, longitude: 38.7500 };

    const transferJourney: Journey = {
      id: "case_d_transfer",
      origin: ORIGIN_A,
      destination: DEST_C,
      totalWalkingMeters: 250,
      transfersCount: 1,
      estimatedDurationMinutes: 25,
      score: 80,
      trust: { transit: "VERIFIED", fare: "UNAVAILABLE", realtime: "UNAVAILABLE" },
      legs: [
        {
          type: "WALK",
          from: { name: "Origin", ...ORIGIN_A },
          to: { name: "Stop A", ...ORIGIN_A },
          distanceMeters: 100,
          estimatedMinutes: 2,
        },
        {
          type: "TRANSIT",
          routeId: "R1",
          routeShortName: "AB001",
          routeLongName: "Leg 1",
          routeType: 3,
          boardingStop: { id: "sA", name: "Stop A", ...ORIGIN_A },
          alightingStop: { id: "sT1", name: "Transfer Stop 1", ...TRANSFER_STOP_1 },
          boardingSequence: 1,
          alightingSequence: 2,
          stopsCount: 2,
          orderedStops: [
            { id: "sA", name: "Stop A", stopSequence: 1, ...ORIGIN_A },
            { id: "sT1", name: "Transfer Stop 1", stopSequence: 2, ...TRANSFER_STOP_1 },
          ],
        },
        {
          type: "TRANSFER",
          fromStop: { id: "sT1", name: "Transfer Stop 1", ...TRANSFER_STOP_1 },
          toStop: { id: "sT2", name: "Transfer Stop 2", ...TRANSFER_STOP_2 },
          distanceMeters: 50,
          estimatedMinutes: 1,
        },
        {
          type: "TRANSIT",
          routeId: "R2",
          routeShortName: "SH002",
          routeLongName: "Leg 2",
          routeType: 3,
          boardingStop: { id: "sT2", name: "Transfer Stop 2", ...TRANSFER_STOP_2 },
          alightingStop: { id: "sC", name: "Stop C", ...DEST_C },
          boardingSequence: 1,
          alightingSequence: 2,
          stopsCount: 2,
          orderedStops: [
            { id: "sT2", name: "Transfer Stop 2", stopSequence: 1, ...TRANSFER_STOP_2 },
            { id: "sC", name: "Stop C", stopSequence: 2, ...DEST_C },
          ],
        },
        {
          type: "WALK",
          from: { name: "Stop C", ...DEST_C },
          to: { name: "Dest C", ...DEST_C },
          distanceMeters: 100,
          estimatedMinutes: 2,
        },
      ],
    };

    const metrics = JourneyMetricsService.calculateMetrics(transferJourney);

    expect(metrics.transfersCount).toBe(1);
    expect(metrics.transitLegsCount).toBe(2);
    expect(metrics.totalWalkingMeters).toBe(250);
    expect(metrics.walkingBeforeFirstTransitMeters).toBe(100);
    expect(metrics.walkingAfterLastTransitMeters).toBe(100);
    expect(metrics.journeyGeometryDistanceMeters).toBeGreaterThan(metrics.transitDistanceMeters);
  });

  test("CASE E — Curved path (smooth progression, no false backtracking)", () => {
    // Arc curving gently northeast to reach destination north
    const P1: Coordinate = { latitude: 9.0030, longitude: 38.7520 };
    const P2: Coordinate = { latitude: 9.0080, longitude: 38.7530 };
    const P3: Coordinate = { latitude: 9.0140, longitude: 38.7520 };

    const curvedJourney: Journey = {
      id: "case_e_curved",
      origin: ORIGIN_A,
      destination: DEST_C,
      totalWalkingMeters: 0,
      transfersCount: 0,
      estimatedDurationMinutes: 20,
      score: 55,
      trust: { transit: "VERIFIED", fare: "UNAVAILABLE", realtime: "UNAVAILABLE" },
      legs: [
        {
          type: "TRANSIT",
          routeId: "R_CURVE",
          routeShortName: "AB_CURVE",
          routeLongName: "Curved Line",
          routeType: 3,
          boardingStop: { id: "sA", name: "Stop A", ...ORIGIN_A },
          alightingStop: { id: "sC", name: "Stop C", ...DEST_C },
          boardingSequence: 1,
          alightingSequence: 5,
          stopsCount: 5,
          orderedStops: [
            { id: "sA", name: "Stop A", stopSequence: 1, ...ORIGIN_A },
            { id: "sP1", name: "Stop 1", stopSequence: 2, ...P1 },
            { id: "sP2", name: "Stop 2", stopSequence: 3, ...P2 },
            { id: "sP3", name: "Stop 3", stopSequence: 4, ...P3 },
            { id: "sC", name: "Stop C", stopSequence: 5, ...DEST_C },
          ],
        },
      ],
    };

    const metrics = JourneyMetricsService.calculateMetrics(curvedJourney);

    // Each step gets closer to DEST_C (north), so total backtracking should be 0
    expect(metrics.totalBacktrackingMeters).toBeLessThan(0.1);
    expect(metrics.destinationProgressRatio).toBeGreaterThan(0.90);
  });

  test("CASE F — Real GTFS Bole -> Piassa Router Output Metrics", async () => {
    const origin = { latitude: 8.9983386, longitude: 38.7860596 };
    const destination = { latitude: 9.0365871, longitude: 38.7522029 };
    const preferences = { maxWalkingMeters: 1000, maxTransfers: 1 };

    const startTime = performance.now();
    const result = await RouterService.findJourneysWithDiagnostics({
      origin,
      destination,
      preferences,
    });
    const { journeys } = result;

    expect(journeys.length).toBeGreaterThan(0);

    const metricsStartTime = performance.now();
    const allMetrics = journeys.map((j) => JourneyMetricsService.calculateMetrics(j));
    const metricsDurationMs = performance.now() - metricsStartTime;

    console.log(`Computed ${journeys.length} JourneyMetrics in ${metricsDurationMs.toFixed(2)}ms (avg ${(metricsDurationMs / journeys.length).toFixed(3)}ms/journey)`);

    // Verify factual properties for every returned journey
    for (let i = 0; i < journeys.length; i++) {
      const j = journeys[i];
      const m = allMetrics[i];

      expect(Number.isFinite(m.totalWalkingMeters)).toBeTrue();
      expect(Number.isFinite(m.walkingBeforeFirstTransitMeters)).toBeTrue();
      expect(Number.isFinite(m.walkingAfterLastTransitMeters)).toBeTrue();
      expect(Number.isFinite(m.transfersCount)).toBeTrue();
      expect(Number.isFinite(m.estimatedDurationMinutes)).toBeTrue();
      expect(Number.isFinite(m.transitLegsCount)).toBeTrue();
      expect(Number.isFinite(m.transitDistanceMeters)).toBeTrue();
      expect(Number.isFinite(m.journeyGeometryDistanceMeters)).toBeTrue();
      expect(Number.isFinite(m.initialDestinationProgressMeters)).toBeTrue();
      expect(Number.isFinite(m.totalBacktrackingMeters)).toBeTrue();
      expect(Number.isFinite(m.destinationProgressRatio)).toBeTrue();
      expect(Number.isFinite(m.initialDirectionAlignment)).toBeTrue();

      expect(m.totalWalkingMeters).toBeGreaterThanOrEqual(0);
      expect(m.transfersCount).toBe(j.transfersCount);
      expect(m.totalBacktrackingMeters).toBeGreaterThanOrEqual(0);
      expect(m.destinationProgressRatio).toBeGreaterThan(0);
      expect(m.destinationProgressRatio).toBeLessThanOrEqual(1.0);
      expect(m.initialDirectionAlignment).toBeGreaterThanOrEqual(-1.0);
      expect(m.initialDirectionAlignment).toBeLessThanOrEqual(1.0);
    }
  }, 60000);
});
