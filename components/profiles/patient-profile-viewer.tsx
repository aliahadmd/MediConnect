"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  User,
  Droplets,
  AlertTriangle,
  FileText,
  Calendar,
  Phone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PatientProfileData {
  name: string;
  dateOfBirth: string | null;
  gender: string | null;
  bloodType: string | null;
  allergies: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  medicalHistoryNotes: string | null;
  profileComplete: boolean;
}

export interface PatientProfileViewerProps {
  patientId: string;
  appointmentId: string;
  open: boolean;
  onClose: () => void;
}

function ProfileField({
  icon,
  label,
  value,
  fallback = "Not specified",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  fallback?: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
        {icon}
        {label}
      </p>
      {value ? (
        <p className="mt-0.5 text-sm whitespace-pre-wrap">{value}</p>
      ) : (
        <p className="mt-0.5 text-sm italic text-muted-foreground">{fallback}</p>
      )}
    </div>
  );
}

export function PatientProfileViewer({
  patientId,
  appointmentId,
  open,
  onClose,
}: PatientProfileViewerProps) {
  const [profile, setProfile] = useState<PatientProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setProfile(null);
      setError(null);
      return;
    }

    async function fetchProfile() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/api/patients/${patientId}/profile?appointmentId=${appointmentId}`
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load patient profile");
        }
        const data: PatientProfileData = await res.json();
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [open, patientId, appointmentId]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Patient Profile
          </DialogTitle>
          <DialogDescription>
            Read-only medical profile for this appointment
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="space-y-3 py-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-muted" />
            ))}
          </div>
        )}

        {error && (
          <p className="py-4 text-sm text-destructive">{error}</p>
        )}

        {profile && !loading && (
          <div className="space-y-4">
            {!profile.profileComplete && (
              <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-200">
                Medical profile is incomplete. Some fields may be missing.
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="text-sm">{profile.name}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ProfileField
                icon={<Calendar className="h-3 w-3" />}
                label="Date of Birth"
                value={profile.dateOfBirth}
              />
              <ProfileField
                icon={<User className="h-3 w-3" />}
                label="Gender"
                value={profile.gender}
              />
            </div>

            <div>
              <p className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                <Droplets className="h-3 w-3" />
                Blood Type
              </p>
              {profile.bloodType ? (
                <Badge variant="secondary" className="mt-1">
                  {profile.bloodType}
                </Badge>
              ) : (
                <p className="mt-0.5 text-sm italic text-muted-foreground">
                  Not specified
                </p>
              )}
            </div>

            <ProfileField
              icon={<AlertTriangle className="h-3 w-3" />}
              label="Allergies"
              value={profile.allergies}
              fallback="None reported"
            />

            <div className="grid grid-cols-2 gap-4">
              <ProfileField
                icon={<Phone className="h-3 w-3" />}
                label="Emergency Contact"
                value={profile.emergencyContactName}
              />
              <ProfileField
                icon={<Phone className="h-3 w-3" />}
                label="Emergency Phone"
                value={profile.emergencyContactPhone}
              />
            </div>

            <ProfileField
              icon={<FileText className="h-3 w-3" />}
              label="Medical History"
              value={profile.medicalHistoryNotes}
              fallback="No notes"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
