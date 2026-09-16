"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { Mic, Volume2, Sparkles } from "lucide-react";
import { useMengedStore } from "@/store/useMengedStore";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const waveformBars = [18, 26, 14, 30, 20, 24, 32, 16, 22, 28] as const;

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export default function VoiceMic() {
  const {
    isListening,
    setIsListening,
    transcript,
    setTranscript,
    setOrigin,
    setDestination,
    setPreference,
  } = useMengedStore();

  const recognitionRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  const parseVoiceIntent = useCallback(
    (text: string) => {
      const lower = text.toLowerCase();
      toast.success(`Heard: "${text}"`);

      if (lower.includes("bole")) setOrigin("Bole");
      if (lower.includes("piassa") || lower.includes("pyassa")) setDestination("Piassa");
      if (lower.includes("mexico")) setDestination("Mexico");

      if (lower.includes("cheapest") || lower.includes("cheap") || lower.includes("birr")) {
        setPreference("cheapest");
        toast.success("Preference set to: Cheapest");
      } else if (lower.includes("fastest") || lower.includes("fast") || lower.includes("quick")) {
        setPreference("fastest");
        toast.success("Preference set to: Fastest");
      } else if (lower.includes("walk") || lower.includes("less walking")) {
        setPreference("least_walking");
        toast.success("Preference set to: Least Walking");
      }
    },
    [setDestination, setOrigin, setPreference],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionCtor =
      (window as typeof window & {
        SpeechRecognition?: SpeechRecognitionCtor;
        webkitSpeechRecognition?: SpeechRecognitionCtor;
      }).SpeechRecognition ||
      (window as typeof window & {
        SpeechRecognition?: SpeechRecognitionCtor;
        webkitSpeechRecognition?: SpeechRecognitionCtor;
      }).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      parseVoiceIntent(text);
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast.error("Speech recognition failed or timed out.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [parseVoiceIntent, setIsListening, setTranscript]);

  const toggleListening = () => {
    const recognition = recognitionRef.current;

    if (isListening) {
      recognition?.stop();
      setIsListening(false);
      return;
    }

    setTranscript("");
    setIsListening(true);
    recognition?.start();
    toast.info("Listening... Speak your trip request!", { id: "mic-listening" });
  };

  return (
    <div className="w-full bg-surface border border-border rounded-2xl p-6 flex flex-col items-center justify-between shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between w-full mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-green" />
          <span className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
            Voice
          </span>
        </div>
        <div className="flex items-center gap-1.5 bg-surface-soft px-3 py-1 rounded-full border border-border">
          <span className={`w-2 h-2 rounded-full ${isListening ? "bg-brand-green animate-pulse" : "bg-text-muted"}`} />
          <span className="text-[10px] font-mono text-text-secondary">
            {isListening ? "LISTENING" : "STANDBY"}
          </span>
        </div>
      </div>

      <div className="relative flex flex-col items-center my-6">
        <div
          className={`absolute inset-0 rounded-full bg-brand-green/10 blur-xl transition-all duration-500 scale-125 ${
            isListening ? "animate-pulse scale-150" : "opacity-0"
          }`}
        />

        <Button
          onClick={toggleListening}
          className={`h-24 w-24 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
            isListening
              ? "bg-brand-green hover:bg-brand-green/90 border-brand-green/50 shadow-lg scale-105"
              : "bg-brand-forest hover:bg-brand-forest/90 border-transparent text-white"
          }`}
        >
          {isListening ? (
            <Volume2 className="h-10 w-10 text-white animate-bounce" />
          ) : (
            <Mic className="h-10 w-10 text-white" />
          )}
        </Button>
      </div>

      {isListening && (
        <div className="flex items-center gap-1 h-8 my-3">
          {waveformBars.map((bar, index) => (
            <div
              key={bar + index}
              className="w-1 bg-brand-green rounded-full transition-all duration-150"
              style={{
                height: `${bar}px`,
                animation: "bounce 0.8s ease-in-out infinite alternate",
                animationDelay: `${index * 0.08}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="w-full mt-2 text-center">
        <p className="text-sm font-medium text-text-secondary min-h-[40px] italic">
          {transcript ? `&ldquo;${transcript}&rdquo;` : "Try saying: &lsquo;Take me from Bole to Piassa, cheapest options&rsquo;"}
        </p>
      </div>
    </div>
  );
}
