"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Map, { Marker, Source, Layer, NavigationControl, Popup, MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useMengedStore } from "@/store/useMengedStore";
import { mapJourneyToMapRenderData, MapRenderMarker } from "@/lib/journeyAdapter";
import { MapPin, Navigation, Compass, AlertCircle, RefreshCw } from "lucide-react";

// Gebeta basemap vector tile style endpoint (server-proxied for token protection)
const MAP_STYLE_URL = "/api/map-style";

export default function MengedMap() {
  const {
    activeJourney,
    rawJourneys,
    selectedRoute,
    originCoordinates,
    userLocation,
    gpsAccuracy,
    isNavigating,
  } = useMengedStore();

  const mapRef = useRef<MapRef | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<MapRenderMarker | null>(null);

  // State A (Planning): selectedRoute controls what the map displays
  // State B (Active Navigation): activeJourney is authoritative and pinned
  const journey = useMemo(() => {
    if (isNavigating && activeJourney) {
      return activeJourney;
    }
    if (selectedRoute) {
      return rawJourneys.find((j) => j.id === selectedRoute.id) || activeJourney || null;
    }
    return activeJourney || rawJourneys[0] || null;
  }, [isNavigating, activeJourney, selectedRoute, rawJourneys]);

  // Extract user location coordinates
  const userCoords = useMemo(() => {
    if (userLocation && typeof userLocation.lat === "number" && typeof userLocation.lng === "number") {
      return { latitude: userLocation.lat, longitude: userLocation.lng };
    }
    if (originCoordinates) {
      return originCoordinates;
    }
    return null;
  }, [userLocation, originCoordinates]);

  // Map render data
  const mapData = useMemo(() => {
    if (!journey) return null;
    return mapJourneyToMapRenderData(journey, userCoords);
  }, [journey, userCoords]);

  // Auto-fit bounds when journey or mapData changes
  useEffect(() => {
    if (mapData && mapRef.current && mapData.bounds) {
      const [minLng, minLat, maxLng, maxLat] = mapData.bounds;
      try {
        mapRef.current.fitBounds(
          [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
          { padding: 60, duration: 800 }
        );
      } catch (err) {
        console.warn("[MengedMap] Error fitting bounds:", err);
      }
    }
  }, [mapData]);

  // Default viewport centered on Addis Ababa
  const initialViewState = {
    longitude: userCoords?.longitude || 38.7578,
    latitude: userCoords?.latitude || 9.0192,
    zoom: 12,
  };

  const getMarkerColor = (type: MapRenderMarker["type"]) => {
    switch (type) {
      case "user": return "bg-blue-500 border-blue-300 text-white shadow-blue-500/50";
      case "origin": return "bg-emerald-500 border-emerald-300 text-black shadow-emerald-500/50";
      case "destination": return "bg-rose-500 border-rose-300 text-white shadow-rose-500/50";
      case "boarding": return "bg-teal-500 border-teal-300 text-white shadow-teal-500/50";
      case "transfer": return "bg-amber-500 border-amber-300 text-black shadow-amber-500/50";
      case "alighting": return "bg-indigo-500 border-indigo-300 text-white shadow-indigo-500/50";
      default: return "bg-zinc-800 border-zinc-600 text-zinc-300";
    }
  };

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-zinc-800 bg-[#0d0e11] flex flex-col justify-between shadow-2xl min-h-[380px]">
      {mapError ? (
        <div className="absolute inset-0 z-20 bg-zinc-950/95 p-6 flex flex-col items-center justify-center text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-500" />
          <h4 className="text-sm font-bold text-zinc-200 m-0">Map Tiles Unavailable</h4>
          <p className="text-xs text-zinc-400 max-w-xs m-0">{mapError}</p>
          <button
            onClick={() => setMapError(null)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Retry Map Load
          </button>
        </div>
      ) : (
        <Map
          ref={mapRef}
          initialViewState={initialViewState}
          style={{ width: "100%", height: "100%" }}
          mapStyle={MAP_STYLE_URL}
          onError={(e) => setMapError(e.error?.message || "Failed to load vector map tiles")}
        >
          <NavigationControl position="top-right" />

          {/* Render Polylines */}
          {mapData?.polylines.map((poly) => {
            const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: poly.coordinates,
              },
            };

            return (
              <Source key={poly.id} id={poly.id} type="geojson" data={geojson}>
                <Layer
                  id={`${poly.id}_layer`}
                  type="line"
                  paint={{
                    "line-color": poly.color,
                    "line-width": poly.type === "transit" ? 5 : 3,
                    "line-dasharray": poly.dashed ? [2, 2] : [1],
                    "line-opacity": 0.85,
                  }}
                />
              </Source>
            );
          })}

          {/* Render Markers */}
          {mapData?.markers.map((marker) => (
            <Marker
              key={marker.id}
              longitude={marker.coordinates[0]}
              latitude={marker.coordinates[1]}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedMarker(marker);
              }}
            >
              <div className="group cursor-pointer flex flex-col items-center relative">
                <div
                  className={`p-1.5 rounded-full border-2 shadow-lg flex items-center justify-center transition-transform hover:scale-125 ${getMarkerColor(
                    marker.type
                  )}`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <span className="text-[9px] font-bold bg-zinc-950/90 text-zinc-200 px-1.5 py-0.5 rounded border border-zinc-800 mt-1 whitespace-nowrap backdrop-blur-sm opacity-90 group-hover:opacity-100">
                  {marker.title}
                </span>
              </div>
            </Marker>
          ))}

          {/* Marker Popup */}
          {selectedMarker && (
            <Popup
              longitude={selectedMarker.coordinates[0]}
              latitude={selectedMarker.coordinates[1]}
              onClose={() => setSelectedMarker(null)}
              closeOnClick={false}
              className="z-30 text-xs"
            >
              <div className="p-2 space-y-1 font-sans">
                <span className="font-bold text-zinc-900 block">{selectedMarker.title}</span>
                {selectedMarker.subtitle && (
                  <span className="text-[11px] text-zinc-600 block">{selectedMarker.subtitle}</span>
                )}
                <span className="text-[9px] font-mono text-zinc-500 block">
                  [{selectedMarker.coordinates[1].toFixed(4)}, {selectedMarker.coordinates[0].toFixed(4)}]
                </span>
              </div>
            </Popup>
          )}
        </Map>
      )}

      {/* Map Header Floating Overlay */}
      <div className="p-4 z-10 flex justify-between items-start pointer-events-none w-full">
        <div className="bg-zinc-950/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-zinc-800/80 shadow-xl flex items-center gap-2 pointer-events-auto">
          <Compass className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: "12s" }} />
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Map Layer</span>
            <span className="text-xs font-bold text-zinc-200">
              {journey ? `${journey.origin.latitude.toFixed(3)} → ${journey.destination.latitude.toFixed(3)}` : "Addis Ababa Vector Grid"}
            </span>
          </div>
        </div>

        {gpsAccuracy && gpsAccuracy > 200 && (
          <div className="bg-amber-950/90 border border-amber-500/40 text-amber-200 px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1.5 pointer-events-auto shadow-lg">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Approximate Location (±{Math.round(gpsAccuracy)}m)</span>
          </div>
        )}
      </div>

      {/* Map Footer Status */}
      <div className="p-4 z-10 w-full pointer-events-none flex justify-between items-end">
        <div className="bg-zinc-950/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-800/80 text-[10px] text-zinc-400 font-mono pointer-events-auto">
          {userCoords ? `Lat: ${userCoords.latitude.toFixed(4)}° N | Lng: ${userCoords.longitude.toFixed(4)}° E` : "Detecting Coordinates..."}
        </div>
        {journey && (
          <div className="bg-emerald-500 text-black px-3 py-1.5 rounded-lg shadow-lg font-bold text-xs flex items-center gap-1.5 pointer-events-auto">
            <Navigation className="w-3.5 h-3.5 fill-black" />
            <span>{journey.transfersCount === 0 ? "Direct Journey" : `${journey.transfersCount}-Transfer Route`}</span>
          </div>
        )}
      </div>
    </div>
  );
}
