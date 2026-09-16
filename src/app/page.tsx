"use client";

import React from "react";
import { useMengedStore } from "@/store/useMengedStore";
import Navbar from "@/components/navigation/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import FareTransparencySection from "@/components/landing/FareTransparencySection";
import Footer from "@/components/navigation/Footer";
import VoiceMic from "@/components/voice/VoiceMic";
import RouteSelector from "@/components/routes/RouteSelector";
import MengedMap from "@/components/map/MengedMap";
import { ArrowLeft, Navigation, SlidersHorizontal } from "lucide-react";

export default function Page() {
  const { view, setView, origin, destination, preference, setPreference } = useMengedStore();

  if (view === "landing") {
    return (
      <div className="min-h-screen flex flex-col justify-between">
        <Navbar />
        <main>
          <HeroSection />
          <FeaturesSection />
          <FareTransparencySection />
        </main>
        <Footer />
      </div>
    );
  }

  // TRIP PLANNER VIEW (The Core Product)
  return (
    <div className="min-h-screen flex flex-col bg-[#F6F3EA] dark:bg-[#10251F] text-[#17332D] dark:text-[#F4F0E6]">
      <Navbar />

      <main className="pt-24 pb-8 px-6 max-w-7xl mx-auto w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Trip UI (~40%) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Header & Back */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setView("landing")}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6E7772] dark:text-[#A8B5AE] hover:text-[#17332D] dark:hover:text-[#F4F0E6] bg-transparent border-none cursor-pointer p-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Overview</span>
            </button>
            <span className="text-xs font-mono uppercase tracking-widest text-[#C99A3D]">Trip Planner</span>
          </div>

          {/* Core Voice Mic Component */}
          <VoiceMic />

          {/* Filter Preferences Bar */}
          <div className="glass-panel p-4 flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-[#6E7772] dark:text-[#A8B5AE] flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Preference
            </span>
            <div className="flex gap-1.5">
              {(["cheapest", "fastest", "least_walking", "balanced"] as const).map((pref) => (
                <button
                  key={pref}
                  onClick={() => setPreference(pref)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    preference === pref
                      ? "bg-[#173C32] dark:bg-[#D2A64C] text-[#F6F3EA] dark:text-[#10251F] border-transparent font-medium"
                      : "bg-transparent border-[#D9DED8] dark:border-[#315047] text-[#6E7772] dark:text-[#A8B5AE]"
                  }`}
                >
                  {pref === "cheapest" ? "Cheapest" : pref === "fastest" ? "Fastest" : pref === "least_walking" ? "Less Walk" : "Balanced"}
                </button>
              ))}
            </div>
          </div>

          {/* Route Options List */}
          <RouteSelector />
        </div>

        {/* Right Column: Interactive Map (~60%) */}
        <div className="lg:col-span-7 h-[calc(100vh-8rem)] sticky top-24">
          <MengedMap />
        </div>
      </main>
    </div>
  );
}