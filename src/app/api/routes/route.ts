import { NextResponse } from "next/server";
import { RouterService } from "@/services/router";
import { RouteRequest } from "@/types/journey";

export async function POST(req: Request) {
  try {
    let body: RouteRequest;
    try {
      body = (await req.json()) as RouteRequest;
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body payload" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Request body must be an object" },
        { status: 400 }
      );
    }

    const origLat = Number(body?.origin?.latitude);
    const origLon = Number(body?.origin?.longitude);
    const destLat = Number(body?.destination?.latitude);
    const destLon = Number(body?.destination?.longitude);

    if (
      isNaN(origLat) ||
      isNaN(origLon) ||
      !isFinite(origLat) ||
      !isFinite(origLon) ||
      origLat < -90 ||
      origLat > 90 ||
      origLon < -180 ||
      origLon > 180
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid or out-of-range origin coordinates" },
        { status: 400 }
      );
    }

    if (
      isNaN(destLat) ||
      isNaN(destLon) ||
      !isFinite(destLat) ||
      !isFinite(destLon) ||
      destLat < -90 ||
      destLat > 90 ||
      destLon < -180 ||
      destLon > 180
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid or out-of-range destination coordinates" },
        { status: 400 }
      );
    }

    const journeys = await RouterService.findJourneys({
      ...body,
      origin: { latitude: origLat, longitude: origLon },
      destination: { latitude: destLat, longitude: destLon },
    });

    return NextResponse.json({
      success: true,
      data: {
        journeys,
      },
    });
  } catch (error: any) {
    console.error("[API /api/routes] Sanitized Internal Error:", error?.message);
    return NextResponse.json(
      { success: false, error: "An internal server error occurred while processing route request." },
      { status: 500 }
    );
  }
}
