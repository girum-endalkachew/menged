"use client";

import { useEffect, useRef } from "react";
import { useMengedStore } from "@/store/useMengedStore";
import { GPSLocation } from "@/types/navigation";

const DISPLACEMENT_THRESHOLD_METERS = 3;
const TIME_THRESHOLD_MS = 2000;

/**
 * Calculates approximate distance in meters between two lat/lng pairs using haversine formula
 */
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useJourneyGeolocation() {
  const {
    isNavigating,
    activeJourney,
    evaluateJourneyState,
    setGpsError,
  } = useMengedStore();

  const watchIdRef = useRef<number | null>(null);
  const lastLocationRef = useRef<GPSLocation | null>(null);

  useEffect(() => {
    // Stop watching if navigation is inactive or no active journey exists
    if (!isNavigating || !activeJourney) {
      if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      lastLocationRef.current = null;
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsError("Geolocation is not supported by this browser.");
      return;
    }

    // Clear existing watcher before starting a new one to prevent duplicate watchers
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    const handleSuccess = (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      if (isNaN(lat) || isNaN(lon) || !isFinite(lat) || !isFinite(lon)) {
        return;
      }

      const timestamp = pos.timestamp || Date.now();
      const currentLocation: GPSLocation = {
        latitude: lat,
        longitude: lon,
        speed: pos.coords.speed ?? null,
        heading: pos.coords.heading ?? null,
        accuracy: pos.coords.accuracy ?? 10,
        timestamp,
      };

      // Throttling / filtering insignificant GPS updates
      if (lastLocationRef.current) {
        const dist = calculateDistanceMeters(
          lastLocationRef.current.latitude,
          lastLocationRef.current.longitude,
          lat,
          lon
        );
        const timeDiff = timestamp - lastLocationRef.current.timestamp;

        if (dist < DISPLACEMENT_THRESHOLD_METERS && timeDiff < TIME_THRESHOLD_MS) {
          return;
        }
      }

      lastLocationRef.current = currentLocation;
      setGpsError(null);
      evaluateJourneyState(currentLocation);
    };

    const handleError = (error: GeolocationPositionError) => {
      switch (error.code) {
        case error.PERMISSION_DENIED:
          setGpsError("Geolocation permission denied. Please allow location access to navigate.");
          break;
        case error.POSITION_UNAVAILABLE:
          setGpsError("GPS position unavailable. Check location settings.");
          break;
        case error.TIMEOUT:
          setGpsError("GPS location request timed out.");
          break;
        default:
          setGpsError("An unknown geolocation error occurred.");
          break;
      }
    };

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 1000,
    };

    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, options);
    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isNavigating, activeJourney, evaluateJourneyState, setGpsError]);
}
