import { describe, it, expect } from "vitest";
import { ConnectionQuality } from "livekit-client";
import {
  transitionState,
  computeNextDelay,
  mapConnectionQuality,
  DEFAULT_RECONNECTION_CONFIG,
  type ConnectionState,
  type ConnectionEvent,
} from "@/lib/video-state-machine";

describe("transitionState", () => {
  // Valid transitions
  it("idle + JOIN_CLICKED → connecting", () => {
    expect(transitionState("idle", { type: "JOIN_CLICKED" })).toBe("connecting");
  });

  it("connecting + CONNECTED → connected", () => {
    expect(transitionState("connecting", { type: "CONNECTED" })).toBe("connected");
  });

  it("connecting + DISCONNECTED → disconnected", () => {
    expect(transitionState("connecting", { type: "DISCONNECTED" })).toBe("disconnected");
  });

  it("connected + QUALITY_CHANGED(poor) → poor_connection", () => {
    expect(
      transitionState("connected", { type: "QUALITY_CHANGED", quality: "poor" })
    ).toBe("poor_connection");
  });

  it("connected + DISCONNECTED → reconnecting", () => {
    expect(transitionState("connected", { type: "DISCONNECTED" })).toBe("reconnecting");
  });

  it("connected + END_CALL → ended", () => {
    expect(transitionState("connected", { type: "END_CALL" })).toBe("ended");
  });

  it("poor_connection + QUALITY_CHANGED(good) → connected", () => {
    expect(
      transitionState("poor_connection", { type: "QUALITY_CHANGED", quality: "good" })
    ).toBe("connected");
  });

  it("poor_connection + QUALITY_CHANGED(fair) → connected", () => {
    expect(
      transitionState("poor_connection", { type: "QUALITY_CHANGED", quality: "fair" })
    ).toBe("connected");
  });

  it("poor_connection + DISCONNECTED → reconnecting", () => {
    expect(transitionState("poor_connection", { type: "DISCONNECTED" })).toBe("reconnecting");
  });

  it("poor_connection + END_CALL → ended", () => {
    expect(transitionState("poor_connection", { type: "END_CALL" })).toBe("ended");
  });

  it("reconnecting + RECONNECT_SUCCESS → connected", () => {
    expect(transitionState("reconnecting", { type: "RECONNECT_SUCCESS" })).toBe("connected");
  });

  it("reconnecting + RECONNECT_TIMEOUT → disconnected", () => {
    expect(transitionState("reconnecting", { type: "RECONNECT_TIMEOUT" })).toBe("disconnected");
  });

  it("reconnecting + END_CALL → ended", () => {
    expect(transitionState("reconnecting", { type: "END_CALL" })).toBe("ended");
  });

  it("disconnected + RETRY_CLICKED → connecting", () => {
    expect(transitionState("disconnected", { type: "RETRY_CLICKED" })).toBe("connecting");
  });

  // Invalid transitions return null
  it("idle + CONNECTED → null", () => {
    expect(transitionState("idle", { type: "CONNECTED" })).toBeNull();
  });

  it("ended + any event → null", () => {
    expect(transitionState("ended", { type: "JOIN_CLICKED" })).toBeNull();
    expect(transitionState("ended", { type: "RETRY_CLICKED" })).toBeNull();
    expect(transitionState("ended", { type: "END_CALL" })).toBeNull();
  });

  it("connected + QUALITY_CHANGED(good) → null (no transition when quality is already good)", () => {
    expect(
      transitionState("connected", { type: "QUALITY_CHANGED", quality: "good" })
    ).toBeNull();
  });

  // Full sequence test
  it("supports full lifecycle: idle → connecting → connected → poor → reconnecting → connected → ended", () => {
    let state: ConnectionState = "idle";

    state = transitionState(state, { type: "JOIN_CLICKED" })!;
    expect(state).toBe("connecting");

    state = transitionState(state, { type: "CONNECTED" })!;
    expect(state).toBe("connected");

    state = transitionState(state, { type: "QUALITY_CHANGED", quality: "poor" })!;
    expect(state).toBe("poor_connection");

    state = transitionState(state, { type: "DISCONNECTED" })!;
    expect(state).toBe("reconnecting");

    state = transitionState(state, { type: "RECONNECT_SUCCESS" })!;
    expect(state).toBe("connected");

    state = transitionState(state, { type: "END_CALL" })!;
    expect(state).toBe("ended");
  });
});

describe("computeNextDelay", () => {
  const config = DEFAULT_RECONNECTION_CONFIG;

  it("returns 1000ms for attempt 0", () => {
    expect(computeNextDelay(0, config)).toBe(1000);
  });

  it("returns 2000ms for attempt 1", () => {
    expect(computeNextDelay(1, config)).toBe(2000);
  });

  it("returns 4000ms for attempt 2", () => {
    expect(computeNextDelay(2, config)).toBe(4000);
  });

  it("returns 8000ms for attempt 3", () => {
    expect(computeNextDelay(3, config)).toBe(8000);
  });

  it("caps at 10000ms for attempt 4+", () => {
    expect(computeNextDelay(4, config)).toBe(10000);
    expect(computeNextDelay(5, config)).toBe(10000);
    expect(computeNextDelay(100, config)).toBe(10000);
  });
});

describe("mapConnectionQuality", () => {
  it("maps Excellent → good", () => {
    expect(mapConnectionQuality(ConnectionQuality.Excellent)).toBe("good");
  });

  it("maps Good → fair", () => {
    expect(mapConnectionQuality(ConnectionQuality.Good)).toBe("fair");
  });

  it("maps Poor → poor", () => {
    expect(mapConnectionQuality(ConnectionQuality.Poor)).toBe("poor");
  });

  it("maps Unknown → poor", () => {
    expect(mapConnectionQuality(ConnectionQuality.Unknown)).toBe("poor");
  });

  it("maps Lost → poor", () => {
    expect(mapConnectionQuality(ConnectionQuality.Lost)).toBe("poor");
  });
});
