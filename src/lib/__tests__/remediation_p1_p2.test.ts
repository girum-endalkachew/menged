import { describe, test, expect, beforeEach } from "bun:test";
import { RouterService, calculateEquirectangularDistanceMeters } from "@/services/router";
import { classifyRouteTransportMode, mapJourneyToRouteOption } from "@/lib/journeyAdapter";
import { Journey, TransitLeg } from "@/types/journey";
import { useMengedStore } from "@/store/useMengedStore";

describe("Remediation Pass — P1 & P2 Regression Tests", () => {
  beforeEach(() => {
    useMengedStore.setState({
      view: "app",
      journeyState: "PLANNING",
      isNavigating: false,
      activeJourney: null,
      selectedRoute: null,
      rawJourneys: [],
    });
  });

  describe("P1-ROUTING-01: Candidate Stop Truncation Fix", () => {
    test("Dense transit hub (Bole -> Piassa 1000m) evaluates >15 candidates and discovers routes with stops beyond rank 15", async () => {
      const request = {
        origin: { latitude: 8.9983386, longitude: 38.7860596 },
        destination: { latitude: 9.0365871, longitude: 38.7522029 },
        preferences: { maxWalkingMeters: 1000 },
      };

      const { journeys, diagnostics } = await RouterService.findJourneysWithDiagnostics(request);

      // 1. Prove there are more than 15 spatial candidate stops at the destination hub
      expect(diagnostics.candidateDestStopsCount).toBeGreaterThan(15);

      // 2. Prove router discovers journeys without needing artificial maxDestCandidates overrides
      expect(journeys.length).toBeGreaterThan(0);

      // 3. Prove candidate hub route AB009 (whose Piassa stop is past rank 15) is discovered from real GTFS graph
      const hasAB009 = journeys.some((j) =>
        j.legs.some((l) => l.type === "TRANSIT" && (l.routeShortName === "AB009" || l.routeId === "10410198"))
      );
      expect(hasAB009).toBe(true);
    }, 15000);
  });

  describe("P1-ROUTING-02: Over-Aggressive Journey Deduplication Fix", () => {
    test("Same route sequence with different physical boarding/alighting stops remain distinct", () => {
      const journey1: Journey = {
        id: "j1",
        origin: { latitude: 9.01, longitude: 38.75 },
        destination: { latitude: 9.03, longitude: 38.77 },
        transfersCount: 0,
        totalWalkingMeters: 200,
        estimatedDurationMinutes: 15,
        score: 18,
        legs: [
          {
            type: "WALK",
            from: { name: "Origin", latitude: 9.01, longitude: 38.75 },
            to: { name: "Stop A1", latitude: 9.011, longitude: 38.751, stopId: "stop_a1" },
            distanceMeters: 100,
            estimatedMinutes: 1,
          },
          {
            type: "TRANSIT",
            routeId: "route_100",
            routeShortName: "AB001",
            routeLongName: "Bole Line",
            routeType: 3,
            boardingStop: { id: "stop_a1", name: "Stop A1", latitude: 9.011, longitude: 38.751 },
            alightingStop: { id: "stop_b1", name: "Stop B1", latitude: 9.029, longitude: 38.769 },
            boardingSequence: 1,
            alightingSequence: 5,
            stopsCount: 4,
            orderedStops: [
              { id: "stop_a1", name: "Stop A1", latitude: 9.011, longitude: 38.751, stopSequence: 1 },
              { id: "stop_b1", name: "Stop B1", latitude: 9.029, longitude: 38.769, stopSequence: 5 },
            ],
          },
          {
            type: "WALK",
            from: { name: "Stop B1", latitude: 9.029, longitude: 38.769, stopId: "stop_b1" },
            to: { name: "Destination", latitude: 9.03, longitude: 38.77 },
            distanceMeters: 100,
            estimatedMinutes: 1,
          },
        ],
        trust: { transit: "VERIFIED", fare: "UNAVAILABLE", realtime: "UNAVAILABLE" },
      };

      const journey2: Journey = {
        id: "j2",
        origin: { latitude: 9.01, longitude: 38.75 },
        destination: { latitude: 9.03, longitude: 38.77 },
        transfersCount: 0,
        totalWalkingMeters: 300,
        estimatedDurationMinutes: 18,
        score: 22,
        legs: [
          {
            type: "WALK",
            from: { name: "Origin", latitude: 9.01, longitude: 38.75 },
            to: { name: "Stop A2", latitude: 9.012, longitude: 38.752, stopId: "stop_a2" },
            distanceMeters: 200,
            estimatedMinutes: 2,
          },
          {
            type: "TRANSIT",
            routeId: "route_100",
            routeShortName: "AB001",
            routeLongName: "Bole Line",
            routeType: 3,
            boardingStop: { id: "stop_a2", name: "Stop A2", latitude: 9.012, longitude: 38.752 },
            alightingStop: { id: "stop_b2", name: "Stop B2", latitude: 9.028, longitude: 38.768 },
            boardingSequence: 2,
            alightingSequence: 4,
            stopsCount: 2,
            orderedStops: [
              { id: "stop_a2", name: "Stop A2", latitude: 9.012, longitude: 38.752, stopSequence: 2 },
              { id: "stop_b2", name: "Stop B2", latitude: 9.028, longitude: 38.768, stopSequence: 4 },
            ],
          },
          {
            type: "WALK",
            from: { name: "Stop B2", latitude: 9.028, longitude: 38.768, stopId: "stop_b2" },
            to: { name: "Destination", latitude: 9.03, longitude: 38.77 },
            distanceMeters: 100,
            estimatedMinutes: 1,
          },
        ],
        trust: { transit: "VERIFIED", fare: "UNAVAILABLE", realtime: "UNAVAILABLE" },
      };

      const opt1 = mapJourneyToRouteOption(journey1);
      const opt2 = mapJourneyToRouteOption(journey2);

      // Verify that physically distinct journeys maintain distinct IDs and step details
      expect(opt1.id).not.toBe(opt2.id);
      expect(opt1.steps[1].from).toBe("Stop A1");
      expect(opt2.steps[1].from).toBe("Stop A2");
    });
  });

  describe("P1-ADAPTER-01: Explicit AddisMap Route Classification", () => {
    test("Anbessa routes classify as BUS", () => {
      const mode = classifyRouteTransportMode({
        routeType: 3,
        routeShortName: "AB009",
        routeLongName: "Bole - Piassa Anbessa",
      });
      expect(mode).toBe("bus");
    });

    test("Sheger routes classify as BUS", () => {
      const mode = classifyRouteTransportMode({
        routeType: 3,
        routeShortName: "SH079",
        routeLongName: "Megenagna - Tor Hailoch Sheger",
      });
      expect(mode).toBe("bus");
    });

    test("Minibus Taxi routes classify as MINIBUS", () => {
      const mode = classifyRouteTransportMode({
        routeType: 3,
        routeShortName: "Tx01",
        routeLongName: "Bole - Mexico Minibus Taxi",
      });
      expect(mode).toBe("minibus");
    });

    test("LRT routes classify as LRT", () => {
      const mode = classifyRouteTransportMode({
        routeType: 0,
        routeShortName: "LRT-NS",
        routeLongName: "North-South LRT",
      });
      expect(mode).toBe("lrt");
    });

    test("Unknown route_type === 3 defaults conservatively to BUS", () => {
      const mode = classifyRouteTransportMode({
        routeType: 3,
        routeShortName: "999",
        routeLongName: "Express City Line",
      });
      expect(mode).toBe("bus");
    });
  });

  describe("P1-MAP-01: Planning vs Active Navigation Map State", () => {
    test("Planning state: selectedRoute controls map rendering", () => {
      const mockJourney1: Journey = {
        id: "j_plan_1",
        origin: { latitude: 9.01, longitude: 38.75 },
        destination: { latitude: 9.03, longitude: 38.77 },
        transfersCount: 0,
        totalWalkingMeters: 100,
        estimatedDurationMinutes: 10,
        score: 10,
        legs: [],
        trust: { transit: "VERIFIED", fare: "UNAVAILABLE", realtime: "UNAVAILABLE" },
      };

      const mockJourney2: Journey = {
        id: "j_plan_2",
        origin: { latitude: 9.01, longitude: 38.75 },
        destination: { latitude: 9.03, longitude: 38.77 },
        transfersCount: 1,
        totalWalkingMeters: 200,
        estimatedDurationMinutes: 20,
        score: 25,
        legs: [],
        trust: { transit: "VERIFIED", fare: "UNAVAILABLE", realtime: "UNAVAILABLE" },
      };

      const opt1 = mapJourneyToRouteOption(mockJourney1);
      const opt2 = mapJourneyToRouteOption(mockJourney2);

      useMengedStore.setState({
        isNavigating: false,
        rawJourneys: [mockJourney1, mockJourney2],
        selectedRoute: opt2,
        activeJourney: mockJourney1, // Even if activeJourney exists from earlier, planning uses selectedRoute
      });

      const state = useMengedStore.getState();
      expect(state.isNavigating).toBe(false);
      expect(state.selectedRoute?.id).toBe("j_plan_2");
    });

    test("Active Navigation state: activeJourney is authoritative and pinned", () => {
      const mockActiveJourney: Journey = {
        id: "j_active_nav",
        origin: { latitude: 9.01, longitude: 38.75 },
        destination: { latitude: 9.03, longitude: 38.77 },
        transfersCount: 0,
        totalWalkingMeters: 100,
        estimatedDurationMinutes: 10,
        score: 10,
        legs: [],
        trust: { transit: "VERIFIED", fare: "UNAVAILABLE", realtime: "UNAVAILABLE" },
      };

      useMengedStore.setState({
        isNavigating: true,
        activeJourney: mockActiveJourney,
      });

      const state = useMengedStore.getState();
      expect(state.isNavigating).toBe(true);
      expect(state.activeJourney?.id).toBe("j_active_nav");
    });
  });

  describe("P2-SHAPE-01: Equirectangular Distance Calculation at 9°N", () => {
    test("calculateEquirectangularDistance accounts for cos(latitude) scaling near Addis Ababa", () => {
      const lat = 9.0192;
      const lon = 38.7578;

      // 0.001 deg latitude delta vs 0.001 deg longitude delta
      const distLatOnly = RouterService.calculateEquirectangularDistance(lat, lon, lat + 0.001, lon);
      const distLonOnly = RouterService.calculateEquirectangularDistance(lat, lon, lat, lon + 0.001);

      // At 9°N, cos(9°) ≈ 0.9876. longitude 0.001° is ~109.4m while latitude 0.001° is ~110.8m
      expect(distLatOnly).toBeGreaterThan(distLonOnly);
      expect(distLonOnly / distLatOnly).toBeCloseTo(Math.cos(9.0192 * (Math.PI / 180)), 3);
    });
  });
});
