"use client";

import React from "react";
import { useMengedStore } from "@/store/useMengedStore";
import { Check, Edit2, Mic, ArrowRight, ShieldCheck } from "lucide-react";

export default function TripUnderstanding() {
  const { origin, destination, budgetETB, preference, setActiveModal, setView, setActiveTab } = useMengedStore();

  return (
    <div className="glass-panel p-6 space-y-6 bg-white border-[#2E8B68]/30 shadow-xl max-w-lg mx-auto fade-in">
      <div className="flex justify-between items-center border-b border-[#F3F4F1] pb-3">
        <div className="flex items-center gap-2 text-xs font-mono text-[#2E8B68] font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>TRIP INTENT CONFIRMATION</span>
        </div>
        <span className="text-[10px] font-mono text-[#9AA49F]">VERIFIED</span>
      </div>

      <div>
        <h3 className="font-h3 text-[#123C2F] m-0">I understood your request.</h3>
        <p className="text-xs text-[#66736D] mt-1 m-0">Review what Menged extracted before we calculate your route options.</p>
      </div>

      <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E4E7E5] space-y-3 font-mono text-xs">
        <div className="flex justify-between items-center">
          <span className="text-[#9AA49F] uppercase">FROM</span>
          <span className="font-bold text-[#17231F]">{origin || "Current Location"}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[#9AA49F] uppercase">TO</span>
          <span className="font-bold text-[#17231F]">{destination || "Piassa"}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[#9AA49F] uppercase">BUDGET</span>
          <span className="font-bold text-[#2E8B68]">{budgetETB ? `${budgetETB} ETB` : "No limit"}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[#9AA49F] uppercase">PREFERENCE</span>
          <span className="font-bold text-[#123C2F] capitalize">{preference.replace("_", " ")}</span>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={() => setActiveModal(null)}
          className="btn-glass flex-1 text-xs justify-center py-3"
        >
          <Edit2 className="w-3.5 h-3.5" />
          <span>Edit</span>
        </button>

        <button
          onClick={() => {
            setActiveModal(null);
            setActiveTab("plan");
            setView("app");
          }}
          className="btn-forest flex-1 text-xs justify-center py-3 font-bold shadow-md"
        >
          <span>Find Routes</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}