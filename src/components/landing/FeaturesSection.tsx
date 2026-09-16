"use client";

import React from "react";
import { Mic, Cpu, GitCompare, Sparkles, SlidersHorizontal, MapPin } from "lucide-react";

export default function FeaturesSection() {
  return (
    <section id="how-it-works" className="py-24 px-6 max-w-6xl mx-auto border-t border-[#D9DED8] dark:border-[#315047]">
      <div className="mb-16 space-y-3">
        <div className="inline-flex items-center gap-2">
          <span className="text-xs font-mono uppercase tracking-widest text-[#C99A3D]">How It Works</span>
        </div>
        <h2 className="font-h2 text-[#17332D] dark:text-[#F4F0E6]">
          Designed for the way people actually navigate Addis.
        </h2>
        <p className="font-body text-[#6E7772] dark:text-[#A8B5AE] max-w-xl">
          No complex menu mazes. Simply speak your destination and your budget constraints.
        </p>
      </div>

      {/* 3 Step Editorial Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Step 1 */}
        <div className="glass-panel p-8 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#173C32]/10 dark:bg-[#D2A64C]/10 text-[#173C32] dark:text-[#D2A64C] flex items-center justify-center font-mono font-semibold">
            01
          </div>
          <h3 className="font-h3 text-[#17332D] dark:text-[#F4F0E6]">Speak naturally</h3>
          <p className="text-sm text-[#6E7772] dark:text-[#A8B5AE] leading-relaxed">
            Say where you are, where you need to go, and any constraints like budget or walking tolerance.
          </p>
          <div className="p-3 rounded-lg bg-white/40 dark:bg-[#10251F]/40 border border-[#D9DED8] dark:border-[#315047] text-xs font-mono text-[#6E7772] dark:text-[#A8B5AE]">
            "Bole to Mexico, under 20 birr"
          </div>
        </div>

        {/* Step 2 */}
        <div className="glass-panel p-8 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#173C32]/10 dark:bg-[#D2A64C]/10 text-[#173C32] dark:text-[#D2A64C] flex items-center justify-center font-mono font-semibold">
            02
          </div>
          <h3 className="font-h3 text-[#17332D] dark:text-[#F4F0E6]">Menged understands</h3>
          <p className="text-sm text-[#6E7772] dark:text-[#A8B5AE] leading-relaxed">
            Intent extraction identifies your origin, transfer hubs, and destination without demanding exact street addresses.
          </p>
          <div className="p-3 rounded-lg bg-white/40 dark:bg-[#10251F]/40 border border-[#D9DED8] dark:border-[#315047] text-xs font-mono text-[#6E7772] dark:text-[#A8B5AE]">
            Origin: Bole · Dest: Mexico · Max: 20 ETB
          </div>
        </div>

        {/* Step 3 */}
        <div className="glass-panel p-8 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#173C32]/10 dark:bg-[#D2A64C]/10 text-[#173C32] dark:text-[#D2A64C] flex items-center justify-center font-mono font-semibold">
            03
          </div>
          <h3 className="font-h3 text-[#17332D] dark:text-[#F4F0E6]">Compare your options</h3>
          <p className="text-sm text-[#6E7772] dark:text-[#A8B5AE] leading-relaxed">
            Instantly see fastest minibuses vs cheapest municipal buses with verified fares and transfer guides.
          </p>
          <div className="p-3 rounded-lg bg-white/40 dark:bg-[#10251F]/40 border border-[#D9DED8] dark:border-[#315047] text-xs font-mono text-[#6E7772] dark:text-[#A8B5AE]">
            15 ETB (Minibus) · 8 ETB (Sheger Bus)
          </div>
        </div>
      </div>
    </section>
  );
}