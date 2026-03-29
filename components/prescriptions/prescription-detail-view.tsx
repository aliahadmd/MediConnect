"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { ArrowLeft, Download, FileText, AlertCircle } from "lucide-react";

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface PrescriptionDetail {
  id: string;
  doctorName: string;
  appointmentDate: string;
  medications: Medication[];
  notes: string | null;
  pdfKey: string | null;
  createdAt: string;
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), "MMMM d, yyyy");
  } catch {
    return dateStr;
  }
}

export function PrescriptionDetailView({
  prescription,
}: {
  prescription: PrescriptionDetail;
}) {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function handleDownload() {
    setDownloadError(null);
    setDownloading(true);

    try {
      const res = await fetch(`/api/prescriptions/${prescription.id}/download`);
      if (!res.ok) {
        if (res.status === 503) {
          throw new Error("File storage is temporarily unavailable. Please try again later.");
        }

        let errorMessage: string;
        try {
          const data = await res.json();
          errorMessage = data.error || "";
        } catch {
          errorMessage = "";
        }

        if (res.status === 404) {
          throw new Error(errorMessage || "Prescription not found");
        } else if (res.status === 400) {
          throw new Error(errorMessage || "Invalid request");
        } else {
          throw new Error(errorMessage || `Server error (${res.status})`);
        }
      }

      const { url } = await res.json();
      window.open(url, "_blank");
    } catch (err) {
      setDownloadError(
        err instanceof Error ? err.message : "Download failed"
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/patient/prescriptions")}
        >
          <ArrowLeft className="mr-1 size-4" />
          Back to Prescriptions
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              Prescription Details
            </CardTitle>
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              Issued
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary header with doctor name and dates */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Doctor</p>
              <p className="font-medium">Dr. {prescription.doctorName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Appointment Date</p>
              <p className="font-medium">{formatDate(prescription.appointmentDate)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Prescribed On</p>
              <p className="font-medium">{formatDate(prescription.createdAt)}</p>
            </div>
          </div>

          {/* Medications table */}
          <div>
            <h3 className="mb-2 text-sm font-medium">
              Medications ({prescription.medications.length})
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Dosage</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescription.medications.map((med, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{med.name}</TableCell>
                    <TableCell>{med.dosage}</TableCell>
                    <TableCell>{med.frequency}</TableCell>
                    <TableCell>{med.duration}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Doctor notes section */}
          {prescription.notes && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Doctor Notes</h3>
              <p className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
                {prescription.notes}
              </p>
            </div>
          )}

          {/* PDF not available notice */}
          {!prescription.pdfKey && (
            <div className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
              <AlertCircle className="size-4 shrink-0" />
              PDF is not available for this prescription.
            </div>
          )}

          {/* Download error */}
          {downloadError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {downloadError}
            </div>
          )}
        </CardContent>

        {/* Conditional PDF download button */}
        {prescription.pdfKey && (
          <CardFooter>
            <Button
              onClick={handleDownload}
              disabled={downloading}
              variant="outline"
            >
              <Download className="mr-2 size-4" />
              {downloading ? "Preparing Download..." : "Download PDF"}
            </Button>
          </CardFooter>
        )}
      </Card>
    </>
  );
}
