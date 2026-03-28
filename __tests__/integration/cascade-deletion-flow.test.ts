/**
 * Integration test: Cascade Deletion Flow
 *
 * Simulates admin slot deletion with cascade logic using in-memory stores:
 *   admin deletes booked slot → appointment cancelled →
 *   notifications created for patient and doctor
 *
 * Also tests that unbooked slot deletion creates no notifications.
 *
 * Validates: Requirements 8.1, 8.3
 */

import { describe, it, expect, beforeEach } from "vitest";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// In-memory store for cascade deletion flow
// ---------------------------------------------------------------------------

type Role = "patient" | "doctor" | "admin";
type AppointmentStatus = "pending" | "confirmed" | "rejected" | "cancelled";

interface User {
  id: string;
  name: string;
  role: Role;
}

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
  status: AppointmentStatus;
}

interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
}

class InMemoryCascadeStore {
  users: User[] = [];
  slots: AvailabilitySlot[] = [];
  appointments: Appointment[] = [];
  notifications: Notification[] = [];

  registerUser(name: string, role: Role): User {
    const user: User = { id: randomUUID(), name, role };
    this.users.push(user);
    return user;
  }

  createSlot(doctorId: string, date: string, startTime: string, endTime: string): AvailabilitySlot {
    const slot: AvailabilitySlot = {
      id: randomUUID(),
      doctorId,
      date,
      startTime,
      endTime,
      isBooked: false,
    };
    this.slots.push(slot);
    return slot;
  }

  bookSlot(patientId: string, slotId: string): Appointment {
    const slot = this.slots.find((s) => s.id === slotId);
    if (!slot) throw new Error("Slot not found");
    if (slot.isBooked) throw new Error("Slot already booked");

    slot.isBooked = true;

    const appointment: Appointment = {
      id: randomUUID(),
      patientId,
      doctorId: slot.doctorId,
      slotId: slot.id,
      status: "pending",
    };
    this.appointments.push(appointment);
    return appointment;
  }

  /**
   * Admin cascade deletion: mirrors the real DELETE /api/admin/availability logic.
   * For each slot:
   *   - If booked: cancel appointment, notify patient + doctor, remove slot
   *   - If unbooked: just remove slot
   * All in a single "transaction" (simulated by collecting all changes first).
   */
  adminDeleteSlots(slotIds: string[]): { deletedSlots: number; cancelledAppointments: number; notificationsCreated: number } {
    if (slotIds.length === 0) throw new Error("At least one slot ID is required");

    let cancelledAppointments = 0;
    let notificationsCreated = 0;
    const slotsToRemove: string[] = [];

    for (const slotId of slotIds) {
      const slot = this.slots.find((s) => s.id === slotId);
      if (!slot) throw new Error(`Slot ${slotId} not found`);

      // Check if slot has a booked appointment
      const appointment = this.appointments.find(
        (a) => a.slotId === slotId && a.status !== "cancelled"
      );

      if (appointment) {
        // Cancel the appointment
        appointment.status = "cancelled";
        cancelledAppointments++;

        // Notify patient
        this.notifications.push({
          id: randomUUID(),
          userId: appointment.patientId,
          type: "appointment_cancelled",
          message: `Your appointment on ${slot.date} at ${slot.startTime} has been cancelled due to schedule changes`,
        });
        notificationsCreated++;

        // Notify doctor
        this.notifications.push({
          id: randomUUID(),
          userId: appointment.doctorId,
          type: "appointment_cancelled",
          message: `Appointment on ${slot.date} at ${slot.startTime} has been cancelled by admin`,
        });
        notificationsCreated++;
      }

      slotsToRemove.push(slotId);
    }

    // Remove all slots (simulates transaction commit)
    this.slots = this.slots.filter((s) => !slotsToRemove.includes(s.id));

    return {
      deletedSlots: slotsToRemove.length,
      cancelledAppointments,
      notificationsCreated,
    };
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Cascade Deletion Flow Integration", () => {
  let store: InMemoryCascadeStore;
  let patient: User;
  let doctor: User;
  let admin: User;

  beforeEach(() => {
    store = new InMemoryCascadeStore();
    patient = store.registerUser("Jane Doe", "patient");
    doctor = store.registerUser("Dr. Smith", "doctor");
    admin = store.registerUser("Admin User", "admin");
  });

  describe("Deleting a booked slot cancels the appointment", () => {
    it("cancels appointment and removes slot when booked slot is deleted", () => {
      const slot = store.createSlot(doctor.id, "2025-09-10", "09:00", "09:30");
      const appointment = store.bookSlot(patient.id, slot.id);
      expect(appointment.status).toBe("pending");
      expect(slot.isBooked).toBe(true);

      const result = store.adminDeleteSlots([slot.id]);

      expect(result.deletedSlots).toBe(1);
      expect(result.cancelledAppointments).toBe(1);

      // Slot is removed
      expect(store.slots.find((s) => s.id === slot.id)).toBeUndefined();

      // Appointment is cancelled
      expect(appointment.status).toBe("cancelled");
    });
  });

  describe("Cascade creates notifications for both patient and doctor", () => {
    it("creates exactly 2 notifications per cancelled appointment", () => {
      const slot = store.createSlot(doctor.id, "2025-09-11", "10:00", "10:30");
      store.bookSlot(patient.id, slot.id);

      const result = store.adminDeleteSlots([slot.id]);

      expect(result.notificationsCreated).toBe(2);

      const patientNotifs = store.notifications.filter(
        (n) => n.userId === patient.id && n.type === "appointment_cancelled"
      );
      const doctorNotifs = store.notifications.filter(
        (n) => n.userId === doctor.id && n.type === "appointment_cancelled"
      );

      expect(patientNotifs).toHaveLength(1);
      expect(doctorNotifs).toHaveLength(1);
      expect(patientNotifs[0].message).toContain("cancelled");
      expect(doctorNotifs[0].message).toContain("cancelled");
    });
  });

  describe("Unbooked slot deletion creates no notifications", () => {
    it("deletes unbooked slot without creating any notifications", () => {
      const slot = store.createSlot(doctor.id, "2025-09-12", "11:00", "11:30");
      expect(slot.isBooked).toBe(false);

      const result = store.adminDeleteSlots([slot.id]);

      expect(result.deletedSlots).toBe(1);
      expect(result.cancelledAppointments).toBe(0);
      expect(result.notificationsCreated).toBe(0);
      expect(store.notifications).toHaveLength(0);
      expect(store.slots.find((s) => s.id === slot.id)).toBeUndefined();
    });
  });

  describe("Bulk deletion with mixed booked/unbooked slots", () => {
    it("cascades only for booked slots in a bulk operation", () => {
      const slot1 = store.createSlot(doctor.id, "2025-09-13", "09:00", "09:30");
      const slot2 = store.createSlot(doctor.id, "2025-09-13", "10:00", "10:30");
      const slot3 = store.createSlot(doctor.id, "2025-09-13", "11:00", "11:30");

      // Book slot1 and slot3, leave slot2 unbooked
      const patient2 = store.registerUser("Bob Brown", "patient");
      store.bookSlot(patient.id, slot1.id);
      store.bookSlot(patient2.id, slot3.id);

      const result = store.adminDeleteSlots([slot1.id, slot2.id, slot3.id]);

      expect(result.deletedSlots).toBe(3);
      expect(result.cancelledAppointments).toBe(2);
      // 2 notifications per cancelled appointment = 4 total
      expect(result.notificationsCreated).toBe(4);

      // All slots removed
      expect(store.slots).toHaveLength(0);

      // Both appointments cancelled
      const cancelledAppts = store.appointments.filter((a) => a.status === "cancelled");
      expect(cancelledAppts).toHaveLength(2);

      // Each patient got a notification
      const patient1Notifs = store.notifications.filter((n) => n.userId === patient.id);
      const patient2Notifs = store.notifications.filter((n) => n.userId === patient2.id);
      expect(patient1Notifs).toHaveLength(1);
      expect(patient2Notifs).toHaveLength(1);

      // Doctor got 2 notifications (one per cancelled appointment)
      const doctorNotifs = store.notifications.filter((n) => n.userId === doctor.id);
      expect(doctorNotifs).toHaveLength(2);
    });
  });

  describe("Error handling", () => {
    it("throws when deleting non-existent slot", () => {
      expect(() => store.adminDeleteSlots(["non-existent-id"])).toThrow("Slot non-existent-id not found");
    });

    it("throws when no slot IDs provided", () => {
      expect(() => store.adminDeleteSlots([])).toThrow("At least one slot ID is required");
    });
  });
});
