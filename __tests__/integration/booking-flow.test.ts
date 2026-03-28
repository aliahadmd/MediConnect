/**
 * Integration test: Full Booking Flow
 *
 * Simulates the complete booking lifecycle using an in-memory store:
 *   register patient + doctor → doctor creates availability slot →
 *   patient books slot → doctor accepts → verify appointment is "confirmed"
 *
 * Also tests the rejection path:
 *   doctor rejects → verify appointment is "rejected", slot is released
 *
 * Validates: Requirements 3.2, 4.2
 */

import { describe, it, expect, beforeEach } from "vitest";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// In-memory store combining user, slot, and appointment logic
// ---------------------------------------------------------------------------

type Role = "patient" | "doctor" | "admin";
type AppointmentStatus = "pending" | "confirmed" | "rejected" | "completed" | "cancelled";

interface User {
  id: string;
  name: string;
  email: string;
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
  scheduledAt: Date;
}

interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
}

class InMemoryClinicStore {
  users: User[] = [];
  slots: AvailabilitySlot[] = [];
  appointments: Appointment[] = [];
  notifications: Notification[] = [];

  registerUser(name: string, email: string, role: Role): User {
    const user: User = { id: randomUUID(), name, email, role };
    this.users.push(user);
    return user;
  }

  createSlot(doctorId: string, date: string, startTime: string, endTime: string): AvailabilitySlot {
    const doctor = this.users.find((u) => u.id === doctorId && u.role === "doctor");
    if (!doctor) throw new Error("Doctor not found");

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

  getAvailableSlots(doctorId: string): AvailabilitySlot[] {
    return this.slots.filter((s) => s.doctorId === doctorId && !s.isBooked);
  }

  bookAppointment(patientId: string, slotId: string): Appointment {
    const patient = this.users.find((u) => u.id === patientId && u.role === "patient");
    if (!patient) throw new Error("Patient not found");

    const slot = this.slots.find((s) => s.id === slotId);
    if (!slot) throw new Error("Slot not found");
    if (slot.isBooked) throw new Error("Slot already booked");

    // Atomic: mark slot as booked + create appointment
    slot.isBooked = true;

    const [h, m] = slot.startTime.split(":").map(Number);
    const scheduledAt = new Date(slot.date);
    scheduledAt.setHours(h, m, 0, 0);

    const appointment: Appointment = {
      id: randomUUID(),
      patientId,
      doctorId: slot.doctorId,
      slotId: slot.id,
      status: "pending",
      scheduledAt,
    };
    this.appointments.push(appointment);

    this.notifications.push({
      id: randomUUID(),
      userId: patientId,
      type: "appointment_booked",
      message: `Appointment booked for ${slot.date} at ${slot.startTime}`,
    });

    return appointment;
  }

  acceptAppointment(appointmentId: string, doctorId: string): Appointment {
    const appt = this.appointments.find((a) => a.id === appointmentId && a.doctorId === doctorId);
    if (!appt) throw new Error("Appointment not found");
    if (appt.status !== "pending") throw new Error("Can only accept pending appointments");

    appt.status = "confirmed";

    this.notifications.push({
      id: randomUUID(),
      userId: appt.patientId,
      type: "appointment_confirmed",
      message: "Your appointment has been confirmed",
    });

    return appt;
  }

  rejectAppointment(appointmentId: string, doctorId: string): Appointment {
    const appt = this.appointments.find((a) => a.id === appointmentId && a.doctorId === doctorId);
    if (!appt) throw new Error("Appointment not found");
    if (appt.status !== "pending") throw new Error("Can only reject pending appointments");

    appt.status = "rejected";

    // Release the slot
    const slot = this.slots.find((s) => s.id === appt.slotId);
    if (slot) slot.isBooked = false;

    this.notifications.push({
      id: randomUUID(),
      userId: appt.patientId,
      type: "appointment_rejected",
      message: "Your appointment has been rejected",
    });

    return appt;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Booking Flow Integration", () => {
  let store: InMemoryClinicStore;
  let patient: User;
  let doctor: User;

  beforeEach(() => {
    store = new InMemoryClinicStore();
    patient = store.registerUser("Jane Doe", "jane@example.com", "patient");
    doctor = store.registerUser("Dr. Smith", "smith@example.com", "doctor");
  });

  describe("Happy path: book → accept → confirmed", () => {
    it("completes the full booking flow with correct statuses", () => {
      // Doctor creates an availability slot
      const slot = store.createSlot(doctor.id, "2025-08-20", "09:00", "09:30");
      expect(slot.isBooked).toBe(false);

      // Patient sees the slot as available
      const available = store.getAvailableSlots(doctor.id);
      expect(available).toHaveLength(1);
      expect(available[0].id).toBe(slot.id);

      // Patient books the slot
      const appointment = store.bookAppointment(patient.id, slot.id);
      expect(appointment.status).toBe("pending");
      expect(appointment.patientId).toBe(patient.id);
      expect(appointment.doctorId).toBe(doctor.id);
      expect(appointment.slotId).toBe(slot.id);

      // Slot is now booked
      const afterBook = store.getAvailableSlots(doctor.id);
      expect(afterBook).toHaveLength(0);

      // Doctor accepts the appointment
      const accepted = store.acceptAppointment(appointment.id, doctor.id);
      expect(accepted.status).toBe("confirmed");

      // Slot remains booked after acceptance
      const slotAfterAccept = store.slots.find((s) => s.id === slot.id)!;
      expect(slotAfterAccept.isBooked).toBe(true);

      // Patient received notifications
      const patientNotifs = store.notifications.filter((n) => n.userId === patient.id);
      expect(patientNotifs).toHaveLength(2);
      expect(patientNotifs[0].type).toBe("appointment_booked");
      expect(patientNotifs[1].type).toBe("appointment_confirmed");
    });
  });

  describe("Rejection path: book → reject → slot released", () => {
    it("rejects appointment and releases the slot", () => {
      const slot = store.createSlot(doctor.id, "2025-08-21", "14:00", "14:30");

      // Patient books
      const appointment = store.bookAppointment(patient.id, slot.id);
      expect(appointment.status).toBe("pending");
      expect(store.getAvailableSlots(doctor.id)).toHaveLength(0);

      // Doctor rejects
      const rejected = store.rejectAppointment(appointment.id, doctor.id);
      expect(rejected.status).toBe("rejected");

      // Slot is released back to available
      const available = store.getAvailableSlots(doctor.id);
      expect(available).toHaveLength(1);
      expect(available[0].id).toBe(slot.id);
      expect(available[0].isBooked).toBe(false);

      // Patient received rejection notification
      const patientNotifs = store.notifications.filter((n) => n.userId === patient.id);
      expect(patientNotifs.some((n) => n.type === "appointment_rejected")).toBe(true);
    });
  });

  describe("Double-booking prevention", () => {
    it("rejects booking an already-booked slot", () => {
      const slot = store.createSlot(doctor.id, "2025-08-22", "10:00", "10:30");
      const patient2 = store.registerUser("Bob", "bob@example.com", "patient");

      // First patient books successfully
      store.bookAppointment(patient.id, slot.id);

      // Second patient tries to book the same slot
      expect(() => store.bookAppointment(patient2.id, slot.id)).toThrow("Slot already booked");

      // Only one appointment exists
      expect(store.appointments).toHaveLength(1);
      expect(store.appointments[0].patientId).toBe(patient.id);
    });
  });

  describe("Multiple slots and appointments", () => {
    it("handles multiple slots with independent booking states", () => {
      const slot1 = store.createSlot(doctor.id, "2025-08-23", "09:00", "09:30");
      const slot2 = store.createSlot(doctor.id, "2025-08-23", "10:00", "10:30");
      const slot3 = store.createSlot(doctor.id, "2025-08-23", "11:00", "11:30");

      // Book slot1 and slot3
      const appt1 = store.bookAppointment(patient.id, slot1.id);
      const patient2 = store.registerUser("Alice", "alice@example.com", "patient");
      const appt2 = store.bookAppointment(patient2.id, slot3.id);

      // Only slot2 remains available
      const available = store.getAvailableSlots(doctor.id);
      expect(available).toHaveLength(1);
      expect(available[0].id).toBe(slot2.id);

      // Accept one, reject the other
      store.acceptAppointment(appt1.id, doctor.id);
      store.rejectAppointment(appt2.id, doctor.id);

      // slot1 stays booked, slot3 is released
      expect(store.slots.find((s) => s.id === slot1.id)!.isBooked).toBe(true);
      expect(store.slots.find((s) => s.id === slot3.id)!.isBooked).toBe(false);

      // Now slot2 and slot3 are available
      expect(store.getAvailableSlots(doctor.id)).toHaveLength(2);
    });
  });
});
