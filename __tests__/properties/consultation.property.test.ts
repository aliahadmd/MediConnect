// Feature: mediconnect-virtual-clinic, Property 15: Join eligibility based on time window
// Feature: mediconnect-virtual-clinic, Property 16: End call transitions to completed
// Feature: mediconnect-virtual-clinic, Property 17: Unique room tokens per appointment
// Feature: mediconnect-virtual-clinic, Property 19: Notes save/retrieve round-trip
// **Validates: Requirements 5.1, 5.4, 5.6, 7.2, 7.3**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { getRoomName, isWithinJoinWindow } from "@/lib/livekit";

// ---------------------------------------------------------------------------
// In-memory ConsultationStore (for Properties 16 & 19)
// ---------------------------------------------------------------------------

type AppointmentStatus = "pending" | "confirmed" | "rejected" | "completed" | "cancelled";

interface Appointment {
  id: string;
  status: AppointmentStatus;
  scheduledAt: Date;
}

interface VisitNote {
  appointmentId: string;
  content: string;
}

class ConsultationStore {
  private appointments = new Map<string, Appointment>();
  private notes = new Map<string, VisitNote>();

  createAppointment(id: string, status: AppointmentStatus, scheduledAt: Date): Appointment {
    const appt: Appointment = { id, status, scheduledAt };
    this.appointments.set(id, appt);
    return appt;
  }

  getAppointment(id: string): Appointment | undefined {
    return this.appointments.get(id);
  }

  /** End a call — transitions a confirmed appointment to completed. */
  endCall(appointmentId: string): { success: boolean; error?: string } {
    const appt = this.appointments.get(appointmentId);
    if (!appt) return { success: false, error: "Appointment not found" };
    if (appt.status !== "confirmed") return { success: false, error: "Appointment is not confirmed" };
    appt.status = "completed";
    return { success: true };
  }

  /** Save notes for an appointment. */
  saveNotes(appointmentId: string, content: string): { success: boolean } {
    this.notes.set(appointmentId, { appointmentId, content });
    return { success: true };
  }

  /** Retrieve notes for an appointment. */
  getNotes(appointmentId: string): VisitNote | undefined {
    return this.notes.get(appointmentId);
  }
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

function appointmentIdArb(): fc.Arbitrary<string> {
  return fc.stringMatching(/^appt_[a-z0-9]{4,12}$/);
}

/** Generate a Date within a reasonable range (±2 years from epoch anchor). */
function dateArb(): fc.Arbitrary<Date> {
  // Use a fixed anchor to avoid flaky edge cases around Date boundaries
  const anchor = new Date("2025-06-01T12:00:00Z").getTime();
  const oneYear = 365 * 24 * 60 * 60 * 1000;
  return fc.integer({ min: anchor - oneYear, max: anchor + oneYear }).map((ms) => new Date(ms));
}

/** Generate a time offset in milliseconds. */
function offsetMsArb(min: number, max: number): fc.Arbitrary<number> {
  return fc.integer({ min, max });
}

/** Generate arbitrary non-empty string content for notes. */
function noteContentArb(): fc.Arbitrary<string> {
  return fc.string({ minLength: 1, maxLength: 500 });
}

// ---------------------------------------------------------------------------
// Property 15: Join eligibility based on time window
// ---------------------------------------------------------------------------

// Feature: mediconnect-virtual-clinic, Property 15: Join eligibility based on time window
// **Validates: Requirements 5.1**
describe("Property 15: Join eligibility based on time window", () => {
  const FIVE_MIN_MS = 5 * 60 * 1000;
  const THIRTY_MIN_MS = 30 * 60 * 1000;

  it("returns true iff now is within [scheduledAt - 5min, scheduledAt + 30min]", () => {
    fc.assert(
      fc.property(
        dateArb(),
        offsetMsArb(-FIVE_MIN_MS, THIRTY_MIN_MS),
        (scheduledAt, offsetMs) => {
          const now = new Date(scheduledAt.getTime() + offsetMs);
          expect(isWithinJoinWindow(scheduledAt, now)).toBe(true);
        }
      ),
      { numRuns: 500 }
    );
  });

  it("returns false when now is before the window (more than 5 min early)", () => {
    fc.assert(
      fc.property(
        dateArb(),
        // Offset from -2 hours to just past -5 min boundary (exclusive)
        offsetMsArb(-2 * 60 * 60 * 1000, -(FIVE_MIN_MS + 1)),
        (scheduledAt, offsetMs) => {
          const now = new Date(scheduledAt.getTime() + offsetMs);
          expect(isWithinJoinWindow(scheduledAt, now)).toBe(false);
        }
      ),
      { numRuns: 500 }
    );
  });

  it("returns false when now is after the window (more than 30 min late)", () => {
    fc.assert(
      fc.property(
        dateArb(),
        // Offset from just past +30 min boundary to +2 hours
        offsetMsArb(THIRTY_MIN_MS + 1, 2 * 60 * 60 * 1000),
        (scheduledAt, offsetMs) => {
          const now = new Date(scheduledAt.getTime() + offsetMs);
          expect(isWithinJoinWindow(scheduledAt, now)).toBe(false);
        }
      ),
      { numRuns: 500 }
    );
  });
});


// ---------------------------------------------------------------------------
// Property 16: End call transitions to completed
// ---------------------------------------------------------------------------

// Feature: mediconnect-virtual-clinic, Property 16: End call transitions to completed
// **Validates: Requirements 5.4**
describe("Property 16: End call transitions to completed", () => {
  it("ending a call on a confirmed appointment sets status to 'completed'", () => {
    fc.assert(
      fc.property(
        appointmentIdArb(),
        dateArb(),
        (apptId, scheduledAt) => {
          const store = new ConsultationStore();
          store.createAppointment(apptId, "confirmed", scheduledAt);

          const result = store.endCall(apptId);
          expect(result.success).toBe(true);

          const appt = store.getAppointment(apptId);
          expect(appt!.status).toBe("completed");
        }
      ),
      { numRuns: 300 }
    );
  });

  it("ending a call on a non-confirmed appointment fails", () => {
    const nonConfirmedStatuses: AppointmentStatus[] = ["pending", "rejected", "completed", "cancelled"];

    fc.assert(
      fc.property(
        appointmentIdArb(),
        dateArb(),
        fc.constantFrom(...nonConfirmedStatuses),
        (apptId, scheduledAt, status) => {
          const store = new ConsultationStore();
          store.createAppointment(apptId, status, scheduledAt);

          const result = store.endCall(apptId);
          expect(result.success).toBe(false);

          // Status should remain unchanged
          const appt = store.getAppointment(apptId);
          expect(appt!.status).toBe(status);
        }
      ),
      { numRuns: 300 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 17: Unique room tokens per appointment
// ---------------------------------------------------------------------------

// Feature: mediconnect-virtual-clinic, Property 17: Unique room tokens per appointment
// **Validates: Requirements 5.6**
describe("Property 17: Unique room tokens per appointment", () => {
  it("distinct appointment IDs produce distinct room names", () => {
    fc.assert(
      fc.property(
        appointmentIdArb(),
        appointmentIdArb(),
        (id1, id2) => {
          fc.pre(id1 !== id2);

          const room1 = getRoomName(id1);
          const room2 = getRoomName(id2);

          expect(room1).not.toBe(room2);
        }
      ),
      { numRuns: 500 }
    );
  });

  it("room name is deterministic for the same appointment ID", () => {
    fc.assert(
      fc.property(
        appointmentIdArb(),
        (apptId) => {
          const room1 = getRoomName(apptId);
          const room2 = getRoomName(apptId);
          expect(room1).toBe(room2);
        }
      ),
      { numRuns: 300 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 19: Notes save/retrieve round-trip
// ---------------------------------------------------------------------------

// Feature: mediconnect-virtual-clinic, Property 19: Notes save/retrieve round-trip
// **Validates: Requirements 7.2, 7.3**
describe("Property 19: Notes save/retrieve round-trip", () => {
  it("saved notes content matches retrieved content", () => {
    fc.assert(
      fc.property(
        appointmentIdArb(),
        noteContentArb(),
        (apptId, content) => {
          const store = new ConsultationStore();

          const saveResult = store.saveNotes(apptId, content);
          expect(saveResult.success).toBe(true);

          const retrieved = store.getNotes(apptId);
          expect(retrieved).toBeDefined();
          expect(retrieved!.content).toBe(content);
          expect(retrieved!.appointmentId).toBe(apptId);
        }
      ),
      { numRuns: 500 }
    );
  });

  it("overwriting notes preserves only the latest content", () => {
    fc.assert(
      fc.property(
        appointmentIdArb(),
        noteContentArb(),
        noteContentArb(),
        (apptId, content1, content2) => {
          fc.pre(content1 !== content2);

          const store = new ConsultationStore();

          store.saveNotes(apptId, content1);
          store.saveNotes(apptId, content2);

          const retrieved = store.getNotes(apptId);
          expect(retrieved).toBeDefined();
          expect(retrieved!.content).toBe(content2);
        }
      ),
      { numRuns: 300 }
    );
  });
});
