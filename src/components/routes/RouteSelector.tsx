"use client";

import React from "react";
import { useMengedStore } from "@/store/useMengedStore";
import { RouteOption } from "@/types/transit";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Navigation, Compass, DollarSign, CornerDownRight } from "lucide-react";
import PlaceSearchInput from "@/components/planner/PlaceSearchInput";

export default function RouteSelector() {
  const { routes, selectedRoute, setSelectedRoute, language, isLoadingRoutes, routeError } = useMengedStore();

  const getModeColor = (mode: string) => {
    switch (mode) {
      case "minibus": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "bus": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "lrt": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  if (isLoadingRoutes) {
    return (
      <div className="space-y-4 w-full py-8 text-center">
        <div className="inline-flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-900/60 border border-emerald-500/30 text-emerald-400 text-sm font-medium">
          <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span>Searching GTFS transit graph...</span>
        </div>
      </div>
    );
  }

  if (routeError) {
    return (
      <div className="space-y-4 w-full">
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-xs space-y-2">
          <div className="font-bold text-red-400 flex items-center gap-1.5 text-sm">
            <span>⚠️</span> Route Search Error
          </div>
          <p className="m-0 leading-relaxed">{routeError}</p>
        </div>
      </div>
    );
  }

  const {
    originName,
    originCoordinates,
    destinationName,
    destinationCoordinates,
    setManualOrigin,
    setDestinationPlace,
    fetchRoutes,
  } = useMengedStore();

  const handleSearch = async () => {
    if (originCoordinates && destinationCoordinates) {
      await fetchRoutes(originCoordinates, destinationCoordinates);
    }
  };

  if (routes.length === 0) {
    return (
      <div className="space-y-4 w-full p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
        <h4 className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider m-0">
          Plan Your Transit Journey
        </h4>
        <p className="text-xs text-zinc-400 m-0 leading-relaxed">
          Select starting location and destination to search real GTFS routes across Addis Ababa.
        </p>

        <div className="space-y-3 pt-1">
          <div>
            <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">Starting Point (Origin)</label>
            <PlaceSearchInput
              placeholder="Origin (e.g. Bole Medhanialem, Mexico...)"
              initialValue={originName}
              onSelectPlace={(place) => setManualOrigin(place)}
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">Destination</label>
            <PlaceSearchInput
              placeholder="Destination (e.g. Piassa, 4 Kilo, Ayat...)"
              initialValue={destinationName}
              onSelectPlace={(place) => setDestinationPlace(place)}
            />
          </div>

          <button
            onClick={handleSearch}
            disabled={!originCoordinates || !destinationCoordinates}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border-none shadow-lg mt-2"
          >
            Find Real Routes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Available Options</h3>
        <span className="text-xs text-zinc-500 font-mono">{routes.length} paths found</span>
      </div>

      <div className="space-y-3">
        {routes.map((route: RouteOption) => {
          const isSelected = selectedRoute?.id === route.id;
          const isFareUnavailable = route.fareStatus === "UNAVAILABLE" || route.trust?.fare === "UNAVAILABLE";

          return (
            <Card
              key={route.id}
              onClick={() => setSelectedRoute(route)}
              className={`p-4 cursor-pointer transition-all duration-300 border bg-zinc-900/40 hover:bg-zinc-900/70 ${
                isSelected 
                  ? "border-emerald-500/60 shadow-xl shadow-emerald-950/20 bg-zinc-900/90" 
                  : "border-zinc-800/80"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-zinc-100">
                      {route.origin} → {route.destination}
                    </span>
                    <Badge variant="outline" className={getModeColor(route.mode)}>
                      {route.mode.toUpperCase()}
                    </Badge>
                    {route.trust?.transit === "VERIFIED" && (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-mono">
                        VERIFIED
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 font-medium pt-1">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <DollarSign className="w-3.5 h-3.5" />
                      {isFareUnavailable ? (
                        <span className="text-zinc-400">Fare unavailable</span>
                      ) : (
                        <span>Estimated · {route.totalCostETB} ETB</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {route.estimatedMinutes} mins
                    </span>
                    <span className="flex items-center gap-1 text-zinc-400">
                      <Navigation className="w-3.5 h-3.5" />
                      {route.transfers === 0 ? "Direct" : `${route.transfers} transfer${route.transfers > 1 ? "s" : ""}`}
                    </span>
                    {route.walkingMinutes > 0 && (
                      <span className="text-zinc-500 text-[11px] font-mono">
                        (Walk {route.walkingMinutes} min)
                      </span>
                    )}
                  </div>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  {route.tag}
                </Badge>
              </div>

              {/* Steps inside selected route card */}
              {isSelected && (
                <div className="mt-4 pt-3 border-t border-zinc-800/60 space-y-3 animate-fade-in">
                  <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                    <Compass className="w-3 h-3" /> Step-by-Step Directions
                  </div>
                  {route.steps.map((step, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start">
                      <CornerDownRight className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-zinc-200">
                          {language === "am" ? step.instructionAmharic : step.instruction}
                        </p>
                        <div className="flex gap-2 text-[10px] text-zinc-500 font-mono">
                          <span>{step.vehicleType}</span>
                          <span>•</span>
                          <span>{isFareUnavailable ? "Fare n/a" : `Est. ${step.costETB} Birr`}</span>
                          <span>•</span>
                          <span>{step.durationMins} mins</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
