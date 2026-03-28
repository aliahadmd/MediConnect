import { ConnectionQuality } from "livekit-client";

// --- Types ---

export type ConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "poor_connection"
  | "reconnecting"
  | "disconnected"
  | "ended";

export type ConnectionEvent =
  | { type: "JOIN_CLICKED" }
  | { type: "CONNECTED" }
  | { type: "QUALITY_CHANGED"; quality: "good" | "fair" | "poor" }
  | { type: "DISCONNECTED" }
  | { type: "RECONNECT_SUCCESS" }
  | { type: "RECONNECT_TIMEOUT" }
  | { type: "RETRY_CLICKED" }
  | { type: "END_CALL" };

export interface ReconnectionConfig {
  initialDelayMs: number;
  maxDelayMs: number;
  timeoutMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RECONNECTION_CONFIG: ReconnectionConfig = {
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  timeoutMs: 45000,
  backoffMultiplier: 2,
};

// --- State machine ---

export function transitionState(
  current: ConnectionState,
  event: ConnectionEvent
): ConnectionState | null {
  switch (current) {
    case "idle":
      if (event.type === "JOIN_CLICKED") return "connecting";
      return null;

    case "connecting":
      if (event.type === "CONNECTED") return "connected";
      if (event.type === "DISCONNECTED") return "disconnected";
      return null;

    case "connected":
      if (event.type === "QUALITY_CHANGED" && event.quality === "poor")
        return "poor_connection";
      if (event.type === "DISCONNECTED") return "reconnecting";
      if (event.type === "END_CALL") return "ended";
      return null;

    case "poor_connection":
      if (
        event.type === "QUALITY_CHANGED" &&
        (event.quality === "good" || event.quality === "fair")
      )
        return "connected";
      if (event.type === "DISCONNECTED") return "reconnecting";
      if (event.type === "END_CALL") return "ended";
      return null;

    case "reconnecting":
      if (event.type === "RECONNECT_SUCCESS") return "connected";
      if (event.type === "RECONNECT_TIMEOUT") return "disconnected";
      if (event.type === "END_CALL") return "ended";
      return null;

    case "disconnected":
      if (event.type === "RETRY_CLICKED") return "connecting";
      return null;

    case "ended":
      return null;

    default:
      return null;
  }
}

// --- Exponential backoff ---

export function computeNextDelay(
  attempt: number,
  config: ReconnectionConfig
): number {
  return Math.min(
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelayMs
  );
}

// --- Quality mapping ---

export function mapConnectionQuality(
  livekitQuality: ConnectionQuality
): "good" | "fair" | "poor" {
  switch (livekitQuality) {
    case ConnectionQuality.Excellent:
      return "good";
    case ConnectionQuality.Good:
      return "fair";
    case ConnectionQuality.Poor:
      return "poor";
    case ConnectionQuality.Unknown:
      return "poor";
    case ConnectionQuality.Lost:
      return "poor";
    default:
      return "poor";
  }
}
