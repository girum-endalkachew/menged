"use client";

import React from "react";
import { useMengedStore } from "@/store/useMengedStore";
import { Compass, ShieldCheck, ArrowRight } from "lucide-react";

export default function AuthView() {
  const { setView, setActiveTab } = useMengedStore();

  const handleGoogleSignIn = () => {
    // In production, this invokes signIn("google") via next-auth
    setView("app");
    setActiveTab("home");
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-between p-6 max-w-md mx-auto relative">
      <div className="pt-12 space-y-8">
        <button onClick={() => setView("landing")} className="flex items-center gap-2.5 bg-transparent border-none p-0 cursor-pointer">
          <div className="w-10 h-10 rounded-xl bg-[#123C2F] flex items-center justify-center text-white">
            <Compass className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg text-[#123C2F]">
            Menged <span className="text-[#E7B84B] font-normal text-sm">መንገድ</span>
          </span>
        </button>

        <div className="space-y-3">
          <h1 className="font-h1 text-[#123C2F]">Sign in to Menged.</h1>
          <p className="font-body text-[#66736D] text-sm">
            Save your favorite places, track your journey history, and personalize your Ethiopian transit experience.
          </p>
        </div>

        <div className="space-y-4 pt-4">
          <button
            onClick={handleGoogleSignIn}
            className="w-full glass-panel py-3.5 px-5 flex items-center justify-center gap-3 border-[#E4E7E5] hover:border-[#123C2F] transition-all cursor-pointer font-medium text-sm text-[#17231F] shadow-sm bg-white"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <button
            onClick={handleGoogleSignIn}
            className="w-full btn-glass py-3.5 text-xs text-[#66736D] justify-center"
          >
            <span>Continue as Guest</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="py-6 border-t border-[#E4E7E5] flex items-center justify-between text-[11px] text-[#9AA49F]">
        <div className="flex items-center gap-1.5 text-[#2E8B68]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Encrypted Session</span>
        </div>
        <span className="font-mono">v1.0.0</span>
      </div>
    </div>
  );
}