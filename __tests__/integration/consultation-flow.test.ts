/**
 * Integration test: Consultation Lifecycle
 *
 * Simulates the full consultation flow:
 *   confirmed appointment → check join eligibility → generate room name →
 *   save notes → end call → verify status is "completed"
 *
 * Uses the actual `getRoomName` and `isWithinJoinWindow` functions from lib/livekit.ts
 *
 * Validates: Requirements 5.2, 8.2
 */

import { describe, it, expect, beforeEach } from "vitest";
import { randomUUID } from "crypto";
import { getRoomName, isWithinJoinWindow } from "@/lib/livekit";

// ---------------------------------------------------------------------------
// In-memory store for consultation lifecycle
// ---------------------------------------------------------------------------

type AppointmentStatus = "pending" | "confirmed" | "rejected" | "completed" | "cancelled";

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  status: AppointmentStatus;
  scheduledAt: Date;
}

interface VisitNote {
  appointmentId: string;
  content: string;
  updatedAt: Date;
}

class InMemoryConsultationStore {
  appointments: Appointment[] = [];
  notes: VisitNote[] = [];

  createConfirmedAppointment(
    patientId: string,
    doctorId: string,
    scheduledAt: Date
  ): Appointment {
    const appt: Appointment = {
      id: randomUUID(),
      patientId,
      doctorId,
      status: "confirmed",
      scheduledAt,
    };
    this.appointments.push(appt);
    return appt;
  }

  canJoin(appointmentId: string, now: Date): boolean {
    const appt = this.appointments.find((a) => a.id === appointmentId);
    if (!appt) return false;
    if (appt.status !== "confirmed") return false;
    return isWithinJoinWindow(appt.scheduledAt, now);
  }

  generateRoomName(appointmentId: string): string {
    return getRoomName(appointmentId);
  }

  saveNotes(appointmentId: string, content: string): VisitNote {
    const appt = this.appointments.find((a) => a.id === appointmentId);
    if (!appt) throw new Error("Appointment not found");

    const existing = this.notes.find((n) => n.appointmentId === appointmentId);
    if (existing) {
      existing.content = content;
      existing.updatedAt = new Date();
      return existing;
    }

    const note: VisitNote = {
      appointmentId,
      content,
      updatedAt: new Date(),
    };
    this.notes.push(note);
    return note;
  }

  getNotes(appointmentId: string): VisitNote | undefined {
    return this.notes.find((n) => n.appointmentId === appointmentId);
  }

  endCall(appointmentId: string): Appointment {
    const appt = this.appointments.find((a) => a.id === appointmentId);
    if (!appt) throw new Error("Appointment not found");
    if (appt.status !== "confirmed") throw new Error("Can only end confirmed appointments");

    appt.status = "completed";
    return appt;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Consultation Flow Integration", () => {
  let store: InMemoryConsultationStore;
  const patientId = randomUUID();
  const doctorId = randomUUID();

  beforeEach(() => {
    store = new InMemoryConsultationStore();
  });

  describe("Full consultation lifecycle", () => {
    it("confirmed → join check → room name → notes → end call → completed", () => {
      // Schedule appointment for a known time
      const scheduledAt = new Date("2025-08-20T10:00:00Z");
      const appointment = store.createConfirmedAppointment(patientId, doctorId, scheduledAt);

      expect(appointment.status).toBe("confirmed");

      // Check join eligibility — within window (2 min before)
      const withinWindow = new Date("2025-08-20T09:58:00Z");
      expect(store.canJoin(appointment.id, withinWindow)).toBe(true);

      // Check join eligibility — too early (10 min before)
      const tooEarly = new Date("2025-08-20T09:50:00Z");
      expect(store.canJoin(appointment.id, tooEarly)).toBe(false);

      // Generate room name — uses actual getRoomName
      const roomName = store.generateRoomName(appointment.id);
      expect(roomName).toBe(`consultation-${appointment.id}`);

      // Save notes during the call (simulating auto-save)
      store.saveNotes(appointment.id, "Patient reports headache for 3 days.");
      store.saveNotes(appointment.id, "Patient reports headache for 3 days. Prescribed ibuprofen.");

      // Verify notes are updated (not duplicated)
      const notes = store.getNotes(appointment.id);
      expect(notes).toBeDefined();
      expect(notes!.content).toBe("Patient reports headache for 3 days. Prescribed ibuprofen.");

      // End the call
      const completed = store.endCall(appointment.id);
      expect(completed.status).toBe("completed");

      // After completion, join should be denied (status is no longer "confirmed")
      const afterEnd = new Date("2025-08-20T10:05:00Z");
      expect(store.canJoin(appointment.id, afterEnd)).toBe(false);
    });
  });

  describe("Join eligibility edge cases", () => {
    it("denies join for non-confirmed appointment", () => {
      const appt = store.createConfirmedAppointment(patientId, doctorId, new Date("2025-08-20T10:00:00Z"));
      // Manually set to pending to test
      appt.status = "pending";

      const now = new Date("2025-08-20T10:00:00Z");
      expect(store.canJoin(appt.id, now)).toBe(false);
    });

    it("denies join for non-existent appointment", () => {
      expect(store.canJoin("non-existent-id", new Date())).toBe(false);
    });

    it("allows join at exact boundary: 5 min before", () => {
      const scheduledAt = new Date("2025-08-20T10:00:00Z");
      const appt = store.createConfirmedAppointment(patientId, doctorId, scheduledAt);
      const fiveMinBefore = new Date("2025-08-20T09:55:00Z");
      expect(store.canJoin(appt.id, fiveMinBefore)).toBe(true);
    });

    it("allows join at exact boundary: 30 min after", () => {
      const scheduledAt = new Date("2025-08-20T10:00:00Z");
      const appt = store.createConfirmedAppointment(patientId, doctorId, scheduledAt);
      const thirtyMinAfter = new Date("2025-08-20T10:30:00Z");
      expect(store.canJoin(appt.id, thirtyMinAfter)).toBe(true);
    });
  });

  describe("Room name uniqueness", () => {
    it("generates unique room names for different appointments", () => {
      const appt1 = store.createConfirmedAppointment(patientId, doctorId, new Date("2025-08-20T10:00:00Z"));
      const appt2 = store.createConfirmedAppointment(patientId, doctorId, new Date("2025-08-20T11:00:00Z"));

      const room1 = store.generateRoomName(appt1.id);
      const room2 = store.generateRoomName(appt2.id);

      expect(room1).not.toBe(room2);
      expect(room1).toContain(appt1.id);
      expect(room2).toContain(appt2.id);
    });
  });

  describe("Notes save/retrieve round-trip", () => {
    it("saves and retrieves notes correctly", () => {
      const appt = store.createConfirmedAppointment(patientId, doctorId, new Date("2025-08-20T10:00:00Z"));

      store.saveNotes(appt.id, "Initial observation");
      expect(store.getNotes(appt.id)!.content).toBe("Initial observation");

      // Update notes
      store.saveNotes(appt.id, "Updated with diagnosis");
      expect(store.getNotes(appt.id)!.content).toBe("Updated with diagnosis");
    });

    it("returns undefined for appointment with no notes", () => {
      const appt = store.createConfirmedAppointment(patientId, doctorId, new Date("2025-08-20T10:00:00Z"));
      expect(store.getNotes(appt.id)).toBeUndefined();
    });

    it("throws when saving notes for non-existent appointment", () => {
      expect(() => store.saveNotes("bad-id", "content")).toThrow("Appointment not found");
    });
  });

  describe("End call constraints", () => {
    it("throws when ending a non-confirmed appointment", () => {
      const appt = store.createConfirmedAppointment(patientId, doctorId, new Date("2025-08-20T10:00:00Z"));
      store.endCall(appt.id); // now completed
      expect(() => store.endCall(appt.id)).toThrow("Can only end confirmed appointments");
    });

    it("throws when ending a non-existent appointment", () => {
      expect(() => store.endCall("bad-id")).toThrow("Appointment not found");
    });
  });
});
