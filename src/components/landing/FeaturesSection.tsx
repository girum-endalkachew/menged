"use client";

import React from "react";

export default function FeaturesSection() {
  return (
    <section id="how-it-works" className="py-24 px-6 max-w-[1200px] mx-auto">
      <div className="mb-16 space-y-4 max-w-2xl">
        <span className="text-xs font-mono uppercase tracking-widest text-[#2E8B68] font-semibold">How It Works</span>
        <h2 className="font-h2 text-[#123C2F]">
          Designed for the way people actually navigate.
        </h2>
        <p className="font-body text-[#66736D]">
          No complex menu mazes. Simply speak your destination and your constraints, and we handle the routing engine.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Step 1 */}
        <div className="glass-panel p-8 space-y-5 bg-[#FAF9F6]/50">
          <div className="w-12 h-12 rounded-2xl bg-[#E7B84B]/20 text-[#123C2F] flex items-center justify-center font-mono font-bold text-lg border border-[#E7B84B]/30">
            01
          </div>
          <h3 className="font-h3 text-[#17231F]">Speak naturally</h3>
          <p className="text-sm text-[#66736D] leading-relaxed">
            Say where you are, where you need to go, and any constraints like budget or walking tolerance.
          </p>
          <div className="p-3 rounded-lg bg-white border border-[#E4E7E5] text-[11px] font-mono text-[#66736D] shadow-sm">
            "Bole to Mexico, under 20 birr"
          </div>
        </div>

        {/* Step 2 */}
        <div className="glass-panel p-8 space-y-5 bg-[#FAF9F6]/50">
          <div className="w-12 h-12 rounded-2xl bg-[#E7B84B]/20 text-[#123C2F] flex items-center justify-center font-mono font-bold text-lg border border-[#E7B84B]/30">
            02
          </div>
          <h3 className="font-h3 text-[#17231F]">Menged understands</h3>
          <p className="text-sm text-[#66736D] leading-relaxed">
            Intent extraction identifies your origin, transfer hubs, and destination without demanding exact street addresses.
          </p>
          <div className="p-3 rounded-lg bg-white border border-[#E4E7E5] text-[11px] font-mono text-[#66736D] shadow-sm">
            Org: Bole · Dst: Mexico · Max: 20
          </div>
        </div>

        {/* Step 3 */}
        <div className="glass-panel p-8 space-y-5 bg-[#FAF9F6]/50">
          <div className="w-12 h-12 rounded-2xl bg-[#E7B84B]/20 text-[#123C2F] flex items-center justify-center font-mono font-bold text-lg border border-[#E7B84B]/30">
            03
          </div>
          <h3 className="font-h3 text-[#17231F]">We guide you</h3>
          <p className="text-sm text-[#66736D] leading-relaxed">
            Instantly see your options. Once you pick a route, Menged tracks your GPS and guides you step-by-step.
          </p>
          <div className="p-3 rounded-lg bg-[#2E8B68]/10 border border-[#2E8B68]/20 text-[11px] font-mono text-[#123C2F] font-semibold shadow-sm">
            "Get off at the next stop."
          </div>
        </div>
      </div>
    </section>
  );
}