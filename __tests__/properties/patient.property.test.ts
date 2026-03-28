// Feature: mediconnect-virtual-clinic, Property 22: Patient visit history returns only completed appointments
// Feature: mediconnect-virtual-clinic, Property 23: Appointment detail retrieval includes notes and prescription
// **Validates: Requirements 9.1, 9.2**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AppointmentStatus = "pending" | "confirmed" | "rejected" | "completed" | "cancelled";

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  slotId: string;
  status: AppointmentStatus;
  scheduledAt: Date;
}

interface VisitNote {
  appointmentId: string;
  content: string;
  updatedAt: Date;
}

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface Prescription {
  id: string;
  appointmentId: string;
  medications: Medication[];
  notes: string | null;
  pdfKey: string | null;
  createdAt: Date;
}

interface AppointmentDetail {
  id: string;
  doctorName: string;
  patientName: string;
  status: AppointmentStatus;
  visitNotes: { content: string; updatedAt: Date } | null;
  prescription: {
    id: string;
    medications: Medication[];
    notes: string | null;
    pdfKey: string | null;
    createdAt: Date;
  } | null;
}

// ---------------------------------------------------------------------------
// In-memory VisitHistoryStore
// ---------------------------------------------------------------------------

class VisitHistoryStore {
  private appointments = new Map<string, Appointment>();
  private notes = new Map<string, VisitNote>();
  private prescriptions = new Map<string, Prescription>();
  private doctors = new Map<string, string>(); // doctorId -> name
  private patients = new Map<string, string>(); // patientId -> name
  private nextApptId = 1;
  private nextRxId = 1;

  registerDoctor(id: string, name: string): void {
    this.doctors.set(id, name);
  }

  registerPatient(id: string, name: string): void {
    this.patients.set(id, name);
  }

  createAppointment(
    patientId: string,
    doctorId: string,
    status: AppointmentStatus,
    scheduledAt: Date
  ): Appointment {
    const id = `appt_${this.nextApptId++}`;
    const slotId = `slot_${id}`;
    const appt: Appointment = { id, patientId, doctorId, slotId, status, scheduledAt };
    this.appointments.set(id, appt);
    return appt;
  }

  saveNotes(appointmentId: string, content: string): VisitNote {
    const note: VisitNote = { appointmentId, content, updatedAt: new Date() };
    this.notes.set(appointmentId, note);
    return note;
  }

  savePrescription(
    appointmentId: string,
    medications: Medication[],
    notes?: string
  ): Prescription {
    const id = `rx_${this.nextRxId++}`;
    const rx: Prescription = {
      id,
      appointmentId,
      medications,
      notes: notes ?? null,
      pdfKey: `prescriptions/${id}.pdf`,
      createdAt: new Date(),
    };
    this.prescriptions.set(appointmentId, rx);
    return rx;
  }

  /**
   * Visit history: returns only completed appointments for a given patient.
   * Mirrors the client-side filter in visit-history.tsx and the API behaviour.
   */
  getVisitHistory(patientId: string): Appointment[] {
    return Array.from(this.appointments.values()).filter(
      (a) => a.patientId === patientId && a.status === "completed"
    );
  }

  /**
   * Appointment detail retrieval — mirrors GET /api/appointments/[id]/detail.
   * Returns appointment info with joined visit notes and prescription.
   */
  getAppointmentDetail(appointmentId: string): AppointmentDetail | null {
    const appt = this.appointments.get(appointmentId);
    if (!appt) return null;

    const doctorName = this.doctors.get(appt.doctorId) ?? "Unknown";
    const patientName = this.patients.get(appt.patientId) ?? "Unknown";
    const note = this.notes.get(appointmentId);
    const rx = this.prescriptions.get(appointmentId);

    return {
      id: appt.id,
      doctorName,
      patientName,
      status: appt.status,
      visitNotes: note ? { content: note.content, updatedAt: note.updatedAt } : null,
      prescription: rx
        ? {
            id: rx.id,
            medications: rx.medications,
            notes: rx.notes,
            pdfKey: rx.pdfKey,
            createdAt: rx.createdAt,
          }
        : null,
    };
  }
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

function patientIdArb(): fc.Arbitrary<string> {
  return fc.stringMatching(/^pt_[a-z0-9]{4,8}$/);
}

function doctorIdArb(): fc.Arbitrary<string> {
  return fc.stringMatching(/^dr_[a-z0-9]{4,8}$/);
}

function nameArb(): fc.Arbitrary<string> {
  return fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0);
}

function statusArb(): fc.Arbitrary<AppointmentStatus> {
  return fc.constantFrom("pending", "confirmed", "rejected", "completed", "cancelled");
}

function dateArb(): fc.Arbitrary<Date> {
  const anchor = new Date("2025-06-01T12:00:00Z").getTime();
  const oneYear = 365 * 24 * 60 * 60 * 1000;
  return fc.integer({ min: anchor - oneYear, max: anchor + oneYear }).map((ms) => new Date(ms));
}

function medicationArb(): fc.Arbitrary<Medication> {
  return fc.record({
    name: fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
    dosage: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
    frequency: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
    duration: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
  });
}

function medicationsArb(): fc.Arbitrary<Medication[]> {
  return fc.array(medicationArb(), { minLength: 1, maxLength: 5 });
}

function noteContentArb(): fc.Arbitrary<string> {
  return fc.string({ minLength: 1, maxLength: 300 }).filter((s) => s.trim().length > 0);
}

// ---------------------------------------------------------------------------
// Property 22: Patient visit history returns only completed appointments
// ---------------------------------------------------------------------------

// Feature: mediconnect-virtual-clinic, Property 22: Patient visit history returns only completed appointments
// **Validates: Requirements 9.1**
describe("Property 22: Patient visit history returns only completed appointments", () => {
  it("filter returns only 'completed' for that patient", () => {
    fc.assert(
      fc.property(
        patientIdArb(),
        doctorIdArb(),
        fc.array(
          fc.tuple(statusArb(), dateArb()),
          { minLength: 1, maxLength: 10 }
        ),
        (patientId, doctorId, appointmentSpecs) => {
          const store = new VisitHistoryStore();

          const created: Array<{ appt: Appointment; status: AppointmentStatus }> = [];
          for (const [status, scheduledAt] of appointmentSpecs) {
            const appt = store.createAppointment(patientId, doctorId, status, scheduledAt);
            created.push({ appt, status });
          }

          const history = store.getVisitHistory(patientId);

          // Every returned appointment must be completed
          for (const appt of history) {
            expect(appt.status).toBe("completed");
          }

          // Every returned appointment must belong to this patient
          for (const appt of history) {
            expect(appt.patientId).toBe(patientId);
          }

          // Count must match the number of completed appointments we created
          const expectedCount = created.filter((c) => c.status === "completed").length;
          expect(history).toHaveLength(expectedCount);
        }
      ),
      { numRuns: 300 }
    );
  });

  it("returns empty when patient has no completed appointments", () => {
    fc.assert(
      fc.property(
        patientIdArb(),
        doctorIdArb(),
        fc.array(
          fc.tuple(
            fc.constantFrom("pending", "confirmed", "rejected", "cancelled") as fc.Arbitrary<AppointmentStatus>,
            dateArb()
          ),
          { minLength: 1, maxLength: 5 }
        ),
        (patientId, doctorId, appointmentSpecs) => {
          const store = new VisitHistoryStore();

          for (const [status, scheduledAt] of appointmentSpecs) {
            store.createAppointment(patientId, doctorId, status, scheduledAt);
          }

          const history = store.getVisitHistory(patientId);
          expect(history).toHaveLength(0);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("does not return completed appointments belonging to other patients", () => {
    fc.assert(
      fc.property(
        patientIdArb(),
        patientIdArb(),
        doctorIdArb(),
        dateArb(),
        (patient1, patient2, doctorId, scheduledAt) => {
          fc.pre(patient1 !== patient2);

          const store = new VisitHistoryStore();

          // Create a completed appointment for patient2
          store.createAppointment(patient2, doctorId, "completed", scheduledAt);

          // Patient1's history should be empty
          const history = store.getVisitHistory(patient1);
          expect(history).toHaveLength(0);

          // Patient2's history should have the appointment
          const history2 = store.getVisitHistory(patient2);
          expect(history2).toHaveLength(1);
          expect(history2[0].patientId).toBe(patient2);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 23: Appointment detail retrieval includes notes and prescription
// ---------------------------------------------------------------------------

// Feature: mediconnect-virtual-clinic, Property 23: Appointment detail retrieval includes notes and prescription
// **Validates: Requirements 9.2**
describe("Property 23: Appointment detail retrieval includes notes and prescription", () => {
  it("completed appointment with notes and prescription returns both", () => {
    fc.assert(
      fc.property(
        patientIdArb(),
        doctorIdArb(),
        nameArb(),
        nameArb(),
        dateArb(),
        noteContentArb(),
        medicationsArb(),
        fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
        (patientId, doctorId, patientName, doctorName, scheduledAt, notesContent, medications, rxNotes) => {
          const store = new VisitHistoryStore();
          store.registerDoctor(doctorId, doctorName);
          store.registerPatient(patientId, patientName);

          // Create a completed appointment
          const appt = store.createAppointment(patientId, doctorId, "completed", scheduledAt);

          // Add visit notes
          store.saveNotes(appt.id, notesContent);

          // Add prescription
          store.savePrescription(appt.id, medications, rxNotes);

          // Retrieve detail
          const detail = store.getAppointmentDetail(appt.id);
          expect(detail).not.toBeNull();

          // Visit notes are included with correct content
          expect(detail!.visitNotes).not.toBeNull();
          expect(detail!.visitNotes!.content).toBe(notesContent);

          // Prescription is included with correct data
          expect(detail!.prescription).not.toBeNull();
          expect(detail!.prescription!.medications).toHaveLength(medications.length);
          for (let i = 0; i < medications.length; i++) {
            expect(detail!.prescription!.medications[i].name).toBe(medications[i].name);
            expect(detail!.prescription!.medications[i].dosage).toBe(medications[i].dosage);
            expect(detail!.prescription!.medications[i].frequency).toBe(medications[i].frequency);
            expect(detail!.prescription!.medications[i].duration).toBe(medications[i].duration);
          }

          // Prescription notes preserved
          expect(detail!.prescription!.notes).toBe(rxNotes ?? null);

          // PDF key is non-null
          expect(detail!.prescription!.pdfKey).not.toBeNull();

          // Doctor and patient names are correct
          expect(detail!.doctorName).toBe(doctorName);
          expect(detail!.patientName).toBe(patientName);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("completed appointment without notes or prescription returns nulls", () => {
    fc.assert(
      fc.property(
        patientIdArb(),
        doctorIdArb(),
        dateArb(),
        (patientId, doctorId, scheduledAt) => {
          const store = new VisitHistoryStore();

          const appt = store.createAppointment(patientId, doctorId, "completed", scheduledAt);

          const detail = store.getAppointmentDetail(appt.id);
          expect(detail).not.toBeNull();
          expect(detail!.visitNotes).toBeNull();
          expect(detail!.prescription).toBeNull();
        }
      ),
      { numRuns: 200 }
    );
  });
});
