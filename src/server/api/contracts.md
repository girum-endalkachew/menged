# Backend API Contracts

Base path: `/api/v1`

## `POST /trips/plan`

Request JSON:

```json
{
  "origin": "Bole",
  "destination": "Piassa",
  "budgetETB": 50,
  "preference": "balanced",
  "walkingToleranceMinutes": 15,
  "avoidTransportModes": ["ride"]
}
```

Response JSON contains `origin`, `destination`, `preference`, `items`, `count`, and `generatedAt`. Each item is a route option with cost, duration, walking minutes, transfers, steps, and map path coordinates.

## `POST /voice/interpret`

Request JSON: `{ "transcript": string, "locale": string, "userId?: string" }`

Response JSON contains `ok`, `intent`, `confidence`, and `transcript`. The intent may include `origin`, `destination`, and one of `cheapest`, `fastest`, `least_walking`, or `balanced` as `preference`.

## Error contract

Validation failures return HTTP `400` with the validator error payload. Resource lookups return HTTP `404` with `{ "error": string }`.
