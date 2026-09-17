"use client";

import React, { useState } from "react";
import { useMengedStore } from "@/store/useMengedStore";
import VoiceMic from "@/components/voice/VoiceMic";
import { MapPin, Navigation, ArrowRight, Home, Briefcase, GraduationCap, History, Compass, CheckCircle2 } from "lucide-react";

export default function HomeView() {
  const { 
    userLocation, 
    setUserLocation,
    hasLocationPermission,
    setHasLocationPermission,
    savedPlaces, 
    tripHistory, 
    setOrigin, 
    setDestination, 
    setActiveTab 
  } = useMengedStore();

  const [requestingGPS, setRequestingGPS] = useState(false);

  const handleRequestGPS = () => {
    setRequestingGPS(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            name: "Current Location (GPS Active)"
          });
          setHasLocationPermission(true);
          setRequestingGPS(false);
        },
        () => {
          setHasLocationPermission(false);
          setRequestingGPS(false);
        }
      );
    } else {
      setRequestingGPS(false);
    }
  };

  const handleSelectQuickTrip = (from: string, to: string) => {
    setOrigin(from);
    setDestination(to);
    setActiveTab("plan");
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Location Banner */}
      <div className="glass-panel p-6 space-y-4 bg-white border-[#E4E7E5]">
        <div className="flex justify-between items-center border-b border-[#F3F4F1] pb-3">
          <div className="flex items-center gap-2 text-xs font-mono text-[#66736D]">
            <MapPin className="w-4 h-4 text-[#E7B84B]" />
            <span>GPS Sensor</span>
          </div>
          {hasLocationPermission ? (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#2E8B68]/10 text-[#2E8B68] font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> ACTIVE
            </span>
          ) : (
            <button
              onClick={handleRequestGPS}
              className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E7B84B]/20 text-[#123C2F] font-bold border-none cursor-pointer"
            >
              {requestingGPS ? "Locating..." : "Enable GPS"}
            </button>
          )}
        </div>

        <div>
          <span className="text-xs text-[#9AA49F] font-mono block">Starting from</span>
          <h2 className="font-h2 text-[#123C2F] mt-0.5 m-0">
            {userLocation?.name || "Bole Medhanialem"}
          </h2>
        </div>
      </div>

      {/* Voice Control */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-h3 text-[#123C2F] m-0">Where are you going?</h3>
          <span className="text-xs text-[#9AA49F] font-mono">Voice First</span>
        </div>
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
          {savedPlaces.map((place) => (
            <button
              key={place.id}
              onClick={() => handleSelectQuickTrip(userLocation?.name || "Bole", place.name)}
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
          ))}
        </div>
      </div>

      {/* Recent Trips */}
      <div className="space-y-3">
        <span className="text-xs font-mono uppercase tracking-widest text-[#2E8B68] font-bold block">Recent Journeys</span>
        <div className="space-y-2">
          {tripHistory.slice(0, 3).map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelectQuickTrip(item.origin, item.destination)}
              className="w-full glass-panel p-4 flex items-center justify-between hover:border-[#2E8B68] transition-all cursor-pointer text-left bg-white"
            >
              <div className="flex items-center gap-3">
                <History className="w-4 h-4 text-[#9AA49F]" />
                <div>
                  <span className="text-xs font-bold text-[#17231F] block">{item.origin} → {item.destination}</span>
                  <span className="text-[10px] text-[#66736D] font-mono">{item.date} · {item.durationMins} min</span>
                </div>
              </div>
              <span className="text-xs font-mono text-[#2E8B68] font-bold">{item.costETB} ETB</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}