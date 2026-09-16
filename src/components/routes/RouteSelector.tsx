"use client";

import React from "react";
import { useMengedStore } from "@/store/useMengedStore";
import { RouteOption } from "@/types/transit";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Navigation, Compass, DollarSign, CornerDownRight } from "lucide-react";

export default function RouteSelector() {
  const { routes, selectedRoute, setSelectedRoute, language } = useMengedStore();

  const getModeColor = (mode: string) => {
    switch (mode) {
      case "minibus": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "bus": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "lrt": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Available Options</h3>
        <span className="text-xs text-zinc-500 font-mono">{routes.length} paths found</span>
      </div>

      <div className="space-y-3">
        {routes.map((route: RouteOption) => {
          const isSelected = selectedRoute?.id === route.id;
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
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-400 font-medium">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <DollarSign className="w-3..5 h-3.5" />
                      {route.totalCostETB} ETB
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {route.estimatedMinutes} mins
                    </span>
                    <span className="flex items-center gap-1">
                      <Navigation className="w-3.5 h-3.5" />
                      {route.transfers === 0 ? "Direct" : `${route.transfers} transfers`}
                    </span>
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
                          <span>{step.costETB} Birr</span>
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
