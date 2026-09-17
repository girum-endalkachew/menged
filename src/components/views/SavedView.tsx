"use client";

import React from "react";
import { useMengedStore } from "@/store/useMengedStore";
import { Bookmark, Home, Briefcase, GraduationCap, MapPin, Navigation, Plus } from "lucide-react";

export default function SavedView() {
  const { savedPlaces, savedRoutes, setOrigin, setDestination, setActiveTab } = useMengedStore();

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between border-b border-[#D9DED8] dark:border-[#315047] pb-4">
        <div>
          <h2 className="font-h2 text-[#17332D] dark:text-[#F4F0E6]">Saved</h2>
          <p className="text-xs text-[#6E7772] dark:text-[#A8B5AE] font-mono">Places and favorite routes</p>
        </div>
        <Bookmark className="w-5 h-5 text-[#C99A3D]" />
      </div>

      {/* Places */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-mono uppercase tracking-widest text-[#6E7772] dark:text-[#A8B5AE]">Saved Places</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {savedPlaces.map((place) => (
            <div key={place.id} className="glass-panel p-5 space-y-3">
              <div className="flex items-center gap-2">
                {place.label === "Home" ? <Home className="w-4 h-4 text-[#C99A3D]" /> : <Briefcase className="w-4 h-4 text-[#173C32] dark:text-[#D2A64C]" />}
                <span className="font-bold text-sm text-[#17332D] dark:text-[#F4F0E6]">{place.label}</span>
              </div>
              <p className="text-xs font-semibold text-[#17332D] dark:text-[#F4F0E6] m-0">{place.name}</p>
              <p className="text-[11px] text-[#6E7772] dark:text-[#A8B5AE] font-mono m-0">{place.address}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Routes */}
      <div className="space-y-3">
        <span className="text-xs font-mono uppercase tracking-widest text-[#6E7772] dark:text-[#A8B5AE]">Saved Routes</span>
        {savedRoutes.map((route) => (
          <div key={route.id} className="glass-panel p-5 flex justify-between items-center">
            <div>
              <h3 className="font-h3 text-[#17332D] dark:text-[#F4F0E6]">
                {route.origin} → {route.destination}
              </h3>
              <p className="text-xs text-[#6E7772] dark:text-[#A8B5AE] font-mono">
                {route.totalCostETB} ETB · ~{route.estimatedMinutes} mins
              </p>
            </div>
            <button
              onClick={() => {
                setOrigin(route.origin);
                setDestination(route.destination);
                setActiveTab("plan");
              }}
              className="btn-forest text-xs"
            >
              Plan now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}