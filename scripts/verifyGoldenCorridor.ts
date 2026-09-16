import { TransitService } from "../src/services/transitService";

async function verifyGoldenCorridor() {
  console.log("==================================================");
  console.log("MENGED PHASE 1 — GOLDEN CORRIDOR ACCEPTANCE TEST");
  console.log("==================================================");

  const originStopId = "node/7037142424"; // Bole Medhanialem
  const destinationStopId = "node/7041071579"; // Piassa Arada

  console.log(`[Test] Querying direct transit connection from GTFS data...`);
  console.log(`       Origin Stop ID:      ${originStopId}`);
  console.log(`       Destination Stop ID: ${destinationStopId}`);

  // 1. Derive direct journey relationship from GTFS data
  const result = await TransitService.findDirectJourney(originStopId, destinationStopId);

  if (!result) {
    console.error("❌ FAILED: No direct transit connection found in GTFS dataset.");
    process.exit(1);
  }

  console.log("\n[Test] Direct Transit Relationship Derived Successfully:");
  console.log(`       Origin Stop Name:      ${result.originStop.name}`);
  console.log(`       Destination Stop Name: ${result.destinationStop.name}`);
  console.log(`       Derived Route ID:      ${result.transitLeg.routeId}`);
  console.log(`       Route Short Name:      ${result.transitLeg.routeShortName}`);
  console.log(`       Route Long Name:       ${result.transitLeg.routeLongName}`);
  console.log(`       Raw GTFS Route Type:   ${result.transitLeg.routeType}`);
  console.log(`       Boarding Sequence:     ${result.transitLeg.boardingSequence}`);
  console.log(`       Alighting Sequence:    ${result.transitLeg.alightingSequence}`);
  console.log(`       Stops Traversed:       ${result.transitLeg.stopsCount}`);

  console.log("\n[Test] Trust Model Verification:");
  console.log(`       Transit Data:          ${result.trust.transitDataStatus}`);
  console.log(`       Fare Data:             ${result.trust.fareDataStatus}`);
  console.log(`       Realtime Data:         ${result.trust.realtimeDataStatus}`);

  // 2. Assertions
  const expectedRouteId = "10410198";
  if (result.transitLeg.routeId === expectedRouteId) {
    console.log("\n✅ SUCCESS: Derived route matches expected GTFS route ID 10410198 (AB009)!");
    console.log("==================================================");
    process.exit(0);
  } else {
    console.error(`❌ FAILED: Expected route ID ${expectedRouteId} but derived ${result.transitLeg.routeId}`);
    process.exit(1);
  }
}

verifyGoldenCorridor().catch((err) => {
  console.error(err);
  process.exit(1);
});
