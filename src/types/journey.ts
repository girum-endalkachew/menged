export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RouteRequest {
  origin: Coordinate;
  destination: Coordinate;
  preferences?: {
    maxWalkingMeters?: number;
    maxTransfers?: number;
    maxOriginCandidates?: number;
    maxDestCandidates?: number;
  };
}

export interface WalkingLeg {
  type: "WALK";
  from: { name: string; latitude: number; longitude: number; stopId?: string };
  to: { name: string; latitude: number; longitude: number; stopId?: string };
  distanceMeters: number;
  estimatedMinutes: number; // Marked as ESTIMATED (assumed 4.5 km/h)
}

export interface TransitLeg {
  type: "TRANSIT";
  routeId: string;
  routeShortName: string | null;
  routeLongName: string | null;
  routeType: number; // Raw GTFS integer preserved (3 = Bus/Minibus)
  boardingStop: { id: string; name: string; latitude: number; longitude: number };
  alightingStop: { id: string; name: string; latitude: number; longitude: number };
  boardingSequence: number;
  alightingSequence: number;
  stopsCount: number;
  orderedStops: Array<{ id: string; name: string; latitude: number; longitude: number; stopSequence: number }>;
  shapePoints?: Array<[number, number]>; // [lng, lat] for MapLibre GL
}

export interface TransferLeg {
  type: "TRANSFER";
  fromStop: { id: string; name: string; latitude: number; longitude: number };
  toStop: { id: string; name: string; latitude: number; longitude: number };
  distanceMeters: number;
  estimatedMinutes: number;
}

export type JourneyLeg = WalkingLeg | TransitLeg | TransferLeg;

export interface Journey {
  id: string;
  origin: Coordinate;
  destination: Coordinate;
  legs: JourneyLeg[];
  totalWalkingMeters: number;
  transfersCount: number;
  estimatedDurationMinutes: number; // Marked as ESTIMATED
  score: number;
  tag?: "Cheapest" | "Fastest" | "Least Walking" | "Balanced";
  trust: {
    transit: "VERIFIED";
    fare: "UNAVAILABLE" | "ESTIMATED";
    realtime: "UNAVAILABLE";
  };
}
