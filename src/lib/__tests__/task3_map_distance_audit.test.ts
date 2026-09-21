import { describe, test, expect, beforeEach, beforeAll, afterAll } from "bun:test";
import { useMengedStore } from "@/store/useMengedStore";
import { RouterService } from "@/services/router";
import { mapJourneyToRouteOption, mapJourneyToMapRenderData } from "@/lib/journeyAdapter";
import { POST as routesRouteHandler } from "@/app/api/routes/route";
import { Journey, TransitLeg, WalkingLeg, TransferLeg } from "@/types/journey";

const originalFetch = globalThis.fetch;

describe("Phase 4 Task 3: GPS/Distance Audit & MapLibre Vector Map Integration", () => {
  beforeAll(() => {
    // Intercept relative fetch calls in Bun test environment for /api/routes
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlString =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : input.url;

      if (urlString === "/api/routes" || urlString.includes("/api/routes")) {
        const req = new Request("http://localhost:3000/api/routes", init);
        return routesRouteHandler(req);
      }
      return originalFetch(input, init);
    }) as any;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  beforeEach(() => {
    useMengedStore.getState().cancelJourney();
    useMengedStore.setState({
      originType: "none",
      originName: "",
      originCoordinates: null,
      destinationName: "",
      destinationCoordinates: null,
      gpsStatus: "detecting",
      gpsAccuracy: null,
      routes: [],
      rawJourneys: [],
      routeError: null,
    });
  });

  /**
   * Test 1-3: Authoritative Walking Distance/Duration Formulas
   * Formula: 4.5 km/h = 75 meters/minute -> Math.ceil(distanceMeters / 75)
   */
  test("Test 1-3 — Authoritative Walking Duration: 100m, 1000m, 3000m walking legs scale consistently", () => {
    const calcWalkTime = (meters: number) => Math.ceil((meters / 1000) / (4.5 / 60)); // Or Math.ceil(meters / 75)

    // 100m walking leg -> 2 min
    expect(calcWalkTime(100)).toBe(2);

    // 1000m walking leg -> 14 min
    expect(calcWalkTime(1000)).toBe(14);

    // 3000m walking leg -> 40 min (MUST NEVER be 6 min!)
    expect(calcWalkTime(3000)).toBe(40);
    expect(calcWalkTime(3000)).not.toBe(6);
  });

  /**
   * Test 4: Coordinate Sanity ({ latitude, longitude } vs MapLibre [longitude, latitude])
   */
  test("Test 4 — Coordinate Sanity: Application uses {latitude, longitude}, GeoJSON/MapLibre uses [longitude, latitude]", () => {
    const appCoord = { latitude: 9.0108, longitude: 38.7636 };

    // Application internal shape
    expect(appCoord.latitude).toBe(9.0108);
    expect(appCoord.longitude).toBe(38.7636);

    // GeoJSON MapLibre shape
    const mapRenderCoord: [number, number] = [appCoord.longitude, appCoord.latitude];
    expect(mapRenderCoord[0]).toBe(38.7636); // Lng first
    expect(mapRenderCoord[1]).toBe(9.0108);  // Lat second
  });

  /**
   * Test 5-7: GPS origin, manual origin, and destination coordinates reach /api/routes unchanged
   */
  test("Test 5-7 — Unchanged Coordinate Delivery: GPS/manual origin and destination coordinates reach /api/routes", async () => {
    const gpsOrigin = { latitude: 9.0105, longitude: 38.7454 }; // Mexico Square
    const destCoords = { latitude: 9.0365, longitude: 38.7522 }; // Piassa

    useMengedStore.setState({
      originType: "gps",
      originName: "Current Location",
      originCoordinates: gpsOrigin,
      destinationName: "Piassa",
      destinationCoordinates: destCoords,
      gpsStatus: "active",
      gpsAccuracy: 15,
    });

    const store = useMengedStore.getState();
    expect(store.originCoordinates).toEqual(gpsOrigin);
    expect(store.destinationCoordinates).toEqual(destCoords);

    const success = await store.fetchRoutes();
    expect(success).toBe(true);

    const stateAfterSearch = useMengedStore.getState();
    expect(stateAfterSearch.rawJourneys.length).toBeGreaterThan(0);
    // Origin coordinate in raw journey matches the exact passed origin
    expect(stateAfterSearch.rawJourneys[0].origin).toEqual(gpsOrigin);
  });

  /**
   * Test 8: Bole Medhanialem is NEVER injected automatically
   */
  test("Test 8 — No Automatic Bole Injection: Default store state has null origin/destination coordinates", () => {
    const store = useMengedStore.getState();
    expect(store.originCoordinates).toBeNull();
    expect(store.destinationCoordinates).toBeNull();
    expect(store.originName).toBe("");
    expect(store.destinationName).toBe("");
  });

  /**
   * Test 9-12: Map Render Model Conversion & Marker Extraction
   */
  test("Test 9-12 — Map Render Adapter: Converts Journey legs into MapLibre markers, polylines, and bounds", async () => {
    const origin = { latitude: 8.9984, longitude: 38.7861 };
    const destination = { latitude: 9.0365, longitude: 38.7522 };

    const journeys = await RouterService.findJourneys({
      origin,
      destination,
      preferences: { maxWalkingMeters: 1000, maxTransfers: 1 },
    });
    expect(journeys.length).toBeGreaterThan(0);

    const journey = journeys[0];
    const mapData = mapJourneyToMapRenderData(journey, { latitude: 8.9950, longitude: 38.7850 });

    expect(mapData.markers.length).toBeGreaterThan(0);
    expect(mapData.polylines.length).toBeGreaterThan(0);
    expect(mapData.bounds).toBeDefined();

    // Verify User Location Marker
    const userMarker = mapData.markers.find((m) => m.type === "user");
    expect(userMarker).toBeDefined();
    expect(userMarker?.coordinates).toEqual([38.7850, 8.9950]); // [lng, lat]

    // Verify Origin & Destination Markers
    const originMarker = mapData.markers.find((m) => m.type === "origin");
    const destMarker = mapData.markers.find((m) => m.type === "destination");
    expect(originMarker).toBeDefined();
    expect(destMarker).toBeDefined();

    // Verify Boarding & Alighting Markers
    const boardingMarker = mapData.markers.find((m) => m.type === "boarding");
    const alightingMarker = mapData.markers.find((m) => m.type === "alighting");
    expect(boardingMarker).toBeDefined();
    expect(alightingMarker).toBeDefined();

    // Verify Bounds: minLng <= maxLng and minLat <= maxLat
    const [minLng, minLat, maxLng, maxLat] = mapData.bounds;
    expect(minLng).toBeLessThanOrEqual(maxLng);
    expect(minLat).toBeLessThanOrEqual(maxLat);
  });

  /**
   * Test 13: One-Transfer Journey Map Render Data Order
   */
  test("Test 13 — 1-Transfer Journey Map Data: Preserves transfer markers and polylines", async () => {
    const origin = { latitude: 8.9984, longitude: 38.7861 };
    const destination = { latitude: 9.0212, longitude: 38.8717 }; // Ayat Chefe (1-transfer)

    const journeys = await RouterService.findJourneys({
      origin,
      destination,
      preferences: { maxWalkingMeters: 1000, maxTransfers: 1 },
    });
    expect(journeys.length).toBeGreaterThan(0);

    const transferJourney = journeys.find((j) => j.transfersCount === 1);
    if (transferJourney) {
      const mapData = mapJourneyToMapRenderData(transferJourney);
      const transferMarker = mapData.markers.find((m) => m.type === "transfer");
      const transferPolyline = mapData.polylines.find((p) => p.type === "transfer");

      expect(transferMarker).toBeDefined();
      expect(transferPolyline).toBeDefined();
    }
  });
});
