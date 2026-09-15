export interface TransitStop {
  id: string;
  name: string;
  nameAmharic: string;
  coordinates: [number, number]; // [lng, lat]
}

export interface RouteStep {
  instruction: string;
  instructionAmharic: string;
  vehicleType: "Minibus Taxi" | "Sheger Bus" | "Anbessa Bus" | "LRT" | "Walk" | "Ride";
  from: string;
  to: string;
  costETB: number;
  durationMins: number;
}

export interface RouteOption {
  id: string;
  origin: string;
  destination: string;
  transfers: number;
  totalCostETB: number;
  estimatedMinutes: number;
  walkingMinutes: number;
  mode: "minibus" | "bus" | "lrt" | "ride" | "multimodal";
  tag: "Cheapest" | "Fastest" | "Least Walking" | "Balanced";
  steps: RouteStep[];
  pathCoordinates: [number, number][]; // [lng, lat] for MapLibre
}

export const ADDIS_KEY_STOPS: Record<string, TransitStop> = {
  bole: { id: "bole", name: "Bole Medhanialem", nameAmharic: "ቦሌ መድኃኔዓለም", coordinates: [38.7885, 8.9953] },
  atlas: { id: "atlas", name: "Bole Atlas", nameAmharic: "ቦሌ አትላስ", coordinates: [38.7770, 9.0062] },
  meskel: { id: "meskel", name: "Meskel Square", nameAmharic: "መስቀል አደባባይ", coordinates: [38.7636, 9.0108] },
  mexico: { id: "mexico", name: "Mexico Square", nameAmharic: "ሜክሲኮ", coordinates: [38.7454, 9.0105] },
  piassa: { id: "piassa", name: "Piassa / Arada", nameAmharic: "ፒያሳ / አራዳ", coordinates: [38.7525, 9.0345] },
  megenagna: { id: "megenagna", name: "Megenagna", nameAmharic: "መገናኛ", coordinates: [38.8021, 9.0205] },
  fourkilo: { id: "fourkilo", name: "4 Kilo", nameAmharic: "4 ኪሎ", coordinates: [38.7632, 9.0336] },
};

export const MOCK_ROUTES: RouteOption[] = [
  {
    id: "route-bole-piassa-cheapest",
    origin: "Bole",
    destination: "Piassa",
    transfers: 1,
    totalCostETB: 25,
    estimatedMinutes: 35,
    walkingMinutes: 4,
    mode: "minibus",
    tag: "Cheapest",
    steps: [
      {
        instruction: "Take blue & white minibus from Bole Medhanialem to Mexico",
        instructionAmharic: "ከቦሌ መድኃኔዓለም ወደ ሜክሲኮ ሰማያዊ ታክሲ ይያዙ",
        vehicleType: "Minibus Taxi",
        from: "Bole Medhanialem",
        to: "Mexico",
        costETB: 15,
        durationMins: 20
      },
      {
        instruction: "Transfer at Mexico to Piassa Minibus",
        instructionAmharic: "ሜክሲኮ ላይ ወደ ፒያሳ ታክሲ ይቀይሩ",
        vehicleType: "Minibus Taxi",
        from: "Mexico",
        to: "Piassa (Churchill)",
        costETB: 10,
        durationMins: 15
      }
    ],
    pathCoordinates: [
      [38.7885, 8.9953],
      [38.7770, 9.0062],
      [38.7636, 9.0108],
      [38.7454, 9.0105],
      [38.7525, 9.0345]
    ]
  },
  {
    id: "route-bole-piassa-fastest",
    origin: "Bole",
    destination: "Piassa",
    transfers: 0,
    totalCostETB: 220,
    estimatedMinutes: 20,
    walkingMinutes: 1,
    mode: "ride",
    tag: "Fastest",
    steps: [
      {
        instruction: "Direct trip via Churchill Ave using Ride / Feres",
        instructionAmharic: "በቸርችል ጎዳና በራይድ/ፈረስ በቀጥታ ይሂዱ",
        vehicleType: "Ride",
        from: "Bole Medhanialem",
        to: "Piassa",
        costETB: 220,
        durationMins: 20
      }
    ],
    pathCoordinates: [
      [38.7885, 8.9953],
      [38.7730, 9.0120],
      [38.7525, 9.0345]
    ]
  },
  {
    id: "route-bole-piassa-balanced",
    origin: "Bole",
    destination: "Piassa",
    transfers: 1,
    totalCostETB: 18,
    estimatedMinutes: 40,
    walkingMinutes: 5,
    mode: "bus",
    tag: "Balanced",
    steps: [
      {
        instruction: "Take Sheger Express Bus from Bole to Meskel Square",
        instructionAmharic: "ከቦሌ ወደ መስቀል አደባባይ ሸገር አውቶቡስ ይያዙ",
        vehicleType: "Sheger Bus",
        from: "Bole Airport",
        to: "Meskel Square",
        costETB: 8,
        durationMins: 22
      },
      {
        instruction: "Take LRT or Minibus from Meskel Square to Piassa",
        instructionAmharic: "ከመስቀል አደባባይ በባቡር ወይም በታክሲ ወደ ፒያሳ",
        vehicleType: "LRT",
        from: "Meskel Square LRT",
        to: "Piassa",
        costETB: 10,
        durationMins: 18
      }
    ],
    pathCoordinates: [
      [38.7885, 8.9953],
      [38.7636, 9.0108],
      [38.7632, 9.0336],
      [38.7525, 9.0345]
    ]
  }
];
