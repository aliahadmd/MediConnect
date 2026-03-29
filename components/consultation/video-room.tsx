"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { RoomEvent, ConnectionQuality } from "livekit-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PhoneOff, Loader2, RefreshCw, User } from "lucide-react";
import { VideoCallIllustration, ConsultationCompleteIllustration, ConnectionErrorIllustration } from "@/components/illustrations";
import { NotesPanel } from "@/components/consultation/notes-panel";
import { ConnectionStateIndicator } from "@/components/consultation/connection-state-indicator";
import { ReconnectionOverlay } from "@/components/consultation/reconnection-overlay";
import { CallQualityMonitor } from "@/components/consultation/call-quality-monitor";
import {
  transitionState,
  computeNextDelay,
  mapConnectionQuality,
  DEFAULT_RECONNECTION_CONFIG,
  type ConnectionState,
} from "@/lib/video-state-machine";

interface VideoRoomProps {
  appointmentId: string;
  isDoctor?: boolean;
  status: string;
  scheduledAt: string;
  slotDate: string;
  slotStartTime: string;
  slotEndTime: string;
  participantName?: string;
}

function isWithinJoinWindow(scheduledAt: string): boolean {
  const scheduled = new Date(scheduledAt);
  const now = new Date();
  const fiveMinBefore = new Date(scheduled.getTime() - 5 * 60 * 1000);
  const thirtyMinAfter = new Date(scheduled.getTime() + 30 * 60 * 1000);
  return now >= fiveMinBefore && now <= thirtyMinAfter;
}

function formatSlotTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

/**
 * Inner component that hooks into the LiveKit room context to listen
 * for ConnectionQualityChanged events and dispatch quality state transitions.
 */
function QualityEventBridge({
  onQualityChanged,
}: {
  onQualityChanged: (quality: "good" | "fair" | "poor") => void;
}) {
  const room = useRoomContext();

  useEffect(() => {
    const handler = (quality: ConnectionQuality) => {
      const mapped = mapConnectionQuality(quality);
      onQualityChanged(mapped);
    };

    room.on(RoomEvent.ConnectionQualityChanged, handler);
    return () => {
      room.off(RoomEvent.ConnectionQualityChanged, handler);
    };
  }, [room, onQualityChanged]);

  return null;
}

export function VideoRoom({
  appointmentId,
  isDoctor = false,
  status,
  scheduledAt,
  slotDate,
  slotStartTime,
  slotEndTime,
  participantName,
}: VideoRoomProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canJoin, setCanJoin] = useState(false);
  const [quality, setQuality] = useState<"good" | "fair" | "poor" | undefined>(undefined);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [disconnectedAt, setDisconnectedAt] = useState<Date | null>(null);
  const [isTimedOut, setIsTimedOut] = useState(false);

  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);

  // Helper to dispatch a state machine event
  const dispatch = useCallback(
    (event: Parameters<typeof transitionState>[1]) => {
      setConnectionState((current) => {
        const next = transitionState(current, event);
        return next ?? current;
      });
    },
    []
  );

  // Check join eligibility periodically
  useEffect(() => {
    function check() {
      setCanJoin(status === "confirmed" && isWithinJoinWindow(scheduledAt));
    }
    check();
    const interval = setInterval(check, 10_000);
    return () => clearInterval(interval);
  }, [status, scheduledAt]);

  const fetchToken = useCallback(async (): Promise<{
    token: string;
    serverUrl: string;
  }> => {
    const res = await fetch("/api/consultation/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to get consultation token");
    }

    return res.json();
  }, [appointmentId]);

  const handleJoin = useCallback(async () => {
    dispatch({ type: "JOIN_CLICKED" });
    setError(null);

    try {
      const data = await fetchToken();
      setToken(data.token);
      setServerUrl(data.serverUrl);
      dispatch({ type: "CONNECTED" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to join consultation";
      // If server is unreachable on initial connect, transition to disconnected
      setError(
        message === "Unable to create video session"
          ? "Video service unavailable. Please try again."
          : message
      );
      dispatch({ type: "DISCONNECTED" });
    }
  }, [dispatch, fetchToken]);

  const clearAllTimers = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
  }, []);

  const handleEndCall = useCallback(async () => {
    clearAllTimers();
    dispatch({ type: "END_CALL" });

    try {
      await fetch(`/api/consultation/${appointmentId}/end`, {
        method: "POST",
      });
    } catch {
      // Best effort — the appointment may already be completed
    }
    setToken(null);
    setServerUrl(null);
  }, [appointmentId, dispatch, clearAllTimers]);

  // Exponential backoff reconnection logic
  const startReconnection = useCallback(() => {
    attemptRef.current = 0;
    setReconnectAttempts(0);
    setDisconnectedAt(new Date());
    setIsTimedOut(false);

    // 45-second overall timeout
    timeoutTimerRef.current = setTimeout(() => {
      clearAllTimers();
      setIsTimedOut(true);
      dispatch({ type: "RECONNECT_TIMEOUT" });
    }, DEFAULT_RECONNECTION_CONFIG.timeoutMs);

    // Schedule first reconnect attempt
    const delay = computeNextDelay(0, DEFAULT_RECONNECTION_CONFIG);
    reconnectTimerRef.current = setTimeout(async function tryReconnect() {
      attemptRef.current += 1;
      setReconnectAttempts(attemptRef.current);

      try {
        const data = await fetchToken();
        clearAllTimers();
        setToken(data.token);
        setServerUrl(data.serverUrl);
        setReconnectAttempts(0);
        setDisconnectedAt(null);
        dispatch({ type: "RECONNECT_SUCCESS" });
      } catch {
        // Schedule next attempt with exponential backoff
        const nextDelay = computeNextDelay(
          attemptRef.current,
          DEFAULT_RECONNECTION_CONFIG
        );
        reconnectTimerRef.current = setTimeout(tryReconnect, nextDelay);
      }
    }, delay);
  }, [clearAllTimers, dispatch, fetchToken]);

  const handleDisconnected = useCallback(() => {
    if (connectionState === "ended") return;

    dispatch({ type: "DISCONNECTED" });
    startReconnection();
  }, [connectionState, dispatch, startReconnection]);

  const handleConnected = useCallback(() => {
    clearAllTimers();
    setReconnectAttempts(0);
    setDisconnectedAt(null);
    setIsTimedOut(false);
    dispatch({ type: "CONNECTED" });
  }, [clearAllTimers, dispatch]);

  const handleQualityChanged = useCallback(
    (q: "good" | "fair" | "poor") => {
      setQuality(q);
      dispatch({ type: "QUALITY_CHANGED", quality: q });
    },
    [dispatch]
  );

  const handleRetry = useCallback(async () => {
    clearAllTimers();
    setError(null);
    setIsTimedOut(false);
    setReconnectAttempts(0);
    setDisconnectedAt(null);
    dispatch({ type: "RETRY_CLICKED" });

    try {
      const data = await fetchToken();
      setToken(data.token);
      setServerUrl(data.serverUrl);
      dispatch({ type: "CONNECTED" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to join consultation";
      setError(
        message === "Unable to create video session"
          ? "Video service unavailable. Please try again."
          : message
      );
      dispatch({ type: "DISCONNECTED" });
    }
  }, [clearAllTimers, dispatch, fetchToken]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  // Idle state — show Join button
  if (connectionState === "idle") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12" data-testid="consultation-idle">
          <VideoCallIllustration size={120} className="text-muted-foreground/60" />
          <div className="text-center space-y-1">
            <p className="text-lg font-medium">Ready for your consultation</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Click below to join your video session with your doctor
            </p>
            <p className="text-sm text-muted-foreground">
              {slotDate} · {formatSlotTime(slotStartTime)} –{" "}
              {formatSlotTime(slotEndTime)}
            </p>
            {isDoctor && participantName && (
              <p className="mt-1 flex items-center justify-center gap-1 text-sm text-muted-foreground">
                <User className="size-3.5" />
                Patient: {participantName}
              </p>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {canJoin ? (
            <Button size="lg" className="min-h-[44px] min-w-[44px]" onClick={handleJoin}>
              Join Consultation
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              {status !== "confirmed"
                ? "This appointment is not confirmed yet."
                : "The join window is not open yet. You can join 5 minutes before the scheduled time."}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Connecting state
  if (connectionState === "connecting") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="size-12 animate-spin text-primary" />
          <p className="text-lg font-medium">Connecting to consultation...</p>
        </CardContent>
      </Card>
    );
  }

  // Disconnected state — show error + Retry button
  if (connectionState === "disconnected") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12" data-testid="consultation-disconnected">
          <ConnectionErrorIllustration size={120} className="text-muted-foreground/60" />
          <div className="text-center space-y-1">
            <p className="text-lg font-medium">Connection lost</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Don&apos;t worry — this happens sometimes. Try reconnecting or check your internet connection.
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button size="lg" onClick={handleRetry}>
            <RefreshCw className="mr-2 size-4" />
            Retry Connection
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Ended state
  if (connectionState === "ended") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12" data-testid="consultation-ended">
          <ConsultationCompleteIllustration size={120} className="text-muted-foreground/60" />
          <div className="text-center space-y-1">
            <p className="text-lg font-medium">Consultation complete</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Thank you for your visit. Check your prescriptions or leave a review for your doctor.
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button variant="outline" asChild>
            <a href="/patient/appointments">Back to Appointments</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Connected / Poor Connection / Reconnecting — show LiveKit room
  return (
    <div className="relative flex gap-4">
      <div className={isDoctor ? "flex-1" : "w-full"}>
        {/* Persistent connection state indicator */}
        <div className="absolute left-3 top-3 z-40">
          <ConnectionStateIndicator state={connectionState} quality={quality} />
        </div>

        {/* Reconnection overlay for reconnecting state */}
        {connectionState === "reconnecting" && disconnectedAt && (
          <ReconnectionOverlay
            disconnectedAt={disconnectedAt}
            reconnectAttempts={reconnectAttempts}
            isTimedOut={isTimedOut}
            onRetry={handleRetry}
          />
        )}

        {/* Doctor info bar */}
        {isDoctor && participantName && (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
            <User className="size-4 text-muted-foreground" />
            <span>Patient: {participantName}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              {slotDate} · {formatSlotTime(slotStartTime)} –{" "}
              {formatSlotTime(slotEndTime)}
            </span>
          </div>
        )}

        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <LiveKitRoom
            token={token!}
            serverUrl={serverUrl!}
            connect={true}
            onDisconnected={handleDisconnected}
            onConnected={handleConnected}
            data-lk-theme="default"
            style={{ height: "70vh" }}
          >
            <VideoConference />
            <RoomAudioRenderer />
            <QualityEventBridge onQualityChanged={handleQualityChanged} />
            {/* Call quality monitor in connected/poor_connection states */}
            {(connectionState === "connected" ||
              connectionState === "poor_connection") && (
              <div className="absolute right-3 top-3 z-40">
                <CallQualityMonitor />
              </div>
            )}
            <EndCallButton onEndCall={handleEndCall} />
          </LiveKitRoom>
        </div>
      </div>
      {isDoctor && (
        <div className="w-80 shrink-0">
          <NotesPanel appointmentId={appointmentId} />
        </div>
      )}
    </div>
  );
}

function EndCallButton({ onEndCall }: { onEndCall: () => void }) {
  return (
    <div className="flex justify-center py-4">
      <Button variant="destructive" size="lg" onClick={onEndCall}>
        <PhoneOff className="mr-2 size-4" />
        End Call
      </Button>
    </div>
  );
}
