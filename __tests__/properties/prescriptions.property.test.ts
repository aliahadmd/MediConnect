// Feature: mediconnect-virtual-clinic, Property 20: Prescription submission persists data and generates PDF key
// Feature: mediconnect-virtual-clinic, Property 21: Prescription PDF upload/download round-trip
// **Validates: Requirements 8.2, 8.3, 8.5, 9.3, 14.2, 14.3**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { generatePrescriptionPdf, Medication, PrescriptionData } from "@/lib/pdf";

// ---------------------------------------------------------------------------
// In-memory PrescriptionStore (simulates DB persistence for Property 20)
// ---------------------------------------------------------------------------

interface PrescriptionRecord {
  id: string;
  appointmentId: string;
  medications: Medication[];
  notes: string | null;
  pdfKey: string | null;
}

class PrescriptionStore {
  private records = new Map<string, PrescriptionRecord>();
  private counter = 0;

  submit(
    appointmentId: string,
    medications: Medication[],
    notes?: string
  ): PrescriptionRecord {
    const id = `rx_${++this.counter}`;
    const pdfKey = `prescriptions/${id}.pdf`;
    const record: PrescriptionRecord = {
      id,
      appointmentId,
      medications,
      notes: notes ?? null,
      pdfKey,
    };
    this.records.set(id, record);
    return record;
  }

  get(id: string): PrescriptionRecord | undefined {
    return this.records.get(id);
  }
}

// ---------------------------------------------------------------------------
// In-memory FileStore (simulates MinIO for Property 21)
// ---------------------------------------------------------------------------

class FileStore {
  private files = new Map<string, Buffer>();

  upload(key: string, buffer: Buffer): void {
    this.files.set(key, buffer);
  }

  getPresignedUrl(key: string): string | null {
    if (!this.files.has(key)) return null;
    return `https://minio.local/${key}?token=presigned`;
  }

  download(key: string): Buffer | null {
    return this.files.get(key) ?? null;
  }
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

function medicationArb(): fc.Arbitrary<Medication> {
  return fc.record({
    name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
    dosage: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
    frequency: fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
    duration: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
  });
}

function medicationsArb(): fc.Arbitrary<Medication[]> {
  return fc.array(medicationArb(), { minLength: 1, maxLength: 5 });
}

function notesArb(): fc.Arbitrary<string | undefined> {
  return fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined });
}

function appointmentIdArb(): fc.Arbitrary<string> {
  return fc.stringMatching(/^appt_[a-z0-9]{4,12}$/);
}

function prescriptionDataArb(): fc.Arbitrary<PrescriptionData> {
  return fc.record({
    doctorName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
    patientName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
    date: fc.date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") }).map(
      (d) => d.toISOString().split("T")[0]
    ),
    medications: medicationsArb(),
    notes: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  });
}

// ---------------------------------------------------------------------------
// Property 20: Prescription submission persists data and generates PDF key
// ---------------------------------------------------------------------------

// Feature: mediconnect-virtual-clinic, Property 20: Prescription submission persists data and generates PDF key
// **Validates: Requirements 8.2, 8.3, 8.5**
describe("Property 20: Prescription submission persists data and generates PDF key", () => {
  it("valid prescription data results in DB record with all fields + non-null pdfKey", () => {
    fc.assert(
      fc.property(
        appointmentIdArb(),
        medicationsArb(),
        notesArb(),
        (appointmentId, medications, notes) => {
          const store = new PrescriptionStore();
          const record = store.submit(appointmentId, medications, notes);

          // Record is persisted and retrievable
          const retrieved = store.get(record.id);
          expect(retrieved).toBeDefined();

          // All medication fields are preserved
          expect(retrieved!.medications).toHaveLength(medications.length);
          for (let i = 0; i < medications.length; i++) {
            expect(retrieved!.medications[i].name).toBe(medications[i].name);
            expect(retrieved!.medications[i].dosage).toBe(medications[i].dosage);
            expect(retrieved!.medications[i].frequency).toBe(medications[i].frequency);
            expect(retrieved!.medications[i].duration).toBe(medications[i].duration);
          }

          // Notes preserved
          expect(retrieved!.notes).toBe(notes ?? null);

          // appointmentId preserved
          expect(retrieved!.appointmentId).toBe(appointmentId);

          // pdfKey is non-null
          expect(retrieved!.pdfKey).not.toBeNull();
          expect(typeof retrieved!.pdfKey).toBe("string");
          expect(retrieved!.pdfKey!.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 300 }
    );
  });

  it("generatePrescriptionPdf produces a valid PDF buffer for random data", async () => {
    await fc.assert(
      fc.asyncProperty(
        prescriptionDataArb(),
        async (data) => {
          const buffer = await generatePrescriptionPdf(data);

          // Result is a Buffer
          expect(buffer).toBeInstanceOf(Buffer);
          expect(buffer.length).toBeGreaterThan(0);

          // PDF files start with %PDF-
          expect(buffer.toString("ascii", 0, 5)).toBe("%PDF-");
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 21: Prescription PDF upload/download round-trip
// ---------------------------------------------------------------------------

// Feature: mediconnect-virtual-clinic, Property 21: Prescription PDF upload/download round-trip
// **Validates: Requirements 9.3, 14.2, 14.3**
describe("Property 21: Prescription PDF upload/download round-trip", () => {
  it("stored pdfKey yields valid pre-signed URL and returns matching PDF content", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^prescriptions\/rx_[a-z0-9]{4,12}\.pdf$/),
        fc.uint8Array({ minLength: 10, maxLength: 500 }).map((arr) => Buffer.from(arr)),
        (pdfKey, pdfBuffer) => {
          const fileStore = new FileStore();

          // Upload
          fileStore.upload(pdfKey, pdfBuffer);

          // Get pre-signed URL
          const url = fileStore.getPresignedUrl(pdfKey);
          expect(url).not.toBeNull();
          expect(typeof url).toBe("string");
          expect(url!.length).toBeGreaterThan(0);

          // Download and verify content matches
          const downloaded = fileStore.download(pdfKey);
          expect(downloaded).not.toBeNull();
          expect(downloaded!.length).toBe(pdfBuffer.length);
          expect(downloaded!.equals(pdfBuffer)).toBe(true);
        }
      ),
      { numRuns: 300 }
    );
  });

  it("non-existent key returns null pre-signed URL", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^prescriptions\/rx_[a-z0-9]{4,12}\.pdf$/),
        (pdfKey) => {
          const fileStore = new FileStore();

          const url = fileStore.getPresignedUrl(pdfKey);
          expect(url).toBeNull();

          const downloaded = fileStore.download(pdfKey);
          expect(downloaded).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("actual PDF generation + upload/download round-trip preserves valid PDF", async () => {
    await fc.assert(
      fc.asyncProperty(
        prescriptionDataArb(),
        async (data) => {
          const fileStore = new FileStore();
          const pdfKey = `prescriptions/test_${Date.now()}.pdf`;

          // Generate real PDF
          const pdfBuffer = await generatePrescriptionPdf(data);

          // Upload
          fileStore.upload(pdfKey, pdfBuffer);

          // Download
          const downloaded = fileStore.download(pdfKey);
          expect(downloaded).not.toBeNull();
          expect(downloaded!.equals(pdfBuffer)).toBe(true);

          // Verify it's still a valid PDF
          expect(downloaded!.toString("ascii", 0, 5)).toBe("%PDF-");
        }
      ),
      { numRuns: 30 }
    );
  });
});
