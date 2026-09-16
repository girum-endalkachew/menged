"use client";

import React from "react";
import { ShieldCheck, CheckCircle2 } from "lucide-react";

export default function FareTransparencySection() {
  return (
    <section id="transparency" className="py-24 px-6 max-w-[1200px] mx-auto border-t border-[#E4E7E5]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        <div className="lg:col-span-6 space-y-6">
          <span className="text-xs font-mono uppercase tracking-widest text-[#E7B84B] font-bold">Data Integrity</span>
          <h2 className="font-h2 text-[#123C2F]">Honest, verified transport fares.</h2>
          <p className="font-body text-[#66736D]">
            We never make it look like we know an exact live fare if we don't. Menged combines official city tariffs, verified route benchmarks, and community observations so you're never overcharged.
          </p>

          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3 text-sm font-medium text-[#17231F]">
              <CheckCircle2 className="w-5 h-5 text-[#2E8B68] flex-shrink-0" />
              <span>Official Addis Ababa Transport Bureau tariff base</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-medium text-[#17231F]">
              <CheckCircle2 className="w-5 h-5 text-[#2E8B68] flex-shrink-0" />
              <span>Distance-calculated step segments</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-medium text-[#17231F]">
              <CheckCircle2 className="w-5 h-5 text-[#2E8B68] flex-shrink-0" />
              <span>Confidence level ratings for each route segment</span>
            </div>
          </div>
        </div>

        {/* Confidence Card Mockup */}
        <div className="lg:col-span-6">
          <div className="glass-panel p-8 space-y-6 bg-white shadow-xl border-[#E4E7E5]">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#9AA49F] block mb-1">
                  Sample Fare Assessment
                </span>
                <h4 className="font-h3 text-[#123C2F] m-0">Bole → Mexico → Piassa</h4>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold font-mono text-[#2E8B68]">25 ETB</span>
                <span className="text-[10px] text-[#9AA49F] block font-mono uppercase tracking-wider">Est. Total</span>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-[#FAF9F6] border border-[#E4E7E5] space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-[#66736D]">Based on:</span>
                <span className="font-semibold text-[#17231F]">Official tariff + Minibus bench</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#66736D]">Route distance:</span>
                <span className="font-semibold text-[#17231F] font-mono">8.4 km (2 legs)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#66736D]">Last verified:</span>
                <span className="font-semibold text-[#17231F] font-mono">15 Sep 2026</span>
              </div>
              
              <div className="mt-4 pt-3 border-t border-[#E4E7E5] flex justify-between items-center">
                <span className="text-xs text-[#66736D]">Confidence Level:</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#2E8B68]/10 text-[#2E8B68] text-[11px] font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" /> High
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}