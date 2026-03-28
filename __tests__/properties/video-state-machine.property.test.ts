// Feature: platform-enhancements-v2, Property 1: Connection state machine transitions
// Feature: platform-enhancements-v2, Property 2: Exponential backoff delay computation
// Feature: platform-enhancements-v2, Property 3: Connection quality mapping
// **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.3, 2.4, 2.5, 2.6, 3.2, 3.3**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { ConnectionQuality } from "livekit-client";
import {
  transitionState,
  computeNextDelay,
  mapConnectionQuality,
  DEFAULT_RECONNECTION_CONFIG,
  type ConnectionState,
  type ConnectionEvent,
} from "@/lib/video-state-machine";

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const connectionStateArb: fc.Arbitrary<ConnectionState> = fc.constantFrom(
  "idle",
  "connecting",
  "connected",
  "poor_connection",
  "reconnecting",
  "disconnected",
  "ended"
);

const connectionEventArb: fc.Arbitrary<ConnectionEvent> = fc.oneof(
  fc.constant({ type: "JOIN_CLICKED" } as ConnectionEvent),
  fc.constant({ type: "CONNECTED" } as ConnectionEvent),
  fc.constant({ type: "DISCONNECTED" } as ConnectionEvent),
  fc.constant({ type: "RECONNECT_SUCCESS" } as ConnectionEvent),
  fc.constant({ type: "RECONNECT_TIMEOUT" } as ConnectionEvent),
  fc.constant({ type: "RETRY_CLICKED" } as ConnectionEvent),
  fc.constant({ type: "END_CALL" } as ConnectionEvent),
  fc.constantFrom<"good" | "fair" | "poor">("good", "fair", "poor").map(
    (quality) => ({ type: "QUALITY_CHANGED", quality }) as ConnectionEvent
  )
);

const connectionQualityArb: fc.Arbitrary<ConnectionQuality> = fc.constantFrom(
  ConnectionQuality.Excellent,
  ConnectionQuality.Good,
  ConnectionQuality.Poor,
  ConnectionQuality.Lost,
  ConnectionQuality.Unknown
);

// ---------------------------------------------------------------------------
// Expected transition table
// ---------------------------------------------------------------------------

/**
 * Complete transition table derived from the state machine diagram in the design doc.
 * Key: "state|eventType" (with quality suffix for QUALITY_CHANGED)
 * Value: expected next state
 */
const TRANSITION_TABLE: Record<string, ConnectionState> = {
  // idle
  "idle|JOIN_CLICKED": "connecting",
  // connecting
  "connecting|CONNECTED": "connected",
  "connecting|DISCONNECTED": "disconnected",
  // connected
  "connected|QUALITY_CHANGED:poor": "poor_connection",
  "connected|DISCONNECTED": "reconnecting",
  "connected|END_CALL": "ended",
  // poor_connection
  "poor_connection|QUALITY_CHANGED:good": "connected",
  "poor_connection|QUALITY_CHANGED:fair": "connected",
  "poor_connection|DISCONNECTED": "reconnecting",
  "poor_connection|END_CALL": "ended",
  // reconnecting
  "reconnecting|RECONNECT_SUCCESS": "connected",
  "reconnecting|RECONNECT_TIMEOUT": "disconnected",
  "reconnecting|END_CALL": "ended",
  // disconnected
  "disconnected|RETRY_CLICKED": "connecting",
  // ended — no valid transitions
};

function transitionKey(state: ConnectionState, event: ConnectionEvent): string {
  if (event.type === "QUALITY_CHANGED") {
    return `${state}|${event.type}:${event.quality}`;
  }
  return `${state}|${event.type}`;
}

// ---------------------------------------------------------------------------
// Property 1: Connection state machine transitions
// ---------------------------------------------------------------------------

// Feature: platform-enhancements-v2, Property 1: Connection state machine transitions
// **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 2.3, 2.4, 2.5, 2.6**
describe("Property 1: Connection state machine transitions", () => {
  it("for any valid state and event, transitionState returns the correct next state or null for invalid combinations", () => {
    fc.assert(
      fc.property(connectionStateArb, connectionEventArb, (state, event) => {
        const result = transitionState(state, event);
        const key = transitionKey(state, event);
        const expected = TRANSITION_TABLE[key];

        if (expected !== undefined) {
          // Valid transition — must return the expected next state
          expect(result).toBe(expected);
        } else {
          // Invalid transition — must return null
          expect(result).toBeNull();
        }
      }),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Exponential backoff delay computation
// ---------------------------------------------------------------------------

// Feature: platform-enhancements-v2, Property 2: Exponential backoff delay computation
// **Validates: Requirements 2.1**
describe("Property 2: Exponential backoff delay computation", () => {
  it("for any non-negative attempt, computeNextDelay returns min(1000 * 2^attempt, 10000) and is between initialDelayMs and maxDelayMs", () => {
    const config = DEFAULT_RECONNECTION_CONFIG;

    fc.assert(
      fc.property(fc.nat(), (attempt) => {
        const result = computeNextDelay(attempt, config);
        const expected = Math.min(
          config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelayMs
        );

        // Result equals the formula
        expect(result).toBe(expected);

        // Result is within bounds
        expect(result).toBeGreaterThanOrEqual(config.initialDelayMs);
        expect(result).toBeLessThanOrEqual(config.maxDelayMs);
      }),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Connection quality mapping
// ---------------------------------------------------------------------------

// Feature: platform-enhancements-v2, Property 3: Connection quality mapping
// **Validates: Requirements 3.2, 3.3**
describe("Property 3: Connection quality mapping", () => {
  it("for any LiveKit ConnectionQuality value, mapConnectionQuality returns one of good/fair/poor deterministically", () => {
    fc.assert(
      fc.property(connectionQualityArb, (quality) => {
        const result = mapConnectionQuality(quality);

        // Result is one of the valid display values
        expect(["good", "fair", "poor"]).toContain(result);

        // Determinism: calling again with the same input produces the same output
        const result2 = mapConnectionQuality(quality);
        expect(result2).toBe(result);
      }),
      { numRuns: 200 }
    );
  });
});
