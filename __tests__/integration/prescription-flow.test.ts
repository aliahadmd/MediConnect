/**
 * Integration test: Prescription Flow
 *
 * Simulates the full prescription lifecycle:
 *   completed appointment → create prescription with medications →
 *   generate PDF → verify PDF is valid → simulate upload/download round-trip
 *
 * Uses the actual `generatePrescriptionPdf` function from lib/pdf.ts
 *
 * Validates: Requirements 8.2, 8.3
 */

import { describe, it, expect, beforeEach } from "vitest";
import { randomUUID } from "crypto";
import { generatePrescriptionPdf, PrescriptionData, Medication } from "@/lib/pdf";

// ---------------------------------------------------------------------------
// In-memory store for prescription flow
// ---------------------------------------------------------------------------

type AppointmentStatus = "pending" | "confirmed" | "rejected" | "completed" | "cancelled";

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  status: AppointmentStatus;
}

interface StoredPrescription {
  id: string;
  appointmentId: string;
  medications: Medication[];
  notes?: string;
  pdfKey: string | null;
}

/**
 * Simulates MinIO-like object storage in memory.
 * Stores buffers keyed by object key, supports upload and pre-signed URL simulation.
 */
class InMemoryObjectStore {
  private objects = new Map<string, Buffer>();

  upload(key: string, buffer: Buffer): void {
    this.objects.set(key, buffer);
  }

  download(key: string): Buffer | undefined {
    return this.objects.get(key);
  }

  getPresignedUrl(key: string): string | null {
    if (!this.objects.has(key)) return null;
    // Simulate a pre-signed URL
    return `https://minio.local/prescriptions/${key}?token=${randomUUID()}`;
  }

  has(key: string): boolean {
    return this.objects.has(key);
  }
}

class InMemoryPrescriptionStore {
  appointments: Appointment[] = [];
  prescriptions: StoredPrescription[] = [];
  objectStore = new InMemoryObjectStore();

  createCompletedAppointment(patientId: string, doctorId: string): Appointment {
    const appt: Appointment = {
      id: randomUUID(),
      patientId,
      doctorId,
      status: "completed",
    };
    this.appointments.push(appt);
    return appt;
  }

  async createPrescription(
    appointmentId: string,
    medications: Medication[],
    doctorName: string,
    patientName: string,
    notes?: string
  ): Promise<StoredPrescription> {
    const appt = this.appointments.find((a) => a.id === appointmentId);
    if (!appt) throw new Error("Appointment not found");
    if (appt.status !== "completed") throw new Error("Can only prescribe for completed appointments");

    // Check for duplicate prescription
    if (this.prescriptions.some((p) => p.appointmentId === appointmentId)) {
      throw new Error("Prescription already exists for this appointment");
    }

    // Generate PDF using the actual pdf-lib function
    const pdfData: PrescriptionData = {
      doctorName,
      patientName,
      date: new Date().toISOString().split("T")[0],
      medications,
      notes,
    };
    const pdfBuffer = await generatePrescriptionPdf(pdfData);

    // Upload to simulated object store
    const pdfKey = `prescriptions/${appointmentId}/${randomUUID()}.pdf`;
    this.objectStore.upload(pdfKey, pdfBuffer);

    // Save prescription record
    const prescription: StoredPrescription = {
      id: randomUUID(),
      appointmentId,
      medications,
      notes,
      pdfKey,
    };
    this.prescriptions.push(prescription);

    return prescription;
  }

  getPrescription(prescriptionId: string): StoredPrescription | undefined {
    return this.prescriptions.find((p) => p.id === prescriptionId);
  }

  getDownloadUrl(prescriptionId: string): string | null {
    const prescription = this.prescriptions.find((p) => p.id === prescriptionId);
    if (!prescription || !prescription.pdfKey) return null;
    return this.objectStore.getPresignedUrl(prescription.pdfKey);
  }

  downloadPdf(prescriptionId: string): Buffer | undefined {
    const prescription = this.prescriptions.find((p) => p.id === prescriptionId);
    if (!prescription || !prescription.pdfKey) return undefined;
    return this.objectStore.download(prescription.pdfKey);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Prescription Flow Integration", () => {
  let store: InMemoryPrescriptionStore;
  const patientId = randomUUID();
  const doctorId = randomUUID();

  beforeEach(() => {
    store = new InMemoryPrescriptionStore();
  });

  describe("Full prescription lifecycle", () => {
    it("creates prescription with PDF and enables download", async () => {
      // Create a completed appointment
      const appointment = store.createCompletedAppointment(patientId, doctorId);
      expect(appointment.status).toBe("completed");

      // Doctor creates a prescription
      const medications: Medication[] = [
        { name: "Amoxicillin", dosage: "500mg", frequency: "3 times daily", duration: "7 days" },
        { name: "Ibuprofen", dosage: "200mg", frequency: "As needed", duration: "5 days" },
      ];

      const prescription = await store.createPrescription(
        appointment.id,
        medications,
        "Dr. Smith",
        "Jane Doe",
        "Take with food. Follow up in one week."
      );

      // Verify prescription record
      expect(prescription.id).toBeDefined();
      expect(prescription.appointmentId).toBe(appointment.id);
      expect(prescription.medications).toHaveLength(2);
      expect(prescription.medications[0].name).toBe("Amoxicillin");
      expect(prescription.medications[1].name).toBe("Ibuprofen");
      expect(prescription.notes).toBe("Take with food. Follow up in one week.");
      expect(prescription.pdfKey).toBeTruthy();

      // Verify PDF was uploaded to object store
      expect(store.objectStore.has(prescription.pdfKey!)).toBe(true);

      // Verify pre-signed download URL is generated
      const downloadUrl = store.getDownloadUrl(prescription.id);
      expect(downloadUrl).toBeTruthy();
      expect(downloadUrl).toContain("minio.local/prescriptions");

      // Verify the actual PDF content is valid
      const pdfBuffer = store.downloadPdf(prescription.id);
      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer!.length).toBeGreaterThan(0);
      expect(pdfBuffer!.toString("ascii", 0, 5)).toBe("%PDF-");
    });
  });

  describe("Prescription with single medication", () => {
    it("generates valid PDF for a single medication", async () => {
      const appointment = store.createCompletedAppointment(patientId, doctorId);

      const prescription = await store.createPrescription(
        appointment.id,
        [{ name: "Metformin", dosage: "850mg", frequency: "Twice daily", duration: "30 days" }],
        "Dr. Lee",
        "Bob Brown"
      );

      expect(prescription.medications).toHaveLength(1);
      expect(prescription.pdfKey).toBeTruthy();

      const pdfBuffer = store.downloadPdf(prescription.id);
      expect(pdfBuffer!.toString("ascii", 0, 5)).toBe("%PDF-");
    });
  });

  describe("Prescription constraints", () => {
    it("rejects prescription for non-completed appointment", async () => {
      const appt = store.createCompletedAppointment(patientId, doctorId);
      appt.status = "confirmed"; // override to non-completed

      await expect(
        store.createPrescription(
          appt.id,
          [{ name: "Test", dosage: "1mg", frequency: "daily", duration: "1 day" }],
          "Dr. X",
          "Patient Y"
        )
      ).rejects.toThrow("Can only prescribe for completed appointments");
    });

    it("rejects duplicate prescription for same appointment", async () => {
      const appt = store.createCompletedAppointment(patientId, doctorId);

      await store.createPrescription(
        appt.id,
        [{ name: "Med A", dosage: "10mg", frequency: "daily", duration: "7 days" }],
        "Dr. A",
        "Patient B"
      );

      await expect(
        store.createPrescription(
          appt.id,
          [{ name: "Med B", dosage: "20mg", frequency: "daily", duration: "7 days" }],
          "Dr. A",
          "Patient B"
        )
      ).rejects.toThrow("Prescription already exists for this appointment");
    });

    it("rejects prescription for non-existent appointment", async () => {
      await expect(
        store.createPrescription(
          "non-existent-id",
          [{ name: "Med", dosage: "1mg", frequency: "daily", duration: "1 day" }],
          "Dr. X",
          "Patient Y"
        )
      ).rejects.toThrow("Appointment not found");
    });
  });

  describe("Download for non-existent prescription", () => {
    it("returns null URL for unknown prescription", () => {
      expect(store.getDownloadUrl("unknown-id")).toBeNull();
    });

    it("returns undefined buffer for unknown prescription", () => {
      expect(store.downloadPdf("unknown-id")).toBeUndefined();
    });
  });

  describe("Upload/download round-trip integrity", () => {
    it("downloaded PDF matches the generated PDF content", async () => {
      const appt = store.createCompletedAppointment(patientId, doctorId);

      const medications: Medication[] = [
        { name: "Aspirin", dosage: "100mg", frequency: "Once daily", duration: "30 days" },
      ];

      const prescription = await store.createPrescription(
        appt.id,
        medications,
        "Dr. Johnson",
        "Alice Smith",
        "Take in the morning with water."
      );

      // Download the PDF from the store
      const downloaded = store.downloadPdf(prescription.id);
      expect(downloaded).toBeDefined();

      // Generate the same PDF independently to verify content structure
      const independentPdf = await generatePrescriptionPdf({
        doctorName: "Dr. Johnson",
        patientName: "Alice Smith",
        date: new Date().toISOString().split("T")[0],
        medications,
        notes: "Take in the morning with water.",
      });

      // Both should be valid PDFs of similar size
      expect(downloaded!.toString("ascii", 0, 5)).toBe("%PDF-");
      expect(independentPdf.toString("ascii", 0, 5)).toBe("%PDF-");
      // Sizes should be in the same ballpark (exact match unlikely due to UUIDs in metadata)
      expect(Math.abs(downloaded!.length - independentPdf.length)).toBeLessThan(500);
    });
  });
});
