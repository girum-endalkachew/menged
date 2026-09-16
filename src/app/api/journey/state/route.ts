import { NextResponse } from "next/server";
import { JourneyStateService } from "@/services/journeyStateService";
import { ActiveJourneyState, GPSLocation } from "@/types/navigation";
import { Journey } from "@/types/journey";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const activeState = body?.activeState as ActiveJourneyState;
    const location = body?.location as GPSLocation;
    const journey = body?.journey as Journey;

    if (!activeState || !location || !journey) {
      return NextResponse.json(
        { success: false, error: "Missing activeState, location, or journey payload" },
        { status: 400 }
      );
    }

    if (typeof location.latitude !== "number" || typeof location.longitude !== "number") {
      return NextResponse.json(
        { success: false, error: "Invalid location coordinates (must be numbers)" },
        { status: 400 }
      );
    }

    const result = JourneyStateService.evaluateState(activeState, location, journey);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[API /api/journey/state] Internal Error:", error);
    return NextResponse.json(
      { success: false, error: "An internal server error occurred while evaluating journey state." },
      { status: 500 }
    );
  }
}
