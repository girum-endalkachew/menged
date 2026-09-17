"use client";

import React from "react";
import { useMengedStore, ActiveTab } from "@/store/useMengedStore";
import { Home, History, Mic, Bookmark, User } from "lucide-react";

export default function BottomNavigation() {
  const { activeTab, setActiveTab, setIsListening, language } = useMengedStore();

  const items: { id: ActiveTab | "voice"; labelEn: string; labelAm: string; icon: React.ReactNode }[] = [
    { id: "home", labelEn: "Home", labelAm: "ዋና ገጽ", icon: <Home className="w-5 h-5" /> },
    { id: "journeys", labelEn: "Trips", labelAm: "ጉዞዎች", icon: <History className="w-5 h-5" /> },
    { id: "voice", labelEn: "Voice", labelAm: "ድምጽ", icon: <Mic className="w-5 h-5 text-white" /> },
    { id: "saved", labelEn: "Saved", labelAm: "የተቀመጡ", icon: <Bookmark className="w-5 h-5" /> },
    { id: "profile", labelEn: "Profile", labelAm: "መገለጫ", icon: <User className="w-5 h-5" /> },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-3 bg-surface/90 backdrop-blur-xl border-t border-border shadow-[0_-4px_24px_-12px_rgba(18,60,47,0.1)]">
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
                className="w-14 h-14 rounded-full bg-brand-forest text-white flex items-center justify-center -mt-8 shadow-[0_8px_20px_-6px_rgba(18,60,47,0.4)] border-4 border-surface-ivory cursor-pointer hover:bg-brand-green transition-colors"
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
              className={`flex flex-col items-center gap-1 text-[10px] font-medium bg-transparent border-none cursor-pointer transition-colors ${
                isActive ? "text-brand-forest" : "text-text-muted hover:text-text-secondary"
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
