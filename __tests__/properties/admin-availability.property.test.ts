// Feature: platform-enhancements-v2, Property 9: Admin availability slot filtering
// Feature: platform-enhancements-v2, Property 10: Admin bulk slot deletion with cascade
// **Validates: Requirements 7.2, 7.4, 7.6, 8.1, 8.2, 8.3, 8.4, 8.5**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AvailabilitySlot {
  id: string;
  doctorId: string;
  doctorName: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  isBooked: boolean;
}

type AppointmentStatus = "pending" | "confirmed" | "cancelled";

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  slotId: string;
  status: AppointmentStatus;
}

interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
}

// ---------------------------------------------------------------------------
// In-memory Admin Availability Store
// ---------------------------------------------------------------------------

class AdminAvailabilityStore {
  private slots = new Map<string, AvailabilitySlot>();
  private appointments = new Map<string, Appointment>();
  private notificationsList: Notification[] = [];
  private nextSlotId = 1;
  private nextApptId = 1;
  private nextNotifId = 1;

  createSlot(
    doctorId: string,
    doctorName: string,
    date: string,
    startTime: string,
    endTime: string
  ): AvailabilitySlot {
    const id = `slot_${this.nextSlotId++}`;
    const slot: AvailabilitySlot = {
      id,
      doctorId,
      doctorName,
      date,
      startTime,
      endTime,
      isBooked: false,
    };
    this.slots.set(id, slot);
    return slot;
  }

  createAppointment(
    patientId: string,
    doctorId: string,
    slotId: string,
    status: AppointmentStatus
  ): Appointment {
    const id = `appt_${this.nextApptId++}`;
    const slot = this.slots.get(slotId);
    if (slot) slot.isBooked = true;
    const appt: Appointment = { id, patientId, doctorId, slotId, status };
    this.appointments.set(id, appt);
    return appt;
  }

  /**
   * Filter slots by doctor name substring (case-insensitive) and date range.
   * Mirrors GET /api/admin/availability?doctorName=X&dateFrom=Y&dateTo=Z
   */
  filterSlots(criteria: {
    doctorName?: string;
    dateFrom?: string;
    dateTo?: string;
  }): AvailabilitySlot[] {
    return Array.from(this.slots.values()).filter((slot) => {
      if (
        criteria.doctorName &&
        !slot.doctorName
          .toLowerCase()
          .includes(criteria.doctorName.toLowerCase())
      ) {
        return false;
      }
      if (criteria.dateFrom && slot.date < criteria.dateFrom) {
        return false;
      }
      if (criteria.dateTo && slot.date > criteria.dateTo) {
        return false;
      }
      return true;
    });
  }

  /**
   * Bulk delete slots with cascade: cancel associated appointments, notify users.
   * Mirrors DELETE /api/admin/availability { slotIds: string[] }
   */
  bulkDelete(slotIds: string[]): {
    deleted: number;
    cancelledAppointments: number;
  } {
    let cancelledAppointments = 0;

    for (const slotId of slotIds) {
      // Find active appointments for this slot
      const slotAppointments = Array.from(this.appointments.values()).filter(
        (a) =>
          a.slotId === slotId &&
          (a.status === "pending" || a.status === "confirmed")
      );

      for (const appt of slotAppointments) {
        // Cancel the appointment
        appt.status = "cancelled";

        // Release the slot booking
        const slot = this.slots.get(slotId);
        if (slot) slot.isBooked = false;

        // Notify patient
        this.notificationsList.push({
          id: `notif_${this.nextNotifId++}`,
          userId: appt.patientId,
          type: "appointment_cancelled",
          message: "Your appointment has been cancelled due to schedule changes.",
        });

        // Notify doctor
        this.notificationsList.push({
          id: `notif_${this.nextNotifId++}`,
          userId: appt.doctorId,
          type: "appointment_cancelled",
          message:
            "An appointment has been cancelled by an administrator due to availability changes.",
        });

        cancelledAppointments++;
      }

      // Delete the slot
      this.slots.delete(slotId);
    }

    return { deleted: slotIds.length, cancelledAppointments };
  }

  getSlot(id: string): AvailabilitySlot | undefined {
    return this.slots.get(id);
  }

  getAllSlots(): AvailabilitySlot[] {
    return Array.from(this.slots.values());
  }

  getAppointment(id: string): Appointment | undefined {
    return this.appointments.get(id);
  }

  getAllAppointments(): Appointment[] {
    return Array.from(this.appointments.values());
  }

  getNotifications(): Notification[] {
    return [...this.notificationsList];
  }

  getNotificationsForUser(userId: string): Notification[] {
    return this.notificationsList.filter((n) => n.userId === userId);
  }
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generate a doctor name string. */
const doctorNameArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.constantFrom("Dr. ", "Dr "),
    fc.stringMatching(/^[A-Z][a-z]{2,8}$/)
  )
  .map(([prefix, name]) => `${prefix}${name}`);

/** Generate a date string in YYYY-MM-DD format within a fixed range. */
const dateArb: fc.Arbitrary<string> = fc
  .integer({ min: 0, max: 89 })
  .map((offset) => {
    const base = new Date(2025, 0, 1);
    const d = new Date(base.getTime() + offset * 24 * 60 * 60 * 1000);
    return d.toISOString().split("T")[0];
  });

/** Generate a date range (from <= to) within the same fixed range. */
const dateRangeArb: fc.Arbitrary<{ dateFrom: string; dateTo: string }> = fc
  .tuple(
    fc.integer({ min: 0, max: 89 }),
    fc.integer({ min: 0, max: 89 })
  )
  .map(([a, b]) => {
    const base = new Date(2025, 0, 1);
    const d1 = new Date(
      base.getTime() + Math.min(a, b) * 24 * 60 * 60 * 1000
    );
    const d2 = new Date(
      base.getTime() + Math.max(a, b) * 24 * 60 * 60 * 1000
    );
    return {
      dateFrom: d1.toISOString().split("T")[0],
      dateTo: d2.toISOString().split("T")[0],
    };
  });

/** Generate a time string HH:mm. */
const timeArb: fc.Arbitrary<string> = fc
  .record({
    h: fc.integer({ min: 8, max: 17 }),
    m: fc.constantFrom(0, 15, 30, 45),
  })
  .map(
    ({ h, m }) =>
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
  );

/** Generate a valid slot time range. */
const slotTimeArb: fc.Arbitrary<{ startTime: string; endTime: string }> = fc
  .tuple(timeArb, timeArb)
  .filter(([a, b]) => a < b)
  .map(([startTime, endTime]) => ({ startTime, endTime }));

const userIdArb: fc.Arbitrary<string> = fc
  .integer({ min: 1, max: 500 })
  .map((n) => `user_${n}`);

const doctorIdArb: fc.Arbitrary<string> = fc
  .integer({ min: 1, max: 100 })
  .map((n) => `doctor_${n}`);

const patientIdArb: fc.Arbitrary<string> = fc
  .integer({ min: 1, max: 100 })
  .map((n) => `patient_${n}`);

const activeStatusArb: fc.Arbitrary<AppointmentStatus> = fc.constantFrom(
  "pending",
  "confirmed"
) as fc.Arbitrary<AppointmentStatus>;

// ---------------------------------------------------------------------------
// Property 9: Admin availability slot filtering
// ---------------------------------------------------------------------------

// Feature: platform-enhancements-v2, Property 9: Admin availability slot filtering
// **Validates: Requirements 7.2**
describe("Property 9: Admin availability slot filtering", () => {
  it("filter by doctor name substring returns only matching slots with complete result set", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(doctorIdArb, doctorNameArb, dateArb, slotTimeArb),
          { minLength: 1, maxLength: 20 }
        ),
        fc.stringMatching(/^[a-z]{1,4}$/),
        (slotSpecs, nameSubstring) => {
          const store = new AdminAvailabilityStore();

          const created: AvailabilitySlot[] = [];
          for (const [doctorId, doctorName, date, { startTime, endTime }] of slotSpecs) {
            created.push(
              store.createSlot(doctorId, doctorName, date, startTime, endTime)
            );
          }

          const results = store.filterSlots({ doctorName: nameSubstring });

          // Every returned slot must match the name filter
          const q = nameSubstring.toLowerCase();
          for (const slot of results) {
            expect(slot.doctorName.toLowerCase()).toContain(q);
          }

          // Completeness: count matches expected
          const expectedCount = created.filter((s) =>
            s.doctorName.toLowerCase().includes(q)
          ).length;
          expect(results).toHaveLength(expectedCount);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("filter by date range returns only slots within [dateFrom, dateTo]", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(doctorIdArb, doctorNameArb, dateArb, slotTimeArb),
          { minLength: 1, maxLength: 20 }
        ),
        dateRangeArb,
        (slotSpecs, { dateFrom, dateTo }) => {
          const store = new AdminAvailabilityStore();

          const created: AvailabilitySlot[] = [];
          for (const [doctorId, doctorName, date, { startTime, endTime }] of slotSpecs) {
            created.push(
              store.createSlot(doctorId, doctorName, date, startTime, endTime)
            );
          }

          const results = store.filterSlots({ dateFrom, dateTo });

          // Every returned slot must be within the date range
          for (const slot of results) {
            expect(slot.date >= dateFrom).toBe(true);
            expect(slot.date <= dateTo).toBe(true);
          }

          // Completeness
          const expectedCount = created.filter(
            (s) => s.date >= dateFrom && s.date <= dateTo
          ).length;
          expect(results).toHaveLength(expectedCount);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("combined filter (name + date range) returns intersection of both criteria", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(doctorIdArb, doctorNameArb, dateArb, slotTimeArb),
          { minLength: 1, maxLength: 20 }
        ),
        fc.stringMatching(/^[a-z]{1,4}$/),
        dateRangeArb,
        (slotSpecs, nameSubstring, { dateFrom, dateTo }) => {
          const store = new AdminAvailabilityStore();

          const created: AvailabilitySlot[] = [];
          for (const [doctorId, doctorName, date, { startTime, endTime }] of slotSpecs) {
            created.push(
              store.createSlot(doctorId, doctorName, date, startTime, endTime)
            );
          }

          const results = store.filterSlots({
            doctorName: nameSubstring,
            dateFrom,
            dateTo,
          });

          const q = nameSubstring.toLowerCase();

          // Every result matches both criteria
          for (const slot of results) {
            expect(slot.doctorName.toLowerCase()).toContain(q);
            expect(slot.date >= dateFrom).toBe(true);
            expect(slot.date <= dateTo).toBe(true);
          }

          // Completeness
          const expectedCount = created.filter(
            (s) =>
              s.doctorName.toLowerCase().includes(q) &&
              s.date >= dateFrom &&
              s.date <= dateTo
          ).length;
          expect(results).toHaveLength(expectedCount);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("no filters returns all slots", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(doctorIdArb, doctorNameArb, dateArb, slotTimeArb),
          { minLength: 0, maxLength: 15 }
        ),
        (slotSpecs) => {
          const store = new AdminAvailabilityStore();

          for (const [doctorId, doctorName, date, { startTime, endTime }] of slotSpecs) {
            store.createSlot(doctorId, doctorName, date, startTime, endTime);
          }

          const results = store.filterSlots({});
          expect(results).toHaveLength(slotSpecs.length);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 10: Admin bulk slot deletion with cascade
// ---------------------------------------------------------------------------

// Feature: platform-enhancements-v2, Property 10: Admin bulk slot deletion with cascade
// **Validates: Requirements 7.4, 7.6, 8.1, 8.2, 8.3, 8.4, 8.5**
describe("Property 10: Admin bulk slot deletion with cascade", () => {
  it("bulk deletion removes all selected slots, cancels associated appointments, creates exactly 2 notifications per cancelled appointment", () => {
    fc.assert(
      fc.property(
        // Generate slots: some booked (with appointments), some not
        fc.array(
          fc.record({
            doctorId: doctorIdArb,
            doctorName: doctorNameArb,
            date: dateArb,
            time: slotTimeArb,
            hasAppointment: fc.boolean(),
            patientId: patientIdArb,
            appointmentStatus: activeStatusArb,
          }),
          { minLength: 1, maxLength: 10 }
        ),
        // Subset selection: which indices to delete
        fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }),
        (slotSpecs, selectionFlags) => {
          const store = new AdminAvailabilityStore();

          const createdSlots: AvailabilitySlot[] = [];
          const createdAppointments: Appointment[] = [];

          for (const spec of slotSpecs) {
            const slot = store.createSlot(
              spec.doctorId,
              spec.doctorName,
              spec.date,
              spec.time.startTime,
              spec.time.endTime
            );
            createdSlots.push(slot);

            if (spec.hasAppointment) {
              const appt = store.createAppointment(
                spec.patientId,
                spec.doctorId,
                slot.id,
                spec.appointmentStatus
              );
              createdAppointments.push(appt);
            }
          }

          // Select a subset of slots for deletion
          const selectedSlotIds = createdSlots
            .filter((_, i) => selectionFlags[i % selectionFlags.length])
            .map((s) => s.id);

          // Skip if nothing selected
          if (selectedSlotIds.length === 0) return;

          // Count expected cancelled appointments before deletion
          const expectedCancelled = createdAppointments.filter(
            (a) =>
              selectedSlotIds.includes(a.slotId) &&
              (a.status === "pending" || a.status === "confirmed")
          ).length;

          const result = store.bulkDelete(selectedSlotIds);

          // 1. All selected slots are removed
          for (const slotId of selectedSlotIds) {
            expect(store.getSlot(slotId)).toBeUndefined();
          }

          // 2. Non-selected slots still exist
          const nonSelectedIds = createdSlots
            .filter((s) => !selectedSlotIds.includes(s.id))
            .map((s) => s.id);
          for (const slotId of nonSelectedIds) {
            expect(store.getSlot(slotId)).toBeDefined();
          }

          // 3. All associated appointments are cancelled
          for (const appt of createdAppointments) {
            if (selectedSlotIds.includes(appt.slotId)) {
              const updated = store.getAppointment(appt.id);
              expect(updated).toBeDefined();
              expect(updated!.status).toBe("cancelled");
            }
          }

          // 4. Correct number of cancelled appointments
          expect(result.cancelledAppointments).toBe(expectedCancelled);

          // 5. Exactly 2 notifications per cancelled appointment
          const allNotifications = store.getNotifications();
          expect(allNotifications).toHaveLength(expectedCancelled * 2);

          // 6. Each cancelled appointment has one patient notification and one doctor notification
          for (const appt of createdAppointments) {
            if (selectedSlotIds.includes(appt.slotId)) {
              const patientNotifs = store
                .getNotificationsForUser(appt.patientId)
                .filter((n) => n.type === "appointment_cancelled");
              const doctorNotifs = store
                .getNotificationsForUser(appt.doctorId)
                .filter((n) => n.type === "appointment_cancelled");

              expect(patientNotifs.length).toBeGreaterThanOrEqual(1);
              expect(doctorNotifs.length).toBeGreaterThanOrEqual(1);
            }
          }

          // 7. All notifications are of type appointment_cancelled
          for (const notif of allNotifications) {
            expect(notif.type).toBe("appointment_cancelled");
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it("deleting unbooked slots creates no notifications", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(doctorIdArb, doctorNameArb, dateArb, slotTimeArb),
          { minLength: 1, maxLength: 10 }
        ),
        (slotSpecs) => {
          const store = new AdminAvailabilityStore();

          const slotIds: string[] = [];
          for (const [doctorId, doctorName, date, { startTime, endTime }] of slotSpecs) {
            const slot = store.createSlot(
              doctorId,
              doctorName,
              date,
              startTime,
              endTime
            );
            slotIds.push(slot.id);
          }

          const result = store.bulkDelete(slotIds);

          // All slots removed
          expect(result.deleted).toBe(slotIds.length);
          expect(result.cancelledAppointments).toBe(0);

          // No notifications created
          expect(store.getNotifications()).toHaveLength(0);

          // No slots remain
          expect(store.getAllSlots()).toHaveLength(0);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("deleting all booked slots cancels all appointments with correct notification count", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            doctorIdArb,
            doctorNameArb,
            dateArb,
            slotTimeArb,
            patientIdArb,
            activeStatusArb
          ),
          { minLength: 1, maxLength: 8 }
        ),
        (slotSpecs) => {
          const store = new AdminAvailabilityStore();

          const slotIds: string[] = [];
          for (const [
            doctorId,
            doctorName,
            date,
            { startTime, endTime },
            patientId,
            status,
          ] of slotSpecs) {
            const slot = store.createSlot(
              doctorId,
              doctorName,
              date,
              startTime,
              endTime
            );
            store.createAppointment(patientId, doctorId, slot.id, status);
            slotIds.push(slot.id);
          }

          const result = store.bulkDelete(slotIds);

          // All slots removed
          expect(result.deleted).toBe(slotIds.length);

          // All appointments cancelled
          expect(result.cancelledAppointments).toBe(slotSpecs.length);

          // Exactly 2 notifications per appointment
          expect(store.getNotifications()).toHaveLength(slotSpecs.length * 2);

          // No slots remain
          expect(store.getAllSlots()).toHaveLength(0);
        }
      ),
      { numRuns: 200 }
    );
  });
});
