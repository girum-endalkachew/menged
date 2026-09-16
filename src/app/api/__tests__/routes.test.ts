import { describe, expect, test } from "bun:test";
import { POST as handleRoutesPost } from "../routes/route";
import { POST as handleJourneyStatePost } from "../journey/state/route";
import { ActiveJourneyState, GPSLocation } from "@/types/navigation";
import { Journey } from "@/types/journey";

describe("API Controllers Endpoints", () => {
  test("POST /api/routes returns HTTP 200 with verified Journey JSON for valid request", async () => {
    const req = new Request("http://localhost:3000/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin: { latitude: 8.9983386, longitude: 38.7860596 },
        destination: { latitude: 9.0365871, longitude: 38.7522029 },
      }),
    });

    const res = await handleRoutesPost(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.journeys.length).toBeGreaterThan(0);
    expect(json.data.journeys[0].trust.transit).toBe("VERIFIED");
  }, 10000);

  test("POST /api/routes returns HTTP 400 for empty payload", async () => {
    const req = new Request("http://localhost:3000/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await handleRoutesPost(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.success).toBe(false);
  });

  test("POST /api/journey/state evaluates GPS position and returns HTTP 200", async () => {
    const testJourneyFixture: Journey = {
      id: "journey_api_test",
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
          distanceMeters: 100,
          durationMinutes: 2,
          instruction: "Walk to Bole Medhanialem",
          origin: { latitude: 8.9983386, longitude: 38.7860596 },
          destination: { latitude: 8.9984, longitude: 38.7861 },
          targetStop: { id: "node/7037142424", name: "Bole Medhanialem", latitude: 8.9984, longitude: 38.7861 },
        },
        {
          type: "TRANSIT",
          routeId: "10410198",
          routeShortName: "AB009",
          routeLongName: "Piassa Arada ↔ Brass Clinic",
          routeType: 3,
          boardingStop: { id: "node/7037142424", name: "Bole Medhanialem", latitude: 8.9984, longitude: 38.7861 },
          alightingStop: { id: "node/7041071579", name: "Piassa Arada", latitude: 9.0365871, longitude: 38.7522029 },
          stopsCount: 12,
          distanceMeters: 5400,
          durationMinutes: 20,
        },
      ],
    };

    const activeState: ActiveJourneyState = {
      journeyId: testJourneyFixture.id,
      currentState: "WALKING_TO_STOP",
      currentLegIndex: 0,
      boardingConfirmed: false,
      lastLocation: null,
      activeInstruction: "Walk",
      voicePrompt: "Walk",
    };

    const locationAtStop: GPSLocation = {
      latitude: 8.9984,
      longitude: 38.7861,
      speed: 0.5,
      heading: null,
      accuracy: 5,
      timestamp: Date.now(),
    };

    const req = new Request("http://localhost:3000/api/journey/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeState, location: locationAtStop, journey: testJourneyFixture }),
    });

    const res = await handleJourneyStatePost(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.stateChanged).toBe(true);
  });

  test("P2-01 API Error Sanitization: HTTP 500 responses return safe generic messages without exposing DB details or stack traces", async () => {
    // Pass malformed body that triggers a 500 handler exception
    const req = new Request("http://localhost:3000/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid-json-body",
    });

    const res = await handleRoutesPost(req);
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe("An internal server error occurred while processing route request.");
    expect(json.error).not.toContain("DATABASE_URL");
    expect(json.error).not.toContain("postgres");
    expect(json.error).not.toContain("SELECT");
  });
});
