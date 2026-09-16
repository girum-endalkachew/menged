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
    view, 
    setView, 
    activeTab, 
    journeyState, 
    startJourney, 
    selectedRoute, 
    preference, 
    setPreference 
  } = useMengedStore();

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

  const isJourneyActive = journeyState !== "PLANNING" && journeyState !== "ROUTE_SELECTED";

  return (
    <div className="min-h-screen flex bg-[#F6F3EA] dark:bg-[#10251F] text-[#17332D] dark:text-[#F4F0E6]">
      {/* Desktop Sidebar Navigation */}
      <Sidebar />

      {/* Main Application Container */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="p-4 border-b border-[#D9DED8] dark:border-[#315047] flex justify-between items-center lg:hidden">
          <button onClick={() => setView("landing")} className="text-xs font-bold text-[#173C32] dark:text-[#D2A64C] bg-transparent border-none">
            Menged መንገድ
          </button>
          <span className="text-[10px] font-mono text-[#6E7772] dark:text-[#A8B5AE] uppercase">Addis Transit</span>
        </header>

        <main className="p-6 max-w-7xl mx-auto w-full flex-1 mb-20 lg:mb-0">
          {/* TAB 1: HOME */}
          {activeTab === "home" && <HomeView />}

          {/* TAB 2: PLAN TRIP (THE CORE WORKSPACE) */}
          {activeTab === "plan" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column (~40%) */}
              <div className="lg:col-span-5 space-y-6">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setView("landing")}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6E7772] dark:text-[#A8B5AE] hover:text-[#17332D] dark:hover:text-[#F4F0E6] bg-transparent border-none cursor-pointer p-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Overview</span>
                  </button>
                  <span className="text-xs font-mono uppercase tracking-widest text-[#C99A3D]">
                    {isJourneyActive ? "Live Companion" : "Trip Planner"}
                  </span>
                </div>

                {isJourneyActive ? (
                  <JourneyCompanion />
                ) : (
                  <>
                    <VoiceMic />

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

                    <RouteSelector />

                    {selectedRoute && (
                      <button
                        onClick={startJourney}
                        className="btn-forest w-full justify-center py-3.5 text-sm uppercase tracking-wider font-semibold shadow-xl"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Start Journey</span>
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Right Column: Map (~60%) */}
              <div className="lg:col-span-7 h-[calc(100vh-8rem)] sticky top-6">
                <MengedMap />
              </div>
            </div>
          )}

          {/* TAB 3: JOURNEYS HISTORY */}
          {activeTab === "journeys" && <JourneysView />}

          {/* TAB 4: SAVED PLACES & ROUTES */}
          {activeTab === "saved" && <SavedView />}

          {/* TAB 5: PROFILE & SETTINGS */}
          {(activeTab === "profile" || activeTab === "settings" || activeTab === "notifications") && <ProfileView />}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <BottomNavigation />
      </div>
    </div>
  );
}