"use client";

import React, { useState, useEffect } from "react";
import { Mic, MicOff, Volume2, Sparkles } from "lucide-react";
import { useMengedStore } from "@/store/useMengedStore";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function VoiceMic() {
  const { 
    isListening, 
    setIsListening, 
    transcript, 
    setTranscript, 
    setOrigin, 
    setDestination, 
    setPreference 
  } = useMengedStore();

  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = "en-US";

        rec.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          setTranscript(text);
          parseVoiceIntent(text);
        };

        rec.onerror = () => {
          setIsListening(false);
          toast.error("Speech recognition failed or timed out.");
        };

        rec.onend = () => {
          setIsListening(false);
        };

        setRecognition(rec);
      }
    }
  }, []);

  const parseVoiceIntent = (text: string) => {
    const lower = text.toLowerCase();
    toast.success(`Heard: "${text}"`, { icon: "🎙️" });

    // Extraction Engine
    if (lower.includes("bole")) setOrigin("Bole");
    if (lower.includes("piassa") || lower.includes("pyassa")) setDestination("Piassa");
    if (lower.includes("mexico")) setDestination("Mexico");

    if (lower.includes("cheapest") || lower.includes("cheap") || lower.includes("birr")) {
      setPreference("cheapest");
      toast.success("Preference set to: Cheapest Option", { icon: "💰" });
    } else if (lower.includes("fastest") || lower.includes("fast") || lower.includes("quick")) {
      setPreference("fastest");
      toast.success("Preference set to: Fastest Option", { icon: "⚡" });
    } else if (lower.includes("walk") || lower.includes("lazy")) {
      setPreference("least_walking");
      toast.success("Preference set to: Least Walking", { icon: "🚶" });
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognition?.stop();
      setIsListening(false);
    } else {
      setTranscript("");
      setIsListening(true);
      recognition?.start();
      toast.info("Listening... Speak your trip request!", { id: "mic-listening" });
    }
  };

  return (
    <div className="w-full bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl rounded-2xl p-6 flex flex-col items-center justify-between shadow-2xl relative overflow-hidden">
      {/* Decorative Glow background */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between w-full mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Voice Commander</span>
        </div>
        <div className="flex items-center gap-1.5 bg-zinc-950 px-3 py-1 rounded-full border border-zinc-800">
          <span className={`w-2 h-2 rounded-full ${isListening ? "bg-emerald-500 animate-ping" : "bg-zinc-600"}`} />
          <span className="text-[10px] font-mono text-zinc-400">{isListening ? "LIVE FEED" : "STANDBY"}</span>
        </div>
      </div>

      <div className="relative flex flex-col items-center my-6">
        {/* Pulsating Ring */}
        <div className={`absolute inset-0 rounded-full bg-emerald-500/10 blur-xl transition-all duration-500 scale-125 ${isListening ? "animate-pulse scale-150" : "opacity-0"}`} />
        
        <Button
          onClick={toggleListening}
          className={`h-24 w-24 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
            isListening 
              ? "bg-emerald-500 hover:bg-emerald-600 border-emerald-400/50 shadow-emerald-500/30 shadow-2xl scale-105" 
              : "bg-zinc-950 hover:bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-100"
          }`}
        >
          {isListening ? (
            <Volume2 className="h-10 w-10 text-black animate-bounce" />
          ) : (
            <Mic className="h-10 w-10 text-emerald-400 group-hover:scale-110 transition-transform" />
          )}
        </Button>
      </div>

      {/* Dynamic Sound waves */}
      {isListening && (
        <div className="flex items-center gap-1 h-8 my-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((bar) => (
            <div
              key={bar}
              className="w-1 bg-emerald-400 rounded-full transition-all duration-150"
              style={{
                height: `${Math.floor(Math.random() * 24) + 6}px`,
                animation: `bounce 0.8s ease-in-out infinite alternate`,
                animationDelay: `${bar * 0.08}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Transcript Textbox */}
      <div className="w-full mt-2 text-center">
        <p className="text-sm font-medium text-zinc-300 min-h-[40px] italic">
          {transcript ? `"${transcript}"` : `Try saying: "Take me from Bole to Piassa, cheapest options"`}
        </p>
      </div>
    </div>
  );
}
