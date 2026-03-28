// Feature: mediconnect-virtual-clinic, Property 18: Queue position ordering
// **Validates: Requirements 6.2**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// In-memory simulation of waiting room queue position logic
// ---------------------------------------------------------------------------

type AppointmentStatus = "pending" | "confirmed" | "rejected" | "completed" | "cancelled";

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  status: AppointmentStatus;
  scheduledAt: Date;
}

class WaitingRoomStore {
  private appointments: Appointment[] = [];

  addAppointment(appt: Appointment): void {
    this.appointments.push(appt);
  }

  /**
   * Compute queue position for a given appointment.
   * Mirrors the API logic: count of confirmed appointments for the same doctor
   * with scheduledAt <= this appointment's scheduledAt.
   */
  getQueuePosition(appointmentId: string): number {
    const target = this.appointments.find((a) => a.id === appointmentId);
    if (!target) return 0;

    return this.appointments.filter(
      (a) =>
        a.doctorId === target.doctorId &&
        a.status === "confirmed" &&
        a.scheduledAt.getTime() <= target.scheduledAt.getTime()
    ).length;
  }

  /** Get all confirmed appointments for a given doctor, sorted by scheduledAt. */
  getConfirmedForDoctor(doctorId: string): Appointment[] {
    return this.appointments
      .filter((a) => a.doctorId === doctorId && a.status === "confirmed")
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generate N distinct minute offsets within a day, used to create unique scheduledAt timestamps. */
function distinctMinuteOffsetsArb(minLen: number, maxLen: number) {
  return fc.uniqueArray(fc.integer({ min: 0, max: 24 * 60 - 1 }), {
    minLength: minLen,
    maxLength: maxLen,
  });
}

// ---------------------------------------------------------------------------
// Property 18: Queue position ordering
// ---------------------------------------------------------------------------

// Feature: mediconnect-virtual-clinic, Property 18: Queue position ordering
// **Validates: Requirements 6.2**
describe("Property 18: Queue position ordering", () => {
  it("N confirmed appointments for the same doctor get unique positions [1..N] ordered by scheduledAt", () => {
    fc.assert(
      fc.property(
        // Generate between 1 and 20 distinct minute offsets
        fc.uniqueArray(fc.integer({ min: 0, max: 24 * 60 - 1 }), {
          minLength: 1,
          maxLength: 20,
        }),
        (minuteOffsets) => {
          const anchor = new Date("2025-06-15T08:00:00Z").getTime();
          const n = minuteOffsets.length;
          const store = new WaitingRoomStore();
          const doctorId = "doctor_1";

          // Create N confirmed appointments with distinct scheduledAt
          const apptIds: string[] = [];
          for (let i = 0; i < n; i++) {
            const apptId = `appt_${i}`;
            apptIds.push(apptId);
            store.addAppointment({
              id: apptId,
              patientId: `patient_${i}`,
              doctorId,
              status: "confirmed",
              scheduledAt: new Date(anchor + minuteOffsets[i] * 60 * 1000),
            });
          }

          // Compute queue positions for all appointments
          const positions = apptIds.map((id) => store.getQueuePosition(id));

          // 1. All positions should be unique
          const uniquePositions = new Set(positions);
          expect(uniquePositions.size).toBe(n);

          // 2. Positions should be exactly [1..N]
          const sorted = [...positions].sort((a, b) => a - b);
          for (let i = 0; i < n; i++) {
            expect(sorted[i]).toBe(i + 1);
          }

          // 3. Positions should be ordered by scheduledAt
          //    (earlier scheduledAt → lower position)
          const confirmedSorted = store.getConfirmedForDoctor(doctorId);
          for (let i = 0; i < confirmedSorted.length; i++) {
            const pos = store.getQueuePosition(confirmedSorted[i].id);
            expect(pos).toBe(i + 1);
          }
        }
      ),
      { numRuns: 500 }
    );
  });

  it("non-confirmed appointments do not affect queue positions", () => {
    fc.assert(
      fc.property(
        distinctMinuteOffsetsArb(5, 5),
        fc.constantFrom<AppointmentStatus>("pending", "rejected", "completed", "cancelled"),
        (minuteOffsets, nonConfirmedStatus) => {
          const anchor = new Date("2025-06-15T08:00:00Z").getTime();
          const timestamps = minuteOffsets.map((m) => new Date(anchor + m * 60 * 1000));
          const store = new WaitingRoomStore();
          const doctorId = "doctor_1";

          // Add 3 confirmed appointments
          for (let i = 0; i < 3; i++) {
            store.addAppointment({
              id: `confirmed_${i}`,
              patientId: `patient_${i}`,
              doctorId,
              status: "confirmed",
              scheduledAt: timestamps[i],
            });
          }

          // Add 2 non-confirmed appointments
          for (let i = 3; i < 5; i++) {
            store.addAppointment({
              id: `other_${i}`,
              patientId: `patient_${i}`,
              doctorId,
              status: nonConfirmedStatus,
              scheduledAt: timestamps[i],
            });
          }

          // Only confirmed appointments should have positions in [1..3]
          const confirmedSorted = store.getConfirmedForDoctor(doctorId);
          expect(confirmedSorted.length).toBe(3);

          const positions = confirmedSorted.map((a) =>
            store.getQueuePosition(a.id)
          );
          const sorted = [...positions].sort((a, b) => a - b);
          expect(sorted).toEqual([1, 2, 3]);

          // Positions should be ordered by scheduledAt
          for (let i = 0; i < confirmedSorted.length; i++) {
            expect(store.getQueuePosition(confirmedSorted[i].id)).toBe(i + 1);
          }
        }
      ),
      { numRuns: 300 }
    );
  });
});
