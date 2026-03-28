"use client";

import { useState } from "react";
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
import { Download, FileText } from "lucide-react";

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface Prescription {
  id: string;
  medications: Medication[];
  notes: string | null;
  pdfKey: string | null;
  createdAt: string;
}

export function PrescriptionViewer({
  prescription,
  patientName,
  doctorName,
}: {
  prescription: Prescription;
  patientName: string;
  doctorName: string;
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function handleDownload() {
    setDownloadError(null);
    setDownloading(true);

    try {
      const res = await fetch(`/api/prescriptions/${prescription.id}/download`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to get download link");
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

  let formattedDate: string;
  try {
    formattedDate = new Date(prescription.createdAt).toLocaleDateString(
      "en-US",
      { year: "numeric", month: "long", day: "numeric" }
    );
  } catch {
    formattedDate = prescription.createdAt;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            Prescription
          </CardTitle>
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Issued
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Patient</p>
            <p className="font-medium">{patientName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Doctor</p>
            <p className="font-medium">Dr. {doctorName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Date</p>
            <p className="font-medium">{formattedDate}</p>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium">Medications</h3>
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

        {prescription.notes && (
          <div>
            <h3 className="mb-2 text-sm font-medium">Notes</h3>
            <p className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
              {prescription.notes}
            </p>
          </div>
        )}

        {downloadError && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {downloadError}
          </div>
        )}
      </CardContent>
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
  );
}
