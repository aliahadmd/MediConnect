/**
 * Integration test: SSE Notification Flow
 *
 * Simulates the SSE notification delivery lifecycle using in-memory stores:
 *   register SSE connection → book appointment → notification created →
 *   SSE delivers to connected client → bell count updates
 *
 * Uses the actual SSEEventEmitter from lib/sse.ts
 *
 * Validates: Requirements 4.2, 5.1
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { randomUUID } from "crypto";
import { SSEEventEmitter } from "@/lib/sse";

// ---------------------------------------------------------------------------
// In-memory store combining booking + notification + SSE logic
// ---------------------------------------------------------------------------

type Role = "patient" | "doctor";
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
  read: boolean;
}

class InMemorySSENotificationStore {
  users: User[] = [];
  slots: AvailabilitySlot[] = [];
  appointments: Appointment[] = [];
  notifications: Notification[] = [];
  sseEmitter: SSEEventEmitter;

  constructor() {
    this.sseEmitter = new SSEEventEmitter();
  }

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

  /**
   * Simulates booking an appointment: creates appointment, creates notification,
   * and emits via SSE — mirroring the real createNotification + sseEmitter.emit flow.
   */
  bookAppointment(patientId: string, slotId: string): Appointment {
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

    // Create notification for doctor (mirrors lib/notifications.ts createNotification)
    const notification = this.createNotification(
      slot.doctorId,
      "appointment_booked",
      `New appointment booked for ${slot.date} at ${slot.startTime}`
    );

    return appointment;
  }

  acceptAppointment(appointmentId: string, doctorId: string): Appointment {
    const appt = this.appointments.find((a) => a.id === appointmentId && a.doctorId === doctorId);
    if (!appt) throw new Error("Appointment not found");

    appt.status = "confirmed";
    this.createNotification(appt.patientId, "appointment_confirmed", "Your appointment has been confirmed");
    return appt;
  }

  rejectAppointment(appointmentId: string, doctorId: string): Appointment {
    const appt = this.appointments.find((a) => a.id === appointmentId && a.doctorId === doctorId);
    if (!appt) throw new Error("Appointment not found");

    appt.status = "rejected";
    this.createNotification(appt.patientId, "appointment_rejected", "Your appointment has been rejected");
    return appt;
  }

  /**
   * Mirrors the real createNotification: insert into store + emit via SSE.
   */
  createNotification(userId: string, type: string, message: string): Notification {
    const notification: Notification = {
      id: randomUUID(),
      userId,
      type,
      message,
      read: false,
    };
    this.notifications.push(notification);

    // Push to active SSE connections (mirrors sseEmitter.emit in lib/notifications.ts)
    this.sseEmitter.emit(userId, notification);

    return notification;
  }

  getUnreadCount(userId: string): number {
    return this.notifications.filter((n) => n.userId === userId && !n.read).length;
  }
}

// ---------------------------------------------------------------------------
// Helper: create a mock SSE controller that captures messages
// ---------------------------------------------------------------------------

function createMockController() {
  const messages: string[] = [];
  const controller = {
    enqueue: vi.fn((chunk: Uint8Array) => {
      messages.push(new TextDecoder().decode(chunk));
    }),
  } as unknown as ReadableStreamDefaultController;
  return { controller, messages };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SSE Notification Flow Integration", () => {
  let store: InMemorySSENotificationStore;
  let patient: User;
  let doctor: User;

  beforeEach(() => {
    store = new InMemorySSENotificationStore();
    patient = store.registerUser("Jane Doe", "patient");
    doctor = store.registerUser("Dr. Smith", "doctor");
  });

  describe("SSE connection and notification delivery on booking", () => {
    it("delivers notification to doctor via SSE when patient books", () => {
      // Doctor opens the app — SSE connection established
      const doctorSSE = createMockController();
      store.sseEmitter.register(doctor.id, doctorSSE.controller);
      expect(store.sseEmitter.getConnectionCount(doctor.id)).toBe(1);

      // Doctor creates a slot
      const slot = store.createSlot(doctor.id, "2025-09-01", "09:00", "09:30");

      // Patient books the slot — triggers notification + SSE emit
      store.bookAppointment(patient.id, slot.id);

      // Doctor's SSE connection received the notification
      expect(doctorSSE.messages).toHaveLength(1);
      const delivered = JSON.parse(doctorSSE.messages[0].replace("data: ", "").trim());
      expect(delivered.type).toBe("appointment_booked");
      expect(delivered.userId).toBe(doctor.id);

      // Doctor's unread count is 1
      expect(store.getUnreadCount(doctor.id)).toBe(1);
    });
  });

  describe("SSE delivers to multiple tabs", () => {
    it("delivers notification to all of a user's SSE connections", () => {
      const tab1 = createMockController();
      const tab2 = createMockController();
      store.sseEmitter.register(doctor.id, tab1.controller);
      store.sseEmitter.register(doctor.id, tab2.controller);

      const slot = store.createSlot(doctor.id, "2025-09-02", "10:00", "10:30");
      store.bookAppointment(patient.id, slot.id);

      // Both tabs received the notification
      expect(tab1.messages).toHaveLength(1);
      expect(tab2.messages).toHaveLength(1);
    });
  });

  describe("SSE isolation between users", () => {
    it("does not deliver doctor notification to patient SSE", () => {
      const doctorSSE = createMockController();
      const patientSSE = createMockController();
      store.sseEmitter.register(doctor.id, doctorSSE.controller);
      store.sseEmitter.register(patient.id, patientSSE.controller);

      const slot = store.createSlot(doctor.id, "2025-09-03", "11:00", "11:30");
      store.bookAppointment(patient.id, slot.id);

      // Doctor received the booking notification
      expect(doctorSSE.messages).toHaveLength(1);
      // Patient did NOT receive the doctor's notification
      expect(patientSSE.messages).toHaveLength(0);
    });
  });

  describe("Notification bell real-time update on accept/reject", () => {
    it("patient receives SSE notification when doctor accepts", () => {
      const patientSSE = createMockController();
      store.sseEmitter.register(patient.id, patientSSE.controller);

      const slot = store.createSlot(doctor.id, "2025-09-04", "14:00", "14:30");
      const appointment = store.bookAppointment(patient.id, slot.id);

      // Patient SSE should have 0 messages (booking notifies doctor, not patient)
      expect(patientSSE.messages).toHaveLength(0);

      // Doctor accepts
      store.acceptAppointment(appointment.id, doctor.id);

      // Patient now receives the confirmation via SSE
      expect(patientSSE.messages).toHaveLength(1);
      const delivered = JSON.parse(patientSSE.messages[0].replace("data: ", "").trim());
      expect(delivered.type).toBe("appointment_confirmed");
      expect(store.getUnreadCount(patient.id)).toBe(1);
    });

    it("patient receives SSE notification when doctor rejects", () => {
      const patientSSE = createMockController();
      store.sseEmitter.register(patient.id, patientSSE.controller);

      const slot = store.createSlot(doctor.id, "2025-09-05", "15:00", "15:30");
      const appointment = store.bookAppointment(patient.id, slot.id);

      store.rejectAppointment(appointment.id, doctor.id);

      expect(patientSSE.messages).toHaveLength(1);
      const delivered = JSON.parse(patientSSE.messages[0].replace("data: ", "").trim());
      expect(delivered.type).toBe("appointment_rejected");
    });
  });

  describe("No SSE connection — notifications still stored", () => {
    it("creates notifications even when no SSE connection is active", () => {
      const slot = store.createSlot(doctor.id, "2025-09-06", "16:00", "16:30");
      store.bookAppointment(patient.id, slot.id);

      // Notification was created in the store
      expect(store.getUnreadCount(doctor.id)).toBe(1);
      // No SSE connections — emit is a no-op but doesn't throw
      expect(store.sseEmitter.getConnectionCount(doctor.id)).toBe(0);
    });
  });

  describe("Stale SSE connection cleanup", () => {
    it("removes stale connections on emit failure and still delivers to healthy ones", () => {
      const healthySSE = createMockController();
      const staleController = {
        enqueue: vi.fn(() => { throw new Error("Controller closed"); }),
      } as unknown as ReadableStreamDefaultController;

      store.sseEmitter.register(doctor.id, healthySSE.controller);
      store.sseEmitter.register(doctor.id, staleController);
      expect(store.sseEmitter.getConnectionCount(doctor.id)).toBe(2);

      const slot = store.createSlot(doctor.id, "2025-09-07", "08:00", "08:30");
      store.bookAppointment(patient.id, slot.id);

      // Healthy connection received the message
      expect(healthySSE.messages).toHaveLength(1);
      // Stale connection was cleaned up
      expect(store.sseEmitter.getConnectionCount(doctor.id)).toBe(1);
    });
  });
});
