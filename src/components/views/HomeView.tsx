"use client";

import React, { useEffect } from "react";
import { useMengedStore } from "@/store/useMengedStore";
import VoiceMic from "@/components/voice/VoiceMic";
import PlaceSearchInput from "@/components/planner/PlaceSearchInput";
import { MapPin, ArrowRight, Home, Briefcase, History, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Coordinate } from "@/types/journey";

export default function HomeView() {
  const { 
    originType,
    originName,
    originCoordinates,
    destinationName,
    destinationCoordinates,
    gpsStatus,
    requestGPSLocation,
    setManualOrigin,
    setDestinationPlace,
    savedPlaces, 
    tripHistory, 
    setActiveTab,
    fetchRoutes
  } = useMengedStore();

  useEffect(() => {
    if (gpsStatus === "detecting") {
      requestGPSLocation();
    }
  }, [gpsStatus, requestGPSLocation]);

  const handleSelectDestination = async (place: { name: string; coordinates: Coordinate }) => {
    setDestinationPlace(place);
    if (originCoordinates) {
      setActiveTab("plan");
      await fetchRoutes(originCoordinates, place.coordinates);
    }
  };

  const handleSelectQuickTrip = async (fromCoords: Coordinate, toCoords: Coordinate, fromName: string, toName: string) => {
    setManualOrigin({ name: fromName, coordinates: fromCoords });
    setDestinationPlace({ name: toName, coordinates: toCoords });
    setActiveTab("plan");
    await fetchRoutes(fromCoords, toCoords);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Location Banner */}
      <div className="glass-panel p-6 space-y-4 bg-white border-[#E4E7E5]">
        <div className="flex justify-between items-center border-b border-[#F3F4F1] pb-3">
          <div className="flex items-center gap-2 text-xs font-mono text-[#66736D]">
            <MapPin className="w-4 h-4 text-[#2E8B68]" />
            <span>GPS Status</span>
          </div>
          {gpsStatus === "active" ? (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#2E8B68]/10 text-[#2E8B68] font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> GPS ACTIVE
            </span>
          ) : gpsStatus === "detecting" ? (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 font-bold flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" /> DETECTING GPS...
            </span>
          ) : (
            <button
              onClick={() => requestGPSLocation()}
              className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E7B84B]/20 text-[#123C2F] font-bold border-none cursor-pointer hover:bg-[#E7B84B]/40 transition-colors"
            >
              Retry GPS
            </button>
          )}
        </div>

        <div>
          <span className="text-xs text-[#9AA49F] font-mono block">Starting Location</span>
          {originType === "gps" && originCoordinates ? (
            <div className="mt-1">
              <h2 className="font-h2 text-[#123C2F] m-0 flex items-center gap-2">
                <span>Current Location</span>
                <span className="text-xs text-[#2E8B68] font-mono font-normal">
                  ({originCoordinates.latitude.toFixed(4)}, {originCoordinates.longitude.toFixed(4)})
                </span>
              </h2>
            </div>
          ) : originType === "place" && originName ? (
            <div className="mt-1">
              <h2 className="font-h2 text-[#123C2F] m-0">{originName}</h2>
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-center gap-2 font-mono">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>GPS is unavailable. Please search and select your starting point manually below.</span>
              </div>
              <PlaceSearchInput
                placeholder="Choose starting point..."
                onSelectPlace={(place) => setManualOrigin(place)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Destination Search Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-h3 text-[#123C2F] m-0">Where do you want to go?</h3>
          <span className="text-xs text-[#9AA49F] font-mono">Gebeta Geocoded</span>
        </div>
        <PlaceSearchInput
          placeholder="Type destination (e.g. Piassa, 4 Kilo, Mexico, Edna Mall)..."
          onSelectPlace={handleSelectDestination}
          initialValue={destinationName}
        />

        <VoiceMic />
      </div>

      {/* Saved Places */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-widest text-[#2E8B68] font-bold">Saved Places</span>
          <button onClick={() => setActiveTab("saved")} className="text-xs text-[#E7B84B] font-semibold bg-transparent border-none cursor-pointer">
            Manage
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {savedPlaces.map((place) => {
            const destCoords: Coordinate = { latitude: place.coordinates[1], longitude: place.coordinates[0] };
            return (
              <button
                key={place.id}
                onClick={() => {
                  if (originCoordinates) {
                    handleSelectQuickTrip(originCoordinates, destCoords, originName || "Current Location", place.name);
                  } else {
                    setDestinationPlace({ name: place.name, coordinates: destCoords });
                    setActiveTab("plan");
                  }
                }}
                className="glass-panel p-4 flex items-center justify-between hover:border-[#2E8B68] transition-all cursor-pointer text-left bg-white"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#FAF9F6]">
                    {place.label === "Home" ? <Home className="w-4 h-4 text-[#E7B84B]" /> : <Briefcase className="w-4 h-4 text-[#123C2F]" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#17231F] block">{place.label}</span>
                    <span className="text-[11px] text-[#66736D] font-mono">{place.name}</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#9AA49F]" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}