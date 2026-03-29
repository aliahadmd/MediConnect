"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Stethoscope, Loader2 } from "lucide-react";
import { WaitingIllustration } from "@/components/illustrations";

interface WaitingRoomProps {
  appointmentId: string;
}

interface StatusData {
  queuePosition: number;
  doctorReady: boolean;
}

export function WaitingRoom({ appointmentId }: WaitingRoomProps) {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/consultation/${appointmentId}/status`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch status");
      }
      const data: StatusData = await res.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch status");
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  // Poll every 5 seconds
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (loading && !status) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16">
          <Loader2 className="size-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading waiting room...</p>
        </CardContent>
      </Card>
    );
  }

  if (error && !status) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={fetchStatus}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const doctorReady = status?.doctorReady ?? false;
  const queuePosition = status?.queuePosition ?? 0;

  return (
    <div className="space-y-6">
      {/* Queue position card */}
      <Card>
        <CardContent className="flex flex-col items-center gap-6 py-12">
          {/* Waiting state */}
          {!doctorReady && (
            <div data-testid="waiting-state" className="flex flex-col items-center gap-6">
              {/* Waiting illustration */}
              <WaitingIllustration size={120} className="text-muted-foreground/60" />

              {/* Pulsing animation while waiting */}
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="flex size-24 items-center justify-center rounded-full bg-primary/10"
              >
                <Clock className="size-12 text-primary" />
              </motion.div>

              {/* Calming engagement copy */}
              <div className="space-y-1 text-center">
                <p className="text-lg font-medium">Your doctor will be with you shortly</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Relax and prepare for your consultation. You&apos;ll be notified when your doctor is ready.
                </p>
              </div>
            </div>
          )}

          {/* Doctor ready state */}
          {doctorReady && (
            <div data-testid="doctor-ready-state" className="flex flex-col items-center gap-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="flex size-24 items-center justify-center rounded-full bg-green-100"
              >
                <Stethoscope className="size-12 text-green-600" />
              </motion.div>

              {/* Doctor-ready engagement copy */}
              <div className="space-y-1 text-center">
                <p className="text-lg font-medium">Your doctor is ready to see you</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Click the button below to join your consultation
                </p>
              </div>
            </div>
          )}

          {/* Animated queue position */}
          <div className="text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={queuePosition}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center justify-center gap-2">
                  <Users className="size-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Queue Position
                  </span>
                </div>
                <p className="mt-1 text-6xl font-black tabular-nums">
                  {queuePosition}
                </p>
              </motion.div>
            </AnimatePresence>

            <Badge
              variant={doctorReady ? "default" : "secondary"}
              className="mt-4"
            >
              {doctorReady ? "Doctor is ready" : "Waiting for doctor"}
            </Badge>
          </div>

          {/* Doctor ready — Join Now button */}
          <AnimatePresence>
            {doctorReady && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              >
                <Button size="lg" className="min-h-[44px] min-w-[44px] bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-base px-8" asChild>
                  <a href={`/consultation/${appointmentId}`}>
                    <Stethoscope className="mr-2 size-4" />
                    Doctor is ready — Join Now
                  </a>
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
