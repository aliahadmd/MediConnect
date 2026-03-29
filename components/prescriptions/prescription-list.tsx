"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { illustrationVariants } from "@/lib/animation-variants";
import { PrescriptionCard } from "@/components/prescriptions/prescription-card";
import { EmptyStateIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import Link from "next/link";

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
      <div data-testid="empty-prescriptions-list" className="flex flex-col items-center gap-4 py-12 text-center">
        <motion.div variants={illustrationVariants} initial="hidden" animate="visible">
          <EmptyStateIllustration size={160} className="text-muted-foreground/60" />
        </motion.div>
        <div className="space-y-1">
          <p className="text-lg font-medium">No prescriptions yet</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Prescriptions from your completed appointments will appear here
          </p>
        </div>
        <Button asChild className="min-h-[44px] min-w-[44px]">
          <Link href="/patient/appointments">View Appointments</Link>
        </Button>
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
