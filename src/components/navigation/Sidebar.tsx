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
  LogOut
} from "lucide-react";
import { t } from "@/i18n/translations";

export default function Sidebar() {
  const { activeTab, setActiveTab, setView, language } = useMengedStore();

  const navItems: { id: ActiveTab; labelKey: any; icon: React.ReactNode }[] = [
    { id: "home", labelKey: "nav.home", icon: <Home className="w-4 h-4" /> },
    { id: "plan", labelKey: "nav.plan", icon: <Navigation className="w-4 h-4" /> },
    { id: "journeys", labelKey: "nav.routes", icon: <History className="w-4 h-4" /> },
    { id: "saved", labelKey: "nav.saved", icon: <Bookmark className="w-4 h-4" /> },
    { id: "notifications", labelKey: "nav.notifications", icon: <Bell className="w-4 h-4" /> },
    { id: "profile", labelKey: "nav.profile", icon: <User className="w-4 h-4" /> },
    { id: "settings", labelKey: "nav.settings", icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <aside className="hidden lg:flex flex-col justify-between w-64 h-screen sticky top-0 p-6 border-r border-[#E4E7E5] bg-[#FAF9F6]">
      <div className="space-y-8">
        {/* Brand */}
        <button
          onClick={() => setView("landing")}
          className="flex items-center gap-3 bg-transparent border-none cursor-pointer p-0 text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-[#123C2F] flex items-center justify-center text-[#FFFFFF] shadow-md group-hover:bg-[#2E8B68] transition-colors">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-[#123C2F] m-0">
              Menged <span className="text-[#E7B84B] text-xs font-normal">መንገድ</span>
            </h1>
            <p className="text-[10px] text-[#66736D] font-mono m-0">
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
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer border ${
                  isActive
                    ? "bg-[#123C2F] text-[#FFFFFF] border-transparent shadow-sm"
                    : "bg-transparent border-transparent text-[#66736D] hover:text-[#17231F] hover:bg-[#F3F4F1]"
                }`}
              >
                {item.icon}
                <span>{item.labelKey === "nav.home" ? (language === "am" ? "ዋና ገፅ" : "Home") : t(item.labelKey, language)}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Footer Profile */}
      <div className="pt-4 border-t border-[#E4E7E5] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#E7B84B] text-[#123C2F] font-bold text-xs flex items-center justify-center font-mono">
            GE
          </div>
          <div>
            <span className="text-xs font-semibold text-[#17231F] block">Girum Endalk</span>
            <span className="text-[10px] text-[#66736D] font-mono">Addis Ababa</span>
          </div>
        </div>
        <button
          onClick={() => setView("landing")}
          className="text-[#9AA49F] hover:text-[#F28C38] bg-transparent border-none cursor-pointer p-1 transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}