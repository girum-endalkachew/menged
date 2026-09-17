import distance from "@turf/distance";
import { point } from "@turf/helpers";
import { Journey, TransitLeg } from "@/types/journey";
import {
  ActiveJourneyState,
  GPSLocation,
  StateEvaluationResult,
} from "@/types/navigation";
import {
  BOARDING_STOP_THRESHOLD_METERS,
  ALIGHTING_APPROACH_THRESHOLD_METERS,
  ALIGHTED_STOP_THRESHOLD_METERS,
  ARRIVAL_THRESHOLD_METERS,
} from "@/config/constants";

export class JourneyStateService {
  /**
   * Pure Geodesic WGS84 distance calculation in meters using Turf.js
   */
  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const pt1 = point([lon1, lat1]);
    const pt2 = point([lon2, lat2]);
    const distKm = distance(pt1, pt2, { units: "kilometers" });
    return Math.round(distKm * 1000);
  }

  /**
   * Calculates vector projection parameter t of point P (latP, lonP) onto line segment B (latB, lonB) -> A (latA, lonA).
   * t = 0 at B, t = 1.0 at A. t > 1.0 means P is past A along the vector B -> A.
   */
  private static calculateVectorProjection(
    latB: number,
    lonB: number,
    latA: number,
    lonA: number,
    latP: number,
    lonP: number
  ): number {
    const latRad = (latB * Math.PI) / 180;
    const cosLat = Math.cos(latRad);

    const dLatV = latA - latB;
    const dLonV = (lonA - lonB) * cosLat;

    const dLatW = latP - latB;
    const dLonW = (lonP - lonB) * cosLat;

    const dotWV = dLatW * dLatV + dLonW * dLonV;
    const dotVV = dLatV * dLatV + dLonV * dLonV;

    if (dotVV <= 1e-12) {
      return 0;
    }

    return dotWV / dotVV;
  }

  /**
   * Pure Domain Evaluator: Accepts active state, current GPS location, and Journey object,
   * returns updated state, stateChanged flag, and human guidance instructions.
   */
  static evaluateState(
    activeState: ActiveJourneyState,
    location: GPSLocation,
    journey: Journey
  ): StateEvaluationResult {
    // Input validation
    if (!activeState || typeof activeState !== "object") {
      throw new Error("Invalid activeState: state object required");
    }
    if (!journey || !Array.isArray(journey.legs) || journey.legs.length === 0) {
      throw new Error("Invalid journey: journey with legs required");
    }
    if (
      !location ||
      typeof location.latitude !== "number" ||
      typeof location.longitude !== "number" ||
      isNaN(location.latitude) ||
      isNaN(location.longitude)
    ) {
      throw new Error("Invalid location: valid latitude and longitude required");
    }

    // If journey is already ARRIVED, return stable terminal state
    if (activeState.currentState === "ARRIVED") {
      return {
        nextState: {
          ...activeState,
          lastLocation: location,
          activeInstruction: "You have arrived at your destination.",
          voicePrompt: "You have arrived.",
        },
        stateChanged: false,
      };
    }

    let activeLegIndex = activeState.currentLegIndex ?? 0;
    if (isNaN(activeLegIndex) || activeLegIndex < 0) {
      activeLegIndex = 0;
    } else if (activeLegIndex >= journey.legs.length) {
      activeLegIndex = journey.legs.length - 1;
    }

    const nextState: ActiveJourneyState = {
      ...activeState,
      currentLegIndex: activeLegIndex,
      lastLocation: location,
    };

    let stateChanged = false;

    // Helper: Find next transit leg at or after current leg index
    const findNextTransitLegIndex = (startIndex: number): number => {
      for (let i = Math.max(0, startIndex); i < journey.legs.length; i++) {
        if (journey.legs[i]?.type === "TRANSIT") return i;
      }
      return -1;
    };

    const currentLeg = journey.legs[activeLegIndex] || journey.legs[0];
    const nextTransitIdx = findNextTransitLegIndex(activeLegIndex);
    const activeTransitLeg =
      currentLeg?.type === "TRANSIT"
        ? (currentLeg as TransitLeg)
        : nextTransitIdx !== -1
        ? (journey.legs[nextTransitIdx] as TransitLeg)
        : undefined;

    switch (activeState.currentState) {
      case "PLANNED": {
        nextState.currentState = "WALKING_TO_STOP";
        nextState.currentLegIndex = 0;
        nextState.boardingConfirmed = false;
        const boardingStopName = activeTransitLeg?.boardingStop.name || "the transit stop";
        nextState.activeInstruction = `First, walk to ${boardingStopName}.`;
        nextState.voicePrompt = `First, walk to ${boardingStopName}. I will guide you.`;
        stateChanged = true;
        break;
      }

      case "WALKING_TO_STOP": {
        if (activeTransitLeg) {
          const distToBoarding = this.calculateDistance(
            location.latitude,
            location.longitude,
            activeTransitLeg.boardingStop.latitude,
            activeTransitLeg.boardingStop.longitude
          );

          if (distToBoarding <= BOARDING_STOP_THRESHOLD_METERS) {
            nextState.currentState = "AT_STOP";
            // Invariant: Preserve valid early boarding confirmation when arriving at AT_STOP
            nextState.boardingConfirmed = activeState.boardingConfirmed ?? false;
            nextState.activeInstruction = `You have reached ${activeTransitLeg.boardingStop.name}. Wait here for vehicle ${activeTransitLeg.routeShortName || ""}.`;
            nextState.voicePrompt = `You are at ${activeTransitLeg.boardingStop.name}. Wait here for your vehicle.`;
            stateChanged = true;
          } else {
            nextState.activeInstruction = `Walk to ${activeTransitLeg.boardingStop.name} (${distToBoarding}m remaining).`;
          }
        }
        break;
      }

      case "AT_STOP": {
        // ANTI-HALLUCINATION / TRUST RULE: Require explicit boarding confirmation
        if (activeState.boardingConfirmed && activeTransitLeg) {
          nextState.currentState = "TRANSIT_LEG";
          nextState.currentLegIndex = nextTransitIdx !== -1 ? nextTransitIdx : activeLegIndex;
          nextState.activeInstruction = `On board ${activeTransitLeg.routeShortName || "vehicle"}. Stay on board until ${activeTransitLeg.alightingStop.name}.`;
          nextState.voicePrompt = `You are on board. Stay on until ${activeTransitLeg.alightingStop.name}.`;
          stateChanged = true;
        } else if (activeTransitLeg) {
          const distToBoarding = this.calculateDistance(
            location.latitude,
            location.longitude,
            activeTransitLeg.boardingStop.latitude,
            activeTransitLeg.boardingStop.longitude
          );

          if (distToBoarding > BOARDING_STOP_THRESHOLD_METERS) {
            nextState.currentState = "WALKING_TO_STOP";
            nextState.activeInstruction = `Walk to ${activeTransitLeg.boardingStop.name} (${distToBoarding}m remaining).`;
            nextState.voicePrompt = `Walk to ${activeTransitLeg.boardingStop.name}.`;
            stateChanged = true;
          } else {
            nextState.activeInstruction = `Waiting at ${activeTransitLeg.boardingStop.name}. Confirm when on board.`;
          }
        }
        break;
      }

      case "TRANSIT_LEG": {
        if (activeTransitLeg) {
          const distToAlighting = this.calculateDistance(
            location.latitude,
            location.longitude,
            activeTransitLeg.alightingStop.latitude,
            activeTransitLeg.alightingStop.longitude
          );
          const distToBoarding = this.calculateDistance(
            location.latitude,
            location.longitude,
            activeTransitLeg.boardingStop.latitude,
            activeTransitLeg.boardingStop.longitude
          );

          const t = this.calculateVectorProjection(
            activeTransitLeg.boardingStop.latitude,
            activeTransitLeg.boardingStop.longitude,
            activeTransitLeg.alightingStop.latitude,
            activeTransitLeg.alightingStop.longitude,
            location.latitude,
            location.longitude
          );

          let lastDistToAlighting: number | null = null;
          if (activeState.lastLocation) {
            lastDistToAlighting = this.calculateDistance(
              activeState.lastLocation.latitude,
              activeState.lastLocation.longitude,
              activeTransitLeg.alightingStop.latitude,
              activeTransitLeg.alightingStop.longitude
            );
          }

          const subsequentTransitIdx = findNextTransitLegIndex(activeLegIndex + 1);
          const nextTarget =
            subsequentTransitIdx !== -1 && journey.legs[subsequentTransitIdx]
              ? (journey.legs[subsequentTransitIdx] as TransitLeg).boardingStop
              : journey.destination;
          const distToNextTarget = this.calculateDistance(
            location.latitude,
            location.longitude,
            nextTarget.latitude,
            nextTarget.longitude
          );

          // Check if vehicle/user is moving away from alighting stop (distance increasing while past boarding stop)
          const isMovingAwayFromAlighting =
            lastDistToAlighting !== null &&
            distToAlighting > lastDistToAlighting &&
            distToBoarding > distToAlighting &&
            (distToAlighting <= 300 || t >= 1.0);

          const hasPassedStop =
            distToBoarding > distToAlighting &&
            (t >= 1.0 || isMovingAwayFromAlighting || distToNextTarget < distToAlighting);

          if (distToAlighting <= ALIGHTING_APPROACH_THRESHOLD_METERS) {
            nextState.currentState = "APPROACHING_ALIGHTING_STOP";
            nextState.activeInstruction = `${activeTransitLeg.alightingStop.name} is coming up in ${distToAlighting}m. Get ready to get off.`;
            nextState.voicePrompt = `${activeTransitLeg.alightingStop.name} is coming up. Get ready to get off.`;
            stateChanged = true;
          } else if (hasPassedStop) {
            // Overshoot protection: GPS update jumped past alighting stop or vehicle is moving away
            nextState.currentState = "APPROACHING_ALIGHTING_STOP";
            nextState.activeInstruction = `You have passed ${activeTransitLeg.alightingStop.name}. Get ready to get off.`;
            nextState.voicePrompt = `You have passed ${activeTransitLeg.alightingStop.name}. Get ready to get off.`;
            stateChanged = true;
          } else {
            nextState.activeInstruction = `On route ${activeTransitLeg.routeShortName || ""}. Staying on board.`;
          }
        }
        break;
      }

      case "APPROACHING_ALIGHTING_STOP": {
        if (activeTransitLeg) {
          const distToAlighting = this.calculateDistance(
            location.latitude,
            location.longitude,
            activeTransitLeg.alightingStop.latitude,
            activeTransitLeg.alightingStop.longitude
          );
          const distToBoarding = this.calculateDistance(
            location.latitude,
            location.longitude,
            activeTransitLeg.boardingStop.latitude,
            activeTransitLeg.boardingStop.longitude
          );

          const t = this.calculateVectorProjection(
            activeTransitLeg.boardingStop.latitude,
            activeTransitLeg.boardingStop.longitude,
            activeTransitLeg.alightingStop.latitude,
            activeTransitLeg.alightingStop.longitude,
            location.latitude,
            location.longitude
          );

          let lastDistToAlighting: number | null = null;
          if (activeState.lastLocation) {
            lastDistToAlighting = this.calculateDistance(
              activeState.lastLocation.latitude,
              activeState.lastLocation.longitude,
              activeTransitLeg.alightingStop.latitude,
              activeTransitLeg.alightingStop.longitude
            );
          }

          const subsequentTransitIdx = findNextTransitLegIndex(activeLegIndex + 1);
          const nextTarget =
            subsequentTransitIdx !== -1 && journey.legs[subsequentTransitIdx]
              ? (journey.legs[subsequentTransitIdx] as TransitLeg).boardingStop
              : journey.destination;
          const distToNextTarget = this.calculateDistance(
            location.latitude,
            location.longitude,
            nextTarget.latitude,
            nextTarget.longitude
          );

          const isMovingAwayFromAlighting =
            lastDistToAlighting !== null &&
            distToAlighting > lastDistToAlighting &&
            distToBoarding > distToAlighting &&
            (distToAlighting <= 300 || t >= 1.0);

          const hasPassedStop =
            distToBoarding > distToAlighting &&
            (t >= 1.0 || isMovingAwayFromAlighting || distToNextTarget < distToAlighting);

          if (distToAlighting <= ALIGHTED_STOP_THRESHOLD_METERS || hasPassedStop) {
            nextState.currentState = "ALIGHTED";
            const nextLegIndex = activeLegIndex + 1;
            nextState.currentLegIndex = nextLegIndex < journey.legs.length ? nextLegIndex : journey.legs.length - 1;
            nextState.activeInstruction = `Get off at ${activeTransitLeg.alightingStop.name}.`;
            nextState.voicePrompt = `Get off here at ${activeTransitLeg.alightingStop.name}.`;
            stateChanged = true;
          }
        }
        break;
      }

      case "ALIGHTED": {
        const nextLegIndex = activeState.currentLegIndex;
        const subsequentTransitIdx = findNextTransitLegIndex(nextLegIndex);

        if (subsequentTransitIdx !== -1) {
          // Additional transit leg remains (e.g. transfer journey)
          nextState.currentState = "WALKING_TO_STOP";
          nextState.boardingConfirmed = false; // Reset boarding confirmation for next transit leg
          const nextLeg = journey.legs[subsequentTransitIdx] as TransitLeg;
          nextState.activeInstruction = `Transfer: walk to ${nextLeg.boardingStop.name}.`;
          nextState.voicePrompt = `Walk to ${nextLeg.boardingStop.name} for your transfer vehicle.`;
          stateChanged = true;
        } else {
          // Final leg: walk to destination
          nextState.currentState = "WALKING_TO_DESTINATION";
          const distToDest = this.calculateDistance(
            location.latitude,
            location.longitude,
            journey.destination.latitude,
            journey.destination.longitude
          );
          nextState.activeInstruction = `Walk to your destination (${distToDest}m remaining).`;
          nextState.voicePrompt = `Walk to your final destination.`;
          stateChanged = true;
        }
        break;
      }

      case "WALKING_TO_DESTINATION": {
        const distToDest = this.calculateDistance(
          location.latitude,
          location.longitude,
          journey.destination.latitude,
          journey.destination.longitude
        );

        if (distToDest <= ARRIVAL_THRESHOLD_METERS) {
          nextState.currentState = "ARRIVED";
          nextState.activeInstruction = "You have reached your destination.";
          nextState.voicePrompt = "You have arrived.";
          stateChanged = true;
        } else {
          nextState.activeInstruction = `Walk to your destination (${distToDest}m remaining).`;
        }
        break;
      }
    }

    return {
      nextState,
      stateChanged,
    };
  }
}
