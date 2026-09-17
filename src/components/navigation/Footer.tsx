"use client";

import React from "react";
import { Compass, Code2 } from "lucide-react";

export default function Footer() {
  return (
    <footer className="py-10 px-6 border-t border-[#E4E7E5] max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-[#66736D] bg-[#FAF9F6]">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-[#123C2F] text-white flex items-center justify-center">
          <Compass className="w-3.5 h-3.5" />
        </div>
        <span className="font-semibold text-[#17231F]">Menged (መንገድ)</span>
        <span className="text-[#9AA49F]">— Your Voice Knows the Way</span>
      </div>

      <div className="flex items-center gap-6 font-mono text-[10px] tracking-wider uppercase">
        <span>Stark Official Hackathon</span>
        <span className="text-[#D9DED8]">•</span>
        <a
          href="https://github.com/girum-endalkachew/menged"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#123C2F] transition-colors flex items-center gap-1.5 text-inherit no-underline font-semibold"
        >
          <Code2 className="w-3.5 h-3.5 text-[#E7B84B]" />
          <span>girum/menged</span>
        </a>
      </div>
    </footer>
  );
}