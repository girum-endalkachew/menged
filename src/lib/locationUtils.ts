import { Coordinate } from "@/types/journey";
import { ADDIS_KEY_STOPS } from "@/types/transit";

/**
 * Known Addis Ababa transit key stop coordinates for MVP resolution
 */
const KNOWN_COORDINATES: Record<string, Coordinate> = {
  // Bole area
  bole: { latitude: 8.9953, longitude: 38.7885 },
  "bole medhanialem": { latitude: 8.9984, longitude: 38.7861 },
  "bole medhanialem stop": { latitude: 8.9984, longitude: 38.7861 },
  "bole atlas": { latitude: 9.0062, longitude: 38.7770 },
  "bole airport": { latitude: 8.9806, longitude: 38.7956 },
  
  // Central corridor
  "meskel square": { latitude: 9.0108, longitude: 38.7636 },
  "mexico square": { latitude: 9.0105, longitude: 38.7454 },
  mexico: { latitude: 9.0105, longitude: 38.7454 },
  
  // Piassa / Arada
  piassa: { latitude: 9.0365, longitude: 38.7522 },
  "piassa arada": { latitude: 9.0365, longitude: 38.7522 },
  "piassa arada stop": { latitude: 9.0365, longitude: 38.7522 },
  "churchill ave": { latitude: 9.0220, longitude: 38.7550 },
  arada: { latitude: 9.0345, longitude: 38.7525 },

  // East / Transfer Corridor
  megenagna: { latitude: 9.0205, longitude: 38.8021 },
  "4 kilo": { latitude: 9.0336, longitude: 38.7632 },
  fourkilo: { latitude: 9.0336, longitude: 38.7632 },
  ayat: { latitude: 9.0212, longitude: 38.8717 },
  "ayat chefe": { latitude: 9.0212, longitude: 38.8717 },
};

/**
 * Resolves a text location name into WGS84 coordinates.
 * Returns null if location cannot be resolved (no silent fallback).
 */
export function resolveLocationToCoordinates(locationName: string): Coordinate | null {
  if (!locationName || typeof locationName !== "string") {
    return null;
  }

  const normalized = locationName.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized) {
    return null;
  }

  // 1. Direct match in KNOWN_COORDINATES table
  if (KNOWN_COORDINATES[normalized]) {
    return KNOWN_COORDINATES[normalized];
  }

  // 2. Partial substring matching against known keys
  for (const [key, coords] of Object.entries(KNOWN_COORDINATES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return coords;
    }
  }

  // 3. Match against ADDIS_KEY_STOPS array in transit.ts
  for (const stop of Object.values(ADDIS_KEY_STOPS)) {
    const stopNameNorm = stop.name.toLowerCase();
    if (normalized.includes(stopNameNorm) || stopNameNorm.includes(normalized)) {
      return {
        latitude: stop.coordinates[1],
        longitude: stop.coordinates[0],
      };
    }
  }

  return null;
}
