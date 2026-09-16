"use client";

import React from "react";
import VoiceMic from "@/components/voice/VoiceMic";
import RouteSelector from "@/components/routes/RouteSelector";
import MengedMap from "@/components/map/MengedMap";
import { useMengedStore } from "@/store/useMengedStore";
import { Badge } from "@/components/ui/badge";
import { Map, Navigation, Heart, ShieldAlert, Sparkles, Languages } from "lucide-react";

export default function Home() {
  const { origin, destination, language, setLanguage } = useMengedStore();

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 max-w-[1600px] mx-auto">
      {/* Column Left: Controls & Options (5/12 grid spacing) */}
      <div className="lg:col-span-5 flex flex-col gap-6 justify-between h-full">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Navigation className="h-5 w-5 text-black transform rotate-45" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                Menged <span className="text-emerald-400">መንገድ</span>
              </h1>
              <p className="text-xs text-zinc-400 font-medium">Your Voice Knows the Way</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setLanguage(language === "en" ? "am" : "en")}
              className="flex items-center gap-1 text-xs bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-zinc-300 hover:text-white transition-colors"
            >
              <Languages className="w-3.5 h-3.5 text-emerald-400" />
              <span>{language === "en" ? "አማርኛ" : "English"}</span>
            </button>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 font-bold bg-emerald-500/5">
              HACKATHON MVP
            </Badge>
          </div>
        </div>

        {/* Dynamic Navigation Summary */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Current Query</span>
            <h2 className="text-sm font-bold text-zinc-200 mt-1">
              From <span className="text-emerald-400">{origin}</span> to <span className="text-indigo-400">{destination}</span>
            </h2>
          </div>
          <Badge className="bg-zinc-950 text-zinc-400 border border-zinc-800">
            Active
          </Badge>
        </div>

        {/* Speech Recognition Mic */}
        <VoiceMic />

        {/* Route Options List */}
        <div className="flex-1 overflow-y-auto">
          <RouteSelector />
        </div>

        {/* Footer info */}
        <footer className="text-xs text-zinc-500 flex items-center justify-between border-t border-zinc-900 pt-4">
          <span className="flex items-center gap-1">
            Built with <Heart className="w-3 h-3 text-red-500 fill-red-500" /> for Stark Hackathon
          </span>
          <span className="font-mono">v1.0.0</span>
        </footer>
      </div>

      {/* Column Right: Live Spatial Grid (7/12 grid spacing) */}
      <div className="lg:col-span-7 h-[calc(100vh-2rem)] flex flex-col gap-4">
        <div className="flex-1 h-full min-h-[400px]">
          <MengedMap />
        </div>
      </div>
    </main>
  );
}
