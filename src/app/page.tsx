"use client";

import React from "react";
import { useMengedStore } from "@/store/useMengedStore";
import Navbar from "@/components/navigation/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import FareTransparencySection from "@/components/landing/FareTransparencySection";
import Footer from "@/components/navigation/Footer";

import Sidebar from "@/components/navigation/Sidebar";
import BottomNavigation from "@/components/navigation/BottomNavigation";
import HomeView from "@/components/views/HomeView";
import JourneysView from "@/components/views/JourneysView";
import SavedView from "@/components/views/SavedView";
import ProfileView from "@/components/views/ProfileView";
import VoiceMic from "@/components/voice/VoiceMic";
import RouteSelector from "@/components/routes/RouteSelector";
import MengedMap from "@/components/map/MengedMap";
import JourneyCompanion from "@/components/journey/JourneyCompanion";
import { ArrowLeft, SlidersHorizontal, Play } from "lucide-react";

export default function Page() {
  const {
    view, setView, activeTab, journeyState, startJourney,
    selectedRoute, preference, setPreference
  } = useMengedStore();

  if (view === "landing") {
    return (
      <div className="min-h-screen flex flex-col bg-surface-ivory">
        <Navbar />
        <main className="flex-1">
          <HeroSection />
          <FeaturesSection />
          <FareTransparencySection />
        </main>
        <Footer />
      </div>
    );
  }

  const isJourneyActive = journeyState !== "PLANNING" && journeyState !== "ROUTE_SELECTED";

  return (
    <div className="min-h-screen flex bg-surface-ivory">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="p-4 border-b border-border flex justify-between items-center lg:hidden bg-surface">
          <button
            onClick={() => setView("landing")}
            className="text-sm font-bold text-brand-forest bg-transparent border-none"
          >
            Menged መንገድ
          </button>
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
            Addis Transit
          </span>
        </header>

        <main className="p-4 lg:p-6 max-w-7xl mx-auto w-full flex-1 mb-20 lg:mb-0">
          {activeTab === "home" && <HomeView />}
          {activeTab === "plan" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
              <div className="lg:col-span-5 space-y-6">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setView("landing")}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-brand-forest bg-transparent border-none p-0 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" /> <span>Back</span>
                  </button>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-accent-gold font-bold">
                    {isJourneyActive ? "Live Companion" : "Trip Planner"}
                  </span>
                </div>

                {isJourneyActive ? (
                  <JourneyCompanion />
                ) : (
                  <>
                    <VoiceMic />
                    <div className="rounded-2xl border border-border p-3.5 flex items-center justify-between bg-surface">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted flex items-center gap-1.5 font-semibold">
                        <SlidersHorizontal className="w-3.5 h-3.5" /> Pref
                      </span>
                      <div className="flex gap-1">
                        {(["cheapest", "fastest", "least_walking", "balanced"] as const).map((pref) => (
                          <button
                            key={pref}
                            onClick={() => setPreference(pref)}
                            className={`text-[11px] px-2.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer border ${
                              preference === pref
                                ? "bg-brand-forest text-white border-brand-forest"
                                : "bg-transparent border-transparent text-text-secondary hover:bg-surface-soft"
                            }`}
                          >
                            {pref === "cheapest" ? "Cheapest" : pref === "fastest" ? "Fastest" : pref === "least_walking" ? "Less Walk" : "Balanced"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <RouteSelector />
                    {selectedRoute && (
                      <button
                        onClick={startJourney}
                        className="w-full py-3.5 text-sm uppercase tracking-widest font-bold rounded-xl bg-brand-forest text-white flex items-center justify-center gap-2 hover:bg-brand-green transition-colors cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Start Journey</span>
                      </button>
                    )}
                  </>
                )}
              </div>
              <div className="lg:col-span-7 h-[50vh] lg:h-[calc(100vh-6rem)] sticky top-6">
                <MengedMap />
              </div>
            </div>
          )}
          {activeTab === "journeys" && <JourneysView />}
          {activeTab === "saved" && <SavedView />}
          {(activeTab === "profile" || activeTab === "settings" || activeTab === "notifications") && <ProfileView />}
        </main>
        <BottomNavigation />
      </div>
    </div>
  );
}
