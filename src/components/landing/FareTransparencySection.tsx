"use client";

import React from "react";
import { ShieldCheck, CheckCircle2 } from "lucide-react";

export default function FareTransparencySection() {
  return (
    <section id="transparency" className="border-t border-[#dfe7df] bg-[#f7f5ef] px-6 py-24 lg:px-10 lg:py-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-5">
          <span className="text-xs font-mono font-bold uppercase tracking-[0.18em] text-[#b18425]">Data integrity</span>
          <h2 className="text-4xl font-semibold leading-tight tracking-[-0.03em] text-[#123c2f] sm:text-5xl">A fare estimate should tell the truth about what it knows.</h2>
          <p className="max-w-lg text-lg leading-8 text-[#66736d]">
            We never make it look like we know an exact live fare if we don&apos;t. Menged combines official city tariffs, verified route benchmarks, and community observations so you&apos;re never overcharged.
          </p>

          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3 text-sm font-semibold text-[#17231f]">
              <CheckCircle2 className="w-5 h-5 text-[#2E8B68] flex-shrink-0" />
              <span>Official Addis Ababa Transport Bureau tariff base</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-semibold text-[#17231f]">
              <CheckCircle2 className="w-5 h-5 text-[#2E8B68] flex-shrink-0" />
              <span>Distance-calculated step segments</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-semibold text-[#17231f]">
              <CheckCircle2 className="w-5 h-5 text-[#2E8B68] flex-shrink-0" />
              <span>Confidence level ratings for each route segment</span>
            </div>
          </div>
        </div>

        {/* Confidence Card Mockup */}
        <div className="lg:col-span-7">
          <div className="rounded-[2rem] border border-[#dfe7df] bg-white p-5 shadow-[0_24px_70px_-36px_rgba(18,60,47,0.45)] sm:p-8">
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