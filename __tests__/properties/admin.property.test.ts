// Feature: mediconnect-virtual-clinic, Property 24: Admin user search filtering
// Feature: mediconnect-virtual-clinic, Property 25: User activate/deactivate round-trip
// Feature: mediconnect-virtual-clinic, Property 26: Admin appointment status filtering
// Feature: mediconnect-virtual-clinic, Property 27: Admin cancel appointment transitions state and notifies
// **Validates: Requirements 10.2, 10.3, 10.4, 11.1, 11.3**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Role = "patient" | "doctor" | "admin";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// In-memory AdminUserStore
// ---------------------------------------------------------------------------

class AdminUserStore {
  private users = new Map<string, User>();
  private nextId = 1;

  createUser(name: string, email: string, role: Role): User {
    const id = `user_${this.nextId++}`;
    const user: User = { id, name, email, role, isActive: true };
    this.users.set(id, user);
    return user;
  }

  /**
   * Search users by name/email (case-insensitive substring) and optional role filter.
   * Mirrors GET /api/admin/users?search=X&role=Y
   */
  searchUsers(search?: string, roleFilter?: Role): User[] {
    return Array.from(this.users.values()).filter((u) => {
      // Role filter
      if (roleFilter && u.role !== roleFilter) return false;

      // Search filter: case-insensitive substring match on name or email
      if (search) {
        const q = search.toLowerCase();
        const nameMatch = u.name.toLowerCase().includes(q);
        const emailMatch = u.email.toLowerCase().includes(q);
        if (!nameMatch && !emailMatch) return false;
      }

      return true;
    });
  }

  /**
   * Deactivate a user — sets isActive to false.
   * Mirrors PATCH /api/admin/users/[id] { action: "deactivate" }
   */
  deactivateUser(userId: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;
    user.isActive = false;
    return true;
  }

  /**
   * Activate a user — sets isActive to true.
   * Mirrors PATCH /api/admin/users/[id] { action: "activate" }
   */
  activateUser(userId: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;
    user.isActive = true;
    return true;
  }

  /**
   * Attempt login — returns the user only if isActive is true.
   * Simulates the auth check that blocks deactivated users.
   */
  attemptLogin(userId: string): User | null {
    const user = this.users.get(userId);
    if (!user || !user.isActive) return null;
    return user;
  }

  getUser(userId: string): User | null {
    return this.users.get(userId) ?? null;
  }
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

function nameArb(): fc.Arbitrary<string> {
  return fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0);
}

function emailArb(): fc.Arbitrary<string> {
  return fc
    .tuple(
      fc.stringMatching(/^[a-z][a-z0-9]{1,10}$/),
      fc.stringMatching(/^[a-z]{2,8}$/),
      fc.constantFrom("com", "org", "net")
    )
    .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);
}

function roleArb(): fc.Arbitrary<Role> {
  return fc.constantFrom("patient", "doctor", "admin");
}

function nonAdminRoleArb(): fc.Arbitrary<Role> {
  return fc.constantFrom("patient", "doctor") as fc.Arbitrary<Role>;
}

function searchQueryArb(): fc.Arbitrary<string> {
  return fc.stringMatching(/^[a-z0-9]{1,6}$/);
}

// ---------------------------------------------------------------------------
// Property 24: Admin user search filtering
// ---------------------------------------------------------------------------

// Feature: mediconnect-virtual-clinic, Property 24: Admin user search filtering
// **Validates: Requirements 10.2**
describe("Property 24: Admin user search filtering", () => {
  it("search + role filter returns only matching users", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(nameArb(), emailArb(), roleArb()),
          { minLength: 1, maxLength: 15 }
        ),
        searchQueryArb(),
        fc.option(roleArb(), { nil: undefined }),
        (userSpecs, searchQuery, roleFilter) => {
          const store = new AdminUserStore();

          const created: User[] = [];
          for (const [name, email, role] of userSpecs) {
            created.push(store.createUser(name, email, role));
          }

          const results = store.searchUsers(searchQuery, roleFilter);

          // Every returned user must match the search query (case-insensitive substring on name or email)
          const q = searchQuery.toLowerCase();
          for (const user of results) {
            const nameMatch = user.name.toLowerCase().includes(q);
            const emailMatch = user.email.toLowerCase().includes(q);
            expect(nameMatch || emailMatch).toBe(true);
          }

          // Every returned user must match the role filter (if provided)
          if (roleFilter) {
            for (const user of results) {
              expect(user.role).toBe(roleFilter);
            }
          }

          // Count must match the expected number of matching users
          const expectedCount = created.filter((u) => {
            if (roleFilter && u.role !== roleFilter) return false;
            const nameMatch = u.name.toLowerCase().includes(q);
            const emailMatch = u.email.toLowerCase().includes(q);
            return nameMatch || emailMatch;
          }).length;
          expect(results).toHaveLength(expectedCount);
        }
      ),
      { numRuns: 300 }
    );
  });

  it("empty search returns all users (optionally filtered by role)", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(nameArb(), emailArb(), roleArb()),
          { minLength: 1, maxLength: 10 }
        ),
        fc.option(roleArb(), { nil: undefined }),
        (userSpecs, roleFilter) => {
          const store = new AdminUserStore();

          const created: User[] = [];
          for (const [name, email, role] of userSpecs) {
            created.push(store.createUser(name, email, role));
          }

          // No search query — should return all (or all matching role)
          const results = store.searchUsers(undefined, roleFilter);

          if (roleFilter) {
            const expectedCount = created.filter((u) => u.role === roleFilter).length;
            expect(results).toHaveLength(expectedCount);
            for (const user of results) {
              expect(user.role).toBe(roleFilter);
            }
          } else {
            expect(results).toHaveLength(created.length);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it("search is case-insensitive", () => {
    fc.assert(
      fc.property(
        nameArb(),
        emailArb(),
        roleArb(),
        (name, email, role) => {
          const store = new AdminUserStore();
          store.createUser(name, email, role);

          // Search with uppercase version of first char of name
          const upperSearch = name.charAt(0).toUpperCase();
          const lowerSearch = name.charAt(0).toLowerCase();

          const upperResults = store.searchUsers(upperSearch);
          const lowerResults = store.searchUsers(lowerSearch);

          // Both should return the same results
          expect(upperResults.length).toBe(lowerResults.length);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 25: User activate/deactivate round-trip
// ---------------------------------------------------------------------------

// Feature: mediconnect-virtual-clinic, Property 25: User activate/deactivate round-trip
// **Validates: Requirements 10.3, 10.4**
describe("Property 25: User activate/deactivate round-trip", () => {
  it("deactivate blocks login, reactivate restores it", () => {
    fc.assert(
      fc.property(
        nameArb(),
        emailArb(),
        nonAdminRoleArb(),
        (name, email, role) => {
          const store = new AdminUserStore();
          const user = store.createUser(name, email, role);

          // Initially active — login should succeed
          expect(store.attemptLogin(user.id)).not.toBeNull();
          expect(store.getUser(user.id)!.isActive).toBe(true);

          // Deactivate — login should be blocked
          const deactivated = store.deactivateUser(user.id);
          expect(deactivated).toBe(true);
          expect(store.getUser(user.id)!.isActive).toBe(false);
          expect(store.attemptLogin(user.id)).toBeNull();

          // Reactivate — login should be restored
          const activated = store.activateUser(user.id);
          expect(activated).toBe(true);
          expect(store.getUser(user.id)!.isActive).toBe(true);
          expect(store.attemptLogin(user.id)).not.toBeNull();
        }
      ),
      { numRuns: 300 }
    );
  });

  it("multiple deactivate/activate cycles maintain consistency", () => {
    fc.assert(
      fc.property(
        nameArb(),
        emailArb(),
        nonAdminRoleArb(),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }),
        (name, email, role, toggles) => {
          const store = new AdminUserStore();
          const user = store.createUser(name, email, role);

          // Apply a sequence of toggles (true = activate, false = deactivate)
          for (const shouldBeActive of toggles) {
            if (shouldBeActive) {
              store.activateUser(user.id);
            } else {
              store.deactivateUser(user.id);
            }

            const currentUser = store.getUser(user.id)!;
            expect(currentUser.isActive).toBe(shouldBeActive);

            const loginResult = store.attemptLogin(user.id);
            if (shouldBeActive) {
              expect(loginResult).not.toBeNull();
            } else {
              expect(loginResult).toBeNull();
            }
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it("deactivating a non-existent user returns false", () => {
    const store = new AdminUserStore();
    expect(store.deactivateUser("nonexistent_id")).toBe(false);
    expect(store.activateUser("nonexistent_id")).toBe(false);
  });
});


// ---------------------------------------------------------------------------
// Appointment Types
// ---------------------------------------------------------------------------

type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "rejected"
  | "completed"
  | "cancelled";

interface AvailabilitySlot {
  id: string;
  doctorId: string;
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

// ---------------------------------------------------------------------------
// In-memory AdminAppointmentStore
// ---------------------------------------------------------------------------

class AdminAppointmentStore {
  private slots = new Map<string, AvailabilitySlot>();
  private appointments = new Map<string, Appointment>();
  private notificationsList: Notification[] = [];
  private nextSlotId = 1;
  private nextApptId = 1;
  private nextNotifId = 1;

  createSlot(doctorId: string): AvailabilitySlot {
    const id = `slot_${this.nextSlotId++}`;
    const slot: AvailabilitySlot = { id, doctorId, isBooked: false };
    this.slots.set(id, slot);
    return slot;
  }

  createAppointment(
    patientId: string,
    doctorId: string,
    slotId: string,
    status: AppointmentStatus,
    scheduledAt: Date
  ): Appointment {
    const id = `appt_${this.nextApptId++}`;
    const slot = this.slots.get(slotId);
    if (slot) slot.isBooked = true;
    const appt: Appointment = {
      id,
      patientId,
      doctorId,
      slotId,
      status,
      scheduledAt,
    };
    this.appointments.set(id, appt);
    return appt;
  }

  /**
   * Filter appointments by status.
   * Mirrors GET /api/admin/appointments?status=X
   */
  filterByStatus(status?: AppointmentStatus): {
    appointments: Appointment[];
    total: number;
  } {
    const all = Array.from(this.appointments.values());
    const filtered = status ? all.filter((a) => a.status === status) : all;
    return { appointments: filtered, total: filtered.length };
  }

  /**
   * Cancel an appointment — only if pending or confirmed.
   * Sets status to "cancelled", releases slot, creates notifications.
   * Mirrors PATCH /api/admin/appointments { action: "cancel" }
   */
  cancelAppointment(
    appointmentId: string
  ): { success: true } | { success: false; error: string } {
    const appt = this.appointments.get(appointmentId);
    if (!appt) return { success: false, error: "Appointment not found" };

    if (appt.status !== "pending" && appt.status !== "confirmed") {
      return {
        success: false,
        error: `Cannot cancel appointment with status "${appt.status}"`,
      };
    }

    // Transition to cancelled
    appt.status = "cancelled";

    // Release the slot
    const slot = this.slots.get(appt.slotId);
    if (slot) slot.isBooked = false;

    // Notify both patient and doctor
    this.notificationsList.push({
      id: `notif_${this.nextNotifId++}`,
      userId: appt.patientId,
      type: "appointment_cancelled",
      message: "Your appointment has been cancelled by an administrator.",
    });
    this.notificationsList.push({
      id: `notif_${this.nextNotifId++}`,
      userId: appt.doctorId,
      type: "appointment_cancelled",
      message: "An appointment has been cancelled by an administrator.",
    });

    return { success: true };
  }

  getAppointment(id: string): Appointment | null {
    return this.appointments.get(id) ?? null;
  }

  getSlot(id: string): AvailabilitySlot | null {
    return this.slots.get(id) ?? null;
  }

  getNotifications(): Notification[] {
    return [...this.notificationsList];
  }

  getNotificationsForUser(userId: string): Notification[] {
    return this.notificationsList.filter((n) => n.userId === userId);
  }
}

// ---------------------------------------------------------------------------
// Appointment Generators
// ---------------------------------------------------------------------------

function appointmentStatusArb(): fc.Arbitrary<AppointmentStatus> {
  return fc.constantFrom(
    "pending",
    "confirmed",
    "rejected",
    "completed",
    "cancelled"
  );
}

function cancellableStatusArb(): fc.Arbitrary<AppointmentStatus> {
  return fc.constantFrom("pending", "confirmed") as fc.Arbitrary<AppointmentStatus>;
}

function scheduledAtArb(): fc.Arbitrary<Date> {
  // Future dates within the next 30 days
  return fc
    .integer({ min: 1, max: 30 })
    .map((days) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      d.setHours(9, 0, 0, 0);
      return d;
    });
}

function userIdArb(): fc.Arbitrary<string> {
  return fc
    .integer({ min: 1, max: 1000 })
    .map((n) => `user_${n}`);
}

// ---------------------------------------------------------------------------
// Property 26: Admin appointment status filtering
// ---------------------------------------------------------------------------

// Feature: mediconnect-virtual-clinic, Property 26: Admin appointment status filtering
// **Validates: Requirements 11.1**
describe("Property 26: Admin appointment status filtering", () => {
  it("status filter returns only matching appointments with correct count", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(userIdArb(), userIdArb(), appointmentStatusArb(), scheduledAtArb()),
          { minLength: 1, maxLength: 20 }
        ),
        appointmentStatusArb(),
        (apptSpecs, filterStatus) => {
          const store = new AdminAppointmentStore();

          const created: Appointment[] = [];
          for (const [patientId, doctorId, status, scheduledAt] of apptSpecs) {
            const slot = store.createSlot(doctorId);
            created.push(
              store.createAppointment(patientId, doctorId, slot.id, status, scheduledAt)
            );
          }

          const result = store.filterByStatus(filterStatus);

          // Every returned appointment must have the filtered status
          for (const appt of result.appointments) {
            expect(appt.status).toBe(filterStatus);
          }

          // Count must match the number of appointments with that status
          const expectedCount = created.filter(
            (a) => a.status === filterStatus
          ).length;
          expect(result.total).toBe(expectedCount);
          expect(result.appointments).toHaveLength(expectedCount);
        }
      ),
      { numRuns: 300 }
    );
  });

  it("no filter returns all appointments", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(userIdArb(), userIdArb(), appointmentStatusArb(), scheduledAtArb()),
          { minLength: 1, maxLength: 15 }
        ),
        (apptSpecs) => {
          const store = new AdminAppointmentStore();

          for (const [patientId, doctorId, status, scheduledAt] of apptSpecs) {
            const slot = store.createSlot(doctorId);
            store.createAppointment(patientId, doctorId, slot.id, status, scheduledAt);
          }

          const result = store.filterByStatus(undefined);

          expect(result.total).toBe(apptSpecs.length);
          expect(result.appointments).toHaveLength(apptSpecs.length);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 27: Admin cancel appointment transitions state and notifies
// ---------------------------------------------------------------------------

// Feature: mediconnect-virtual-clinic, Property 27: Admin cancel appointment transitions state and notifies
// **Validates: Requirements 11.3**
describe("Property 27: Admin cancel appointment transitions state and notifies", () => {
  it("cancel sets status 'cancelled', releases slot, and creates notifications for both patient and doctor", () => {
    fc.assert(
      fc.property(
        userIdArb(),
        userIdArb(),
        cancellableStatusArb(),
        scheduledAtArb(),
        (patientId, doctorId, initialStatus, scheduledAt) => {
          const store = new AdminAppointmentStore();
          const slot = store.createSlot(doctorId);
          const appt = store.createAppointment(
            patientId,
            doctorId,
            slot.id,
            initialStatus,
            scheduledAt
          );

          // Slot should be booked before cancel
          expect(store.getSlot(slot.id)!.isBooked).toBe(true);

          const result = store.cancelAppointment(appt.id);
          expect(result.success).toBe(true);

          // Status must be "cancelled"
          const updated = store.getAppointment(appt.id)!;
          expect(updated.status).toBe("cancelled");

          // Slot must be released
          expect(store.getSlot(slot.id)!.isBooked).toBe(false);

          // Notifications must exist for both patient and doctor
          const patientNotifs = store.getNotificationsForUser(patientId);
          const doctorNotifs = store.getNotificationsForUser(doctorId);

          expect(
            patientNotifs.some((n) => n.type === "appointment_cancelled")
          ).toBe(true);
          expect(
            doctorNotifs.some((n) => n.type === "appointment_cancelled")
          ).toBe(true);
        }
      ),
      { numRuns: 300 }
    );
  });

  it("cancel is rejected for non-cancellable statuses (rejected, completed, cancelled)", () => {
    fc.assert(
      fc.property(
        userIdArb(),
        userIdArb(),
        fc.constantFrom("rejected", "completed", "cancelled") as fc.Arbitrary<AppointmentStatus>,
        scheduledAtArb(),
        (patientId, doctorId, nonCancellableStatus, scheduledAt) => {
          const store = new AdminAppointmentStore();
          const slot = store.createSlot(doctorId);
          const appt = store.createAppointment(
            patientId,
            doctorId,
            slot.id,
            nonCancellableStatus,
            scheduledAt
          );

          const result = store.cancelAppointment(appt.id);
          expect(result.success).toBe(false);

          // Status must remain unchanged
          const unchanged = store.getAppointment(appt.id)!;
          expect(unchanged.status).toBe(nonCancellableStatus);

          // No notifications should have been created
          expect(store.getNotifications()).toHaveLength(0);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("cancel on non-existent appointment returns failure", () => {
    const store = new AdminAppointmentStore();
    const result = store.cancelAppointment("nonexistent_appt");
    expect(result.success).toBe(false);
  });
});


// ---------------------------------------------------------------------------
// Analytics Types & In-memory AnalyticsStore
// ---------------------------------------------------------------------------

interface AnalyticsUser {
  id: string;
  role: Role;
  isActive: boolean;
}

interface AnalyticsAppointment {
  id: string;
  patientId: string;
  doctorId: string;
  status: AppointmentStatus;
  scheduledAt: Date;
}

interface AnalyticsResult {
  totalConsultations: number;
  totalRevenue: number;
  activeDoctors: number;
}

const CONSULTATION_FEE = 50;

class AnalyticsStore {
  private users: AnalyticsUser[] = [];
  private appointments: AnalyticsAppointment[] = [];
  private nextUserId = 1;
  private nextApptId = 1;

  addUser(role: Role, isActive: boolean): AnalyticsUser {
    const user: AnalyticsUser = {
      id: `auser_${this.nextUserId++}`,
      role,
      isActive,
    };
    this.users.push(user);
    return user;
  }

  addAppointment(
    patientId: string,
    doctorId: string,
    status: AppointmentStatus,
    scheduledAt: Date
  ): AnalyticsAppointment {
    const appt: AnalyticsAppointment = {
      id: `aappt_${this.nextApptId++}`,
      patientId,
      doctorId,
      status,
      scheduledAt,
    };
    this.appointments.push(appt);
    return appt;
  }

  /**
   * Compute analytics over all data (no date filter).
   * Mirrors GET /api/admin/analytics
   */
  computeAnalytics(): AnalyticsResult {
    const completedAppointments = this.appointments.filter(
      (a) => a.status === "completed"
    );
    const totalConsultations = completedAppointments.length;
    const totalRevenue = totalConsultations * CONSULTATION_FEE;
    const activeDoctors = this.users.filter(
      (u) => u.role === "doctor" && u.isActive
    ).length;
    return { totalConsultations, totalRevenue, activeDoctors };
  }

  /**
   * Compute analytics filtered to a date range [start, end] (inclusive).
   * Only appointments whose scheduledAt falls within the range are counted.
   * Mirrors GET /api/admin/analytics?from=DATE&to=DATE
   */
  computeAnalyticsInRange(start: Date, end: Date): AnalyticsResult {
    const filtered = this.appointments.filter(
      (a) => a.scheduledAt >= start && a.scheduledAt <= end
    );
    const completedInRange = filtered.filter((a) => a.status === "completed");
    const totalConsultations = completedInRange.length;
    const totalRevenue = totalConsultations * CONSULTATION_FEE;
    const activeDoctors = this.users.filter(
      (u) => u.role === "doctor" && u.isActive
    ).length;
    return { totalConsultations, totalRevenue, activeDoctors };
  }

  /**
   * Return appointments that fall within the date range.
   */
  getAppointmentsInRange(start: Date, end: Date): AnalyticsAppointment[] {
    return this.appointments.filter(
      (a) => a.scheduledAt >= start && a.scheduledAt <= end
    );
  }
}

// ---------------------------------------------------------------------------
// Analytics Generators
// ---------------------------------------------------------------------------

function analyticsDateArb(): fc.Arbitrary<Date> {
  // Dates within a 90-day window starting from a fixed base to keep things deterministic
  return fc.integer({ min: 0, max: 89 }).map((dayOffset) => {
    const base = new Date(2025, 0, 1, 12, 0, 0, 0); // Jan 1 2025 noon
    return new Date(base.getTime() + dayOffset * 24 * 60 * 60 * 1000);
  });
}

function dateRangeArb(): fc.Arbitrary<{ start: Date; end: Date }> {
  return fc
    .tuple(
      fc.integer({ min: 0, max: 89 }),
      fc.integer({ min: 0, max: 89 })
    )
    .map(([a, b]) => {
      const base = new Date(2025, 0, 1, 0, 0, 0, 0);
      const d1 = new Date(base.getTime() + Math.min(a, b) * 24 * 60 * 60 * 1000);
      // End of day for the end date to make the range inclusive of the whole day
      const d2 = new Date(
        base.getTime() + Math.max(a, b) * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000
      );
      return { start: d1, end: d2 };
    });
}

function boolArb(): fc.Arbitrary<boolean> {
  return fc.boolean();
}

// ---------------------------------------------------------------------------
// Property 28: Analytics aggregation correctness
// ---------------------------------------------------------------------------

// Feature: mediconnect-virtual-clinic, Property 28: Analytics aggregation correctness
// **Validates: Requirements 12.1, 12.2, 12.3**
describe("Property 28: Analytics aggregation correctness", () => {
  it("totalConsultations equals count of completed appointments, totalRevenue = totalConsultations * 50, activeDoctors equals count of active doctor users", () => {
    fc.assert(
      fc.property(
        // Generate a mix of users with various roles and active states
        fc.array(
          fc.tuple(roleArb(), boolArb()),
          { minLength: 1, maxLength: 20 }
        ),
        // Generate appointments with mixed statuses
        fc.array(
          fc.tuple(appointmentStatusArb(), analyticsDateArb()),
          { minLength: 0, maxLength: 30 }
        ),
        (userSpecs, apptSpecs) => {
          const store = new AnalyticsStore();

          // Create users
          const users: AnalyticsUser[] = [];
          for (const [role, isActive] of userSpecs) {
            users.push(store.addUser(role, isActive));
          }

          // Pick patient and doctor IDs from created users (or use fallback)
          const patients = users.filter((u) => u.role === "patient");
          const doctors = users.filter((u) => u.role === "doctor");
          const fallbackPatientId = "fallback_patient";
          const fallbackDoctorId = "fallback_doctor";

          // Create appointments
          for (const [status, scheduledAt] of apptSpecs) {
            const patientId =
              patients.length > 0
                ? patients[Math.floor(Math.random() * patients.length)].id
                : fallbackPatientId;
            const doctorId =
              doctors.length > 0
                ? doctors[Math.floor(Math.random() * doctors.length)].id
                : fallbackDoctorId;
            store.addAppointment(patientId, doctorId, status, scheduledAt);
          }

          const result = store.computeAnalytics();

          // totalConsultations = count of completed appointments
          const expectedCompleted = apptSpecs.filter(
            ([status]) => status === "completed"
          ).length;
          expect(result.totalConsultations).toBe(expectedCompleted);

          // totalRevenue = totalConsultations * 50
          expect(result.totalRevenue).toBe(expectedCompleted * CONSULTATION_FEE);

          // activeDoctors = count of users with role "doctor" and isActive true
          const expectedActiveDoctors = userSpecs.filter(
            ([role, isActive]) => role === "doctor" && isActive
          ).length;
          expect(result.activeDoctors).toBe(expectedActiveDoctors);
        }
      ),
      { numRuns: 300 }
    );
  });

  it("zero completed appointments yields zero consultations and zero revenue", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(roleArb(), boolArb()),
          { minLength: 1, maxLength: 10 }
        ),
        fc.array(
          fc.tuple(
            fc.constantFrom("pending", "confirmed", "rejected", "cancelled") as fc.Arbitrary<AppointmentStatus>,
            analyticsDateArb()
          ),
          { minLength: 0, maxLength: 15 }
        ),
        (userSpecs, apptSpecs) => {
          const store = new AnalyticsStore();

          for (const [role, isActive] of userSpecs) {
            store.addUser(role, isActive);
          }

          for (const [status, scheduledAt] of apptSpecs) {
            store.addAppointment("p1", "d1", status, scheduledAt);
          }

          const result = store.computeAnalytics();
          expect(result.totalConsultations).toBe(0);
          expect(result.totalRevenue).toBe(0);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 29: Analytics date range filtering
// ---------------------------------------------------------------------------

// Feature: mediconnect-virtual-clinic, Property 29: Analytics date range filtering
// **Validates: Requirements 12.5**
describe("Property 29: Analytics date range filtering", () => {
  it("filtered results include only appointments within [start, end]", () => {
    fc.assert(
      fc.property(
        // Users
        fc.array(
          fc.tuple(roleArb(), boolArb()),
          { minLength: 1, maxLength: 10 }
        ),
        // Appointments with dates spread across the 90-day window
        fc.array(
          fc.tuple(appointmentStatusArb(), analyticsDateArb()),
          { minLength: 1, maxLength: 25 }
        ),
        // Date range filter
        dateRangeArb(),
        (userSpecs, apptSpecs, { start, end }) => {
          const store = new AnalyticsStore();

          for (const [role, isActive] of userSpecs) {
            store.addUser(role, isActive);
          }

          const allAppointments: AnalyticsAppointment[] = [];
          for (const [status, scheduledAt] of apptSpecs) {
            allAppointments.push(
              store.addAppointment("p1", "d1", status, scheduledAt)
            );
          }

          const result = store.computeAnalyticsInRange(start, end);
          const appointmentsInRange = store.getAppointmentsInRange(start, end);

          // All appointments in range must have scheduledAt within [start, end]
          for (const appt of appointmentsInRange) {
            expect(appt.scheduledAt.getTime()).toBeGreaterThanOrEqual(start.getTime());
            expect(appt.scheduledAt.getTime()).toBeLessThanOrEqual(end.getTime());
          }

          // No appointment outside the range should be included
          const outsideRange = allAppointments.filter(
            (a) => a.scheduledAt < start || a.scheduledAt > end
          );
          const inRangeIds = new Set(appointmentsInRange.map((a) => a.id));
          for (const appt of outsideRange) {
            expect(inRangeIds.has(appt.id)).toBe(false);
          }

          // totalConsultations should equal completed appointments within range
          const completedInRange = appointmentsInRange.filter(
            (a) => a.status === "completed"
          ).length;
          expect(result.totalConsultations).toBe(completedInRange);

          // totalRevenue should match
          expect(result.totalRevenue).toBe(completedInRange * CONSULTATION_FEE);
        }
      ),
      { numRuns: 300 }
    );
  });

  it("empty date range (start > end) returns zero consultations", () => {
    const store = new AnalyticsStore();
    store.addUser("doctor", true);
    store.addAppointment(
      "p1",
      "d1",
      "completed",
      new Date(2025, 0, 15, 12, 0, 0)
    );

    // start after end — no appointments should match
    const start = new Date(2025, 1, 1);
    const end = new Date(2025, 0, 1);
    const result = store.computeAnalyticsInRange(start, end);
    expect(result.totalConsultations).toBe(0);
    expect(result.totalRevenue).toBe(0);
  });
});
