"use client";

import React from "react";
import { useMengedStore } from "@/store/useMengedStore";
import { Compass, ArrowRight, Globe } from "lucide-react";

export default function Navbar() {
  const { setView, language, setLanguage } = useMengedStore();

  return (
    <header className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <nav className="px-6 py-3 flex items-center justify-between w-full max-w-5xl pointer-events-auto rounded-full bg-surface/80 backdrop-blur-xl border border-border shadow-sm">
        <button
          onClick={() => setView("landing")}
          className="flex items-center gap-2.5 group cursor-pointer bg-transparent border-none text-left p-0"
        >
          <div className="w-8 h-8 rounded-full bg-brand-forest flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-105">
            <Compass className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-base tracking-tight text-text-primary">
              Menged <span className="text-accent-gold text-sm ml-0.5">መንገድ</span>
            </span>
          </div>
        </button>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-text-secondary">
          <button
            onClick={() => setView("app")}
            className="hover:text-brand-forest transition-colors bg-transparent border-none cursor-pointer p-0"
          >
            Plan Trip
          </button>
          <a href="#how-it-works" className="hover:text-brand-forest transition-colors no-underline text-inherit">
            How it works
          </a>
          <a href="#routes" className="hover:text-brand-forest transition-colors no-underline text-inherit">
            Routes
          </a>
          <a href="#transparency" className="hover:text-brand-forest transition-colors no-underline text-inherit">
            Fares
          </a>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setLanguage(language === "en" ? "am" : "en")}
            className="flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-brand-forest px-3 py-1.5 rounded-full border border-border bg-surface/50 transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-accent-gold" />
            <span className="font-mono">{language === "en" ? "AM" : "EN"}</span>
          </button>

          <button
            onClick={() => setView("app")}
            className="flex items-center gap-2 text-xs py-2 px-5 rounded-full shadow-sm bg-brand-forest text-white font-bold hover:bg-brand-green transition-colors cursor-pointer"
          >
            <span>Plan a trip</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>
    </header>
  );
}
