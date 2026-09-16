import { Coordinate } from "./journey";

export type NavigationState =
  | "PLANNED"
  | "WALKING_TO_STOP"
  | "AT_STOP"
  | "TRANSIT_LEG"
  | "APPROACHING_ALIGHTING_STOP"
  | "ALIGHTED"
  | "WALKING_TO_DESTINATION"
  | "ARRIVED";

export interface GPSLocation {
  latitude: number;
  longitude: number;
  speed: number | null; // meters per second or null
  heading: number | null; // degrees or null
  accuracy: number; // meters
  timestamp: number;
}

export interface ActiveJourneyState {
  journeyId: string;
  currentState: NavigationState;
  currentLegIndex: number;
  boardingConfirmed: boolean;
  lastLocation: GPSLocation | null;
  activeInstruction: string;
  voicePrompt: string;
}

export interface StateEvaluationResult {
  nextState: ActiveJourneyState;
  stateChanged: boolean;
}
