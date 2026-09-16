"use client";

import React from "react";
import { useMengedStore, ActiveTab } from "@/store/useMengedStore";
import { Home, History, Mic, Bookmark, User } from "lucide-react";

export default function BottomNavigation() {
  const { activeTab, setActiveTab, setIsListening, language } = useMengedStore();

  const items: { id: ActiveTab | "voice"; labelEn: string; labelAm: string; icon: React.ReactNode }[] = [
    { id: "home", labelEn: "Home", labelAm: "ዋና ገፅ", icon: <Home className="w-5 h-5" /> },
    { id: "journeys", labelEn: "Trips", labelAm: "ታሪክ", icon: <History className="w-5 h-5" /> },
    { id: "voice", labelEn: "Voice", labelAm: "ድምፅ", icon: <Mic className="w-5 h-5 text-[#10251F]" /> },
    { id: "saved", labelEn: "Saved", labelAm: "የተቀመጡ", icon: <Bookmark className="w-5 h-5" /> },
    { id: "profile", labelEn: "Profile", labelAm: "መገለጫ", icon: <User className="w-5 h-5" /> },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2 bg-[#F6F3EA]/90 dark:bg-[#10251F]/90 backdrop-blur-xl border-t border-[#D9DED8] dark:border-[#315047]">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {items.map((item) => {
          if (item.id === "voice") {
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab("plan");
                  setIsListening(true);
                }}
                className="w-12 h-12 rounded-full bg-[#C99A3D] text-[#10251F] flex items-center justify-center -mt-6 shadow-lg border-2 border-[#F6F3EA] dark:border-[#10251F] cursor-pointer"
                aria-label="Activate Voice"
              >
                {item.icon}
              </button>
            );
          }

          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as ActiveTab)}
              className={`flex flex-col items-center gap-1 text-[10px] font-medium bg-transparent border-none cursor-pointer ${
                isActive
                  ? "text-[#173C32] dark:text-[#D2A64C]"
                  : "text-[#6E7772] dark:text-[#A8B5AE]"
              }`}
            >
              {item.icon}
              <span>{language === "am" ? item.labelAm : item.labelEn}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}