"use client";

import React from "react";
import { useMengedStore } from "@/store/useMengedStore";
import { ArrowRight, Mic, Sparkles, Navigation, Layers, ShieldCheck } from "lucide-react";

export default function HeroSection() {
  const { setView, setOrigin, setDestination, setPreference } = useMengedStore();

  const handleQuickDemo = (from: string, to: string, pref: "cheapest" | "fastest") => {
    setOrigin(from);
    setDestination(to);
    setPreference(pref);
    setView("planner");
  };

  return (
    <section className="relative min-h-screen pt-36 pb-20 px-6 max-w-6xl mx-auto flex flex-col justify-center">
      {/* Background Architectural Grid Lines */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05] bg-[radial-gradient(#173C32_1px,transparent_1px)] dark:bg-[radial-gradient(#D8E4DC_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
        {/* Left Column: Editorial Headline & Actions */}
        <div className="lg:col-span-7 space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#D9DED8] dark:border-[#315047] bg-[#FFFFFF]/60 dark:bg-[#18352D]/60 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C99A3D]" />
            <span className="text-xs font-mono uppercase tracking-wider text-[#6E7772] dark:text-[#A8B5AE]">
              Addis Ababa Transit Intelligence
            </span>
          </div>

          <h1 className="font-hero text-[#17332D] dark:text-[#F4F0E6]">
            Your voice knows the way.
          </h1>

          <p className="font-body text-[#6E7772] dark:text-[#A8B5AE] max-w-lg">
            Tell Menged where you're going. We'll figure out how to get you there across minibuses, Sheger buses, and Light Rail.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => setView("planner")}
              className="btn-forest"
            >
              <span>Plan a trip</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href="#how-it-works"
              className="btn-glass no-underline text-inherit"
            >
              See how it works
            </a>
          </div>

          {/* Quick Voice Prompt Suggestions */}
          <div className="pt-4 border-t border-[#D9DED8]/60 dark:border-[#315047]/60">
            <span className="text-xs font-mono text-[#6E7772] dark:text-[#A8B5AE] uppercase tracking-wider block mb-3">
              Try asking directly
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleQuickDemo("Bole", "Piassa", "cheapest")}
                className="text-xs font-medium px-3.5 py-1.5 rounded-full border border-[#D9DED8] dark:border-[#315047] bg-white/40 dark:bg-[#18352D]/40 hover:border-[#173C32] dark:hover:border-[#D2A64C] transition-colors cursor-pointer text-[#17332D] dark:text-[#F4F0E6]"
              >
                "Bole to Piassa with 30 birr"
              </button>
              <button
                onClick={() => handleQuickDemo("Mexico", "Megenagna", "fastest")}
                className="text-xs font-medium px-3.5 py-1.5 rounded-full border border-[#D9DED8] dark:border-[#315047] bg-white/40 dark:bg-[#18352D]/40 hover:border-[#173C32] dark:hover:border-[#D2A64C] transition-colors cursor-pointer text-[#17332D] dark:text-[#F4F0E6]"
              >
                "Fastest route from Mexico to Megenagna"
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Floating Transportation Intelligence Card */}
        <div className="lg:col-span-5">
          <div className="glass-panel p-6 shadow-xl relative overflow-hidden space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#D9DED8] dark:border-[#315047]">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-[#C99A3D]" />
                <span className="text-xs font-mono uppercase tracking-widest text-[#6E7772] dark:text-[#A8B5AE]">
                  Live Trip Preview
                </span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#173C32]/10 dark:bg-[#D2A64C]/10 text-[#173C32] dark:text-[#D2A64C]">
                ADDIS GRID
              </span>
            </div>

            {/* Voice Input Mockup */}
            <div className="p-4 rounded-xl bg-white/60 dark:bg-[#10251F]/60 border border-[#D9DED8] dark:border-[#315047] flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#C99A3D] text-[#10251F] flex items-center justify-center flex-shrink-0 shadow-sm">
                <Mic className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-mono text-[#6E7772] dark:text-[#A8B5AE] uppercase tracking-wider block">
                  Voice Request
                </span>
                <p className="text-sm font-medium text-[#17332D] dark:text-[#F4F0E6] italic m-0">
                  "Bole to Piassa, cheapest option"
                </p>
              </div>
            </div>

            {/* Structured Transit Node chain */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-start gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[#173C32] dark:bg-[#D2A64C] mt-1.5 flex-shrink-0" />
                <div className="flex-1 flex justify-between items-baseline">
                  <div>
                    <p className="text-sm font-semibold text-[#17332D] dark:text-[#F4F0E6] m-0">Bole Medhanialem</p>
                    <p className="text-xs text-[#6E7772] dark:text-[#A8B5AE] m-0">Board Minibus toward Mexico</p>
                  </div>
                  <span className="text-xs font-mono text-[#173C32] dark:text-[#D2A64C]">15 ETB</span>
                </div>
              </div>

              <div className="ml-1 pl-3 border-l-2 border-dashed border-[#D9DED8] dark:border-[#315047] py-1 text-xs text-[#6E7772] dark:text-[#A8B5AE] font-mono">
                Transfer at Mexico Square (2 min walk)
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[#C99A3D] mt-1.5 flex-shrink-0" />
                <div className="flex-1 flex justify-between items-baseline">
                  <div>
                    <p className="text-sm font-semibold text-[#17332D] dark:text-[#F4F0E6] m-0">Piassa (Churchill Ave)</p>
                    <p className="text-xs text-[#6E7772] dark:text-[#A8B5AE] m-0">Arrival via Arada Minibus</p>
                  </div>
                  <span className="text-xs font-mono text-[#173C32] dark:text-[#D2A64C]">10 ETB</span>
                </div>
              </div>
            </div>

            {/* Bottom Fare & Duration Bar */}
            <div className="pt-3 border-t border-[#D9DED8] dark:border-[#315047] flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5 text-[#6E7772] dark:text-[#A8B5AE]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C99A3D]" />
                <span>Verified tariff</span>
              </div>
              <div className="font-mono font-medium text-[#17332D] dark:text-[#F4F0E6]">
                25 ETB · ~35 mins
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}