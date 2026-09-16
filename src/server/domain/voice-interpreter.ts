import type { RoutePreference } from "./route-planner";

export interface VoiceIntent {
  origin?: string;
  destination?: string;
  preference: RoutePreference;
}

const locations = [
  { aliases: ["bole"], value: "Bole" },
  { aliases: ["piassa", "pyassa"], value: "Piassa" },
  { aliases: ["mexico"], value: "Mexico" },
];

function includesAny(text: string, aliases: string[]) {
  return aliases.some((alias) => text.includes(alias));
}

export function interpretVoiceIntent(transcript: string): VoiceIntent {
  const normalized = transcript.trim().toLowerCase();
  const matchedLocations = locations.filter((location) =>
    includesAny(normalized, location.aliases),
  );

  let preference: RoutePreference = "balanced";
  if (includesAny(normalized, ["cheapest", "cheap", "lowest fare", "save money", "birr"])) {
    preference = "cheapest";
  } else if (includesAny(normalized, ["fastest", "fast", "quick"] )) {
    preference = "fastest";
  } else if (includesAny(normalized, ["less walking", "avoid walking", "walk less"])) {
    preference = "least_walking";
  }

  return {
    origin: matchedLocations[0]?.value,
    destination: matchedLocations[1]?.value,
    preference,
  };
}
