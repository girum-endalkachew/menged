"use client";

import React, { useEffect, useState } from "react";
import { useMengedStore } from "@/store/useMengedStore";
import { ADDIS_KEY_STOPS } from "@/types/transit";
import { Compass, MapPin, Navigation } from "lucide-react";

export default function MengedMap() {
  const { selectedRoute } = useMengedStore();
  const [zoom, setZoom] = useState(13);

  // Focus center of Addis when route changes
  const center = { lat: 9.0192, lng: 38.7578 };

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-zinc-800 bg-[#0d0e11] flex flex-col justify-between shadow-2xl">
      {/* Simulation of a real high-fidelity vector dark map style */}
      <div className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px]" />
      
      {/* Simulated map route drawing layer */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        {selectedRoute && (
          <>
            {/* Draw route paths */}
            <polyline
              points={selectedRoute.pathCoordinates.map(([lng, lat], i) => {
                // simple scaling math to render beautifully on screen regardless of exact coordinates
                const x = 120 + ((lng - 38.74) * 4500);
                const y = 350 - ((lat - 8.99) * 4500);
                return `${x},${y}`;
              }).join(" ")}
              fill="none"
              stroke="#10b981"
              strokeWidth="4"
              strokeDasharray="6,4"
              className="animate-pulse"
            />
            {/* Outline background glowing line */}
            <polyline
              points={selectedRoute.pathCoordinates.map(([lng, lat], i) => {
                const x = 120 + ((lng - 38.74) * 4500);
                const y = 350 - ((lat - 8.99) * 4500);
                return `${x},${y}`;
              }).join(" ")}
              fill="none"
              stroke="#10b981"
              strokeWidth="10"
              strokeLinecap="round"
              className="opacity-20 blur-sm"
            />
          </>
        )}
      </svg>

      {/* Display Addis Ababa Stop Pins */}
      <div className="absolute inset-0 pointer-events-none">
        {Object.values(ADDIS_KEY_STOPS).map((stop) => {
          const x = 120 + ((stop.coordinates[0] - 38.74) * 4500);
          const y = 350 - ((stop.coordinates[1] - 8.99) * 4500);

          const isOrigin = selectedRoute?.origin === stop.name || selectedRoute?.steps.some(s => s.from === stop.name);
          const isDestination = selectedRoute?.destination === stop.name || selectedRoute?.steps.some(s => s.to === stop.name);

          return (
            <div
              key={stop.id}
              className="absolute transition-all duration-300 flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
              style={{ left: `${x}px`, top: `${y}px` }}
            >
              <div className={`p-1 rounded-full border shadow-lg flex items-center justify-center ${
                isOrigin 
                  ? "bg-emerald-500 border-emerald-300 text-black scale-110" 
                  : isDestination 
                  ? "bg-indigo-500 border-indigo-300 text-white scale-110 animate-bounce" 
                  : "bg-zinc-900 border-zinc-700 text-zinc-400 scale-90"
              }`}>
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <span className="text-[9px] font-bold bg-zinc-950/80 px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-300 mt-1 backdrop-blur-sm">
                {stop.nameAmharic}
              </span>
            </div>
          );
        })}
      </div>

      {/* Map Header Floating Overlay */}
      <div className="p-4 z-10 flex justify-between items-start pointer-events-none w-full">
        <div className="bg-zinc-950/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-zinc-800/80 shadow-xl flex items-center gap-2 pointer-events-auto">
          <Compass className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: "12s" }} />
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Map Layer</span>
            <span className="text-xs font-bold text-zinc-200">Addis Ababa Central Grid</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 pointer-events-auto">
          <button onClick={() => setZoom(z => z + 1)} className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white font-bold text-sm">+</button>
          <button onClick={() => setZoom(z => z - 1)} className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white font-bold text-sm">-</button>
        </div>
      </div>

      {/* Map Footer status */}
      <div className="p-4 z-10 w-full pointer-events-none flex justify-between items-end">
        <div className="bg-zinc-950/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-800/80 text-[10px] text-zinc-400 font-mono pointer-events-auto">
          Lat: 9.0192° N | Lng: 38.7578° E
        </div>
        {selectedRoute && (
          <div className="bg-emerald-500 text-black px-3 py-1.5 rounded-lg shadow-lg font-bold text-xs flex items-center gap-1.5 pointer-events-auto animate-pulse">
            <Navigation className="w-3.5 h-3.5 fill-black" />
            Route Rendered
          </div>
        )}
      </div>
    </div>
  );
}
