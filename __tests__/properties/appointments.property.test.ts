// Feature: mediconnect-virtual-clinic, Property 9: Patient sees only unbooked slots
// Feature: mediconnect-virtual-clinic, Property 10: Booking creates pending appointment
// Feature: mediconnect-virtual-clinic, Property 11: No double-booking
// **Validates: Requirements 3.1, 3.2, 3.3, 3.6**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AvailabilitySlot {
  id: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
}

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  slotId: string;
  status: "pending" | "confirmed" | "rejected" | "completed" | "cancelled";
  scheduledAt: Date;
}

type BookingResult =
  | { success: true; appointment: Appointment }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// In-memory AppointmentStore
// ---------------------------------------------------------------------------

/**
 * Simulates the database layer for slots and appointments.
 * Mirrors the transactional booking logic from POST /api/appointments.
 */
class AppointmentStore {
  private slots = new Map<string, AvailabilitySlot>();
  private appointments = new Map<string, Appointment>();
  private nextSlotId = 1;
  private nextApptId = 1;

  /** Create an availability slot for a doctor. */
  createSlot(
    doctorId: string,
    date: string,
    startTime: string,
    endTime: string,
    isBooked = false
  ): AvailabilitySlot {
    const id = `slot_${this.nextSlotId++}`;
    const slot: AvailabilitySlot = { id, doctorId, date, startTime, endTime, isBooked };
    this.slots.set(id, slot);
    return slot;
  }

  /** Query available (unbooked) slots for a doctor — patient perspective. */
  getAvailableSlots(doctorId: string): AvailabilitySlot[] {
    return Array.from(this.slots.values()).filter(
      (s) => s.doctorId === doctorId && !s.isBooked
    );
  }

  /** Query all slots for a doctor (booked + unbooked). */
  getAllSlots(doctorId: string): AvailabilitySlot[] {
    return Array.from(this.slots.values()).filter((s) => s.doctorId === doctorId);
  }

  /**
   * Book a slot for a patient — mirrors the transactional logic:
   * 1. Look up slot, verify it belongs to the doctor
   * 2. Check isBooked — reject if already booked
   * 3. Mark slot as booked, create appointment with status "pending"
   */
  bookSlot(patientId: string, doctorId: string, slotId: string): BookingResult {
    const slot = this.slots.get(slotId);

    if (!slot || slot.doctorId !== doctorId) {
      return { success: false, error: "Slot not found" };
    }

    if (slot.isBooked) {
      return { success: false, error: "Slot no longer available" };
    }

    // Mark slot as booked
    slot.isBooked = true;

    // Create appointment
    const id = `appt_${this.nextApptId++}`;
    const scheduledAt = new Date(`${slot.date}T${slot.startTime}`);
    const appointment: Appointment = {
      id,
      patientId,
      doctorId,
      slotId,
      status: "pending",
      scheduledAt,
    };
    this.appointments.set(id, appointment);

    return { success: true, appointment };
  }

  /** Get a slot by ID. */
  getSlot(slotId: string): AvailabilitySlot | undefined {
    return this.slots.get(slotId);
  }

  /** Get an appointment by ID. */
  getAppointment(appointmentId: string): Appointment | undefined {
    return this.appointments.get(appointmentId);
  }

  /** List appointments for a patient. */
  listByPatient(patientId: string): Appointment[] {
    return Array.from(this.appointments.values()).filter(
      (a) => a.patientId === patientId
    );
  }

  /**
   * Accept a pending appointment — sets status to "confirmed", slot stays booked.
   * Mirrors PATCH /api/appointments/[id] with action "accept".
   */
  acceptAppointment(appointmentId: string): { success: boolean; error?: string } {
    const appt = this.appointments.get(appointmentId);
    if (!appt) return { success: false, error: "Appointment not found" };
    if (appt.status !== "pending") return { success: false, error: "Appointment is not pending" };

    appt.status = "confirmed";
    return { success: true };
  }

  /**
   * Reject a pending appointment — sets status to "rejected" and releases the slot.
   * Mirrors PATCH /api/appointments/[id] with action "reject".
   */
  rejectAppointment(appointmentId: string): { success: boolean; error?: string } {
    const appt = this.appointments.get(appointmentId);
    if (!appt) return { success: false, error: "Appointment not found" };
    if (appt.status !== "pending") return { success: false, error: "Appointment is not pending" };

    appt.status = "rejected";

    const slot = this.slots.get(appt.slotId);
    if (slot) {
      slot.isBooked = false;
    }

    return { success: true };
  }

  /** List only pending appointments for a given doctor. */
  listPendingByDoctor(doctorId: string): Appointment[] {
    return Array.from(this.appointments.values()).filter(
      (a) => a.doctorId === doctorId && a.status === "pending"
    );
  }
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

function doctorIdArb(): fc.Arbitrary<string> {
  return fc.stringMatching(/^dr_[a-z0-9]{4,8}$/);
}

function patientIdArb(): fc.Arbitrary<string> {
  return fc.stringMatching(/^pt_[a-z0-9]{4,8}$/);
}

function futureDateArb(): fc.Arbitrary<string> {
  return fc.integer({ min: 1, max: 365 }).map((daysAhead) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split("T")[0];
  });
}

function slotArb(): fc.Arbitrary<{ startTime: string; endTime: string }> {
  return fc
    .record({
      h1: fc.integer({ min: 0, max: 23 }),
      m1: fc.integer({ min: 0, max: 59 }),
      h2: fc.integer({ min: 0, max: 23 }),
      m2: fc.integer({ min: 0, max: 59 }),
    })
    .filter(({ h1, m1, h2, m2 }) => h1 * 60 + m1 < h2 * 60 + m2)
    .map(({ h1, m1, h2, m2 }) => ({
      startTime: `${String(h1).padStart(2, "0")}:${String(m1).padStart(2, "0")}`,
      endTime: `${String(h2).padStart(2, "0")}:${String(m2).padStart(2, "0")}`,
    }));
}

// ---------------------------------------------------------------------------
// Property 9: Patient sees only unbooked slots
// ---------------------------------------------------------------------------

// Feature: mediconnect-virtual-clinic, Property 9: Patient sees only unbooked slots
// **Validates: Requirements 3.1**
describe("Property 9: Patient sees only unbooked slots", () => {
  it("query returns only slots where isBooked is false", () => {
    fc.assert(
      fc.property(
        doctorIdArb(),
        fc.array(
          fc.tuple(futureDateArb(), slotArb(), fc.boolean()),
          { minLength: 1, maxLength: 10 }
        ),
        (doctorId, slotSpecs) => {
          const store = new AppointmentStore();

          // Create a mix of booked and unbooked slots
          const createdSlots: Array<{ slot: AvailabilitySlot; shouldBeBooked: boolean }> = [];
          for (const [date, { startTime, endTime }, booked] of slotSpecs) {
            const slot = store.createSlot(doctorId, date, startTime, endTime, booked);
            createdSlots.push({ slot, shouldBeBooked: booked });
          }

          // Query available slots (patient perspective)
          const available = store.getAvailableSlots(doctorId);

          // Every returned slot must have isBooked === false
          for (const slot of available) {
            expect(slot.isBooked).toBe(false);
          }

          // Count should match the number of unbooked slots we created
          const expectedUnbooked = createdSlots.filter((s) => !s.shouldBeBooked).length;
          expect(available).toHaveLength(expectedUnbooked);

          // No booked slot should appear in the results
          const availableIds = new Set(available.map((s) => s.id));
          for (const { slot, shouldBeBooked } of createdSlots) {
            if (shouldBeBooked) {
              expect(availableIds.has(slot.id)).toBe(false);
            } else {
              expect(availableIds.has(slot.id)).toBe(true);
            }
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it("returns empty when all slots are booked", () => {
    fc.assert(
      fc.property(
        doctorIdArb(),
        fc.array(fc.tuple(futureDateArb(), slotArb()), { minLength: 1, maxLength: 5 }),
        (doctorId, slotSpecs) => {
          const store = new AppointmentStore();

          // Create all slots as booked
          for (const [date, { startTime, endTime }] of slotSpecs) {
            store.createSlot(doctorId, date, startTime, endTime, true);
          }

          const available = store.getAvailableSlots(doctorId);
          expect(available).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 10: Booking creates pending appointment
// ---------------------------------------------------------------------------

// Feature: mediconnect-virtual-clinic, Property 10: Booking creates pending appointment
// **Validates: Requirements 3.2**
describe("Property 10: Booking creates pending appointment", () => {
  it("booking sets status 'pending' and isBooked true with correct IDs", () => {
    fc.assert(
      fc.property(
        patientIdArb(),
        doctorIdArb(),
        futureDateArb(),
        slotArb(),
        (patientId, doctorId, date, { startTime, endTime }) => {
          const store = new AppointmentStore();

          // Create an unbooked slot
          const slot = store.createSlot(doctorId, date, startTime, endTime);
          expect(slot.isBooked).toBe(false);

          // Book the slot
          const result = store.bookSlot(patientId, doctorId, slot.id);

          // Booking must succeed
          expect(result.success).toBe(true);
          if (!result.success) return;

          const appt = result.appointment;

          // Appointment status must be "pending"
          expect(appt.status).toBe("pending");

          // Correct IDs are associated
          expect(appt.patientId).toBe(patientId);
          expect(appt.doctorId).toBe(doctorId);
          expect(appt.slotId).toBe(slot.id);

          // Slot must now be marked as booked
          const updatedSlot = store.getSlot(slot.id);
          expect(updatedSlot!.isBooked).toBe(true);

          // The appointment should appear in the patient's list
          const patientAppts = store.listByPatient(patientId);
          expect(patientAppts).toHaveLength(1);
          expect(patientAppts[0].id).toBe(appt.id);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("scheduledAt is derived from slot date and startTime", () => {
    fc.assert(
      fc.property(
        patientIdArb(),
        doctorIdArb(),
        futureDateArb(),
        slotArb(),
        (patientId, doctorId, date, { startTime, endTime }) => {
          const store = new AppointmentStore();
          const slot = store.createSlot(doctorId, date, startTime, endTime);

          const result = store.bookSlot(patientId, doctorId, slot.id);
          expect(result.success).toBe(true);
          if (!result.success) return;

          const expected = new Date(`${date}T${startTime}`);
          expect(result.appointment.scheduledAt.getTime()).toBe(expected.getTime());
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 11: No double-booking
// ---------------------------------------------------------------------------

// Feature: mediconnect-virtual-clinic, Property 11: No double-booking
// **Validates: Requirements 3.3, 3.6**
describe("Property 11: No double-booking", () => {
  it("booking an already-booked slot is rejected", () => {
    fc.assert(
      fc.property(
        patientIdArb(),
        patientIdArb(),
        doctorIdArb(),
        futureDateArb(),
        slotArb(),
        (patient1, patient2, doctorId, date, { startTime, endTime }) => {
          // Ensure different patients
          fc.pre(patient1 !== patient2);

          const store = new AppointmentStore();
          const slot = store.createSlot(doctorId, date, startTime, endTime);

          // First patient books successfully
          const first = store.bookSlot(patient1, doctorId, slot.id);
          expect(first.success).toBe(true);

          // Second patient attempts to book the same slot
          const second = store.bookSlot(patient2, doctorId, slot.id);

          // Must be rejected
          expect(second.success).toBe(false);
          if (!second.success) {
            expect(second.error).toBe("Slot no longer available");
          }

          // Original appointment is unchanged
          if (first.success) {
            const originalAppt = store.getAppointment(first.appointment.id);
            expect(originalAppt).toBeDefined();
            expect(originalAppt!.patientId).toBe(patient1);
            expect(originalAppt!.status).toBe("pending");
          }

          // Slot remains booked
          const updatedSlot = store.getSlot(slot.id);
          expect(updatedSlot!.isBooked).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("same patient cannot double-book the same slot", () => {
    fc.assert(
      fc.property(
        patientIdArb(),
        doctorIdArb(),
        futureDateArb(),
        slotArb(),
        (patientId, doctorId, date, { startTime, endTime }) => {
          const store = new AppointmentStore();
          const slot = store.createSlot(doctorId, date, startTime, endTime);

          // First booking succeeds
          const first = store.bookSlot(patientId, doctorId, slot.id);
          expect(first.success).toBe(true);

          // Second booking of same slot by same patient is rejected
          const second = store.bookSlot(patientId, doctorId, slot.id);
          expect(second.success).toBe(false);

          // Only one appointment exists for this patient
          const appts = store.listByPatient(patientId);
          expect(appts).toHaveLength(1);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("booking a slot with wrong doctorId is rejected", () => {
    fc.assert(
      fc.property(
        patientIdArb(),
        doctorIdArb(),
        doctorIdArb(),
        futureDateArb(),
        slotArb(),
        (patientId, realDoctor, wrongDoctor, date, { startTime, endTime }) => {
          fc.pre(realDoctor !== wrongDoctor);

          const store = new AppointmentStore();
          const slot = store.createSlot(realDoctor, date, startTime, endTime);

          // Attempt to book with wrong doctor ID
          const result = store.bookSlot(patientId, wrongDoctor, slot.id);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error).toBe("Slot not found");
          }

          // Slot should remain unbooked
          expect(store.getSlot(slot.id)!.isBooked).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });
});


// ---------------------------------------------------------------------------
// Property 13: Appointment accept/reject state transitions
// ---------------------------------------------------------------------------

// Feature: mediconnect-virtual-clinic, Property 13: Appointment accept/reject state transitions
// **Validates: Requirements 4.2, 4.3**
describe("Property 13: Appointment accept/reject state transitions", () => {
  it("accepting a pending appointment sets status to 'confirmed' and slot stays booked", () => {
    fc.assert(
      fc.property(
        patientIdArb(),
        doctorIdArb(),
        futureDateArb(),
        slotArb(),
        (patientId, doctorId, date, { startTime, endTime }) => {
          const store = new AppointmentStore();
          const slot = store.createSlot(doctorId, date, startTime, endTime);

          // Book the slot to create a pending appointment
          const bookResult = store.bookSlot(patientId, doctorId, slot.id);
          expect(bookResult.success).toBe(true);
          if (!bookResult.success) return;

          const apptId = bookResult.appointment.id;

          // Accept the appointment
          const acceptResult = store.acceptAppointment(apptId);
          expect(acceptResult.success).toBe(true);

          // Status must be "confirmed"
          const appt = store.getAppointment(apptId);
          expect(appt!.status).toBe("confirmed");

          // Slot must remain booked
          const updatedSlot = store.getSlot(slot.id);
          expect(updatedSlot!.isBooked).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("rejecting a pending appointment sets status to 'rejected' and slot becomes unbooked", () => {
    fc.assert(
      fc.property(
        patientIdArb(),
        doctorIdArb(),
        futureDateArb(),
        slotArb(),
        (patientId, doctorId, date, { startTime, endTime }) => {
          const store = new AppointmentStore();
          const slot = store.createSlot(doctorId, date, startTime, endTime);

          // Book the slot to create a pending appointment
          const bookResult = store.bookSlot(patientId, doctorId, slot.id);
          expect(bookResult.success).toBe(true);
          if (!bookResult.success) return;

          const apptId = bookResult.appointment.id;

          // Reject the appointment
          const rejectResult = store.rejectAppointment(apptId);
          expect(rejectResult.success).toBe(true);

          // Status must be "rejected"
          const appt = store.getAppointment(apptId);
          expect(appt!.status).toBe("rejected");

          // Slot must be released (unbooked)
          const updatedSlot = store.getSlot(slot.id);
          expect(updatedSlot!.isBooked).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 14: Doctor pending appointments filter
// ---------------------------------------------------------------------------

// Feature: mediconnect-virtual-clinic, Property 14: Doctor pending appointments filter
// **Validates: Requirements 4.1**
describe("Property 14: Doctor pending appointments filter", () => {
  it("query returns only 'pending' appointments for that doctor", () => {
    fc.assert(
      fc.property(
        doctorIdArb(),
        fc.array(
          fc.record({
            patientId: patientIdArb(),
            date: futureDateArb(),
            slot: slotArb(),
            // Action after booking: leave pending, accept, or simulate completed
            action: fc.constantFrom("pending", "accept", "complete") as fc.Arbitrary<"pending" | "accept" | "complete">,
          }),
          { minLength: 2, maxLength: 8 }
        ),
        (doctorId, appointmentSpecs) => {
          const store = new AppointmentStore();

          const createdAppointments: Array<{ id: string; action: string }> = [];

          for (const { patientId, date, slot, action } of appointmentSpecs) {
            const s = store.createSlot(doctorId, date, slot.startTime, slot.endTime);
            const bookResult = store.bookSlot(patientId, doctorId, s.id);
            if (!bookResult.success) continue;

            const apptId = bookResult.appointment.id;
            createdAppointments.push({ id: apptId, action });

            if (action === "accept") {
              store.acceptAppointment(apptId);
            } else if (action === "complete") {
              // Accept first, then manually set to completed to simulate the flow
              store.acceptAppointment(apptId);
              const appt = store.getAppointment(apptId);
              if (appt) appt.status = "completed";
            }
            // "pending" — leave as-is
          }

          // Query pending appointments for this doctor
          const pending = store.listPendingByDoctor(doctorId);

          // Every returned appointment must be pending and belong to this doctor
          for (const appt of pending) {
            expect(appt.status).toBe("pending");
            expect(appt.doctorId).toBe(doctorId);
          }

          // Count should match the number we left as pending
          const expectedPendingCount = createdAppointments.filter(
            (a) => a.action === "pending"
          ).length;
          expect(pending).toHaveLength(expectedPendingCount);
        }
      ),
      { numRuns: 200 }
    );
  });
});
