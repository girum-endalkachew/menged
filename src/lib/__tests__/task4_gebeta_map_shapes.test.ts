import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mapJourneyToMapRenderData, mapJourneyToRouteOption } from "../journeyAdapter";
import { RouterService } from "@/services/router";
import { Journey, TransitLeg, WalkingLeg, TransferLeg } from "@/types/journey";
import { GET as getMapStyle } from "@/app/api/map-style/route";

describe("Task 4 — Real Gebeta Basemap & Production Journey Map Visualization", () => {
  const mockDirectJourney: Journey = {
    id: "journey_direct_route_1_stopA_stopB",
    origin: { latitude: 9.0192, longitude: 38.7578 },
    destination: { latitude: 9.0300, longitude: 38.7600 },
    transfersCount: 0,
    totalWalkingMeters: 300,
    estimatedDurationMinutes: 18,
    score: 21,
    tag: "Fastest",
    trust: {
      transit: "VERIFIED",
      fare: "UNAVAILABLE",
      realtime: "UNAVAILABLE",
    },
    legs: [
      {
        type: "WALK",
        from: { name: "Origin GPS", latitude: 9.0192, longitude: 38.7578 },
        to: { name: "Meskel Square Stop", latitude: 9.0100, longitude: 38.7600, stopId: "stop_1" },
        distanceMeters: 150,
        estimatedMinutes: 2,
      },
      {
        type: "TRANSIT",
        routeId: "route_1",
        routeShortName: "01",
        routeLongName: "Bole - Mexico",
        routeType: 3,
        boardingStop: { id: "stop_1", name: "Meskel Square", latitude: 9.0100, longitude: 38.7600 },
        alightingStop: { id: "stop_2", name: "Mexico Square", latitude: 9.0150, longitude: 38.7520 },
        boardingSequence: 1,
        alightingSequence: 5,
        stopsCount: 4,
        orderedStops: [
          { id: "stop_1", name: "Meskel Square", latitude: 9.0100, longitude: 38.7600, stopSequence: 1 },
          { id: "stop_mid_1", name: "Stadium", latitude: 9.0120, longitude: 38.7560, stopSequence: 2 },
          { id: "stop_mid_2", name: "Legehar", latitude: 9.0135, longitude: 38.7540, stopSequence: 3 },
          { id: "stop_2", name: "Mexico Square", latitude: 9.0150, longitude: 38.7520, stopSequence: 4 },
        ],
        shapePoints: [
          [38.7600, 9.0100],
          [38.7580, 9.0110],
          [38.7560, 9.0120],
          [38.7540, 9.0135],
          [38.7520, 9.0150],
        ],
      },
      {
        type: "WALK",
        from: { name: "Mexico Square", latitude: 9.0150, longitude: 38.7520, stopId: "stop_2" },
        to: { name: "Destination Place", latitude: 9.0300, longitude: 38.7600 },
        distanceMeters: 150,
        estimatedMinutes: 2,
      },
    ],
  };

  const mockTransferJourney: Journey = {
    id: "journey_transfer_r1_s1_s2_r2_s3_s4",
    origin: { latitude: 9.0000, longitude: 38.7400 },
    destination: { latitude: 9.0500, longitude: 38.7800 },
    transfersCount: 1,
    totalWalkingMeters: 400,
    estimatedDurationMinutes: 35,
    score: 45,
    tag: "Balanced",
    trust: {
      transit: "VERIFIED",
      fare: "UNAVAILABLE",
      realtime: "UNAVAILABLE",
    },
    legs: [
      {
        type: "WALK",
        from: { name: "Origin", latitude: 9.0000, longitude: 38.7400 },
        to: { name: "Gotera Stop", latitude: 9.0020, longitude: 38.7420, stopId: "stop_gotera" },
        distanceMeters: 200,
        estimatedMinutes: 3,
      },
      {
        type: "TRANSIT",
        routeId: "route_gotera_mexico",
        routeShortName: "05",
        routeLongName: "Gotera - Mexico",
        routeType: 3,
        boardingStop: { id: "stop_gotera", name: "Gotera", latitude: 9.0020, longitude: 38.7420 },
        alightingStop: { id: "stop_mexico", name: "Mexico", latitude: 9.0150, longitude: 38.7520 },
        boardingSequence: 1,
        alightingSequence: 4,
        stopsCount: 3,
        orderedStops: [
          { id: "stop_gotera", name: "Gotera", latitude: 9.0020, longitude: 38.7420, stopSequence: 1 },
          { id: "stop_mexico", name: "Mexico", latitude: 9.0150, longitude: 38.7520, stopSequence: 4 },
        ],
      },
      {
        type: "TRANSFER",
        fromStop: { id: "stop_mexico", name: "Mexico", latitude: 9.0150, longitude: 38.7520 },
        toStop: { id: "stop_mexico_lrt", name: "Mexico LRT", latitude: 9.0155, longitude: 38.7525 },
        distanceMeters: 60,
        estimatedMinutes: 1,
      },
      {
        type: "TRANSIT",
        routeId: "route_lrt_east_west",
        routeShortName: "LRT-EW",
        routeLongName: "LRT East-West",
        routeType: 0,
        boardingStop: { id: "stop_mexico_lrt", name: "Mexico LRT", latitude: 9.0155, longitude: 38.7525 },
        alightingStop: { id: "stop_megenagna_lrt", name: "Megenagna LRT", latitude: 9.0200, longitude: 38.7750 },
        boardingSequence: 5,
        alightingSequence: 10,
        stopsCount: 5,
        orderedStops: [
          { id: "stop_mexico_lrt", name: "Mexico LRT", latitude: 9.0155, longitude: 38.7525, stopSequence: 5 },
          { id: "stop_megenagna_lrt", name: "Megenagna LRT", latitude: 9.0200, longitude: 38.7750, stopSequence: 10 },
        ],
      },
      {
        type: "WALK",
        from: { name: "Megenagna LRT", latitude: 9.0200, longitude: 38.7750, stopId: "stop_megenagna_lrt" },
        to: { name: "Destination", latitude: 9.0500, longitude: 38.7800 },
        distanceMeters: 140,
        estimatedMinutes: 2,
      },
    ],
  };

  test("1. Gebeta map configuration / server API endpoint returns valid unwatermarked style JSON when token is set", async () => {
    const response = await getMapStyle();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.sources).toBeDefined();
    expect(data.layers).toBeDefined();
    expect(Array.isArray(data.layers)).toBe(true);

    // Verify unwatermarked tile source
    const sourcesStr = JSON.stringify(data.sources);
    expect(sourcesStr).not.toContain("cartocdn.com");
  });

  test("1b. Gebeta map tile authentication surfaces HTTP 401 error when token is missing", async () => {
    const t1 = process.env.GEBETAMAPS_TILES_TOKEN;
    const t2 = process.env.GEBETA_MAP_ACCESS_TOKEN;
    const t3 = process.env.GEBTAMAPS_GEOCODING_TOKEN;
    const t4 = process.env.GEBETA_API_KEY;

    delete process.env.GEBETAMAPS_TILES_TOKEN;
    delete process.env.GEBETA_MAP_ACCESS_TOKEN;
    delete process.env.GEBTAMAPS_GEOCODING_TOKEN;
    delete process.env.GEBETA_API_KEY;

    try {
      const response = await getMapStyle();
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Gebeta Map Authentication Required");
    } finally {
      if (t1) process.env.GEBETAMAPS_TILES_TOKEN = t1;
      if (t2) process.env.GEBETA_MAP_ACCESS_TOKEN = t2;
      if (t3) process.env.GEBTAMAPS_GEOCODING_TOKEN = t3;
      if (t4) process.env.GEBETA_API_KEY = t4;
    }
  });

  test("2. Coordinate conversion: application { latitude, longitude } -> GeoJSON [longitude, latitude]", () => {
    const userLocation = { latitude: 9.0192, longitude: 38.7578 };
    const renderData = mapJourneyToMapRenderData(mockDirectJourney, userLocation);

    const userMarker = renderData.markers.find((m) => m.type === "user");
    expect(userMarker).toBeDefined();
    // [lng, lat] GeoJSON standard boundary rule
    expect(userMarker?.coordinates[0]).toBe(38.7578);
    expect(userMarker?.coordinates[1]).toBe(9.0192);

    const originMarker = renderData.markers.find((m) => m.type === "origin");
    expect(originMarker?.coordinates[0]).toBe(38.7578);
    expect(originMarker?.coordinates[1]).toBe(9.0192);
  });

  test("3. Direct Journey map render data contains markers, polylines, and bounding box", () => {
    const renderData = mapJourneyToMapRenderData(mockDirectJourney, null);

    expect(renderData.markers.length).toBeGreaterThan(0);
    expect(renderData.polylines.length).toBe(3); // 1 walk + 1 transit + 1 walk
    expect(renderData.bounds).toBeDefined();
    expect(renderData.bounds.length).toBe(4);

    const [minLng, minLat, maxLng, maxLat] = renderData.bounds;
    expect(minLng).toBeLessThanOrEqual(maxLng);
    expect(minLat).toBeLessThanOrEqual(maxLat);
  });

  test("4. Transfer Journey map render data includes transfer leg and markers", () => {
    const renderData = mapJourneyToMapRenderData(mockTransferJourney, null);

    const transferMarker = renderData.markers.find((m) => m.type === "transfer");
    expect(transferMarker).toBeDefined();

    const transferPoly = renderData.polylines.find((p) => p.type === "transfer");
    expect(transferPoly).toBeDefined();
    expect(transferPoly?.dashed).toBe(true);
  });

  test("5. Transit geometry uses GTFS shapePoints when available", () => {
    const renderData = mapJourneyToMapRenderData(mockDirectJourney, null);
    const transitPoly = renderData.polylines.find((p) => p.type === "transit");

    expect(transitPoly).toBeDefined();
    expect(transitPoly?.coordinates.length).toBe(5); // Matches mockDirectJourney.shapePoints!
    expect(transitPoly?.coordinates[0]).toEqual([38.7600, 9.0100]);
    expect(transitPoly?.coordinates[4]).toEqual([38.7520, 9.0150]);
  });

  test("6. Transit geometry gracefully falls back to orderedStops when shapePoints is unavailable", () => {
    const renderData = mapJourneyToMapRenderData(mockTransferJourney, null);
    const transitPoly1 = renderData.polylines.find((p) => p.id.includes("route_gotera_mexico"));

    expect(transitPoly1).toBeDefined();
    expect(transitPoly1?.coordinates.length).toBe(2); // Falls back to orderedStops!
  });

  test("7. Changing route selection alters map render data deterministically", () => {
    const renderData1 = mapJourneyToMapRenderData(mockDirectJourney, null);
    const renderData2 = mapJourneyToMapRenderData(mockTransferJourney, null);

    expect(renderData1.polylines.length).not.toEqual(renderData2.polylines.length);
    expect(renderData1.bounds).not.toEqual(renderData2.bounds);
  });

  test("8. RouterService attaches GTFS shapePoints to candidates when database contains shapes", async () => {
    // Route from Meskel Square to Mexico Square
    const request = {
      origin: { latitude: 9.0100, longitude: 38.7600 },
      destination: { latitude: 9.0150, longitude: 38.7520 },
    };

    const journeys = await RouterService.findJourneys(request);
    expect(journeys.length).toBeGreaterThan(0);

    const firstJourney = journeys[0];
    const transitLeg = firstJourney.legs.find((l): l is TransitLeg => l.type === "TRANSIT");
    expect(transitLeg).toBeDefined();

    // If trip has a shapeId in DB, shapePoints will be populated
    if (transitLeg?.shapeId) {
      expect(transitLeg.shapePoints).toBeDefined();
      expect(Array.isArray(transitLeg.shapePoints)).toBe(true);
      if (transitLeg.shapePoints && transitLeg.shapePoints.length > 0) {
        expect(transitLeg.shapePoints[0].length).toBe(2); // [lng, lat]
      }
    }
  }, 30000);

  test("9. Map failure fallback does not throw or crash journey data processing", () => {
    expect(() => {
      mapJourneyToMapRenderData(mockDirectJourney, { latitude: 0, longitude: 0 });
    }).not.toThrow();
  });
});
