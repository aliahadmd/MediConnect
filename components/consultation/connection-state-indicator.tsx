"use client";

import type { ConnectionState } from "@/lib/video-state-machine";

interface ConnectionStateIndicatorProps {
  state: ConnectionState;
  quality?: "good" | "fair" | "poor";
}

const stateConfig: Record<
  ConnectionState,
  { dotClass: string; label: string }
> = {
  idle: { dotClass: "bg-gray-400", label: "Idle" },
  connecting: { dotClass: "bg-gray-400 animate-pulse", label: "Connecting" },
  connected: { dotClass: "bg-green-500", label: "Connected" },
  poor_connection: { dotClass: "bg-yellow-500", label: "Poor Connection" },
  reconnecting: {
    dotClass: "bg-red-500 animate-pulse",
    label: "Reconnecting",
  },
  disconnected: { dotClass: "bg-red-500", label: "Disconnected" },
  ended: { dotClass: "bg-gray-400", label: "Ended" },
};

const qualityLabels: Record<"good" | "fair" | "poor", string> = {
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

function getDotClass(state: ConnectionState, quality?: "good" | "fair" | "poor"): string {
  if ((state === "connected" || state === "poor_connection") && quality) {
    if (quality === "good") return "bg-green-500";
    if (quality === "fair") return "bg-yellow-500";
    return "bg-red-500";
  }
  return stateConfig[state].dotClass;
}

export function ConnectionStateIndicator({
  state,
  quality,
}: ConnectionStateIndicatorProps) {
  const { label } = stateConfig[state];
  const dotClass = getDotClass(state, quality);
  const showQuality =
    (state === "connected" || state === "poor_connection") && quality;

  return (
    <div className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
      <span className={`inline-block size-2 rounded-full ${dotClass}`} />
      <span>
        {label}
        {showQuality && (
          <span className="ml-1 text-white/70">· {qualityLabels[quality!]}</span>
        )}
      </span>
    </div>
  );
}
