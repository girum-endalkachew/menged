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

    if (!journey.id || !Array.isArray(journey.legs) || journey.legs.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid journey: must include id and non-empty legs array" },
        { status: 400 }
      );
    }

    if (activeState.journeyId !== journey.id) {
      return NextResponse.json(
        { success: false, error: `Journey ID mismatch: activeState refers to '${activeState.journeyId}' but journey is '${journey.id}'` },
        { status: 400 }
      );
    }

    const validStates = new Set([
      "PLANNED",
      "WALKING_TO_STOP",
      "AT_STOP",
      "TRANSIT_LEG",
      "APPROACHING_ALIGHTING_STOP",
      "ALIGHTED",
      "WALKING_TO_DESTINATION",
      "ARRIVED",
    ]);

    if (!validStates.has(activeState.currentState)) {
      return NextResponse.json(
        { success: false, error: `Invalid currentState '${activeState.currentState}' in activeState` },
        { status: 400 }
      );
    }

    if (
      typeof activeState.currentLegIndex !== "number" ||
      !Number.isInteger(activeState.currentLegIndex) ||
      activeState.currentLegIndex < 0 ||
      activeState.currentLegIndex >= journey.legs.length
    ) {
      return NextResponse.json(
        { success: false, error: `Impossible currentLegIndex ${activeState.currentLegIndex} for journey with ${journey.legs.length} legs` },
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

    const accuracy = typeof location.accuracy === "number" && !isNaN(location.accuracy) ? location.accuracy : 10;
    const sanitizedLocation: GPSLocation = {
      ...location,
      latitude: lat,
      longitude: lon,
      accuracy,
    };

    const result = JourneyStateService.evaluateState(activeState, sanitizedLocation, journey);

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
