"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PrescriptionCard } from "@/components/prescriptions/prescription-card";
import { FileText } from "lucide-react";

interface PrescriptionListItem {
  id: string;
  appointmentId: string;
  doctorName: string;
  appointmentDate: string;
  medications: Array<{ name: string; dosage: string; frequency: string; duration: string }>;
  notes: string | null;
  pdfKey: string | null;
  createdAt: string;
}

export function PrescriptionList() {
  const router = useRouter();
  const [prescriptions, setPrescriptions] = useState<PrescriptionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPrescriptions() {
      try {
        const res = await fetch("/api/prescriptions");
        if (!res.ok) {
          throw new Error("Failed to load prescriptions");
        }
        const data = await res.json();
        setPrescriptions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load prescriptions");
      } finally {
        setLoading(false);
      }
    }
    fetchPrescriptions();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading prescriptions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <FileText className="size-12 text-muted-foreground/50" />
        <div>
          <p className="font-medium text-muted-foreground">No prescriptions yet</p>
          <p className="text-sm text-muted-foreground">
            Prescriptions from your completed appointments will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {prescriptions.map((prescription) => (
        <PrescriptionCard
          key={prescription.id}
          id={prescription.id}
          doctorName={prescription.doctorName}
          appointmentDate={prescription.appointmentDate}
          medicationCount={prescription.medications.length}
          createdAt={prescription.createdAt}
          onClick={() => router.push(`/patient/prescriptions/${prescription.id}`)}
        />
      ))}
    </div>
  );
}
