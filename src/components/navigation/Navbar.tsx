"use client";

import React from "react";
import { useMengedStore } from "@/store/useMengedStore";
import { Compass, ArrowRight, Globe } from "lucide-react";

export default function Navbar() {
  const { view, setView, language, setLanguage } = useMengedStore();

  return (
    <header className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <nav className="glass-nav px-6 py-3 flex items-center justify-between w-full max-w-5xl pointer-events-auto shadow-sm">
        {/* Brand */}
        <button
          onClick={() => setView("landing")}
          className="flex items-center gap-2.5 group cursor-pointer bg-transparent border-none text-left p-0"
        >
          <div className="w-8 h-8 rounded-full bg-[#173C32] dark:bg-[#D2A64C] flex items-center justify-center text-[#F6F3EA] dark:text-[#10251F] transition-transform duration-300 group-hover:scale-105">
            <Compass className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-base tracking-tight text-[#17332D] dark:text-[#F4F0E6]">
              Menged <span className="text-[#C99A3D] dark:text-[#D2A64C] text-sm ml-0.5">መንገድ</span>
            </span>
          </div>
        </button>

        {/* Center Links */}
        <div className="hidden md:flex items-center gap-7 text-sm font-medium text-[#6E7772] dark:text-[#A8B5AE]">
          <button
            onClick={() => setView("planner")}
            className="hover:text-[#17332D] dark:hover:text-[#F4F0E6] transition-colors bg-transparent border-none cursor-pointer"
          >
            Plan
          </button>
          <a
            href="#how-it-works"
            className="hover:text-[#17332D] dark:hover:text-[#F4F0E6] transition-colors no-underline text-inherit"
          >
            How it works
          </a>
          <a
            href="#routes"
            className="hover:text-[#17332D] dark:hover:text-[#F4F0E6] transition-colors no-underline text-inherit"
          >
            Routes
          </a>
          <a
            href="#transparency"
            className="hover:text-[#17332D] dark:hover:text-[#F4F0E6] transition-colors no-underline text-inherit"
          >
            Fares
          </a>
        </div>

        {/* Right CTA */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLanguage(language === "en" ? "am" : "en")}
            className="flex items-center gap-1.5 text-xs font-medium text-[#6E7772] dark:text-[#A8B5AE] hover:text-[#17332D] dark:hover:text-[#F4F0E6] px-2.5 py-1.5 rounded-full border border-[#D9DED8] dark:border-[#315047] transition-colors bg-transparent cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-[#C99A3D]" />
            <span className="font-mono">{language === "en" ? "AM" : "EN"}</span>
          </button>

          <button
            onClick={() => setView(view === "landing" ? "planner" : "landing")}
            className="btn-forest text-xs py-2 px-4 rounded-full"
          >
            <span>{view === "landing" ? "Plan a trip" : "Overview"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>
    </header>
  );
}