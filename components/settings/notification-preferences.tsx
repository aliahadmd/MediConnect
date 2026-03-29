"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface NotificationPreference {
  notificationType: string;
  enabled: boolean;
}

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  appointment_booked: "Appointment Booked",
  appointment_confirmed: "Appointment Confirmed",
  appointment_rejected: "Appointment Rejected",
  appointment_cancelled: "Appointment Cancelled",
  patient_calling: "Patient Calling",
  prescription_ready: "Prescription Ready",
};

const NOTIFICATION_TYPE_DESCRIPTIONS: Record<string, string> = {
  appointment_booked: "When a patient books an appointment with you",
  appointment_confirmed: "When a doctor confirms your appointment",
  appointment_rejected: "When a doctor rejects your appointment",
  appointment_cancelled: "When an appointment is cancelled",
  patient_calling: "When a patient joins the video room",
  prescription_ready: "When a prescription is ready for download",
};

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPreferences() {
      try {
        const res = await fetch("/api/notifications/preferences");
        if (res.ok) {
          const data: NotificationPreference[] = await res.json();
          setPreferences(data);
        }
      } catch {
        // Silently fail — defaults will show as all enabled
      } finally {
        setLoading(false);
      }
    }
    fetchPreferences();
  }, []);

  async function handleToggle(notificationType: string, enabled: boolean) {
    // Optimistically update UI
    setPreferences((prev) =>
      prev.map((p) =>
        p.notificationType === notificationType ? { ...p, enabled } : p
      )
    );
    setUpdating(notificationType);

    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: [{ notificationType, enabled }],
        }),
      });

      if (res.ok) {
        const updated: NotificationPreference[] = await res.json();
        setPreferences(updated);
      } else {
        // Revert on failure
        setPreferences((prev) =>
          prev.map((p) =>
            p.notificationType === notificationType
              ? { ...p, enabled: !enabled }
              : p
          )
        );
      }
    } catch {
      // Revert on network error
      setPreferences((prev) =>
        prev.map((p) =>
          p.notificationType === notificationType
            ? { ...p, enabled: !enabled }
            : p
        )
      );
    } finally {
      setUpdating(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-5" data-testid="notification-preferences-skeleton">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-1">
            <div className="space-y-2">
              <div className="h-4 w-40 animate-pulse rounded-md bg-muted" />
              <div className="h-3 w-60 animate-pulse rounded-md bg-muted" />
            </div>
            <div className="h-6 w-10 animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {preferences.map((pref) => (
        <div
          key={pref.notificationType}
          className="flex items-center justify-between gap-4"
        >
          <Label
            htmlFor={`pref-${pref.notificationType}`}
            className="flex flex-col gap-0.5 cursor-pointer"
          >
            <span className="text-sm font-medium">
              {NOTIFICATION_TYPE_LABELS[pref.notificationType] ??
                pref.notificationType}
            </span>
            <span className="text-xs text-muted-foreground font-normal">
              {NOTIFICATION_TYPE_DESCRIPTIONS[pref.notificationType] ?? ""}
            </span>
          </Label>
          <Switch
            id={`pref-${pref.notificationType}`}
            checked={pref.enabled}
            onCheckedChange={(checked) =>
              handleToggle(pref.notificationType, checked as boolean)
            }
            disabled={updating === pref.notificationType}
          />
        </div>
      ))}
    </div>
  );
}
