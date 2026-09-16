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

const LABELS_EN: Record<ActiveTab, string> = {
  home: "Home",
  plan: "Plan Trip",
  journeys: "Trips",
  saved: "Saved",
  notifications: "Notifications",
  profile: "Profile",
  settings: "Settings",
};

const LABELS_AM: Record<ActiveTab, string> = {
  home: "ዋና ገጽ",
  plan: "ጉዞ አቅድ",
  journeys: "ጉዞዎች",
  saved: "የተቀመጡ",
  notifications: "ማሳወቂያዎች",
  profile: "መገለጫ",
  settings: "ቅንብሮች",
};

export default function Sidebar() {
  const { activeTab, setActiveTab, setView, language } = useMengedStore();

  const navItems: { id: ActiveTab; icon: React.ReactNode }[] = [
    { id: "home", icon: <Home className="w-4 h-4" /> },
    { id: "plan", icon: <Navigation className="w-4 h-4" /> },
    { id: "journeys", icon: <History className="w-4 h-4" /> },
    { id: "saved", icon: <Bookmark className="w-4 h-4" /> },
    { id: "notifications", icon: <Bell className="w-4 h-4" /> },
    { id: "profile", icon: <User className="w-4 h-4" /> },
    { id: "settings", icon: <Settings className="w-4 h-4" /> },
  ];

  const labels = language === "am" ? LABELS_AM : LABELS_EN;

  return (
    <aside className="hidden lg:flex flex-col justify-between w-64 h-screen sticky top-0 p-6 border-r border-border bg-surface-ivory">
      <div className="space-y-8">
        <button
          onClick={() => setView("landing")}
          className="flex items-center gap-3 bg-transparent border-none cursor-pointer p-0 text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-brand-forest flex items-center justify-center text-white shadow-md group-hover:bg-brand-green transition-colors">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-brand-forest m-0">
              Menged <span className="text-accent-gold text-xs font-normal">መንገድ</span>
            </h1>
            <p className="text-[10px] text-text-secondary font-mono m-0">
              Transit Companion
            </p>
          </div>
        </button>

        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer border ${
                  isActive
                    ? "bg-brand-forest text-white border-transparent shadow-sm"
                    : "bg-transparent border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-soft"
                }`}
              >
                {item.icon}
                <span>{labels[item.id]}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-accent-gold text-brand-forest font-bold text-xs flex items-center justify-center font-mono">
            GE
          </div>
          <div>
            <span className="text-xs font-semibold text-text-primary block">Girum Endalk</span>
            <span className="text-[10px] text-text-secondary font-mono">Addis Ababa</span>
          </div>
        </div>
        <button
          onClick={() => setView("landing")}
          className="text-text-muted hover:text-accent-orange bg-transparent border-none cursor-pointer p-1 transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
