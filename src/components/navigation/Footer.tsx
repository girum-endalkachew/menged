"use client";

import React from "react";
import { Compass, Code2 } from "lucide-react";

export default function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-[#D9DED8] dark:border-[#315047] max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-[#6E7772] dark:text-[#A8B5AE]">
      <div className="flex items-center gap-2">
        <Compass className="w-4 h-4 text-[#C99A3D]" />
        <span className="font-medium text-[#17332D] dark:text-[#F4F0E6]">Menged (መንገድ)</span>
        <span>— Your Voice Knows the Way</span>
      </div>

      <div className="flex items-center gap-6 font-mono text-[11px]">
        <span>Stark Official Hackathon</span>
        <span>•</span>
        <a
          href="https://github.com/girum-endalkachew/menged"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#17332D] dark:hover:text-[#F4F0E6] transition-colors flex items-center gap-1 text-inherit no-underline"
        >
          <Code2 className="w-3.5 h-3.5 text-[#C99A3D]" />
          <span>girum-endalkachew/menged</span>
        </a>
      </div>
    </footer>
  );
}