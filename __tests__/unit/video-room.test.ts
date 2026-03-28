import { describe, it, expect } from "vitest";
import {
  transitionState,
  computeNextDelay,
  DEFAULT_RECONNECTION_CONFIG,
  type ConnectionState,
  type ConnectionEvent,
  type ReconnectionConfig,
} from "@/lib/video-state-machine";

/**
 * Video room edge case tests.
 * Validates: Requirements 1.5, 2.4, 2.5
 */

describe("Video Room Edge Cases", () => {
  // ── State transition sequences ──────────────────────────────────────

  describe("state transition sequences", () => {
    it("idle → connecting → connected → poor_connection → reconnecting → connected", () => {
      const events: ConnectionEvent[] = [
        { type: "JOIN_CLICKED" },
        { type: "CONNECTED" },
        { type: "QUALITY_CHANGED", quality: "poor" },
        { type: "DISCONNECTED" },
        { type: "RECONNECT_SUCCESS" },
      ];
      const expected: ConnectionState[] = [
        "connecting",
        "connected",
        "poor_connection",
        "reconnecting",
        "connected",
      ];

      let state: ConnectionState = "idle";
      for (let i = 0; i < events.length; i++) {
        const next = transitionState(state, events[i]);
        expect(next).toBe(expected[i]);
        state = next!;
      }
    });

    it("connected → reconnecting → disconnected → connecting → connected (retry after timeout)", () => {
      let state: ConnectionState = "connected";

      state = transitionState(state, { type: "DISCONNECTED" })!;
      expect(state).toBe("reconnecting");

      state = transitionState(state, { type: "RECONNECT_TIMEOUT" })!;
      expect(state).toBe("disconnected");

      state = transitionState(state, { type: "RETRY_CLICKED" })!;
      expect(state).toBe("connecting");

      state = transitionState(state, { type: "CONNECTED" })!;
      expect(state).toBe("connected");
    });

    it("poor_connection → reconnecting → connected → poor_connection (repeated quality degradation)", () => {
      let state: ConnectionState = "poor_connection";

      state = transitionState(state, { type: "DISCONNECTED" })!;
      expect(state).toBe("reconnecting");

      state = transitionState(state, { type: "RECONNECT_SUCCESS" })!;
      expect(state).toBe("connected");

      state = transitionState(state, { type: "QUALITY_CHANGED", quality: "poor" })!;
      expect(state).toBe("poor_connection");
    });

    it("connecting → disconnected → connecting → disconnected (repeated initial failures)", () => {
      let state: ConnectionState = "idle";

      state = transitionState(state, { type: "JOIN_CLICKED" })!;
      expect(state).toBe("connecting");

      state = transitionState(state, { type: "DISCONNECTED" })!;
      expect(state).toBe("disconnected");

      state = transitionState(state, { type: "RETRY_CLICKED" })!;
      expect(state).toBe("connecting");

      state = transitionState(state, { type: "DISCONNECTED" })!;
      expect(state).toBe("disconnected");
    });

    it("END_CALL from reconnecting is a valid terminal transition", () => {
      let state: ConnectionState = "connected";

      state = transitionState(state, { type: "DISCONNECTED" })!;
      expect(state).toBe("reconnecting");

      state = transitionState(state, { type: "END_CALL" })!;
      expect(state).toBe("ended");

      // ended is terminal — all events return null
      expect(transitionState(state, { type: "RETRY_CLICKED" })).toBeNull();
      expect(transitionState(state, { type: "JOIN_CLICKED" })).toBeNull();
    });
  });

  // ── 45-second timeout boundary ──────────────────────────────────────

  describe("45-second timeout boundary", () => {
    const config = DEFAULT_RECONNECTION_CONFIG;

    it("cumulative backoff delays fit within 45 seconds", () => {
      // Delays: 1000, 2000, 4000, 8000, 10000, 10000, 10000 ...
      // Cumulative: 1000, 3000, 7000, 15000, 25000, 35000, 45000
      let totalMs = 0;
      let attempt = 0;

      while (totalMs < config.timeoutMs) {
        const delay = computeNextDelay(attempt, config);
        totalMs += delay;
        attempt++;
      }

      // At exactly 45000ms the timeout fires — this is the attempt count
      // that pushes us to or past the 45s boundary
      expect(totalMs).toBeGreaterThanOrEqual(config.timeoutMs);
      // We should have made 7 attempts (cumulative = 45000)
      expect(attempt).toBe(7);
    });

    it("exactly 45000ms cumulative triggers timeout (boundary)", () => {
      // Verify the exact cumulative sum: 1000+2000+4000+8000+10000+10000+10000 = 45000
      const delays: number[] = [];
      for (let i = 0; i < 7; i++) {
        delays.push(computeNextDelay(i, config));
      }
      expect(delays).toEqual([1000, 2000, 4000, 8000, 10000, 10000, 10000]);
      expect(delays.reduce((a, b) => a + b, 0)).toBe(45000);
    });

    it("6 attempts stay under 45 seconds (no timeout yet)", () => {
      let totalMs = 0;
      for (let i = 0; i < 6; i++) {
        totalMs += computeNextDelay(i, config);
      }
      // 1000+2000+4000+8000+10000+10000 = 35000
      expect(totalMs).toBe(35000);
      expect(totalMs).toBeLessThan(config.timeoutMs);
    });

    it("state machine transitions to disconnected on RECONNECT_TIMEOUT", () => {
      const result = transitionState("reconnecting", { type: "RECONNECT_TIMEOUT" });
      expect(result).toBe("disconnected");
    });

    it("RECONNECT_TIMEOUT is only valid from reconnecting state", () => {
      const states: ConnectionState[] = [
        "idle",
        "connecting",
        "connected",
        "poor_connection",
        "disconnected",
        "ended",
      ];
      for (const state of states) {
        expect(transitionState(state, { type: "RECONNECT_TIMEOUT" })).toBeNull();
      }
    });
  });

  // ── Retry flow (new token request) ──────────────────────────────────

  describe("retry flow requesting new token", () => {
    it("disconnected → connecting → connected (successful retry)", () => {
      let state: ConnectionState = "disconnected";

      // User clicks retry — requests new token, transitions to connecting
      state = transitionState(state, { type: "RETRY_CLICKED" })!;
      expect(state).toBe("connecting");

      // New token works, connection established
      state = transitionState(state, { type: "CONNECTED" })!;
      expect(state).toBe("connected");
    });

    it("disconnected → connecting → disconnected (retry fails)", () => {
      let state: ConnectionState = "disconnected";

      state = transitionState(state, { type: "RETRY_CLICKED" })!;
      expect(state).toBe("connecting");

      // Server still unreachable
      state = transitionState(state, { type: "DISCONNECTED" })!;
      expect(state).toBe("disconnected");
    });

    it("RETRY_CLICKED is only valid from disconnected state", () => {
      const states: ConnectionState[] = [
        "idle",
        "connecting",
        "connected",
        "poor_connection",
        "reconnecting",
        "ended",
      ];
      for (const state of states) {
        expect(transitionState(state, { type: "RETRY_CLICKED" })).toBeNull();
      }
    });

    it("multiple retry cycles work correctly", () => {
      let state: ConnectionState = "disconnected";

      // First retry fails
      state = transitionState(state, { type: "RETRY_CLICKED" })!;
      expect(state).toBe("connecting");
      state = transitionState(state, { type: "DISCONNECTED" })!;
      expect(state).toBe("disconnected");

      // Second retry fails
      state = transitionState(state, { type: "RETRY_CLICKED" })!;
      expect(state).toBe("connecting");
      state = transitionState(state, { type: "DISCONNECTED" })!;
      expect(state).toBe("disconnected");

      // Third retry succeeds
      state = transitionState(state, { type: "RETRY_CLICKED" })!;
      expect(state).toBe("connecting");
      state = transitionState(state, { type: "CONNECTED" })!;
      expect(state).toBe("connected");
    });

    it("full flow: connected → timeout → retry → reconnected", () => {
      let state: ConnectionState = "connected";

      // Network drops
      state = transitionState(state, { type: "DISCONNECTED" })!;
      expect(state).toBe("reconnecting");

      // Auto-reconnect times out after 45s
      state = transitionState(state, { type: "RECONNECT_TIMEOUT" })!;
      expect(state).toBe("disconnected");

      // User clicks retry (new token requested)
      state = transitionState(state, { type: "RETRY_CLICKED" })!;
      expect(state).toBe("connecting");

      // Fresh connection succeeds
      state = transitionState(state, { type: "CONNECTED" })!;
      expect(state).toBe("connected");
    });
  });
});
