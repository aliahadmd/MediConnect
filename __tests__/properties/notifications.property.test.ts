// Feature: mediconnect-virtual-clinic, Property 12: State-changing actions create notifications
// **Validates: Requirements 3.4, 4.4, 8.4**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "rejected"
  | "completed"
  | "cancelled";

type NotificationType =
  | "appointment_booked"
  | "appointment_confirmed"
  | "appointment_rejected"
  | "appointment_cancelled"
  | "prescription_ready";

interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
}

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  status: AppointmentStatus;
}

interface Prescription {
  id: string;
  appointmentId: string;
  patientId: string;
}

// ---------------------------------------------------------------------------
// In-memory NotificationStore
// ---------------------------------------------------------------------------

class NotificationStore {
  private appointments = new Map<string, Appointment>();
  private notificationsList: Notification[] = [];
  private nextApptId = 1;
  private nextNotifId = 1;
  private nextRxId = 1;

  /**
   * Book an appointment — creates a pending appointment and notifies the patient.
   * Mirrors POST /api/appointments
   */
  bookAppointment(patientId: string, doctorId: string): Appointment {
    const id = `appt_${this.nextApptId++}`;
    const appt: Appointment = { id, patientId, doctorId, status: "pending" };
    this.appointments.set(id, appt);

    this.notificationsList.push({
      id: `notif_${this.nextNotifId++}`,
      userId: patientId,
      type: "appointment_booked",
      message: "Your appointment has been booked.",
    });

    return appt;
  }

  /**
   * Accept an appointment — sets status to confirmed and notifies the patient.
   * Mirrors PATCH /api/appointments/[id] { action: "accept" }
   */
  acceptAppointment(
    appointmentId: string
  ): { success: true } | { success: false; error: string } {
    const appt = this.appointments.get(appointmentId);
    if (!appt) return { success: false, error: "Not found" };
    if (appt.status !== "pending")
      return { success: false, error: "Not pending" };

    appt.status = "confirmed";

    this.notificationsList.push({
      id: `notif_${this.nextNotifId++}`,
      userId: appt.patientId,
      type: "appointment_confirmed",
      message: "Your appointment has been confirmed.",
    });

    return { success: true };
  }

  /**
   * Reject an appointment — sets status to rejected and notifies the patient.
   * Mirrors PATCH /api/appointments/[id] { action: "reject" }
   */
  rejectAppointment(
    appointmentId: string
  ): { success: true } | { success: false; error: string } {
    const appt = this.appointments.get(appointmentId);
    if (!appt) return { success: false, error: "Not found" };
    if (appt.status !== "pending")
      return { success: false, error: "Not pending" };

    appt.status = "rejected";

    this.notificationsList.push({
      id: `notif_${this.nextNotifId++}`,
      userId: appt.patientId,
      type: "appointment_rejected",
      message: "Your appointment has been rejected.",
    });

    return { success: true };
  }

  /**
   * Cancel an appointment — sets status to cancelled and notifies both patient and doctor.
   * Mirrors PATCH /api/admin/appointments { action: "cancel" }
   */
  cancelAppointment(
    appointmentId: string
  ): { success: true } | { success: false; error: string } {
    const appt = this.appointments.get(appointmentId);
    if (!appt) return { success: false, error: "Not found" };
    if (appt.status !== "pending" && appt.status !== "confirmed")
      return { success: false, error: "Not cancellable" };

    appt.status = "cancelled";

    this.notificationsList.push({
      id: `notif_${this.nextNotifId++}`,
      userId: appt.patientId,
      type: "appointment_cancelled",
      message: "Your appointment has been cancelled.",
    });
    this.notificationsList.push({
      id: `notif_${this.nextNotifId++}`,
      userId: appt.doctorId,
      type: "appointment_cancelled",
      message: "An appointment has been cancelled.",
    });

    return { success: true };
  }

  /**
   * Create a prescription — notifies the patient that a prescription is ready.
   * Mirrors POST /api/prescriptions
   */
  createPrescription(appointmentId: string, patientId: string): Prescription {
    const id = `rx_${this.nextRxId++}`;
    const rx: Prescription = { id, appointmentId, patientId };

    this.notificationsList.push({
      id: `notif_${this.nextNotifId++}`,
      userId: patientId,
      type: "prescription_ready",
      message: "A new prescription is available for you.",
    });

    return rx;
  }

  getNotifications(): Notification[] {
    return [...this.notificationsList];
  }

  getNotificationsForUser(userId: string): Notification[] {
    return this.notificationsList.filter((n) => n.userId === userId);
  }

  getAppointment(id: string): Appointment | null {
    return this.appointments.get(id) ?? null;
  }
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

function userIdArb(): fc.Arbitrary<string> {
  return fc.integer({ min: 1, max: 1000 }).map((n) => `user_${n}`);
}

// ---------------------------------------------------------------------------
// Property 12: State-changing actions create notifications
// ---------------------------------------------------------------------------

// Feature: mediconnect-virtual-clinic, Property 12: State-changing actions create notifications
// **Validates: Requirements 3.4, 4.4, 8.4**
describe("Property 12: State-changing actions create notifications", () => {
  it("booking creates exactly 1 notification to the patient with type appointment_booked", () => {
    fc.assert(
      fc.property(userIdArb(), userIdArb(), (patientId, doctorId) => {
        const store = new NotificationStore();
        store.bookAppointment(patientId, doctorId);

        const all = store.getNotifications();
        expect(all).toHaveLength(1);
        expect(all[0].userId).toBe(patientId);
        expect(all[0].type).toBe("appointment_booked");
      }),
      { numRuns: 300 }
    );
  });

  it("accept creates exactly 1 notification to the patient with type appointment_confirmed", () => {
    fc.assert(
      fc.property(userIdArb(), userIdArb(), (patientId, doctorId) => {
        const store = new NotificationStore();
        const appt = store.bookAppointment(patientId, doctorId);

        const beforeCount = store.getNotifications().length;
        const result = store.acceptAppointment(appt.id);
        expect(result.success).toBe(true);

        const all = store.getNotifications();
        expect(all).toHaveLength(beforeCount + 1);

        const acceptNotif = all[all.length - 1];
        expect(acceptNotif.userId).toBe(patientId);
        expect(acceptNotif.type).toBe("appointment_confirmed");
      }),
      { numRuns: 300 }
    );
  });

  it("reject creates exactly 1 notification to the patient with type appointment_rejected", () => {
    fc.assert(
      fc.property(userIdArb(), userIdArb(), (patientId, doctorId) => {
        const store = new NotificationStore();
        const appt = store.bookAppointment(patientId, doctorId);

        const beforeCount = store.getNotifications().length;
        const result = store.rejectAppointment(appt.id);
        expect(result.success).toBe(true);

        const all = store.getNotifications();
        expect(all).toHaveLength(beforeCount + 1);

        const rejectNotif = all[all.length - 1];
        expect(rejectNotif.userId).toBe(patientId);
        expect(rejectNotif.type).toBe("appointment_rejected");
      }),
      { numRuns: 300 }
    );
  });

  it("cancel creates exactly 2 notifications — one to patient and one to doctor, both with type appointment_cancelled", () => {
    fc.assert(
      fc.property(userIdArb(), userIdArb(), (patientId, doctorId) => {
        const store = new NotificationStore();
        const appt = store.bookAppointment(patientId, doctorId);

        const beforeCount = store.getNotifications().length;
        const result = store.cancelAppointment(appt.id);
        expect(result.success).toBe(true);

        const all = store.getNotifications();
        expect(all).toHaveLength(beforeCount + 2);

        // Last two notifications should be the cancel notifications
        const cancelNotifs = all.slice(-2);

        // Both should be appointment_cancelled type
        for (const n of cancelNotifs) {
          expect(n.type).toBe("appointment_cancelled");
        }

        // One should be for the patient, one for the doctor
        const recipientIds = new Set(cancelNotifs.map((n) => n.userId));
        expect(recipientIds.has(patientId)).toBe(true);
        expect(recipientIds.has(doctorId)).toBe(true);
      }),
      { numRuns: 300 }
    );
  });

  it("prescription creation creates exactly 1 notification to the patient with type prescription_ready", () => {
    fc.assert(
      fc.property(userIdArb(), userIdArb(), (patientId, doctorId) => {
        const store = new NotificationStore();
        const appt = store.bookAppointment(patientId, doctorId);

        const beforeCount = store.getNotifications().length;
        store.createPrescription(appt.id, patientId);

        const all = store.getNotifications();
        expect(all).toHaveLength(beforeCount + 1);

        const rxNotif = all[all.length - 1];
        expect(rxNotif.userId).toBe(patientId);
        expect(rxNotif.type).toBe("prescription_ready");
      }),
      { numRuns: 300 }
    );
  });

  it("each action produces the correct cumulative notification count across a sequence of actions", () => {
    fc.assert(
      fc.property(
        // Use uniqueArray to ensure distinct patient IDs
        fc.tuple(userIdArb(), userIdArb()).filter(([a, b]) => a !== b),
        userIdArb(),
        ([patient1, patient2], doctorId) => {
          const store = new NotificationStore();

          // Book two appointments: +1 each = 2 total
          const appt1 = store.bookAppointment(patient1, doctorId);
          const appt2 = store.bookAppointment(patient2, doctorId);
          expect(store.getNotifications()).toHaveLength(2);

          // Accept first: +1 = 3 total
          store.acceptAppointment(appt1.id);
          expect(store.getNotifications()).toHaveLength(3);

          // Reject second: +1 = 4 total
          store.rejectAppointment(appt2.id);
          expect(store.getNotifications()).toHaveLength(4);

          // Patient1 should have: booked + confirmed = 2
          const p1Notifs = store.getNotificationsForUser(patient1);
          expect(p1Notifs).toHaveLength(2);
          expect(p1Notifs.map((n) => n.type)).toContain("appointment_booked");
          expect(p1Notifs.map((n) => n.type)).toContain(
            "appointment_confirmed"
          );

          // Patient2 should have: booked + rejected = 2
          const p2Notifs = store.getNotificationsForUser(patient2);
          expect(p2Notifs).toHaveLength(2);
          expect(p2Notifs.map((n) => n.type)).toContain("appointment_booked");
          expect(p2Notifs.map((n) => n.type)).toContain(
            "appointment_rejected"
          );
        }
      ),
      { numRuns: 200 }
    );
  });
});
