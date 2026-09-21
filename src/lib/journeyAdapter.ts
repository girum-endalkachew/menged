import { Journey, TransitLeg } from "@/types/journey";
import { RouteOption, RouteStep } from "@/types/transit";

export interface MapRenderMarker {
  id: string;
  type: "origin" | "destination" | "user" | "boarding" | "transfer" | "alighting" | "transit_stop";
  title: string;
  subtitle?: string;
  coordinates: [number, number]; // [longitude, latitude] for GeoJSON/MapLibre!
  stopSequence?: number;
  routeShortName?: string;
}

export interface MapRenderPolyline {
  id: string;
  type: "walk" | "transit" | "transfer";
  coordinates: [number, number][]; // [longitude, latitude][]
  color: string;
  dashed?: boolean;
}

export interface MapRenderData {
  markers: MapRenderMarker[];
  polylines: MapRenderPolyline[];
  bounds: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
}

export type TransportCategory = "lrt" | "bus" | "minibus";

/**
 * Classifies transport mode for a GTFS route leg based on GTFS routeType and AddisMap naming conventions.
 * GTFS routeType 0 = LRT.
 * GTFS routeType 3 = Bus/Minibus:
 * - Short name starting with "Tx" or long name containing "Taxi"/"Minibus" => MINIBUS
 * - Short name starting with "AB" (Anbessa) or "SH" (Sheger) or long name with "Anbessa"/"Sheger"/"Bus" => BUS
 * - Unknown routeType 3 => Conservative default to BUS
 */
export function classifyRouteTransportMode(route: {
  routeType: number;
  routeShortName?: string | null;
  routeLongName?: string | null;
}): TransportCategory {
  if (route.routeType === 0) {
    return "lrt";
  }

  if (route.routeType === 3) {
    const sName = (route.routeShortName || "").trim();
    const lName = (route.routeLongName || "").trim().toLowerCase();

    if (sName.startsWith("Tx") || lName.includes("taxi") || lName.includes("minibus")) {
      return "minibus";
    }

    if (
      sName.startsWith("AB") ||
      sName.startsWith("SH") ||
      lName.includes("anbessa") ||
      lName.includes("sheger") ||
      lName.includes("bus")
    ) {
      return "bus";
    }

    // Conservative default for unknown routeType === 3
    return "bus";
  }

  return "bus";
}

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

  // Explicit AddisMap transport mode classification
  const legModes = transitLegs.map((l) => classifyRouteTransportMode(l));
  const hasLRT = legModes.includes("lrt");
  const hasBus = legModes.includes("bus");
  const hasMinibus = legModes.includes("minibus");

  let mode: RouteOption["mode"] = "minibus";
  const modeTypesCount = [hasLRT, hasBus, hasMinibus].filter(Boolean).length;

  if (modeTypesCount > 1) {
    mode = "multimodal";
  } else if (hasLRT) {
    mode = "lrt";
  } else if (hasBus) {
    mode = "bus";
  } else if (hasMinibus) {
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
      const modeCat = classifyRouteTransportMode(leg);
      const vType = modeCat === "lrt" ? "LRT" : modeCat === "bus" ? "Bus" : "Minibus Taxi";
      const routeName = leg.routeShortName ? `[${leg.routeShortName}] ` : "";
      const amharicVehicle = modeCat === "lrt" ? "ባቡር" : modeCat === "bus" ? "አውቶቡስ" : "ታክሲ";
      return {
        instruction: `Board ${vType} ${routeName}from ${leg.boardingStop.name} to ${leg.alightingStop.name}`,
        instructionAmharic: `ከ ${leg.boardingStop.name} ወደ ${leg.alightingStop.name} ${amharicVehicle} ይያዙ`,
        vehicleType: (vType === "LRT" ? "LRT" : vType === "Bus" ? "Bus" : "Minibus Taxi") as any,
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

/**
 * Extracts structured MapRenderData from backend Journey model for MapLibre rendering.
 * Converts canonical { latitude, longitude } to MapLibre [longitude, latitude] ONLY at boundary.
 */
export function mapJourneyToMapRenderData(
  journey: Journey,
  userLocation?: { latitude: number; longitude: number } | null
): MapRenderData {
  const markers: MapRenderMarker[] = [];
  const polylines: MapRenderPolyline[] = [];
  const allCoords: [number, number][] = [];

  // 1. User Location Marker if available
  if (userLocation && typeof userLocation.latitude === "number" && typeof userLocation.longitude === "number") {
    const userCoord: [number, number] = [userLocation.longitude, userLocation.latitude];
    markers.push({
      id: "marker_user_location",
      type: "user",
      title: "Current Location",
      coordinates: userCoord,
    });
    allCoords.push(userCoord);
  }

  // 2. Origin Marker
  const firstLeg = journey.legs[0];
  const originCoord: [number, number] = [journey.origin.longitude, journey.origin.latitude];
  markers.push({
    id: "marker_origin",
    type: "origin",
    title: firstLeg?.type === "WALK" ? firstLeg.from.name || "Origin" : "Origin",
    coordinates: originCoord,
  });
  allCoords.push(originCoord);

  // 3. Destination Marker
  const lastLeg = journey.legs[journey.legs.length - 1];
  const destCoord: [number, number] = [journey.destination.longitude, journey.destination.latitude];
  markers.push({
    id: "marker_destination",
    type: "destination",
    title: lastLeg?.type === "WALK" ? lastLeg.to.name || "Destination" : "Destination",
    coordinates: destCoord,
  });
  allCoords.push(destCoord);

  // 4. Process Legs
  journey.legs.forEach((leg, index) => {
    if (leg.type === "WALK") {
      const fromPt: [number, number] = [leg.from.longitude, leg.from.latitude];
      const toPt: [number, number] = [leg.to.longitude, leg.to.latitude];
      polylines.push({
        id: `poly_walk_${index}`,
        type: "walk",
        coordinates: [fromPt, toPt],
        color: "#10b981",
        dashed: true,
      });
      allCoords.push(fromPt, toPt);
    } else if (leg.type === "TRANSIT") {
      const bCoord: [number, number] = [leg.boardingStop.longitude, leg.boardingStop.latitude];
      const aCoord: [number, number] = [leg.alightingStop.longitude, leg.alightingStop.latitude];

      markers.push({
        id: `marker_boarding_${leg.routeId}_${index}`,
        type: "boarding",
        title: leg.boardingStop.name,
        subtitle: `Board ${leg.routeType === 0 ? "LRT" : "Taxi"} ${leg.routeShortName ? `[${leg.routeShortName}]` : ""}`,
        coordinates: bCoord,
        routeShortName: leg.routeShortName || undefined,
      });

      markers.push({
        id: `marker_alighting_${leg.routeId}_${index}`,
        type: "alighting",
        title: leg.alightingStop.name,
        subtitle: `Alight ${leg.routeShortName ? `[${leg.routeShortName}]` : ""}`,
        coordinates: aCoord,
        routeShortName: leg.routeShortName || undefined,
      });

      // Prefer GTFS shapePoints geometry when available; fallback to orderedStops sequence
      const transitLineCoords: [number, number][] =
        leg.shapePoints && leg.shapePoints.length > 0
          ? leg.shapePoints
          : leg.orderedStops.map((s) => [s.longitude, s.latitude]);

      leg.orderedStops.forEach((s) => {
        if (s.id !== leg.boardingStop.id && s.id !== leg.alightingStop.id) {
          markers.push({
            id: `marker_stop_${s.id}_${index}`,
            type: "transit_stop",
            title: s.name,
            subtitle: `Stop ${s.stopSequence}`,
            coordinates: [s.longitude, s.latitude],
            stopSequence: s.stopSequence,
          });
        }
      });

      polylines.push({
        id: `poly_transit_${leg.routeId}_${index}`,
        type: "transit",
        coordinates: transitLineCoords.length > 0 ? transitLineCoords : [bCoord, aCoord],
        color: leg.routeType === 0 ? "#059669" : "#0284c7",
        dashed: false,
      });

      allCoords.push(...(transitLineCoords.length > 0 ? transitLineCoords : [bCoord, aCoord]));
    } else if (leg.type === "TRANSFER") {
      const fromPt: [number, number] = [leg.fromStop.longitude, leg.fromStop.latitude];
      const toPt: [number, number] = [leg.toStop.longitude, leg.toStop.latitude];

      markers.push({
        id: `marker_transfer_${index}`,
        type: "transfer",
        title: `Transfer: ${leg.fromStop.name} → ${leg.toStop.name}`,
        subtitle: `${leg.distanceMeters}m walk (${leg.estimatedMinutes} min)`,
        coordinates: fromPt,
      });

      polylines.push({
        id: `poly_transfer_${index}`,
        type: "transfer",
        coordinates: [fromPt, toPt],
        color: "#f59e0b",
        dashed: true,
      });

      allCoords.push(fromPt, toPt);
    }
  });

  // Calculate bounding box [minLng, minLat, maxLng, maxLat]
  let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;
  allCoords.forEach(([lng, lat]) => {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  });

  if (minLng > maxLng) {
    minLng = 38.74; maxLng = 38.80; minLat = 8.99; maxLat = 9.04;
  }

  return {
    markers,
    polylines,
    bounds: [minLng, minLat, maxLng, maxLat],
  };
}
