import { z } from "zod";

export const routePreferenceSchema = z.enum([
  "cheapest",
  "fastest",
  "least_walking",
  "balanced",
]);

export const tripPlanSchema = z.object({
  origin: z.string().min(1, "Origin is required."),
  destination: z.string().min(1, "Destination is required."),
  budgetETB: z.number().int().min(0).optional(),
  preference: routePreferenceSchema.default("balanced"),
  walkingToleranceMinutes: z.number().int().min(0).max(60).optional(),
  avoidTransportModes: z.array(z.string()).default([]),
});

export const voiceInterpretationSchema = z.object({
  transcript: z.string().min(1),
  locale: z.string().default("en-US"),
  userId: z.string().optional(),
});

export const reportSchema = z.object({
  issueType: z.enum([
    "wrong_route",
    "wrong_stop",
    "wrong_fare",
    "route_unavailable",
    "stop_moved",
    "transport_issue",
    "other",
  ]),
  description: z.string().min(3),
  location: z.string().optional(),
  routeId: z.string().optional(),
  stopId: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

export const notificationQuerySchema = z.object({
  unreadOnly: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
