"use client";

import React from "react";
import { ArrowUpRight, Mic2, Route, Volume2 } from "lucide-react";

export default function FeaturesSection() {
  return (
    <section id="how-it-works" className="bg-white px-6 py-24 lg:px-10 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-6 border-b border-[#e3e8e2] pb-10 md:flex-row md:items-end">
          <div className="max-w-2xl"><span className="text-xs font-mono font-bold uppercase tracking-[0.18em] text-[#2e8b68]">A calmer way through the city</span><h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.03em] text-[#123c2f] sm:text-5xl">Less guessing. More knowing where to go next.</h2></div>
          <p className="max-w-sm text-sm leading-6 text-[#66736d]">Menged keeps the important details close: what to take, what it should cost, and when to move.</p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            { number: "01", icon: Mic2, title: "Say it your way", text: "Start with a natural request. Mention your destination, budget, or how much walking feels right.", detail: "Bole to Mexico, under 20 birr" },
            { number: "02", icon: Route, title: "See the trade-offs", text: "Compare options by fare, time, transfers, and walking instead of choosing a route blindly.", detail: "25 ETB · 35 min · 1 transfer" },
            { number: "03", icon: Volume2, title: "Keep moving", text: "Once you choose, guidance stays simple and timely from the first step to the final stop.", detail: "Get off at the next stop" },
          ].map(({ number, icon: Icon, title, text, detail }) => (
            <article key={number} className="group relative overflow-hidden rounded-3xl border border-[#dfe7df] bg-[#f7f8f4] p-7 transition-transform hover:-translate-y-1">
              <div className="flex items-center justify-between"><span className="font-mono text-sm font-bold text-[#e7b84b]">{number}</span><Icon className="h-5 w-5 text-[#2e8b68]" /></div>
              <h3 className="mt-14 text-2xl font-semibold tracking-tight text-[#123c2f]">{title}</h3><p className="mt-3 text-sm leading-6 text-[#66736d]">{text}</p>
              <div className="mt-8 flex items-center justify-between border-t border-[#dfe7df] pt-4 text-[11px] font-mono font-bold text-[#123c2f]"><span>{detail}</span><ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" /></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}