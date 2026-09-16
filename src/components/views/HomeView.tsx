"use client";

import React from "react";
import { useMengedStore } from "@/store/useMengedStore";
import VoiceMic from "@/components/voice/VoiceMic";
import { MapPin, Navigation, ArrowRight, Home, Briefcase, GraduationCap, History, Bookmark, Sparkles } from "lucide-react";

export default function HomeView() {
  const { 
    userLocation, 
    savedPlaces, 
    tripHistory, 
    setOrigin, 
    setDestination, 
    setActiveTab, 
    language 
  } = useMengedStore();

  const handleSelectQuickTrip = (from: string, to: string) => {
    setOrigin(from);
    setDestination(to);
    setActiveTab("plan");
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header & Location Banner */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-[#D9DED8] dark:border-[#315047] pb-4">
          <div className="flex items-center gap-2 text-xs font-mono text-[#6E7772] dark:text-[#A8B5AE]">
            <MapPin className="w-4 h-4 text-[#C99A3D]" />
            <span>Current Location</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#173C32]/10 dark:bg-[#D2A64C]/10 text-[#173C32] dark:text-[#D2A64C]">
            GPS ACTIVE
          </span>
        </div>

        <div>
          <span className="text-xs text-[#6E7772] dark:text-[#A8B5AE] font-mono">You are around</span>
          <h2 className="font-h2 text-[#17332D] dark:text-[#F4F0E6] mt-0.5">
            {userLocation?.name || "Bole Medhanialem"}
          </h2>
        </div>
      </div>

      {/* Primary Voice Action */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-h3 text-[#17332D] dark:text-[#F4F0E6]">Where are you going?</h3>
          <span className="text-xs text-[#6E7772] dark:text-[#A8B5AE] font-mono">Voice First</span>
        </div>
        <VoiceMic />
      </div>

      {/* Saved Places Quick Actions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-widest text-[#6E7772] dark:text-[#A8B5AE]">
            Saved Places
          </span>
          <button
            onClick={() => setActiveTab("saved")}
            className="text-xs text-[#C99A3D] hover:underline bg-transparent border-none cursor-pointer"
          >
            Manage
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {savedPlaces.map((place) => {
            const icon = place.label === "Home" 
              ? <Home className="w-4 h-4 text-[#C99A3D]" />
              : place.label === "Work" 
              ? <Briefcase className="w-4 h-4 text-[#173C32] dark:text-[#D2A64C]" />
              : <GraduationCap className="w-4 h-4 text-[#B9653D]" />;

            return (
              <button
                key={place.id}
                onClick={() => handleSelectQuickTrip(userLocation?.name || "Bole", place.name)}
                className="glass-panel p-4 flex items-center justify-between hover:border-[#C99A3D]/50 transition-all cursor-pointer text-left border border-transparent"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/50 dark:bg-[#10251F]/50">
                    {icon}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#17332D] dark:text-[#F4F0E6] block">{place.label}</span>
                    <span className="text-[11px] text-[#6E7772] dark:text-[#A8B5AE] font-mono">{place.name}</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#D9DED8] dark:text-[#315047]" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Trips History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-widest text-[#6E7772] dark:text-[#A8B5AE]">
            Recent Journeys
          </span>
          <button
            onClick={() => setActiveTab("journeys")}
            className="text-xs text-[#C99A3D] hover:underline bg-transparent border-none cursor-pointer"
          >
            View all
          </button>
        </div>

        <div className="space-y-2">
          {tripHistory.slice(0, 3).map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelectQuickTrip(item.origin, item.destination)}
              className="w-full glass-panel p-4 flex items-center justify-between hover:border-[#173C32]/30 dark:hover:border-[#D2A64C]/30 transition-all cursor-pointer text-left border border-transparent"
            >
              <div className="flex items-center gap-3">
                <History className="w-4 h-4 text-[#6E7772] dark:text-[#A8B5AE]" />
                <div>
                  <span className="text-xs font-semibold text-[#17332D] dark:text-[#F4F0E6] block">
                    {item.origin} → {item.destination}
                  </span>
                  <span className="text-[10px] text-[#6E7772] dark:text-[#A8B5AE] font-mono">
                    {item.date} · {item.durationMins} min
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono text-[#173C32] dark:text-[#D2A64C] font-semibold">
                {item.costETB} ETB
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}