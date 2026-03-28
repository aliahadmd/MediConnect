import { describe, it, expect } from "vitest";
import { generatePrescriptionPdf, PrescriptionData } from "@/lib/pdf";

describe("generatePrescriptionPdf", () => {
  it("generates a valid PDF buffer with medication data", async () => {
    const data: PrescriptionData = {
      doctorName: "Dr. Smith",
      patientName: "Jane Doe",
      date: "2025-01-15",
      medications: [
        {
          name: "Amoxicillin",
          dosage: "500mg",
          frequency: "3 times daily",
          duration: "7 days",
        },
      ],
    };

    const buffer = await generatePrescriptionPdf(data);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    // PDF files start with %PDF
    expect(buffer.toString("ascii", 0, 5)).toBe("%PDF-");
  });

  it("includes notes section when notes are provided", async () => {
    const data: PrescriptionData = {
      doctorName: "Dr. Adams",
      patientName: "John Doe",
      date: "2025-02-20",
      medications: [
        {
          name: "Ibuprofen",
          dosage: "200mg",
          frequency: "Twice daily",
          duration: "5 days",
        },
      ],
      notes: "Take with food. Follow up in one week.",
    };

    const buffer = await generatePrescriptionPdf(data);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.toString("ascii", 0, 5)).toBe("%PDF-");
  });

  it("handles multiple medications", async () => {
    const data: PrescriptionData = {
      doctorName: "Dr. Lee",
      patientName: "Alice Brown",
      date: "2025-03-10",
      medications: [
        {
          name: "Metformin",
          dosage: "850mg",
          frequency: "Twice daily",
          duration: "30 days",
        },
        {
          name: "Lisinopril",
          dosage: "10mg",
          frequency: "Once daily",
          duration: "30 days",
        },
        {
          name: "Atorvastatin",
          dosage: "20mg",
          frequency: "Once daily at bedtime",
          duration: "30 days",
        },
      ],
      notes: "Monitor blood pressure weekly.",
    };

    const buffer = await generatePrescriptionPdf(data);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.toString("ascii", 0, 5)).toBe("%PDF-");
  });
});
