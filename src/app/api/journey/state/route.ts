import { NextResponse } from "next/server";
import { JourneyStateService } from "@/services/journeyStateService";
import { ActiveJourneyState, GPSLocation } from "@/types/navigation";
import { Journey } from "@/types/journey";

export async function POST(req: Request) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body payload" },
        { status: 400 }
      );
    }

    const activeState = body?.activeState as ActiveJourneyState;
    const location = body?.location as GPSLocation;
    const journey = body?.journey as Journey;

    if (!activeState || !location || !journey) {
      return NextResponse.json(
        { success: false, error: "Missing activeState, location, or journey payload" },
        { status: 400 }
      );
    }

    const lat = Number(location?.latitude);
    const lon = Number(location?.longitude);

    if (
      isNaN(lat) ||
      isNaN(lon) ||
      !isFinite(lat) ||
      !isFinite(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid or out-of-range location coordinates" },
        { status: 400 }
      );
    }

    const result = JourneyStateService.evaluateState(activeState, { ...location, latitude: lat, longitude: lon }, journey);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[API /api/journey/state] Sanitized Internal Error:", error?.message);
    return NextResponse.json(
      { success: false, error: "An internal server error occurred while evaluating journey state." },
      { status: 500 }
    );
  }
}
