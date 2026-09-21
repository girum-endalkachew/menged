"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, MapPin, AlertCircle, Check } from "lucide-react";
import { Coordinate } from "@/types/journey";
import { GeocodedPlace } from "@/app/api/geocode/route";

interface PlaceSearchInputProps {
  placeholder?: string;
  onSelectPlace: (place: { name: string; coordinates: Coordinate }) => void;
  initialValue?: string;
  className?: string;
  id?: string;
}

export default function PlaceSearchInput({
  placeholder = "Search place in Addis Ababa...",
  onSelectPlace,
  initialValue = "",
  className = "",
  id,
}: PlaceSearchInputProps) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<GeocodedPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync initialValue changes
  useEffect(() => {
    if (initialValue !== query) {
      setQuery(initialValue);
    }
  }, [initialValue]);

  // Handle outside click to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setQuery(text);
    setError(null);

    // Clear previous timer & pending fetch
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!text.trim() || text.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setIsOpen(true);

    debounceTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(text.trim())}`, {
          signal: controller.signal,
        });

        const json = await response.json();

        if (!response.ok || !json.success) {
          setError(json.error || `Place search failed (HTTP ${response.status})`);
          setResults([]);
        } else {
          setResults(json.data || []);
          setError(null);
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          return; // Suppress aborted request errors
        }
        setError(`Failed to search places: ${err?.message || "Network error"}`);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce
  };

  const handleSelect = (place: GeocodedPlace) => {
    setQuery(place.name);
    setIsOpen(false);
    setError(null);
    onSelectPlace({
      name: place.name,
      coordinates: place.coordinates,
    });
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-[#66736D] absolute left-3 pointer-events-none" />
        <input
          id={id}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (results.length > 0 || error) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full pl-9 pr-9 py-2.5 bg-white border border-[#E4E7E5] rounded-xl text-xs text-[#17231F] placeholder-[#9AA49F] focus:outline-none focus:border-[#2E8B68] focus:ring-1 focus:ring-[#2E8B68] transition-all font-mono"
        />
        {isLoading && (
          <Loader2 className="w-4 h-4 text-[#2E8B68] animate-spin absolute right-3 pointer-events-none" />
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-[#E4E7E5] rounded-xl shadow-lg max-h-60 overflow-y-auto py-1 fade-in">
          {error && (
            <div className="p-3 text-xs text-red-600 bg-red-50 flex items-start gap-2 border-b border-red-100">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!isLoading && !error && results.length === 0 && query.trim().length >= 2 && (
            <div className="p-3 text-xs text-[#66736D] text-center font-mono">
              No matching places found for &quot;{query}&quot;
            </div>
          )}

          {results.map((place) => (
            <button
              key={place.id}
              type="button"
              onClick={() => handleSelect(place)}
              className="w-full text-left px-3.5 py-2.5 hover:bg-[#FAF9F6] transition-colors flex items-center justify-between group cursor-pointer border-b border-[#F3F4F1] last:border-none"
            >
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-[#2E8B68] flex-shrink-0 group-hover:scale-110 transition-transform" />
                <div>
                  <span className="text-xs font-bold text-[#17231F] block">{place.name}</span>
                  {place.address && (
                    <span className="text-[10px] text-[#66736D] font-mono block">{place.address}</span>
                  )}
                </div>
              </div>
              <span className="text-[10px] text-[#9AA49F] font-mono">
                {place.coordinates.latitude.toFixed(4)}, {place.coordinates.longitude.toFixed(4)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
