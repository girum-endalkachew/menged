import { NextResponse } from "next/server";
import { RouterService } from "@/services/router";
import { RouteRequest } from "@/types/journey";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RouteRequest;

    const origLat = Number(body?.origin?.latitude);
    const origLon = Number(body?.origin?.longitude);
    const destLat = Number(body?.destination?.latitude);
    const destLon = Number(body?.destination?.longitude);

    if (isNaN(origLat) || isNaN(origLon)) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing origin coordinates (must be numbers)" },
        { status: 400 }
      );
    }

    if (isNaN(destLat) || isNaN(destLon)) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing destination coordinates (must be numbers)" },
        { status: 400 }
      );
    }

    const journeys = await RouterService.findJourneys(body);

    return NextResponse.json({
      success: true,
      data: {
        journeys,
      },
    });
  } catch (error: any) {
    console.error("[API /api/routes] Internal Error:", error);
    return NextResponse.json(
      { success: false, error: "An internal server error occurred while processing route request." },
      { status: 500 }
    );
  }
}
