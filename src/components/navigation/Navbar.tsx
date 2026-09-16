"use client";

import React from "react";
import { useMengedStore } from "@/store/useMengedStore";
import { Compass, ArrowRight, Globe } from "lucide-react";

export default function Navbar() {
  const { view, setView, language, setLanguage } = useMengedStore();

  return (
    <header className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <nav className="glass-nav px-6 py-3 flex items-center justify-between w-full max-w-5xl pointer-events-auto rounded-full">
        {/* Brand */}
        <button
          onClick={() => setView("landing")}
          className="flex items-center gap-2.5 group cursor-pointer bg-transparent border-none text-left p-0"
        >
          <div className="w-8 h-8 rounded-full bg-[#123C2F] flex items-center justify-center text-[#FFFFFF] transition-transform duration-300 group-hover:scale-105">
            <Compass className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-base tracking-tight text-[#17231F]">
              Menged <span className="text-[#E7B84B] text-sm ml-0.5">መንገድ</span>
            </span>
          </div>
        </button>

        {/* Center Links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#66736D]">
          <button
            onClick={() => setView("app")}
            className="hover:text-[#123C2F] transition-colors bg-transparent border-none cursor-pointer p-0"
          >
            Plan Trip
          </button>
          <a href="#how-it-works" className="hover:text-[#123C2F] transition-colors no-underline text-inherit">
            How it works
          </a>
          <a href="#routes" className="hover:text-[#123C2F] transition-colors no-underline text-inherit">
            Routes
          </a>
          <a href="#transparency" className="hover:text-[#123C2F] transition-colors no-underline text-inherit">
            Fares
          </a>
        </div>

        {/* Right CTA */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLanguage(language === "en" ? "am" : "en")}
            className="flex items-center gap-1.5 text-xs font-medium text-[#66736D] hover:text-[#123C2F] px-3 py-1.5 rounded-full border border-[#E4E7E5] bg-white/50 transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-[#E7B84B]" />
            <span className="font-mono">{language === "en" ? "AM" : "EN"}</span>
          </button>

          <button
            onClick={() => setView("app")}
            className="btn-forest text-xs py-2 px-5 rounded-full shadow-sm"
          >
            <span>Plan a trip</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>
    </header>
  );
}