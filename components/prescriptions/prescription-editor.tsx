"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, FileText } from "lucide-react";

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

const emptyMedication: Medication = {
  name: "",
  dosage: "",
  frequency: "",
  duration: "",
};

export function PrescriptionEditor({
  appointmentId,
  patientName,
}: {
  appointmentId: string;
  patientName: string;
}) {
  const [medications, setMedications] = useState<Medication[]>([
    { ...emptyMedication },
  ]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function updateMedication(
    index: number,
    field: keyof Medication,
    value: string
  ) {
    setMedications((prev) =>
      prev.map((med, i) => (i === index ? { ...med, [field]: value } : med))
    );
  }

  function addMedication() {
    setMedications((prev) => [...prev, { ...emptyMedication }]);
  }

  function removeMedication(index: number) {
    setMedications((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId,
          medications,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create prescription");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <FileText className="size-12 text-green-600" />
          <p className="text-lg font-medium text-green-700">
            Prescription created successfully!
          </p>
          <p className="text-sm text-muted-foreground">
            The prescription PDF has been generated and is available for
            download.
          </p>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            View Prescription
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            Write Prescription for {patientName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Medications</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMedication}
              >
                <Plus className="mr-1 size-4" />
                Add Medication
              </Button>
            </div>

            {medications.map((med, index) => (
              <div
                key={index}
                className="rounded-lg border p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Medication {index + 1}
                  </span>
                  {medications.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMedication(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="mr-1 size-4" />
                      Remove
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor={`med-name-${index}`}>Name</Label>
                    <Input
                      id={`med-name-${index}`}
                      placeholder="e.g. Amoxicillin"
                      value={med.name}
                      onChange={(e) =>
                        updateMedication(index, "name", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`med-dosage-${index}`}>Dosage</Label>
                    <Input
                      id={`med-dosage-${index}`}
                      placeholder="e.g. 500mg"
                      value={med.dosage}
                      onChange={(e) =>
                        updateMedication(index, "dosage", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`med-frequency-${index}`}>Frequency</Label>
                    <Input
                      id={`med-frequency-${index}`}
                      placeholder="e.g. 3 times daily"
                      value={med.frequency}
                      onChange={(e) =>
                        updateMedication(index, "frequency", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`med-duration-${index}`}>Duration</Label>
                    <Input
                      id={`med-duration-${index}`}
                      placeholder="e.g. 7 days"
                      value={med.duration}
                      onChange={(e) =>
                        updateMedication(index, "duration", e.target.value)
                      }
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional instructions or notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Creating Prescription..." : "Submit Prescription"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
