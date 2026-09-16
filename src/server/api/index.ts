import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ADDIS_KEY_STOPS, MOCK_ROUTES } from "@/types/transit";
import {
  notificationQuerySchema,
  reportSchema,
  tripPlanSchema,
  voiceInterpretationSchema,
} from "@/lib/validation";
import { planRoutes } from "@/server/domain/route-planner";
import { interpretVoiceIntent } from "@/server/domain/voice-interpreter";

export const app = new Hono();

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "menged-api",
    status: "healthy",
    environment: process.env.NODE_ENV ?? "development",
    timestamp: new Date().toISOString(),
  }),
);

app.get("/routes", (c) =>
  c.json({
    items: MOCK_ROUTES,
    count: MOCK_ROUTES.length,
    source: "mock-route-dataset",
  }),
);

app.get("/routes/:id", (c) => {
  const routeId = c.req.param("id");
  const route = MOCK_ROUTES.find((candidate) => candidate.id === routeId);

  if (!route) {
    return c.json({ error: "Route not found." }, 404);
  }

  return c.json({ item: route });
});

app.get("/stops", (c) =>
  c.json({
    items: Object.values(ADDIS_KEY_STOPS),
    count: Object.keys(ADDIS_KEY_STOPS).length,
  }),
);

app.get("/places/search", (c) => {
  const query = c.req.query("q") ?? "";
  const normalized = query.trim().toLowerCase();

  const matches = Object.values(ADDIS_KEY_STOPS).filter((stop) => {
    if (!normalized) return true;
    return (
      stop.name.toLowerCase().includes(normalized) ||
      stop.nameAmharic.toLowerCase().includes(normalized)
    );
  });

  return c.json({ items: matches, count: matches.length });
});

app.post("/trips/plan", zValidator("json", tripPlanSchema), (c) => {
  const body = c.req.valid("json");
  const ranked = planRoutes(MOCK_ROUTES, body);

  return c.json({
    origin: body.origin,
    destination: body.destination,
    preference: body.preference,
    items: ranked,
    count: ranked.length,
    generatedAt: new Date().toISOString(),
  });
});

app.get("/fare/:routeId", (c) => {
  const routeId = c.req.param("routeId");
  const route = MOCK_ROUTES.find((candidate) => candidate.id === routeId);

  if (!route) {
    return c.json({ error: "Route not found." }, 404);
  }

  return c.json({
    routeId: route.id,
    amount: route.totalCostETB,
    currency: "ETB",
    source: "Official tariff + route distance",
    sourceType: "estimated",
    confidence: "medium",
    effectiveDate: "2026-09-15",
    lastVerified: "2026-09-15",
    transportMode: route.mode,
    route: `${route.origin} → ${route.destination}`,
  });
});

app.post("/reports", zValidator("json", reportSchema), async (c) => {
  const payload = c.req.valid("json");

  return c.json({
    ok: true,
    reportId: `report-${Date.now()}`,
    status: "received",
    issueType: payload.issueType,
    createdAt: new Date().toISOString(),
  });
});

app.get("/notifications", zValidator("query", notificationQuerySchema), (c) => {
  const query = c.req.valid("query");

  return c.json({
    items: [
      {
        id: "notif-1",
        title: "Service alert",
        message: "Bole–Piassa minibuses are continuing with standard weekday operations.",
        type: "service_alert",
        isRead: false,
      },
      {
        id: "notif-2",
        title: "Saved route updated",
        message: "Your preferred Bole to Piassa route remain available.",
        type: "saved_route",
        isRead: query.unreadOnly ? false : true,
      },
    ].slice(0, query.limit),
    count: 2,
  });
});

app.post("/voice/session", zValidator("json", voiceInterpretationSchema), (c) => {
  const payload = c.req.valid("json");

  return c.json({
    sessionId: `voice-${Date.now()}`,
    status: "created",
    locale: payload.locale,
    transcript: payload.transcript,
  });
});

app.post("/voice/interpret", zValidator("json", voiceInterpretationSchema), (c) => {
  const payload = c.req.valid("json");
  const intent = interpretVoiceIntent(payload.transcript);

  return c.json({
    ok: true,
    intent,
    confidence: 0.83,
    transcript: payload.transcript,
  });
});

export default app;
