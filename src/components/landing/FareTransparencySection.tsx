"use client";

import React from "react";
import { ShieldCheck, Info, CheckCircle2, AlertCircle } from "lucide-react";

export default function FareTransparencySection() {
  return (
    <section id="transparency" className="py-24 px-6 max-w-6xl mx-auto border-t border-[#D9DED8] dark:border-[#315047]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-[#C99A3D]">Data Integrity</span>
          </div>

          <h2 className="font-h2 text-[#17332D] dark:text-[#F4F0E6]">
            Honest, verified transport fares.
          </h2>

          <p className="font-body text-[#6E7772] dark:text-[#A8B5AE]">
            We never make it look like we know an exact live fare if we don't. Menged combines official city tariffs, verified route benchmarks, and community observations so you're never overcharged.
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-[#17332D] dark:text-[#F4F0E6]">
              <CheckCircle2 className="w-4 h-4 text-[#C99A3D] flex-shrink-0" />
              <span>Official Addis Ababa Transport Bureau tariff base</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-[#17332D] dark:text-[#F4F0E6]">
              <CheckCircle2 className="w-4 h-4 text-[#C99A3D] flex-shrink-0" />
              <span>Distance-calculated step segments</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-[#17332D] dark:text-[#F4F0E6]">
              <CheckCircle2 className="w-4 h-4 text-[#C99A3D] flex-shrink-0" />
              <span>Confidence level ratings for each route segment</span>
            </div>
          </div>
        </div>

        {/* Confidence Card Mockup */}
        <div className="lg:col-span-6">
          <div className="glass-panel p-8 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#6E7772] dark:text-[#A8B5AE] block">
                  Sample Fare Assessment
                </span>
                <h4 className="font-h3 text-[#17332D] dark:text-[#F4F0E6] mt-1">Bole → Mexico → Piassa</h4>
              </div>
              <div className="text-right">
                <span className="text-2xl font-semibold font-mono text-[#173C32] dark:text-[#D2A64C]">25 ETB</span>
                <span className="text-xs text-[#6E7772] dark:text-[#A8B5AE] block font-mono">Estimated Total</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/40 dark:bg-[#10251F]/40 border border-[#D9DED8] dark:border-[#315047] space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-[#6E7772] dark:text-[#A8B5AE]">Based on:</span>
                <span className="font-medium text-[#17332D] dark:text-[#F4F0E6]">Official tariff + Minibus bench</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#6E7772] dark:text-[#A8B5AE]">Route distance:</span>
                <span className="font-medium text-[#17332D] dark:text-[#F4F0E6] font-mono">8.4 km (2 legs)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#6E7772] dark:text-[#A8B5AE]">Last verified:</span>
                <span className="font-medium text-[#17332D] dark:text-[#F4F0E6] font-mono">15 Sep 2026</span>
              </div>
              <div className="flex justify-between text-xs items-center pt-2 border-t border-[#D9DED8]/60 dark:border-[#315047]/60">
                <span className="text-[#6E7772] dark:text-[#A8B5AE]">Confidence:</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#C99A3D]/10 text-[#C99A3D] text-[11px] font-medium">
                  <ShieldCheck className="w-3 h-3" /> High Confidence
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}