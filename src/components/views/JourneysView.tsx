"use client";

import React from "react";
import { useMengedStore } from "@/store/useMengedStore";
import { History, Calendar, Clock, DollarSign, ArrowRight } from "lucide-react";

export default function JourneysView() {
  const { tripHistory, setOrigin, setDestination, setActiveTab } = useMengedStore();

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between border-b border-[#D9DED8] dark:border-[#315047] pb-4">
        <div>
          <h2 className="font-h2 text-[#17332D] dark:text-[#F4F0E6]">Your Journeys</h2>
          <p className="text-xs text-[#6E7772] dark:text-[#A8B5AE] font-mono">Past trips & verified history</p>
        </div>
        <History className="w-5 h-5 text-[#C99A3D]" />
      </div>

      <div className="space-y-3">
        {tripHistory.map((item) => (
          <div key={item.id} className="glass-panel p-5 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#6E7772] dark:text-[#A8B5AE]">{item.date}</span>
                <h3 className="font-h3 text-[#17332D] dark:text-[#F4F0E6] mt-0.5">
                  {item.origin} → {item.destination}
                </h3>
              </div>
              <span className="text-base font-mono font-bold text-[#173C32] dark:text-[#D2A64C]">
                {item.costETB} ETB
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#D9DED8]/60 dark:border-[#315047]/60 text-xs">
              <div className="flex gap-4 font-mono text-[#6E7772] dark:text-[#A8B5AE]">
                <span>{item.durationMins} min</span>
                <span>•</span>
                <span className="uppercase">{item.mode}</span>
              </div>

              <button
                onClick={() => {
                  setOrigin(item.origin);
                  setDestination(item.destination);
                  setActiveTab("plan");
                }}
                className="btn-glass text-xs py-1.5 px-3"
              >
                <span>Plan again</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}