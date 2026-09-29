export interface JourneyMetrics {
  /**
   * Total walking distance across all walking and transfer legs (meters)
   */
  totalWalkingMeters: number;

  /**
   * Walking distance before boarding the first transit leg (meters)
   */
  walkingBeforeFirstTransitMeters: number;

  /**
   * Walking distance after alighting the final transit leg (meters)
   */
  walkingAfterLastTransitMeters: number;

  /**
   * Number of transfer legs in the journey (0 for direct journeys)
   */
  transfersCount: number;

  /**
   * Total estimated duration in minutes
   */
  estimatedDurationMinutes: number;

  /**
   * Number of transit legs in the journey
   */
  transitLegsCount: number;

  /**
   * Total geographic distance along all transit legs (meters)
   */
  transitDistanceMeters: number;

  /**
   * Total geographic distance along the full reconstructed journey path (meters)
   */
  journeyGeometryDistanceMeters: number;

  /**
   * Net progress toward destination achieved at the first transit boarding stop / initial segment (meters).
   * Positive = closer to destination; Negative = farther from destination.
   */
  initialDestinationProgressMeters: number;

  /**
   * Total accumulated distance moved away from destination along consecutive geometry points (meters).
   * Non-negative by definition.
   */
  totalBacktrackingMeters: number;

  /**
   * Ratio of straight-line origin-to-destination distance over total journey geometry path distance [0.0, 1.0].
   */
  destinationProgressRatio: number;

  /**
   * Cosine alignment of the initial movement vector relative to the origin-to-destination vector [-1.0, +1.0].
   * +1.0 = directly toward destination; 0.0 = perpendicular; -1.0 = directly away.
   */
  initialDirectionAlignment: number;
}
