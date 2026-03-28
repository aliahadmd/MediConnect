"use client";

import {
  useLocalParticipant,
  useRemoteParticipants,
  useConnectionQualityIndicator,
} from "@livekit/components-react";
import type { Participant } from "livekit-client";
import { mapConnectionQuality } from "@/lib/video-state-machine";
import {
  Signal,
  SignalLow,
  SignalMedium,
  Mic,
  MicOff,
  Video,
  VideoOff,
} from "lucide-react";

type Quality = "good" | "fair" | "poor";

const qualityConfig: Record<Quality, { icon: typeof Signal; colorClass: string }> = {
  good: { icon: Signal, colorClass: "text-green-400" },
  fair: { icon: SignalMedium, colorClass: "text-yellow-400" },
  poor: { icon: SignalLow, colorClass: "text-red-400" },
};

function ParticipantQualityRow({
  label,
  participant,
  isMicEnabled,
  isCameraEnabled,
}: {
  label: string;
  participant: Participant;
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
}) {
  const { quality: rawQuality } = useConnectionQualityIndicator({
    participant,
  });
  const quality = mapConnectionQuality(rawQuality);
  const { icon: SignalIcon, colorClass } = qualityConfig[quality];

  return (
    <div className="flex items-center gap-2">
      <span className="w-14 text-xs text-white/70">{label}</span>
      <SignalIcon className={`size-4 ${colorClass}`} aria-label={`Signal ${quality}`} />
      {isMicEnabled ? (
        <Mic className="size-3.5 text-white/70" aria-label="Microphone on" />
      ) : (
        <MicOff className="size-3.5 text-red-400" aria-label="Microphone off" />
      )}
      {isCameraEnabled ? (
        <Video className="size-3.5 text-white/70" aria-label="Camera on" />
      ) : (
        <VideoOff className="size-3.5 text-red-400" aria-label="Camera off" />
      )}
    </div>
  );
}

export function CallQualityMonitor() {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } =
    useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const remote = remoteParticipants[0];

  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-black/60 px-3 py-2 text-xs text-white backdrop-blur-sm">
      <ParticipantQualityRow
        label="You"
        participant={localParticipant}
        isMicEnabled={isMicrophoneEnabled}
        isCameraEnabled={isCameraEnabled}
      />
      {remote ? (
        <ParticipantQualityRow
          label="Remote"
          participant={remote}
          isMicEnabled={remote.isMicrophoneEnabled}
          isCameraEnabled={remote.isCameraEnabled}
        />
      ) : (
        <div className="flex items-center gap-2">
          <span className="w-14 text-xs text-white/70">Remote</span>
          <span className="text-xs text-white/40">Waiting…</span>
        </div>
      )}
    </div>
  );
}
