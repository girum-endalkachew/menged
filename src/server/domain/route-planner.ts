import type { RouteOption } from "@/types/transit";

export type RoutePreference = "cheapest" | "fastest" | "least_walking" | "balanced";

export interface PlanTripInput {
  origin: string;
  destination: string;
  budgetETB?: number;
  preference: RoutePreference;
  walkingToleranceMinutes?: number;
  avoidTransportModes: string[];
}

const modeAliases: Record<string, RouteOption["mode"]> = {
  minibus: "minibus",
  bus: "bus",
  lrt: "lrt",
  ride: "ride",
  multimodal: "multimodal",
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function routeMatchesQuery(route: RouteOption, input: PlanTripInput) {
  const origin = normalize(input.origin);
  const destination = normalize(input.destination);
  const routeOrigin = normalize(route.origin);
  const routeDestination = normalize(route.destination);

  return (
    (!origin || routeOrigin.includes(origin) || origin.includes(routeOrigin)) &&
    (!destination ||
      routeDestination.includes(destination) ||
      destination.includes(routeDestination))
  );
}

function routeUsesAvoidedMode(route: RouteOption, avoidModes: string[]) {
  const avoidedModes = new Set(
    avoidModes
      .map((mode) => modeAliases[normalize(mode)] ?? normalize(mode))
      .filter(Boolean),
  );

  return avoidedModes.has(route.mode);
}

function scoreRoute(route: RouteOption, preference: RoutePreference) {
  if (preference === "cheapest") return route.totalCostETB;
  if (preference === "fastest") return route.estimatedMinutes;
  if (preference === "least_walking") return route.walkingMinutes;

  return route.totalCostETB * 0.5 + route.estimatedMinutes * 0.35 + route.walkingMinutes * 0.15;
}

export function planRoutes(routes: RouteOption[], input: PlanTripInput) {
  return routes
    .filter((route) => routeMatchesQuery(route, input))
    .filter((route) => input.budgetETB === undefined || route.totalCostETB <= input.budgetETB)
    .filter(
      (route) =>
        input.walkingToleranceMinutes === undefined ||
        route.walkingMinutes <= input.walkingToleranceMinutes,
    )
    .filter((route) => !routeUsesAvoidedMode(route, input.avoidTransportModes))
    .sort((left, right) => {
      const scoreDifference = scoreRoute(left, input.preference) - scoreRoute(right, input.preference);
      return scoreDifference || left.estimatedMinutes - right.estimatedMinutes;
    });
}
