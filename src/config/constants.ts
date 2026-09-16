/**
 * Menged Transit & Navigation Configuration Constants
 * Centralized threshold values for spatial evaluation and state transitions.
 */

// Geofencing Spatial Thresholds (in meters)
export const BOARDING_STOP_THRESHOLD_METERS = 35;
export const ALIGHTING_APPROACH_THRESHOLD_METERS = 120;
export const ALIGHTED_STOP_THRESHOLD_METERS = 30;
export const ARRIVAL_THRESHOLD_METERS = 25;
export const TRANSFER_MAX_DISTANCE_METERS = 250;

// Speed Thresholds (in kilometers per hour)
export const DEFAULT_WALKING_SPEED_KMH = 4.5;
export const TRANSIT_VEHICLE_SPEED_THRESHOLD_KMH = 15.0;
export const ALIGHTING_SPEED_THRESHOLD_KMH = 6.0;

// Search Defaults
export const DEFAULT_STOP_SEARCH_RADIUS_METERS = 500;
export const DEFAULT_MAX_TRANSFERS = 1;
