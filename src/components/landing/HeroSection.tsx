"use client";

import React from "react";
import { useMengedStore } from "@/store/useMengedStore";
import { ArrowRight, Mic, Navigation, ShieldCheck, MapPin } from "lucide-react";

export default function HeroSection() {
  const { setView, setOrigin, setDestination, setPreference, setActiveTab } = useMengedStore();

  const handleQuickDemo = (from: string, to: string, pref: "cheapest" | "fastest") => {
    setOrigin(from);
    setDestination(to);
    setPreference(pref);
    setActiveTab("plan");
    setView("app");
  };

  return (
    <section className="relative min-h-screen pt-32 pb-20 px-6 max-w-[1400px] mx-auto flex flex-col justify-center overflow-hidden">
      {/* Cinematic Background Layer */}
      <div className="absolute inset-0 -z-10 bg-[#FAF9F6]">
        {/* Soft sunlight gradient from top right */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[radial-gradient(circle_at_top_right,rgba(231,184,75,0.15),transparent_60%)] pointer-events-none" />
        {/* Soft forest green gradient from bottom left */}
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[radial-gradient(circle_at_bottom_left,rgba(46,139,104,0.08),transparent_60%)] pointer-events-none" />
        {/* Subtle architectural grid */}
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#123C2F_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center relative z-10 w-full">
        {/* Left Column: Editorial Headline */}
        <div className="lg:col-span-6 space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#E4E7E5] bg-white/60 backdrop-blur-md shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E7B84B] animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#66736D] font-semibold">
              Addis Ababa Transit Intelligence
            </span>
          </div>

          <h1 className="font-hero text-[#123C2F]">
            Your voice<br />knows the way.
          </h1>

          <p className="font-body text-[#66736D] max-w-md text-lg leading-relaxed">
            Tell Menged where you're going. We'll figure out how to get you there, and stay with you until you arrive.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <button onClick={() => setView("app")} className="btn-forest px-8 py-3.5 shadow-lg">
              <span>Plan a trip</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a href="#how-it-works" className="btn-glass px-6 py-3.5 no-underline text-inherit">
              See how it works
            </a>
          </div>

          <div className="pt-8 flex flex-col gap-3">
            <span className="text-[10px] font-mono text-[#9AA49F] uppercase tracking-wider">Try asking naturally:</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleQuickDemo("Bole", "Piassa", "cheapest")}
                className="text-xs font-medium px-4 py-2 rounded-full border border-[#E4E7E5] bg-white hover:border-[#2E8B68] text-[#17231F] transition-all shadow-sm hover:shadow-md cursor-pointer"
              >
                "Bole to Piassa with 30 birr"
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Floating Product UI */}
        <div className="lg:col-span-6 relative">
          <div className="glass-panel p-6 shadow-[0_20px_60px_-15px_rgba(18,60,47,0.1)] relative overflow-hidden bg-white/80 backdrop-blur-2xl border-[#E4E7E5]/60 max-w-md ml-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#F3F4F1]">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-[#2E8B68]" />
                <span className="text-xs font-mono uppercase tracking-widest text-[#9AA49F]">Live Demo</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#123C2F]/5 text-[#123C2F] font-semibold border border-[#123C2F]/10">
                ADDIS GRID
              </span>
            </div>

            {/* Voice Input Mockup */}
            <div className="my-5 p-4 rounded-xl bg-[#FAF9F6] border border-[#E4E7E5] flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#E7B84B] text-[#17231F] flex items-center justify-center flex-shrink-0 shadow-sm border-2 border-white">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] font-mono text-[#9AA49F] uppercase tracking-widest block mb-0.5">Heard</span>
                <p className="text-sm font-medium text-[#123C2F] italic m-0">"Bole to Piassa, cheapest option"</p>
              </div>
            </div>

            {/* Transit Route Graphic */}
            <div className="pl-2 space-y-0 relative">
              <div className="absolute left-4 top-2 bottom-6 w-[2px] bg-gradient-to-b from-[#123C2F] via-[#E7B84B] to-[#2E8B68]" />
              
              <div className="flex items-start gap-4 pb-6 relative">
                <div className="w-4 h-4 rounded-full bg-[#123C2F] border-2 border-white shadow-sm flex items-center justify-center mt-0.5 z-10">
                  <div className="w-1 h-1 bg-white rounded-full" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#17231F] m-0">Bole Medhanialem</p>
                  <p className="text-[11px] text-[#66736D] m-0 mt-0.5">Board Minibus toward Mexico</p>
                </div>
                <span className="ml-auto text-xs font-mono text-[#123C2F] font-semibold bg-[#F3F4F1] px-2 py-1 rounded">15 ETB</span>
              </div>

              <div className="flex items-start gap-4 pb-6 relative">
                <div className="w-4 h-4 rounded-full bg-[#E7B84B] border-2 border-white shadow-sm mt-0.5 z-10" />
                <div>
                  <p className="text-sm font-bold text-[#17231F] m-0">Mexico Square</p>
                  <p className="text-[11px] text-[#66736D] m-0 mt-0.5">Transfer (2 min walk)</p>
                </div>
              </div>

              <div className="flex items-start gap-4 relative">
                <div className="w-4 h-4 rounded-full bg-[#2E8B68] border-2 border-white shadow-sm flex items-center justify-center mt-0.5 z-10">
                  <MapPin className="w-2.5 h-2.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#17231F] m-0">Piassa (Churchill Ave)</p>
                  <p className="text-[11px] text-[#66736D] m-0 mt-0.5">Destination</p>
                </div>
                <span className="ml-auto text-xs font-mono text-[#123C2F] font-semibold bg-[#F3F4F1] px-2 py-1 rounded">10 ETB</span>
              </div>
            </div>

            {/* Total Footer */}
            <div className="mt-6 pt-4 border-t border-[#F3F4F1] flex justify-between items-center text-xs bg-white rounded-b-xl">
              <div className="flex items-center gap-1.5 text-[#2E8B68] font-medium bg-[#2E8B68]/10 px-2 py-1 rounded-md">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified</span>
              </div>
              <div className="font-mono font-bold text-[#17231F] bg-[#FAF9F6] px-3 py-1.5 rounded-md border border-[#E4E7E5]">
                25 ETB · ~35 mins
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}