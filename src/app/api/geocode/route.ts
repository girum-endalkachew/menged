import { NextRequest, NextResponse } from "next/server";

export interface GeocodedPlace {
  id: string;
  name: string;
  address?: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

/**
 * GET /api/geocode?q=<search_query>
 *
 * Secure server-side proxy for Gebeta Maps Geocoding API.
 * Normalizes Gebeta response into standardized application shape:
 * { success: true, data: GeocodedPlace[] }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || typeof query !== "string" || !query.trim()) {
    return NextResponse.json(
      { success: false, error: "Query parameter 'q' is required." },
      { status: 400 }
    );
  }

  const apiKey =
    process.env.GEBTAMAPS_GEOCODING_TOKEN ||
    process.env.GEBETA_API_KEY ||
    process.env.GEBTAMAPS_ALLOWED_IP_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: "Gebeta API key is not configured on the server. Geocoding unavailable.",
      },
      { status: 500 }
    );
  }

  try {
    const gebetaUrl = `https://mapapi.gebeta.app/api/v1/route/geocoding?name=${encodeURIComponent(
      query.trim()
    )}&apiKey=${encodeURIComponent(apiKey)}`;

    const response = await fetch(gebetaUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000), // 8 second timeout
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Gebeta geocoding service returned status ${response.status}.`,
        },
        { status: response.status >= 500 ? 502 : 400 }
      );
    }

    const json = await response.json();

    // Handle Gebeta response structures
    const rawResults =
      json.data?.results ||
      (Array.isArray(json.data) ? json.data : null) ||
      json.results ||
      [];

    if (!Array.isArray(rawResults) || rawResults.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const normalizedPlaces: GeocodedPlace[] = [];

    for (let index = 0; index < rawResults.length; index++) {
      const item = rawResults[index];
      if (!item) continue;

      // Extract name / display name
      const name =
        item.name ||
        item.display_name ||
        item.place_name ||
        item.title ||
        query.trim();

      const address = item.address || item.type || item.category || undefined;

      // Extract coordinates defensively
      let lat: number | null = null;
      let lng: number | null = null;

      if (typeof item.latitude === "number" && typeof item.longitude === "number") {
        lat = item.latitude;
        lng = item.longitude;
      } else if (item.location && typeof item.location.lat === "number" && typeof item.location.lng === "number") {
        lat = item.location.lat;
        lng = item.location.lng;
      } else if (item.coordinates) {
        if (typeof item.coordinates.lat === "number" && typeof item.coordinates.lng === "number") {
          lat = item.coordinates.lat;
          lng = item.coordinates.lng;
        } else if (typeof item.coordinates.latitude === "number" && typeof item.coordinates.longitude === "number") {
          lat = item.coordinates.latitude;
          lng = item.coordinates.longitude;
        } else if (Array.isArray(item.coordinates) && item.coordinates.length >= 2) {
          // GeoJSON array [lng, lat]
          lng = Number(item.coordinates[0]);
          lat = Number(item.coordinates[1]);
        }
      } else if (Array.isArray(item.geometry?.coordinates) && item.geometry.coordinates.length >= 2) {
        lng = Number(item.geometry.coordinates[0]);
        lat = Number(item.geometry.coordinates[1]);
      }

      if (
        lat !== null &&
        lng !== null &&
        !isNaN(lat) &&
        !isNaN(lng) &&
        isFinite(lat) &&
        isFinite(lng)
      ) {
        normalizedPlaces.push({
          id: String(item.id || `gebeta_${index}_${Date.now()}`),
          name: String(name),
          address: address ? String(address) : undefined,
          coordinates: {
            latitude: lat,
            longitude: lng,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: normalizedPlaces,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: `Gebeta geocoding request failed: ${err?.message || "Network error"}`,
      },
      { status: 500 }
    );
  }
}
