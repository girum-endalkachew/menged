import { describe, test, expect, beforeEach, beforeAll, afterAll } from "bun:test";
import { useMengedStore } from "@/store/useMengedStore";
import { GET as geocodeRouteHandler } from "@/app/api/geocode/route";
import { POST as routesRouteHandler } from "@/app/api/routes/route";
import { NextRequest } from "next/server";
import { RouterService } from "@/services/router";
import { mapJourneyToRouteOption } from "@/lib/journeyAdapter";

const originalFetch = globalThis.fetch;

describe("Phase 4 Task 2 Follow-up: GPS-First Origin & Gebeta Geocoding Place Search", () => {
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
      userLocation: null,
      originType: "none",
      originName: "",
      originCoordinates: null,
      destinationName: "",
      destinationCoordinates: null,
      gpsStatus: "detecting",
      routes: [],
      rawJourneys: [],
      routeError: null,
    });
  });

  /**
   * Test 1: GPS location exists -> route search uses GPS origin, Bole is not injected.
   */
  test("Test 1 — GPS location exists: route search uses GPS coordinates without Bole injection", async () => {
    const gpsCoords = { latitude: 8.9953, longitude: 38.7885 }; // Bole area GPS fix
    const piassaCoords = { latitude: 9.0365, longitude: 38.7522 };

    const store = useMengedStore.getState();
    store.setUserLocation({ lat: gpsCoords.latitude, lng: gpsCoords.longitude, name: "Current Location" });
    useMengedStore.setState({
      originType: "gps",
      originName: "Current Location",
      originCoordinates: gpsCoords,
      destinationName: "Piassa Arada",
      destinationCoordinates: piassaCoords,
      gpsStatus: "active",
    });

    const currentState = useMengedStore.getState();
    expect(currentState.originCoordinates).toEqual(gpsCoords);
    expect(currentState.originName).toBe("Current Location");

    // Perform route search
    const success = await currentState.fetchRoutes();
    expect(success).toBe(true);

    const stateAfterSearch = useMengedStore.getState();
    expect(stateAfterSearch.routes.length).toBeGreaterThan(0);
    expect(stateAfterSearch.routeError).toBeNull();
    // Origin in state remains GPS coordinates, not Bole
    expect(stateAfterSearch.originCoordinates).toEqual(gpsCoords);
  });

  /**
   * Test 2: GPS unavailable -> origin is null, no fake Bole origin injected, user can select manual origin.
   */
  test("Test 2 — GPS unavailable: origin is null, fetchRoutes returns false, manual origin can be set", async () => {
    useMengedStore.setState({
      originType: "none",
      originName: "",
      originCoordinates: null,
      destinationName: "Piassa Arada",
      destinationCoordinates: { latitude: 9.0365, longitude: 38.7522 },
      gpsStatus: "denied",
    });

    const store = useMengedStore.getState();
    expect(store.originCoordinates).toBeNull();

    // Attempt route search without origin coordinates
    const success = await store.fetchRoutes();
    expect(success).toBe(false);
    expect(useMengedStore.getState().routeError).toContain("Please select a valid origin location");

    // User manually selects Mexico Square as starting point
    const mexicoCoords = { latitude: 9.0105, longitude: 38.7454 };
    store.setManualOrigin({ name: "Mexico Square", coordinates: mexicoCoords });

    const stateAfterManual = useMengedStore.getState();
    expect(stateAfterManual.originType).toBe("place");
    expect(stateAfterManual.originName).toBe("Mexico Square");
    expect(stateAfterManual.originCoordinates).toEqual(mexicoCoords);

    // Search now succeeds with manual origin
    const successManual = await stateAfterManual.fetchRoutes();
    expect(successManual).toBe(true);
  });

  /**
   * Test 3: User explicitly selects Bole Medhanialem -> Bole coordinates are used.
   */
  test("Test 3 — Explicit Bole selection: Bole coordinates are used when manually selected", async () => {
    const boleCoords = { latitude: 8.9984, longitude: 38.7861 };
    const piassaCoords = { latitude: 9.0365, longitude: 38.7522 };

    const store = useMengedStore.getState();
    store.setManualOrigin({ name: "Bole Medhanialem", coordinates: boleCoords });
    store.setDestinationPlace({ name: "Piassa", coordinates: piassaCoords });

    const state = useMengedStore.getState();
    expect(state.originName).toBe("Bole Medhanialem");
    expect(state.originCoordinates).toEqual(boleCoords);

    const success = await state.fetchRoutes();
    expect(success).toBe(true);
  });

  /**
   * Test 4: Destination search returns Gebeta result -> selected result provides coordinates.
   */
  test("Test 4 — Destination search: Gebeta geocoding returns normalized places", async () => {
    // Test Gebeta API proxy handler with live or configured token
    const req = new NextRequest("http://localhost:3000/api/geocode?q=Piassa");
    const res = await geocodeRouteHandler(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
    expect(json.data[0].coordinates.latitude).toBeDefined();
    expect(json.data[0].coordinates.longitude).toBeDefined();

    // Test setting destination place via selected Gebeta result coordinates
    const selectedPlace = json.data[0];
    const store = useMengedStore.getState();
    store.setDestinationPlace({ name: selectedPlace.name, coordinates: selectedPlace.coordinates });

    const state = useMengedStore.getState();
    expect(state.destinationName).toBe(selectedPlace.name);
    expect(state.destinationCoordinates).toEqual(selectedPlace.coordinates);
  });

  /**
   * Test 5: Empty destination -> fetchRoutes returns false without calling API.
   */
  test("Test 5 — Empty destination: fetchRoutes returns false when destination is missing", async () => {
    useMengedStore.setState({
      originCoordinates: { latitude: 8.9984, longitude: 38.7861 },
      destinationCoordinates: null,
      destinationName: "",
    });

    const store = useMengedStore.getState();
    const success = await store.fetchRoutes();
    expect(success).toBe(false);
    expect(useMengedStore.getState().routeError).toContain("destination");
  });

  /**
   * Test 6: Gebeta search failure -> /api/geocode returns controlled error response.
   */
  test("Test 6 — Gebeta search failure: /api/geocode returns controlled error response without crashing", async () => {
    // 1. Empty query returns HTTP 400
    const reqEmpty = new NextRequest("http://localhost:3000/api/geocode?q=");
    const resEmpty = await geocodeRouteHandler(reqEmpty);
    expect(resEmpty.status).toBe(400);

    // 2. Query without key returns HTTP 500 with controlled JSON error
    const savedToken1 = process.env.GEBTAMAPS_GEOCODING_TOKEN;
    const savedToken2 = process.env.GEBETA_API_KEY;
    const savedToken3 = process.env.GEBTAMAPS_ALLOWED_IP_API_KEY;

    delete process.env.GEBTAMAPS_GEOCODING_TOKEN;
    delete process.env.GEBETA_API_KEY;
    delete process.env.GEBTAMAPS_ALLOWED_IP_API_KEY;

    try {
      const reqNoKey = new NextRequest("http://localhost:3000/api/geocode?q=Edna%20Mall");
      const resNoKey = await geocodeRouteHandler(reqNoKey);
      const jsonNoKey = await resNoKey.json();

      expect(resNoKey.status).toBe(500);
      expect(jsonNoKey.success).toBe(false);
      expect(typeof jsonNoKey.error).toBe("string");
      expect(jsonNoKey.error).toContain("Gebeta API key is not configured");
    } finally {
      if (savedToken1) process.env.GEBTAMAPS_GEOCODING_TOKEN = savedToken1;
      if (savedToken2) process.env.GEBETA_API_KEY = savedToken2;
      if (savedToken3) process.env.GEBTAMAPS_ALLOWED_IP_API_KEY = savedToken3;
    }
  });

  /**
   * Test 7: Integration check — Direct coordinates passed to RouterService findJourneys work seamlessly.
   */
  test("Test 7 — Direct coordinate routing contract is preserved", async () => {
    const origin = { latitude: 8.9984, longitude: 38.7861 };
    const destination = { latitude: 9.0365, longitude: 38.7522 };

    const journeys = await RouterService.findJourneys({
      origin,
      destination,
      preferences: { maxWalkingMeters: 1000, maxTransfers: 1 },
    });

    expect(journeys.length).toBeGreaterThan(0);
    const routeOptions = journeys.map(mapJourneyToRouteOption);
    expect(routeOptions.length).toBe(journeys.length);
  });
});
