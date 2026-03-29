"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Stethoscope } from "lucide-react";

interface SpecializationItem {
  specialization: string;
  doctorCount: number;
}

export interface SpecializationBrowserProps {
  onSelectSpecialization: (specialization: string) => void;
  selectedSpecialization: string | null;
}

export function SpecializationBrowser({
  onSelectSpecialization,
  selectedSpecialization,
}: SpecializationBrowserProps) {
  const [specializations, setSpecializations] = useState<SpecializationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSpecializations() {
      try {
        setLoading(true);
        const res = await fetch("/api/specializations");
        if (!res.ok) {
          throw new Error("Failed to fetch specializations");
        }
        const data: SpecializationItem[] = await res.json();
        setSpecializations(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    fetchSpecializations();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl bg-muted"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">{error}</p>
    );
  }

  if (specializations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No specializations available.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {specializations.map((item) => {
        const isSelected = selectedSpecialization === item.specialization;
        const isEmpty = item.doctorCount === 0;

        return (
          <button
            key={item.specialization}
            type="button"
            onClick={() => onSelectSpecialization(item.specialization)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border p-4 text-center transition-colors",
              isSelected
                ? "border-primary bg-primary/5 text-primary"
                : "border-border bg-card hover:border-primary/50",
              isEmpty && !isSelected && "opacity-50"
            )}
          >
            <Stethoscope className="h-5 w-5" />
            <span className="text-sm font-medium">{item.specialization}</span>
            <span className={cn(
              "text-xs",
              isSelected ? "text-primary/80" : "text-muted-foreground"
            )}>
              {item.doctorCount} {item.doctorCount === 1 ? "doctor" : "doctors"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
