import { Journey, TransitLeg } from "@/types/journey";
import { RouteOption, RouteStep } from "@/types/transit";

/**
 * Pure adapter function mapping backend Journey model to frontend RouteOption presentation model.
 * Preserves GTFS sequence integrity and orderedStops while computing presentation metrics.
 */
export function mapJourneyToRouteOption(journey: Journey): RouteOption {
  const transitLegs = journey.legs.filter((l): l is TransitLeg => l.type === "TRANSIT");
  const firstTransit = transitLegs[0];
  const lastTransit = transitLegs[transitLegs.length - 1];

  const originName = firstTransit?.boardingStop.name || "Origin";
  const destinationName = lastTransit?.alightingStop.name || "Destination";

  // Mode mapping: GTFS routeType 0 = LRT, 3 = Minibus/Bus
  const hasLRT = transitLegs.some((l) => l.routeType === 0);
  const hasBus = transitLegs.some((l) => l.routeType === 3);
  let mode: RouteOption["mode"] = "minibus";
  if (hasLRT && hasBus) {
    mode = "multimodal";
  } else if (hasLRT) {
    mode = "lrt";
  } else if (hasBus) {
    mode = "minibus";
  }

  // Fare calculation: GTFS dataset lacks fare files; report UNAVAILABLE honestly
  const totalCostETB = 0;
  const fareStatus: "ESTIMATED" | "UNAVAILABLE" = "UNAVAILABLE";

  // Extract pathCoordinates [lng, lat] from orderedStops for map rendering
  const pathCoordinates: [number, number][] = [];
  for (const leg of journey.legs) {
    if (leg.type === "WALK") {
      pathCoordinates.push([leg.from.longitude, leg.from.latitude]);
      pathCoordinates.push([leg.to.longitude, leg.to.latitude]);
    } else if (leg.type === "TRANSIT") {
      for (const s of leg.orderedStops) {
        pathCoordinates.push([s.longitude, s.latitude]);
      }
    } else if (leg.type === "TRANSFER") {
      pathCoordinates.push([leg.fromStop.longitude, leg.fromStop.latitude]);
      pathCoordinates.push([leg.toStop.longitude, leg.toStop.latitude]);
    }
  }

  // Convert legs into RouteStep[] for expandable direction card
  const steps: RouteStep[] = journey.legs.map((leg) => {
    if (leg.type === "WALK") {
      return {
        instruction: `Walk from ${leg.from.name} to ${leg.to.name}`,
        instructionAmharic: `ከ ${leg.from.name} ወደ ${leg.to.name} በእግር ይሂዱ`,
        vehicleType: "Walk",
        from: leg.from.name,
        to: leg.to.name,
        costETB: 0,
        durationMins: leg.estimatedMinutes,
      };
    } else if (leg.type === "TRANSIT") {
      const vType = leg.routeType === 0 ? "LRT" : "Minibus Taxi";
      const routeName = leg.routeShortName ? `[${leg.routeShortName}] ` : "";
      return {
        instruction: `Board ${vType} ${routeName}from ${leg.boardingStop.name} to ${leg.alightingStop.name}`,
        instructionAmharic: `ከ ${leg.boardingStop.name} ወደ ${leg.alightingStop.name} ታክሲ ይያዙ`,
        vehicleType: vType as any,
        from: leg.boardingStop.name,
        to: leg.alightingStop.name,
        costETB: 0,
        durationMins: leg.stopsCount * 4,
      };
    } else {
      return {
        instruction: `Transfer: Walk from ${leg.fromStop.name} to ${leg.toStop.name}`,
        instructionAmharic: `ታክሲ ይቀይሩ: ከ ${leg.fromStop.name} ወደ ${leg.toStop.name} በእግር ይሂዱ`,
        vehicleType: "Walk",
        from: leg.fromStop.name,
        to: leg.toStop.name,
        costETB: 0,
        durationMins: leg.estimatedMinutes,
      };
    }
  });

  return {
    id: journey.id,
    origin: originName,
    destination: destinationName,
    transfers: journey.transfersCount,
    totalCostETB,
    fareStatus,
    trust: {
      transit: "VERIFIED",
      fare: fareStatus,
      realtime: "UNAVAILABLE",
    },
    estimatedMinutes: journey.estimatedDurationMinutes,
    walkingMinutes: Math.ceil(journey.totalWalkingMeters / 75), // Assumes 4.5 km/h walking speed (75m/min)
    mode,
    tag: journey.tag || "Balanced",
    steps,
    pathCoordinates,
  };
}
