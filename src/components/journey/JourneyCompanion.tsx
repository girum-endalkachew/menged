"use client";

import React from "react";
import { useMengedStore } from "@/store/useMengedStore";
import { useJourneyGeolocation } from "@/hooks/useJourneyGeolocation";
import {
  Footprints,
  Bus,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Volume2,
  X,
  Compass,
} from "lucide-react";

export default function JourneyCompanion() {
  // Start geolocation watcher during active navigation
  useJourneyGeolocation();

  const { 
    journeyState, 
    selectedRoute, 
    activeJourney,
    activeJourneyState,
    confirmBoarding,
    cancelJourney, 
    gpsError,
    language 
  } = useMengedStore();

  if (!selectedRoute) return null;

  // Render ARRIVED State Summary
  if (journeyState === "ARRIVED" || activeJourneyState?.currentState === "ARRIVED") {
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
            <span className="text-sm font-bold text-[#173C32] dark:text-[#D2A64C]">
              {selectedRoute.fareStatus === "UNAVAILABLE" ? "Unavailable" : `${selectedRoute.totalCostETB} ETB`}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[#6E7772] dark:text-[#A8B5AE] block">TRANSFERS</span>
            <span className="text-sm font-bold text-[#17332D] dark:text-[#F4F0E6]">{selectedRoute.transfers}</span>
          </div>
        </div>

        <button
          onClick={cancelJourney}
          className="btn-forest w-full justify-center py-3 text-sm font-medium cursor-pointer"
        >
          {language === "am" ? "ጉዞን አጠናቅ" : "Done"}
        </button>
      </div>
    );
  }

  const currentLegIdx = activeJourneyState?.currentLegIndex ?? 0;
  const totalLegs = activeJourney?.legs.length ?? selectedRoute.steps.length;

  return (
    <div className="glass-panel p-6 space-y-6 fade-in relative border-[#173C32]/30 dark:border-[#D2A64C]/30 shadow-2xl">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-[#D9DED8] dark:border-[#315047] pb-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#C99A3D] animate-ping" />
          <span className="text-xs font-mono uppercase tracking-widest text-[#173C32] dark:text-[#D2A64C] font-semibold">
            {(activeJourneyState?.currentState || journeyState).replace(/_/g, " ")}
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

      {/* GPS Warning Banner if any */}
      {gpsError && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2 font-mono">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* STATE-SPECIFIC GUIDANCE CARDS */}

      {/* PREPARING / PLANNED */}
      {(journeyState === "PREPARING" || activeJourneyState?.currentState === "PLANNED") && (
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
      {(journeyState === "WALKING_TO_STOP" || activeJourneyState?.currentState === "WALKING_TO_STOP") && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-[#173C32]/10 dark:bg-[#D2A64C]/10 text-[#173C32] dark:text-[#D2A64C]">
              <Footprints className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[#6E7772] dark:text-[#A8B5AE]">Walk to station</span>
              <h3 className="font-h3 text-[#17332D] dark:text-[#F4F0E6]">
                {activeJourneyState?.activeInstruction || `Walk to boarding station`}
              </h3>
              <p className="text-xs text-[#6E7772] dark:text-[#A8B5AE] font-mono mt-0.5">
                ~{selectedRoute.walkingMinutes} min walk
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/50 dark:bg-[#10251F]/50 border border-[#D9DED8] dark:border-[#315047] space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-[#17332D] dark:text-[#F4F0E6]">
              <Volume2 className="w-4 h-4 text-[#C99A3D]" />
              <span>Voice Guidance</span>
            </div>
            <p className="text-xs text-[#6E7772] dark:text-[#A8B5AE] m-0">
              &ldquo;{activeJourneyState?.voicePrompt || "Walk to the transit stop."}&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* AT STOP / WAITING */}
      {(journeyState === "AT_STOP" || activeJourneyState?.currentState === "AT_STOP") && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-[#C99A3D]/10 text-[#C99A3D]">
              <Bus className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[#6E7772] dark:text-[#A8B5AE]">At Terminal</span>
              <h3 className="font-h3 text-[#17332D] dark:text-[#F4F0E6]">
                {activeJourneyState?.activeInstruction || "At terminal stop"}
              </h3>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/50 dark:bg-[#10251F]/50 border border-[#D9DED8] dark:border-[#315047] space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-[#17332D] dark:text-[#F4F0E6]">
              <Volume2 className="w-4 h-4 text-[#C99A3D]" />
              <span>Voice Guidance</span>
            </div>
            <p className="text-xs text-[#6E7772] dark:text-[#A8B5AE] m-0">
              &ldquo;{activeJourneyState?.voicePrompt || "You are at the stop. Confirm when on board."}&rdquo;
            </p>
          </div>

          <button
            onClick={() => confirmBoarding()}
            className="btn-forest w-full justify-center py-3 text-xs uppercase tracking-wider font-bold cursor-pointer"
          >
            <span>I&apos;m on board</span>
            <CheckCircle2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ONBOARD / TRANSIT LEG */}
      {(journeyState === "ONBOARD" || activeJourneyState?.currentState === "TRANSIT_LEG") && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-[#173C32]/20 dark:bg-[#D2A64C]/20 text-[#173C32] dark:text-[#D2A64C]">
              <Navigation className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[#173C32] dark:text-[#D2A64C] font-bold">Onboard Vehicle</span>
              <h3 className="font-h3 text-[#17332D] dark:text-[#F4F0E6]">
                {activeJourneyState?.activeInstruction || `Heading toward destination`}
              </h3>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#173C32]/5 dark:bg-[#D8E4DC]/5 border border-[#D9DED8] dark:border-[#315047] space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-[#6E7772] dark:text-[#A8B5AE]">Current Leg:</span>
              <span className="font-semibold text-[#17332D] dark:text-[#F4F0E6]">Leg {currentLegIdx + 1} of {totalLegs}</span>
            </div>
            <div className="w-full bg-[#D9DED8] dark:bg-[#315047] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#C99A3D] h-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round(((currentLegIdx + 1) / totalLegs) * 100))}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/50 dark:bg-[#10251F]/50 border border-[#D9DED8] dark:border-[#315047] space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-[#17332D] dark:text-[#F4F0E6]">
              <Volume2 className="w-4 h-4 text-[#C99A3D]" />
              <span>Voice Guidance</span>
            </div>
            <p className="text-xs text-[#6E7772] dark:text-[#A8B5AE] m-0">
              &ldquo;{activeJourneyState?.voicePrompt || "Staying on board."}&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* APPROACHING STOP */}
      {(journeyState === "APPROACHING_STOP" || activeJourneyState?.currentState === "APPROACHING_ALIGHTING_STOP") && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-[#B9653D]/20 text-[#B9653D]">
              <AlertCircle className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[#B9653D] font-bold">Prepare to Disembark</span>
              <h3 className="font-h3 text-[#17332D] dark:text-[#F4F0E6]">
                {activeJourneyState?.activeInstruction || `Get ready to get off`}
              </h3>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/50 dark:bg-[#10251F]/50 border border-[#D9DED8] dark:border-[#315047] space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-[#17332D] dark:text-[#F4F0E6]">
              <Volume2 className="w-4 h-4 text-[#C99A3D]" />
              <span>Voice Guidance</span>
            </div>
            <p className="text-xs text-[#6E7772] dark:text-[#A8B5AE] m-0">
              &ldquo;{activeJourneyState?.voicePrompt || "Get ready to get off."}&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* TRANSFER / ALIGHTED */}
      {(journeyState === "TRANSFER" || activeJourneyState?.currentState === "ALIGHTED") && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-[#C99A3D]/20 text-[#C99A3D]">
              <Footprints className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[#C99A3D] font-bold">Transfer Leg</span>
              <h3 className="font-h3 text-[#17332D] dark:text-[#F4F0E6]">
                {activeJourneyState?.activeInstruction || `Transfer to next leg`}
              </h3>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#173C32]/5 dark:bg-[#D8E4DC]/5 border border-[#D9DED8] dark:border-[#315047] space-y-2 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-[#6E7772] dark:text-[#A8B5AE]">Transfer Progress:</span>
              <span className="font-semibold text-[#17332D] dark:text-[#F4F0E6]">Leg {currentLegIdx + 1} of {totalLegs}</span>
            </div>
          </div>
        </div>
      )}

      {/* WALKING TO DESTINATION */}
      {(journeyState === "WALKING_TO_DESTINATION" || activeJourneyState?.currentState === "WALKING_TO_DESTINATION") && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-[#173C32]/10 dark:bg-[#D2A64C]/10 text-[#173C32] dark:text-[#D2A64C]">
              <Footprints className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[#6E7772] dark:text-[#A8B5AE]">Final Leg</span>
              <h3 className="font-h3 text-[#17332D] dark:text-[#F4F0E6]">
                {activeJourneyState?.activeInstruction || `Walk to final destination`}
              </h3>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/50 dark:bg-[#10251F]/50 border border-[#D9DED8] dark:border-[#315047] space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-[#17332D] dark:text-[#F4F0E6]">
              <Volume2 className="w-4 h-4 text-[#C99A3D]" />
              <span>Voice Guidance</span>
            </div>
            <p className="text-xs text-[#6E7772] dark:text-[#A8B5AE] m-0">
              &ldquo;{activeJourneyState?.voicePrompt || "Walk to your final destination."}&rdquo;
            </p>
          </div>
        </div>
      )}
    </div>
  );
}