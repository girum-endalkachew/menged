"use client";

import React from "react";
import { useMengedStore } from "@/store/useMengedStore";
import { ArrowRight, Mic, Navigation, ShieldCheck, MapPin, Sparkles, Route } from "lucide-react";

export default function HeroSection() {
  const { setView } = useMengedStore();

  return (
    <section className="relative overflow-hidden bg-[#f7f5ef] px-6 pb-20 pt-32 sm:pt-36 lg:min-h-[760px] lg:px-10 lg:pb-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(231,184,75,0.2),transparent_25%),radial-gradient(circle_at_12%_86%,rgba(46,139,104,0.13),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(18,60,47,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(18,60,47,0.04)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div className="max-w-xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#dfe4dc] bg-white/75 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#66736d] shadow-sm backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-[#e7b84b] shadow-[0_0_0_4px_rgba(231,184,75,0.15)]" />
            Addis Ababa transit intelligence
          </div>

          <h1 className="max-w-[640px] text-5xl font-semibold leading-[0.98] tracking-[-0.045em] text-[#123c2f] sm:text-7xl lg:text-[5.8rem]">
            Get there with a little more certainty.
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-[#66736d] sm:text-xl">
            Speak your destination in the language you use every day. Menged turns the city into a clear plan, a fair fare, and guidance that stays with you.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <button onClick={() => setView("app")} className="inline-flex items-center gap-3 rounded-full bg-[#123c2f] px-6 py-3.5 text-sm font-bold text-white shadow-[0_14px_30px_-14px_rgba(18,60,47,0.7)] transition-transform hover:-translate-y-0.5 hover:bg-[#1d624d]">
              <Mic className="h-4 w-4" />
              <span>Plan by voice</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <a href="#how-it-works" className="inline-flex items-center gap-2 rounded-full border border-[#cfd8d0] bg-white/70 px-6 py-3.5 text-sm font-semibold text-[#123c2f] no-underline transition-colors hover:border-[#2e8b68] hover:bg-white">
              See the journey
            </a>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-7 gap-y-2 text-xs font-semibold text-[#66736d]">
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#2e8b68]" /> Fare-aware</span>
            <span className="inline-flex items-center gap-2"><Navigation className="h-4 w-4 text-[#2e8b68]" /> Stop-by-stop</span>
            <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#e7b84b]" /> Built for Addis</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-2xl lg:pt-8">
          <div className="absolute -right-5 -top-2 hidden rounded-full border border-[#d8dfd6] bg-white/80 px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-widest text-[#66736d] shadow-sm sm:block">
            <span className="mr-2 text-[#2e8b68]">●</span> Route confidence 92%
          </div>
          <div className="relative overflow-hidden rounded-[2rem] border border-[#dce3da] bg-[#123c2f] p-3 shadow-[0_30px_80px_-30px_rgba(18,60,47,0.55)] sm:p-5">
            <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:34px_34px]" />
            <div className="relative rounded-[1.45rem] bg-[#f8f7f2] p-5 sm:p-7">
              <div className="flex items-start justify-between border-b border-[#e5e8e2] pb-5">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-[#2e8b68]"><Route className="h-4 w-4" /> Your route</div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#123c2f]">Bole to Piassa</h2>
                </div>
                <span className="rounded-full bg-[#e7b84b]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#8a6817]">Balanced</span>
              </div>

              <div className="relative py-7 pl-2">
                <div className="absolute bottom-10 left-[13px] top-10 w-px bg-gradient-to-b from-[#123c2f] via-[#e7b84b] to-[#2e8b68]" />
                <div className="relative flex gap-4 pb-8"><span className="z-10 mt-1 h-3 w-3 rounded-full border-2 border-[#f8f7f2] bg-[#123c2f] shadow-[0_0_0_1px_#123c2f]" /><div><p className="font-semibold text-[#17231f]">Bole Medhanialem</p><p className="mt-1 text-xs text-[#66736d]">Walk to the minibus queue</p></div><span className="ml-auto font-mono text-xs font-bold text-[#123c2f]">08:30</span></div>
                <div className="relative flex gap-4 pb-8"><span className="z-10 mt-1 h-3 w-3 rounded-full border-2 border-[#f8f7f2] bg-[#e7b84b] shadow-[0_0_0_1px_#e7b84b]" /><div><p className="font-semibold text-[#17231f]">Mexico Square</p><p className="mt-1 text-xs text-[#66736d]">Transfer · 2 min walk</p></div><span className="ml-auto font-mono text-xs text-[#66736d]">09:02</span></div>
                <div className="relative flex gap-4"><span className="z-10 mt-1 flex h-3 w-3 items-center justify-center rounded-full border-2 border-[#f8f7f2] bg-[#2e8b68] shadow-[0_0_0_1px_#2e8b68]"><MapPin className="h-2 w-2 text-white" /></span><div><p className="font-semibold text-[#17231f]">Piassa / Arada</p><p className="mt-1 text-xs text-[#66736d]">Arrive with confidence</p></div><span className="ml-auto font-mono text-xs font-bold text-[#2e8b68]">09:05</span></div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#edf3ed] p-4"><div><p className="text-[10px] font-bold uppercase tracking-widest text-[#66736d]">Estimated fare</p><p className="mt-1 font-mono text-xl font-bold text-[#123c2f]">25 ETB</p></div><div className="text-right"><p className="text-[10px] font-bold uppercase tracking-widest text-[#66736d]">Travel time</p><p className="mt-1 font-mono text-xl font-bold text-[#123c2f]">35 min</p></div></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}