"use client";

import React from "react";
import { useMengedStore } from "@/store/useMengedStore";
import { 
  Footprints, 
  Bus, 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  AlertCircle, 
  Volume2, 
  X,
  Compass,
  Repeat2,
  ShieldCheck
} from "lucide-react";

export default function JourneyCompanion() {
  const { 
    journeyState, 
    setJourneyState, 
    selectedRoute, 
    cancelJourney, 
    language 
  } = useMengedStore();

  if (!selectedRoute) return null;

  // Render ARRIVED State Summary
  if (journeyState === "ARRIVED") {
    return (
      <div className="glass-panel p-6 space-y-6 fade-in border-[#C99A3D]/40">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#C99A3D]/20 text-[#C99A3D] flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-h3 text-[#17332D] dark:text-[#F4F0E6]">
              {language === "am" ? "እዚህ ደርሰዋል።" : "You have arrived."}
            </h3>
            <p className="text-xs text-[#6E7772] dark:text-[#A8B5AE] font-mono">
              {selectedRoute.origin} → {selectedRoute.destination}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-white/40 dark:bg-[#10251F]/40 border border-[#D9DED8] dark:border-[#315047] text-center font-mono">
          <div>
            <span className="text-[10px] text-[#6E7772] dark:text-[#A8B5AE] block">TIME</span>
            <span className="text-sm font-bold text-[#17332D] dark:text-[#F4F0E6]">{selectedRoute.estimatedMinutes} min</span>
          </div>
          <div>
            <span className="text-[10px] text-[#6E7772] dark:text-[#A8B5AE] block">FARE</span>
            <span className="text-sm font-bold text-[#173C32] dark:text-[#D2A64C]">{selectedRoute.totalCostETB} ETB</span>
          </div>
          <div>
            <span className="text-[10px] text-[#6E7772] dark:text-[#A8B5AE] block">TRANSFERS</span>
            <span className="text-sm font-bold text-[#17332D] dark:text-[#F4F0E6]">{selectedRoute.transfers}</span>
          </div>
        </div>

        <button
          onClick={cancelJourney}
          className="btn-forest w-full justify-center py-3 text-sm font-medium"
        >
          {language === "am" ? "ጉዞን አጠናቅ" : "Done"}
        </button>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6 space-y-6 fade-in relative border-[#173C32]/30 dark:border-[#D2A64C]/30 shadow-2xl">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-[#D9DED8] dark:border-[#315047] pb-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#C99A3D] animate-ping" />
          <span className="text-xs font-mono uppercase tracking-widest text-[#173C32] dark:text-[#D2A64C] font-semibold">
            {journeyState.replace(/_/g, " ")}
          </span>
        </div>

        <button
          onClick={cancelJourney}
          className="text-xs text-[#6E7772] dark:text-[#A8B5AE] hover:text-[#B9653D] flex items-center gap-1 bg-transparent border-none cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          <span>{language === "am" ? "ሰርዝ" : "Cancel"}</span>
        </button>
      </div>

      {/* STATE-SPECIFIC GUIDANCE CARDS */}

      {/* PREPARING */}
      {journeyState === "PREPARING" && (
        <div className="space-y-4 text-center py-4">
          <Compass className="w-8 h-8 text-[#C99A3D] animate-spin mx-auto" style={{ animationDuration: "3s" }} />
          <p className="font-h3 text-[#17332D] dark:text-[#F4F0E6]">
            {language === "am" ? "መንገድዎን በማዘጋጀት ላይ..." : "Preparing your journey..."}
          </p>
          <p className="text-xs text-[#6E7772] dark:text-[#A8B5AE]">
            Connecting to GPS & route telemetry
          </p>
        </div>
      )}

      {/* WALKING TO STOP */}
      {journeyState === "WALKING_TO_STOP" && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-[#173C32]/10 dark:bg-[#D2A64C]/10 text-[#173C32] dark:text-[#D2A64C]">
              <Footprints className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[#6E7772] dark:text-[#A8B5AE]">Walk to station</span>
              <h3 className="font-h3 text-[#17332D] dark:text-[#F4F0E6]">
                Walk to {selectedRoute.steps[0]?.from || selectedRoute.origin} terminal
              </h3>
              <p className="text-xs text-[#6E7772] dark:text-[#A8B5AE] font-mono mt-0.5">
                ~{selectedRoute.walkingMinutes} min ({selectedRoute.walkingMinutes * 70}m)
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/50 dark:bg-[#10251F]/50 border border-[#D9DED8] dark:border-[#315047] text-xs space-y-1">
            <span className="font-mono text-[#C99A3D] block font-semibold">DIRECTION</span>
            <p className="text-[#17332D] dark:text-[#F4F0E6] m-0">
              Head east towards the main taxi queue. Look for white and blue minibuses.
            </p>
          </div>

          <button
            onClick={() => setJourneyState("AT_STOP")}
            className="btn-forest w-full justify-center py-3 text-xs uppercase tracking-wider"
          >
            <span>Arrived at stop</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* AT STOP / WAITING */}
      {(journeyState === "AT_STOP" || journeyState === "WAITING_FOR_TRANSPORT") && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-[#C99A3D]/10 text-[#C99A3D]">
              <Bus className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[#6E7772] dark:text-[#A8B5AE]">At Terminal</span>
              <h3 className="font-h3 text-[#17332D] dark:text-[#F4F0E6]">
                Board {selectedRoute.steps[0]?.vehicleType}
              </h3>
              <p className="text-xs text-[#6E7772] dark:text-[#A8B5AE] font-mono mt-0.5">
                Target fare: {selectedRoute.steps[0]?.costETB} ETB
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/50 dark:bg-[#10251F]/50 border border-[#D9DED8] dark:border-[#315047] space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-[#17332D] dark:text-[#F4F0E6]">
              <Volume2 className="w-4 h-4 text-[#C99A3D]" />
              <span>Voice Guidance</span>
            </div>
            <p className="text-xs text-[#6E7772] dark:text-[#A8B5AE] m-0">
              "You are at the stop. Confirm when you board the vehicle."
            </p>
          </div>

          <button
            onClick={() => setJourneyState("ONBOARD")}
            className="btn-forest w-full justify-center py-3 text-xs uppercase tracking-wider"
          >
            <span>I'm on board</span>
            <CheckCircle2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ONBOARD TRACKING */}
      {journeyState === "ONBOARD" && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-[#173C32]/20 dark:bg-[#D2A64C]/20 text-[#173C32] dark:text-[#D2A64C]">
              <Navigation className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[#173C32] dark:text-[#D2A64C] font-bold">Onboard Vehicle</span>
              <h3 className="font-h3 text-[#17332D] dark:text-[#F4F0E6]">
                Heading toward {selectedRoute.steps[0]?.to || selectedRoute.destination}
              </h3>
              <p className="text-xs text-[#6E7772] dark:text-[#A8B5AE] font-mono mt-0.5">
                Est. remaining time: ~{selectedRoute.estimatedMinutes - 5} mins
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#173C32]/5 dark:bg-[#D8E4DC]/5 border border-[#D9DED8] dark:border-[#315047] space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-[#6E7772] dark:text-[#A8B5AE]">Current Leg:</span>
              <span className="font-semibold text-[#17332D] dark:text-[#F4F0E6]">Leg 1 of {selectedRoute.steps.length}</span>
            </div>
            <div className="w-full bg-[#D9DED8] dark:bg-[#315047] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#C99A3D] h-full w-2/3 transition-all duration-500" />
            </div>
          </div>

          <div className="flex gap-2">
            {selectedRoute.transfers > 0 ? (
              <button
                onClick={() => setJourneyState("TRANSFER")}
                className="btn-glass flex-1 justify-center py-2.5 text-xs"
              >
                <span>Approach Transfer</span>
              </button>
            ) : null}

            <button
              onClick={() => setJourneyState("APPROACHING_STOP")}
              className="btn-forest flex-1 justify-center py-2.5 text-xs"
            >
              <span>Approaching Destination</span>
            </button>
          </div>
        </div>
      )}

      {/* APPROACHING STOP */}
      {journeyState === "APPROACHING_STOP" && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-[#B9653D]/20 text-[#B9653D]">
              <AlertCircle className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[#B9653D] font-bold">Prepare to Disembark</span>
              <h3 className="font-h3 text-[#17332D] dark:text-[#F4F0E6]">
                Get off at {selectedRoute.destination}
              </h3>
              <p className="text-xs text-[#6E7772] dark:text-[#A8B5AE] font-mono mt-0.5">
                Stop is ~200 meters ahead
              </p>
            </div>
          </div>

          <button
            onClick={() => setJourneyState("WALKING_TO_DESTINATION")}
            className="btn-forest w-full justify-center py-3 text-xs uppercase tracking-wider"
          >
            <span>I've stepped off</span>
            <Footprints className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* WALKING TO DESTINATION */}
      {journeyState === "WALKING_TO_DESTINATION" && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-[#173C32]/10 dark:bg-[#D2A64C]/10 text-[#173C32] dark:text-[#D2A64C]">
              <Footprints className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[#6E7772] dark:text-[#A8B5AE]">Final Leg</span>
              <h3 className="font-h3 text-[#17332D] dark:text-[#F4F0E6]">
                Walk 2 minutes to final destination
              </h3>
            </div>
          </div>

          <button
            onClick={() => setJourneyState("ARRIVED")}
            className="btn-forest w-full justify-center py-3 text-xs uppercase tracking-wider"
          >
            <span>Complete Journey</span>
            <CheckCircle2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}