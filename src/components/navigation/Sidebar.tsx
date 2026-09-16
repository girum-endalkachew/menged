"use client";

import React from "react";
import { useMengedStore, ActiveTab } from "@/store/useMengedStore";
import { 
  Home, 
  Navigation, 
  History, 
  Bookmark, 
  Bell, 
  User, 
  Settings, 
  Compass, 
  LogOut,
  Sparkles
} from "lucide-react";

export default function Sidebar() {
  const { activeTab, setActiveTab, setView, language } = useMengedStore();

  const navItems: { id: ActiveTab; labelEn: string; labelAm: string; icon: React.ReactNode }[] = [
    { id: "home", labelEn: "Home", labelAm: "ዋና ገፅ", icon: <Home className="w-4 h-4" /> },
    { id: "plan", labelEn: "Plan Trip", labelAm: "ጉዞ ያቅዱ", icon: <Navigation className="w-4 h-4" /> },
    { id: "journeys", labelEn: "Journeys", labelAm: "የጉዞ ታሪክ", icon: <History className="w-4 h-4" /> },
    { id: "saved", labelEn: "Saved", labelAm: "የተቀመጡ", icon: <Bookmark className="w-4 h-4" /> },
    { id: "notifications", labelEn: "Notifications", labelAm: "ማስታወቂያዎች", icon: <Bell className="w-4 h-4" /> },
    { id: "profile", labelEn: "Profile", labelAm: "መገለጫ", icon: <User className="w-4 h-4" /> },
    { id: "settings", labelEn: "Settings", labelAm: "ማስተካከያ", icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <aside className="hidden lg:flex flex-col justify-between w-64 h-screen sticky top-0 p-6 border-r border-[#D9DED8] dark:border-[#315047] bg-[#FFFFFF]/40 dark:bg-[#18352D]/40 backdrop-blur-xl">
      <div className="space-y-8">
        {/* Brand */}
        <button
          onClick={() => setView("landing")}
          className="flex items-center gap-3 bg-transparent border-none cursor-pointer p-0 text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-[#173C32] dark:bg-[#D2A64C] flex items-center justify-center text-[#F6F3EA] dark:text-[#10251F] shadow-md">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-[#17332D] dark:text-[#F4F0E6] m-0">
              Menged <span className="text-[#C99A3D] text-xs font-normal">መንገድ</span>
            </h1>
            <p className="text-[10px] text-[#6E7772] dark:text-[#A8B5AE] font-mono m-0">
              Transit Companion
            </p>
          </div>
        </button>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all cursor-pointer border ${
                  isActive
                    ? "bg-[#173C32] dark:bg-[#D2A64C] text-[#F6F3EA] dark:text-[#10251F] border-transparent shadow-sm"
                    : "bg-transparent border-transparent text-[#6E7772] dark:text-[#A8B5AE] hover:text-[#17332D] dark:hover:text-[#F4F0E6] hover:bg-white/40 dark:hover:bg-[#10251F]/40"
                }`}
              >
                {item.icon}
                <span>{language === "am" ? item.labelAm : item.labelEn}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Footer Profile */}
      <div className="pt-4 border-t border-[#D9DED8] dark:border-[#315047] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#C99A3D] text-[#10251F] font-bold text-xs flex items-center justify-center font-mono">
            GE
          </div>
          <div>
            <span className="text-xs font-semibold text-[#17332D] dark:text-[#F4F0E6] block">Girum Endalk</span>
            <span className="text-[10px] text-[#6E7772] dark:text-[#A8B5AE] font-mono">Addis Ababa</span>
          </div>
        </div>
        <button
          onClick={() => setView("landing")}
          className="text-[#6E7772] dark:text-[#A8B5AE] hover:text-[#B9653D] bg-transparent border-none cursor-pointer p-1"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}