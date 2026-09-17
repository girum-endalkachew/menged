import assert from "node:assert/strict";
import { test } from "node:test";
import { interpretVoiceIntent } from "./voice-interpreter";

test("extracts locations and cheapest preference", () => {
  assert.deepEqual(
    interpretVoiceIntent("Take me from Bole to Piassa with the cheapest fare"),
    { origin: "Bole", destination: "Piassa", preference: "cheapest" },
  );
});

test("supports alternate location spelling and walking preference", () => {
  assert.deepEqual(
    interpretVoiceIntent("From Pyassa to Mexico, avoid walking"),
    { origin: "Piassa", destination: "Mexico", preference: "least_walking" },
  );
});
