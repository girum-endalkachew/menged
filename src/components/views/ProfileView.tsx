"use client";

import React from "react";
import { useMengedStore } from "@/store/useMengedStore";
import { User, Languages, Moon, Sun, ShieldCheck, Bell } from "lucide-react";

export default function ProfileView() {
  const { language, setLanguage, theme, setTheme } = useMengedStore();

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-12">
      <div className="flex items-center justify-between border-b border-[#D9DED8] dark:border-[#315047] pb-4">
        <div>
          <h2 className="font-h2 text-[#17332D] dark:text-[#F4F0E6]">Profile & Settings</h2>
          <p className="text-xs text-[#6E7772] dark:text-[#A8B5AE] font-mono">Account, language & preferences</p>
        </div>
        <User className="w-5 h-5 text-[#C99A3D]" />
      </div>

      {/* User Card */}
      <div className="glass-panel p-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-[#C99A3D] text-[#10251F] font-bold text-lg flex items-center justify-center font-mono">
          GE
        </div>
        <div>
          <h3 className="font-h3 text-[#17332D] dark:text-[#F4F0E6]">Girum Endalkachew</h3>
          <p className="text-xs text-[#6E7772] dark:text-[#A8B5AE] font-mono">girum@example.com · Addis Ababa</p>
        </div>
      </div>

      {/* Language */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="font-h3 text-[#17332D] dark:text-[#F4F0E6] flex items-center gap-2">
          <Languages className="w-4 h-4 text-[#C99A3D]" /> Language
        </h3>
        <div className="flex gap-3">
          <button
            onClick={() => setLanguage("en")}
            className={`btn-glass text-xs py-2 px-4 ${language === "en" ? "border-[#C99A3D] text-[#C99A3D]" : ""}`}
          >
            English
          </button>
          <button
            onClick={() => setLanguage("am")}
            className={`btn-glass text-xs py-2 px-4 ${language === "am" ? "border-[#C99A3D] text-[#C99A3D]" : ""}`}
          >
            አማርኛ (Amharic)
          </button>
        </div>
      </div>

      {/* Theme */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="font-h3 text-[#17332D] dark:text-[#F4F0E6] flex items-center gap-2">
          {theme === "dark" ? <Moon className="w-4 h-4 text-[#C99A3D]" /> : <Sun className="w-4 h-4 text-[#C99A3D]" />} Theme
        </h3>
        <div className="flex gap-3">
          <button
            onClick={() => setTheme("dark")}
            className={`btn-glass text-xs py-2 px-4 ${theme === "dark" ? "border-[#C99A3D] text-[#C99A3D]" : ""}`}
          >
            Dark Forest
          </button>
          <button
            onClick={() => setTheme("light")}
            className={`btn-glass text-xs py-2 px-4 ${theme === "light" ? "border-[#C99A3D] text-[#C99A3D]" : ""}`}
          >
            Warm Ivory
          </button>
        </div>
      </div>
    </div>
  );
}