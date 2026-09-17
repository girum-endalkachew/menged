import assert from "node:assert/strict";
import { test } from "node:test";
import { MOCK_ROUTES } from "@/types/transit";
import { planRoutes } from "./route-planner";

test("ranks cheapest routes by fare", () => {
  const routes = planRoutes(MOCK_ROUTES, {
    origin: "Bole",
    destination: "Piassa",
    preference: "cheapest",
    avoidTransportModes: [],
  });

  assert.deepEqual(
    routes.map((route) => route.totalCostETB),
    [18, 25, 220],
  );
});

test("applies a zero-minute walking limit", () => {
  const routes = planRoutes(MOCK_ROUTES, {
    origin: "Bole",
    destination: "Piassa",
    preference: "balanced",
    walkingToleranceMinutes: 0,
    avoidTransportModes: [],
  });

  assert.equal(routes.length, 0);
});

test("filters routes by avoided transport mode", () => {
  const routes = planRoutes(MOCK_ROUTES, {
    origin: "Bole",
    destination: "Piassa",
    preference: "fastest",
    avoidTransportModes: ["ride"],
  });

  assert.ok(routes.every((route) => route.mode !== "ride"));
});
