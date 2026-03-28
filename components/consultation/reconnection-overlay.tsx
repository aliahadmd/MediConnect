"use client";

import { useState, useEffect } from "react";
import { Loader2, WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReconnectionOverlayProps {
  disconnectedAt: Date;
  reconnectAttempts: number;
  isTimedOut: boolean;
  onRetry: () => void;
}

export function ReconnectionOverlay({
  disconnectedAt,
  reconnectAttempts,
  isTimedOut,
  onRetry,
}: ReconnectionOverlayProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    function updateElapsed() {
      setElapsed(Math.floor((Date.now() - disconnectedAt.getTime()) / 1000));
    }

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [disconnectedAt]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-white/10 px-8 py-10 text-center text-white shadow-lg">
        {isTimedOut ? (
          <>
            <WifiOff className="size-12 text-red-400" />
            <p className="text-xl font-semibold">Connection Lost</p>
            <p className="text-sm text-white/70">
              Disconnected for {elapsed}s
            </p>
            <Button
              size="lg"
              variant="secondary"
              onClick={onRetry}
              className="mt-2"
            >
              <RefreshCw className="mr-2 size-4" />
              Retry Connection
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="size-12 animate-spin text-yellow-400" />
            <p className="text-xl font-semibold">Reconnecting...</p>
            <p className="text-sm text-white/70">
              Disconnected for {elapsed}s
            </p>
            {reconnectAttempts > 0 && (
              <p className="text-sm text-white/70">
                Attempt {reconnectAttempts}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
