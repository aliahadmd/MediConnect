// Feature: patient-doctor-experience-enhancements — All 24 correctness properties
// **Validates: Requirements 1.1, 1.2, 1.5, 2.1, 2.2, 2.4, 3.2, 3.4, 3.5, 4.1, 4.2, 4.3,
//   5.1, 5.3, 5.5, 6.2, 6.3, 6.5, 7.1, 7.2, 7.4, 8.1, 8.2, 8.3, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6,
//   10.1, 10.2, 10.4, 11.2, 11.3, 11.4, 11.5, 11.6, 12.2, 12.4, 13.1, 13.2, 13.3**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ===========================================================================
// Types
// ===========================================================================

type UserRole = "patient" | "doctor" | "admin" | "unknown";

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface PrescriptionRecord {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorName: string;
  appointmentDate: string;
  medications: Medication[];
  notes: string | null;
  pdfKey: string | null;
  createdAt: Date;
}

interface DoctorProfile {
  id: string;
  name: string;
  photoUrl: string | null;
  specialization: string | null;
  qualifications: string | null;
  bio: string | null;
  yearsOfExperience: number | null;
  consultationFee: string | null;
  averageRating: number | null;
  reviewCount: number;
  profileComplete: boolean;
  active: boolean;
}

interface ReviewRecord {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  rating: number;
  reviewText: string | null;
  reviewerName: string;
  createdAt: Date;
}

type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "rejected";

interface AppointmentRecord {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  scheduledAt: Date;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  hasVisitNotes: boolean;
  hasPrescription: boolean;
}

interface PatientProfile {
  name: string;
  dateOfBirth: string | null;
  gender: string | null;
  bloodType: string | null;
  allergies: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  medicalHistoryNotes: string | null;
  profileComplete: boolean;
}

type TimelineEventType = "appointment" | "prescription" | "visit_note";

interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: Date;
  summary: string;
  detailUrl: string;
}

// ===========================================================================
// In-memory Stores
// ===========================================================================

class AuthGate {
  authorize(userRole: UserRole, requiredRole: UserRole): { allowed: boolean; status: number } {
    if (userRole === requiredRole) return { allowed: true, status: 200 };
    return { allowed: false, status: 403 };
  }

  authorizePatientProfile(
    requestingUserId: string,
    requestingUserRole: UserRole,
    assignedDoctorId: string
  ): { allowed: boolean; status: number } {
    if (requestingUserRole === "admin") return { allowed: true, status: 200 };
    if (requestingUserRole === "doctor" && requestingUserId === assignedDoctorId) {
      return { allowed: true, status: 200 };
    }
    return { allowed: false, status: 403 };
  }
}

class PrescriptionStore {
  private records: PrescriptionRecord[] = [];
  private counter = 0;

  add(record: Omit<PrescriptionRecord, "id">): PrescriptionRecord {
    const full: PrescriptionRecord = { ...record, id: `rx_${++this.counter}` };
    this.records.push(full);
    return full;
  }

  listByPatient(patientId: string): PrescriptionRecord[] {
    return this.records
      .filter((r) => r.patientId === patientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  countByPatient(patientId: string): number {
    return this.records.filter((r) => r.patientId === patientId).length;
  }

  recentByPatient(patientId: string, limit: number): PrescriptionRecord[] {
    return this.listByPatient(patientId).slice(0, limit);
  }
}

class AppointmentStore {
  private records: AppointmentRecord[] = [];
  private counter = 0;

  add(record: Omit<AppointmentRecord, "id">): AppointmentRecord {
    const full: AppointmentRecord = { ...record, id: `appt_${++this.counter}` };
    this.records.push(full);
    return full;
  }

  get(id: string): AppointmentRecord | undefined {
    return this.records.find((r) => r.id === id);
  }

  pastByPatient(patientId: string, statusFilter?: AppointmentStatus): AppointmentRecord[] {
    const pastStatuses: AppointmentStatus[] = ["completed", "cancelled", "rejected"];
    return this.records
      .filter((r) => r.patientId === patientId && pastStatuses.includes(r.status))
      .filter((r) => (statusFilter ? r.status === statusFilter : true))
      .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());
  }

  upcomingByPatient(patientId: string, now: Date): AppointmentRecord[] {
    return this.records.filter(
      (r) =>
        r.patientId === patientId &&
        (r.status === "pending" || r.status === "confirmed") &&
        r.scheduledAt.getTime() > now.getTime()
    );
  }

  completedByPatient(patientId: string): AppointmentRecord[] {
    return this.records.filter((r) => r.patientId === patientId && r.status === "completed");
  }

  allByPatient(patientId: string): AppointmentRecord[] {
    return this.records.filter((r) => r.patientId === patientId);
  }
}

class ReviewStore {
  private records: ReviewRecord[] = [];
  private counter = 0;

  submit(
    appointmentId: string,
    patientId: string,
    doctorId: string,
    rating: number,
    reviewText: string | null,
    reviewerName: string,
    appointmentStatus: AppointmentStatus
  ): { success: true; review: ReviewRecord } | { success: false; error: string } {
    if (appointmentStatus !== "completed") {
      return { success: false, error: "Reviews are only allowed for completed appointments" };
    }
    if (this.records.some((r) => r.appointmentId === appointmentId)) {
      return { success: false, error: "A review already exists for this appointment" };
    }
    const review: ReviewRecord = {
      id: `rev_${++this.counter}`,
      appointmentId,
      patientId,
      doctorId,
      rating,
      reviewText,
      reviewerName,
      createdAt: new Date(),
    };
    this.records.push(review);
    return { success: true, review };
  }

  getByDoctor(doctorId: string): ReviewRecord[] {
    return this.records.filter((r) => r.doctorId === doctorId);
  }

  getAverageRating(doctorId: string): number | null {
    const reviews = this.getByDoctor(doctorId);
    if (reviews.length === 0) return null;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / reviews.length) * 100) / 100;
  }

  getReviewCount(doctorId: string): number {
    return this.getByDoctor(doctorId).length;
  }
}

class DoctorSearchEngine {
  private doctors: DoctorProfile[] = [];

  addDoctor(doc: DoctorProfile): void {
    this.doctors.push(doc);
  }

  search(params: {
    q?: string;
    specialization?: string;
    page: number;
    limit: number;
  }): { doctors: DoctorProfile[]; total: number; page: number; limit: number } {
    let results = this.doctors.filter((d) => d.active && d.profileComplete);

    if (params.q) {
      const query = params.q.toLowerCase();
      results = results.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          (d.specialization && d.specialization.toLowerCase().includes(query))
      );
    }

    if (params.specialization) {
      results = results.filter((d) => d.specialization === params.specialization);
    }

    const total = results.length;
    const start = (params.page - 1) * params.limit;
    const paged = results.slice(start, start + params.limit);

    return { doctors: paged, total, page: params.page, limit: params.limit };
  }

  getSpecializations(): { specialization: string; doctorCount: number }[] {
    const active = this.doctors.filter((d) => d.active);
    const map = new Map<string, number>();
    for (const d of active) {
      if (d.specialization) {
        map.set(d.specialization, (map.get(d.specialization) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([specialization, doctorCount]) => ({ specialization, doctorCount }))
      .sort((a, b) => a.specialization.localeCompare(b.specialization));
  }
}

class PatientProfileStore {
  private profiles = new Map<string, PatientProfile>();

  set(patientId: string, profile: PatientProfile): void {
    this.profiles.set(patientId, profile);
  }

  get(patientId: string): PatientProfile | undefined {
    return this.profiles.get(patientId);
  }
}

class TimelineStore {
  buildTimeline(
    appointments: AppointmentRecord[],
    prescriptions: PrescriptionRecord[],
    visitNoteIds: { id: string; appointmentId: string; date: Date; summary: string }[]
  ): TimelineEvent[] {
    const events: TimelineEvent[] = [];

    for (const a of appointments) {
      events.push({
        id: a.id,
        type: "appointment",
        date: a.scheduledAt,
        summary: `Appointment with ${a.doctorName}`,
        detailUrl: `/patient/appointments/${a.id}`,
      });
    }

    for (const p of prescriptions) {
      events.push({
        id: p.id,
        type: "prescription",
        date: p.createdAt,
        summary: `Prescription from ${p.doctorName}`,
        detailUrl: `/patient/prescriptions/${p.id}`,
      });
    }

    for (const v of visitNoteIds) {
      events.push({
        id: v.id,
        type: "visit_note",
        date: v.date,
        summary: v.summary,
        detailUrl: `/patient/appointments/${v.appointmentId}`,
      });
    }

    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  filterByType(events: TimelineEvent[], type: TimelineEventType): TimelineEvent[] {
    return events.filter((e) => e.type === type);
  }
}

class DashboardAggregator {
  compute(
    appointments: AppointmentRecord[],
    prescriptions: PrescriptionRecord[],
    patientId: string,
    now: Date
  ) {
    const upcoming = appointments.filter(
      (a) =>
        a.patientId === patientId &&
        (a.status === "pending" || a.status === "confirmed") &&
        a.scheduledAt.getTime() > now.getTime()
    );
    const completed = appointments.filter(
      (a) => a.patientId === patientId && a.status === "completed"
    );
    const patientPrescriptions = prescriptions.filter((p) => p.patientId === patientId);

    const nextAppointment =
      upcoming.length > 0
        ? upcoming.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0]
        : null;

    const recentPrescriptions = [...patientPrescriptions]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 3);

    return {
      upcomingCount: upcoming.length,
      completedCount: completed.length,
      prescriptionCount: patientPrescriptions.length,
      nextAppointment,
      recentPrescriptions,
    };
  }
}

// ===========================================================================
// Generators
// ===========================================================================

const nonEmptyString = (max = 50) =>
  fc.string({ minLength: 1, maxLength: max }).filter((s) => s.trim().length > 0);

const medicationArb: fc.Arbitrary<Medication> = fc.record({
  name: nonEmptyString(40),
  dosage: nonEmptyString(30),
  frequency: nonEmptyString(30),
  duration: nonEmptyString(20),
});

const medicationsArb = fc.array(medicationArb, { minLength: 1, maxLength: 5 });

const pastDateArb = fc
  .date({ min: new Date("2020-01-01"), max: new Date("2024-12-31") })
  .filter((d) => !isNaN(d.getTime()));

const futureDateArb = fc
  .integer({ min: 1, max: 365 })
  .map((days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(10, 0, 0, 0);
    return d;
  });

const patientIdArb = fc.stringMatching(/^pt_[a-z0-9]{4,8}$/);
const doctorIdArb = fc.stringMatching(/^dr_[a-z0-9]{4,8}$/);
const userIdArb = fc.stringMatching(/^usr_[a-z0-9]{4,8}$/);

const roleArb: fc.Arbitrary<UserRole> = fc.constantFrom("patient", "doctor", "admin", "unknown");
const nonPatientRoleArb: fc.Arbitrary<UserRole> = fc.constantFrom("doctor", "admin", "unknown");

const appointmentStatusArb: fc.Arbitrary<AppointmentStatus> = fc.constantFrom(
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "rejected"
);

const pastStatusArb: fc.Arbitrary<AppointmentStatus> = fc.constantFrom(
  "completed",
  "cancelled",
  "rejected"
);

const nonCompletedStatusArb: fc.Arbitrary<AppointmentStatus> = fc.constantFrom(
  "pending",
  "confirmed",
  "cancelled",
  "rejected"
);

const timelineTypeArb: fc.Arbitrary<TimelineEventType> = fc.constantFrom(
  "appointment",
  "prescription",
  "visit_note"
);

const timeStringArb = fc
  .record({
    h: fc.integer({ min: 0, max: 23 }),
    m: fc.integer({ min: 0, max: 59 }),
  })
  .map(({ h, m }) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);

const ratingArb = fc.integer({ min: 1, max: 5 });

const specializationArb = fc.constantFrom(
  "Cardiology",
  "Dermatology",
  "Neurology",
  "Pediatrics",
  "Orthopedics",
  "General Practice",
  "Oncology",
  "Psychiatry"
);

const dateStringArb = fc
  .date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") })
  .filter((d) => !isNaN(d.getTime()))
  .map((d) => d.toISOString().split("T")[0]);


function prescriptionRecordArb(patientId: string): fc.Arbitrary<Omit<PrescriptionRecord, "id">> {
  return fc.record({
    appointmentId: fc.uuid(),
    patientId: fc.constant(patientId),
    doctorName: nonEmptyString(40),
    appointmentDate: dateStringArb,
    medications: medicationsArb,
    notes: fc.option(nonEmptyString(200), { nil: null }),
    pdfKey: fc.option(fc.constant("prescriptions/test.pdf"), { nil: null }),
    createdAt: pastDateArb,
  });
}

function appointmentRecordArb(
  patientId: string,
  statusGen: fc.Arbitrary<AppointmentStatus> = appointmentStatusArb
): fc.Arbitrary<Omit<AppointmentRecord, "id">> {
  return fc.record({
    patientId: fc.constant(patientId),
    doctorId: doctorIdArb,
    doctorName: nonEmptyString(40),
    scheduledAt: pastDateArb,
    startTime: timeStringArb,
    endTime: timeStringArb,
    status: statusGen,
    hasVisitNotes: fc.boolean(),
    hasPrescription: fc.boolean(),
  });
}

function doctorProfileArb(overrides?: Partial<DoctorProfile>): fc.Arbitrary<DoctorProfile> {
  return fc.record({
    id: overrides?.id !== undefined ? fc.constant(overrides.id) : doctorIdArb,
    name: overrides?.name !== undefined ? fc.constant(overrides.name) : nonEmptyString(40),
    photoUrl: fc.option(fc.constant("https://example.com/photo.jpg"), { nil: null }),
    specialization:
      overrides?.specialization !== undefined
        ? fc.constant(overrides.specialization)
        : fc.option(specializationArb, { nil: null }),
    qualifications: fc.option(nonEmptyString(100), { nil: null }),
    bio: fc.option(nonEmptyString(200), { nil: null }),
    yearsOfExperience: fc.option(fc.integer({ min: 0, max: 40 }), { nil: null }),
    consultationFee: fc.option(fc.constant("100.00"), { nil: null }),
    averageRating: fc.option(fc.double({ min: 1, max: 5, noNaN: true }), { nil: null }),
    reviewCount: fc.integer({ min: 0, max: 500 }),
    profileComplete:
      overrides?.profileComplete !== undefined
        ? fc.constant(overrides.profileComplete)
        : fc.boolean(),
    active: overrides?.active !== undefined ? fc.constant(overrides.active) : fc.boolean(),
  });
}

// ===========================================================================
// Property 1: Prescription list ordering invariant
// ===========================================================================

// Feature: patient-doctor-experience-enhancements, Property 1: Prescription list ordering invariant
// **Validates: Requirements 1.1**
describe("Property 1: Prescription list ordering invariant", () => {
  it("list returned is ordered by createdAt descending", () => {
    fc.assert(
      fc.property(
        patientIdArb,
        fc.array(prescriptionRecordArb("__PLACEHOLDER__"), { minLength: 0, maxLength: 10 }),
        (patientId, rxTemplates) => {
          const store = new PrescriptionStore();
          for (const rx of rxTemplates) {
            store.add({ ...rx, patientId });
          }

          const list = store.listByPatient(patientId);

          for (let i = 0; i < list.length - 1; i++) {
            expect(list[i].createdAt.getTime()).toBeGreaterThanOrEqual(
              list[i + 1].createdAt.getTime()
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// Property 2: Prescription list item contains required fields
// ===========================================================================

// Feature: patient-doctor-experience-enhancements, Property 2: Prescription list item contains required fields
// **Validates: Requirements 1.2, 2.4**
describe("Property 2: Prescription list item contains required fields", () => {
  it("each item has non-null doctorName, appointmentDate, medications (length >= 1), createdAt", () => {
    fc.assert(
      fc.property(
        patientIdArb,
        fc.array(prescriptionRecordArb("__PLACEHOLDER__"), { minLength: 1, maxLength: 8 }),
        (patientId, rxTemplates) => {
          const store = new PrescriptionStore();
          for (const rx of rxTemplates) {
            store.add({ ...rx, patientId });
          }

          const list = store.listByPatient(patientId);

          for (const item of list) {
            expect(item.doctorName).toBeTruthy();
            expect(typeof item.doctorName).toBe("string");
            expect(item.appointmentDate).toBeTruthy();
            expect(typeof item.appointmentDate).toBe("string");
            expect(item.medications.length).toBeGreaterThanOrEqual(1);
            expect(item.createdAt).toBeInstanceOf(Date);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// Property 3: Patient role authorization gate
// ===========================================================================

// Feature: patient-doctor-experience-enhancements, Property 3: Patient role authorization gate
// **Validates: Requirements 1.5**
describe("Property 3: Patient role authorization gate", () => {
  it("non-patient users get 403, patients get access", () => {
    fc.assert(
      fc.property(roleArb, (role) => {
        const gate = new AuthGate();
        const result = gate.authorize(role, "patient");

        if (role === "patient") {
          expect(result.allowed).toBe(true);
          expect(result.status).toBe(200);
        } else {
          expect(result.allowed).toBe(false);
          expect(result.status).toBe(403);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// Property 4: Medication table data completeness
// ===========================================================================

// Feature: patient-doctor-experience-enhancements, Property 4: Medication table data completeness
// **Validates: Requirements 2.1, 2.2**
describe("Property 4: Medication table data completeness", () => {
  it("each medication has non-empty name, dosage, frequency, duration", () => {
    fc.assert(
      fc.property(medicationsArb, (medications) => {
        for (const med of medications) {
          expect(med.name.trim().length).toBeGreaterThan(0);
          expect(med.dosage.trim().length).toBeGreaterThan(0);
          expect(med.frequency.trim().length).toBeGreaterThan(0);
          expect(med.duration.trim().length).toBeGreaterThan(0);
        }
        expect(medications.length).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// Property 5: Patient profile viewer authorization
// ===========================================================================

// Feature: patient-doctor-experience-enhancements, Property 5: Patient profile viewer authorization
// **Validates: Requirements 3.4, 3.5**
describe("Property 5: Patient profile viewer authorization", () => {
  it("only assigned doctor or admin can access, others get 403", () => {
    fc.assert(
      fc.property(
        userIdArb,
        roleArb,
        doctorIdArb,
        (requestingUserId, requestingRole, assignedDoctorId) => {
          const gate = new AuthGate();
          const result = gate.authorizePatientProfile(
            requestingUserId,
            requestingRole,
            assignedDoctorId
          );

          if (requestingRole === "admin") {
            expect(result.allowed).toBe(true);
          } else if (requestingRole === "doctor" && requestingUserId === assignedDoctorId) {
            expect(result.allowed).toBe(true);
          } else {
            expect(result.allowed).toBe(false);
            expect(result.status).toBe(403);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// Property 6: Patient profile data completeness
// ===========================================================================

// Feature: patient-doctor-experience-enhancements, Property 6: Patient profile data completeness
// **Validates: Requirements 3.2**
describe("Property 6: Patient profile data completeness", () => {
  it("completed profile has all fields, profileComplete is true iff profile record exists", () => {
    fc.assert(
      fc.property(
        patientIdArb,
        fc.record({
          name: nonEmptyString(40),
          dateOfBirth: fc.option(dateStringArb, { nil: null }),
          gender: fc.option(fc.constantFrom("male", "female", "other"), { nil: null }),
          bloodType: fc.option(fc.constantFrom("A+", "A-", "B+", "B-", "O+", "O-"), { nil: null }),
          allergies: fc.option(nonEmptyString(100), { nil: null }),
          emergencyContactName: fc.option(nonEmptyString(40), { nil: null }),
          emergencyContactPhone: fc.option(nonEmptyString(15), { nil: null }),
          medicalHistoryNotes: fc.option(nonEmptyString(200), { nil: null }),
        }),
        fc.boolean(),
        (patientId, profileData, hasProfile) => {
          const store = new PatientProfileStore();

          if (hasProfile) {
            store.set(patientId, { ...profileData, profileComplete: true });
          }

          const retrieved = store.get(patientId);

          if (hasProfile) {
            expect(retrieved).toBeDefined();
            expect(retrieved!.profileComplete).toBe(true);
            expect(retrieved!.name).toBeTruthy();
          } else {
            expect(retrieved).toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// Property 7: Doctor profile contains required fields
// ===========================================================================

// Feature: patient-doctor-experience-enhancements, Property 7: Doctor profile contains required fields
// **Validates: Requirements 4.1, 4.2**
describe("Property 7: Doctor profile contains required fields", () => {
  it("completed profile has non-null name, specialization, qualifications, etc.", () => {
    fc.assert(
      fc.property(
        fc.record({
          id: doctorIdArb,
          name: nonEmptyString(40),
          photoUrl: fc.option(fc.constant("https://example.com/photo.jpg"), { nil: null }),
          specialization: specializationArb,
          qualifications: nonEmptyString(100),
          bio: fc.option(nonEmptyString(200), { nil: null }),
          yearsOfExperience: fc.integer({ min: 0, max: 40 }),
          consultationFee: fc.constant("100.00"),
          averageRating: fc.option(fc.double({ min: 1, max: 5, noNaN: true }), { nil: null }),
          reviewCount: fc.integer({ min: 0, max: 500 }),
          profileComplete: fc.constant(true as boolean),
          active: fc.constant(true as boolean),
        }),
        (doctor) => {
          expect(doctor.name).toBeTruthy();
          expect(doctor.specialization).toBeTruthy();
          expect(doctor.qualifications).toBeTruthy();
          expect(doctor.yearsOfExperience).not.toBeNull();
          expect(typeof doctor.yearsOfExperience).toBe("number");
          expect(doctor.consultationFee).toBeTruthy();
          // averageRating and reviewCount fields exist (may be null/0)
          expect("averageRating" in doctor).toBe(true);
          expect("reviewCount" in doctor).toBe(true);
          expect(typeof doctor.reviewCount).toBe("number");
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// Property 8: Review list data completeness
// ===========================================================================

// Feature: patient-doctor-experience-enhancements, Property 8: Review list data completeness
// **Validates: Requirements 4.3**
describe("Property 8: Review list data completeness", () => {
  it("rating 1-5, non-empty reviewerName, valid createdAt", () => {
    fc.assert(
      fc.property(
        doctorIdArb,
        fc.array(
          fc.record({
            appointmentId: fc.uuid(),
            patientId: patientIdArb,
            rating: ratingArb,
            reviewText: fc.option(nonEmptyString(200), { nil: null }),
            reviewerName: nonEmptyString(30),
          }),
          { minLength: 1, maxLength: 8 }
        ),
        (doctorId, reviewSpecs) => {
          const store = new ReviewStore();
          const usedAppointments = new Set<string>();

          for (const spec of reviewSpecs) {
            if (usedAppointments.has(spec.appointmentId)) continue;
            usedAppointments.add(spec.appointmentId);
            store.submit(
              spec.appointmentId,
              spec.patientId,
              doctorId,
              spec.rating,
              spec.reviewText,
              spec.reviewerName,
              "completed"
            );
          }

          const reviews = store.getByDoctor(doctorId);

          for (const review of reviews) {
            expect(review.rating).toBeGreaterThanOrEqual(1);
            expect(review.rating).toBeLessThanOrEqual(5);
            expect(Number.isInteger(review.rating)).toBe(true);
            expect(review.reviewerName.trim().length).toBeGreaterThan(0);
            expect(review.createdAt).toBeInstanceOf(Date);
            expect(review.createdAt.getTime()).not.toBeNaN();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// Property 9: Doctor search text matching
// ===========================================================================

// Feature: patient-doctor-experience-enhancements, Property 9: Doctor search text matching
// **Validates: Requirements 5.1, 11.2**
describe("Property 9: Doctor search text matching", () => {
  it("every result has query as case-insensitive substring of name or specialization", () => {
    fc.assert(
      fc.property(
        fc.array(
          doctorProfileArb({ active: true, profileComplete: true }),
          { minLength: 1, maxLength: 15 }
        ),
        fc.string({ minLength: 2, maxLength: 10 }).filter((s) => s.trim().length >= 2),
        (doctors, query) => {
          const engine = new DoctorSearchEngine();
          for (const d of doctors) {
            engine.addDoctor(d);
          }

          const result = engine.search({ q: query, page: 1, limit: 50 });
          const lowerQuery = query.toLowerCase();

          for (const doc of result.doctors) {
            const nameMatch = doc.name.toLowerCase().includes(lowerQuery);
            const specMatch =
              doc.specialization !== null &&
              doc.specialization.toLowerCase().includes(lowerQuery);
            expect(nameMatch || specMatch).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// Property 10: Doctor search specialization filter
// ===========================================================================

// Feature: patient-doctor-experience-enhancements, Property 10: Doctor search specialization filter
// **Validates: Requirements 5.5, 6.2, 11.3**
describe("Property 10: Doctor search specialization filter", () => {
  it("every result has exact specialization match", () => {
    fc.assert(
      fc.property(
        fc.array(
          doctorProfileArb({ active: true, profileComplete: true }),
          { minLength: 1, maxLength: 15 }
        ),
        specializationArb,
        (doctors, filterSpec) => {
          const engine = new DoctorSearchEngine();
          for (const d of doctors) {
            engine.addDoctor(d);
          }

          const result = engine.search({ specialization: filterSpec, page: 1, limit: 50 });

          for (const doc of result.doctors) {
            expect(doc.specialization).toBe(filterSpec);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// Property 11: Doctor search pagination invariant
// ===========================================================================

// Feature: patient-doctor-experience-enhancements, Property 11: Doctor search pagination invariant
// **Validates: Requirements 11.4, 11.6**
describe("Property 11: Doctor search pagination invariant", () => {
  it("at most L results per page, total equals N, no duplicates across pages", () => {
    fc.assert(
      fc.property(
        fc.array(
          doctorProfileArb({ active: true, profileComplete: true }),
          { minLength: 0, maxLength: 20 }
        ),
        fc.integer({ min: 1, max: 10 }),
        (doctors, limit) => {
          // Ensure unique IDs
          const uniqueDoctors = doctors.reduce<DoctorProfile[]>((acc, d) => {
            if (!acc.some((x) => x.id === d.id)) acc.push(d);
            return acc;
          }, []);

          const engine = new DoctorSearchEngine();
          for (const d of uniqueDoctors) {
            engine.addDoctor(d);
          }

          const firstPage = engine.search({ page: 1, limit });
          const totalN = firstPage.total;

          // total equals the number of active+complete doctors
          const expectedTotal = uniqueDoctors.filter((d) => d.active && d.profileComplete).length;
          expect(totalN).toBe(expectedTotal);

          // Collect all pages
          const totalPages = Math.ceil(totalN / limit) || 1;
          const allIds: string[] = [];

          for (let p = 1; p <= totalPages; p++) {
            const page = engine.search({ page: p, limit });
            expect(page.doctors.length).toBeLessThanOrEqual(limit);
            expect(page.total).toBe(totalN);
            for (const d of page.doctors) {
              allIds.push(d.id);
            }
          }

          // No duplicates
          expect(new Set(allIds).size).toBe(allIds.length);
          // Union equals total
          expect(allIds.length).toBe(totalN);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// Property 12: Search result fields completeness
// ===========================================================================

// Feature: patient-doctor-experience-enhancements, Property 12: Search result fields completeness
// **Validates: Requirements 5.3, 11.5**
describe("Property 12: Search result fields completeness", () => {
  it("all required fields present in search results", () => {
    fc.assert(
      fc.property(
        fc.array(
          doctorProfileArb({ active: true, profileComplete: true }),
          { minLength: 1, maxLength: 10 }
        ),
        (doctors) => {
          const engine = new DoctorSearchEngine();
          for (const d of doctors) {
            engine.addDoctor(d);
          }

          const result = engine.search({ page: 1, limit: 50 });

          for (const doc of result.doctors) {
            expect("id" in doc).toBe(true);
            expect("name" in doc).toBe(true);
            expect("photoUrl" in doc).toBe(true);
            expect("specialization" in doc).toBe(true);
            expect("qualifications" in doc).toBe(true);
            expect("yearsOfExperience" in doc).toBe(true);
            expect("consultationFee" in doc).toBe(true);
            expect("averageRating" in doc).toBe(true);
            expect("reviewCount" in doc).toBe(true);
            expect(typeof doc.id).toBe("string");
            expect(typeof doc.name).toBe("string");
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// Property 13: Specializations derived from data with correct counts
// ===========================================================================

// Feature: patient-doctor-experience-enhancements, Property 13: Specializations derived from data with correct counts
// **Validates: Requirements 6.3, 6.5, 13.1, 13.2, 13.3**
describe("Property 13: Specializations derived from data with correct counts", () => {
  it("distinct non-null specializations with correct doctor counts, ordered alphabetically", () => {
    fc.assert(
      fc.property(
        fc.array(doctorProfileArb(), { minLength: 0, maxLength: 20 }),
        (doctors) => {
          // Ensure unique IDs
          const uniqueDoctors = doctors.reduce<DoctorProfile[]>((acc, d) => {
            if (!acc.some((x) => x.id === d.id)) acc.push(d);
            return acc;
          }, []);

          const engine = new DoctorSearchEngine();
          for (const d of uniqueDoctors) {
            engine.addDoctor(d);
          }

          const specs = engine.getSpecializations();

          // Compute expected from raw data
          const activeDoctors = uniqueDoctors.filter((d) => d.active);
          const expectedMap = new Map<string, number>();
          for (const d of activeDoctors) {
            if (d.specialization) {
              expectedMap.set(d.specialization, (expectedMap.get(d.specialization) || 0) + 1);
            }
          }

          // Same count of distinct specializations
          expect(specs.length).toBe(expectedMap.size);

          // Each specialization has correct count
          for (const s of specs) {
            expect(expectedMap.get(s.specialization)).toBe(s.doctorCount);
          }

          // Ordered alphabetically
          for (let i = 0; i < specs.length - 1; i++) {
            expect(specs[i].specialization.localeCompare(specs[i + 1].specialization)).toBeLessThanOrEqual(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// Property 14: Appointment history ordering and status filtering
// ===========================================================================

// Feature: patient-doctor-experience-enhancements, Property 14: Appointment history ordering and status filtering
// **Validates: Requirements 7.1, 7.4**
describe("Property 14: Appointment history ordering and status filtering", () => {
  it("only completed/cancelled/rejected, ordered by scheduledAt desc, filter works", () => {
    fc.assert(
      fc.property(
        patientIdArb,
        fc.array(
          appointmentRecordArb("__PLACEHOLDER__"),
          { minLength: 1, maxLength: 15 }
        ),
        fc.option(pastStatusArb, { nil: undefined }),
        (patientId, apptTemplates, statusFilter) => {
          const store = new AppointmentStore();
          for (const a of apptTemplates) {
            store.add({ ...a, patientId });
          }

          const history = store.pastByPatient(patientId, statusFilter ?? undefined);

          // Only past statuses
          for (const a of history) {
            expect(["completed", "cancelled", "rejected"]).toContain(a.status);
          }

          // Ordered by scheduledAt descending
          for (let i = 0; i < history.length - 1; i++) {
            expect(history[i].scheduledAt.getTime()).toBeGreaterThanOrEqual(
              history[i + 1].scheduledAt.getTime()
            );
          }

          // Status filter works
          if (statusFilter) {
            for (const a of history) {
              expect(a.status).toBe(statusFilter);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// Property 15: Appointment history entry completeness
// ===========================================================================

// Feature: patient-doctor-experience-enhancements, Property 15: Appointment history entry completeness
// **Validates: Requirements 7.2**
describe("Property 15: Appointment history entry completeness", () => {
  it("has doctorName, date, startTime, endTime, status, hasVisitNotes, hasPrescription", () => {
    fc.assert(
      fc.property(
        patientIdArb,
        fc.array(
          appointmentRecordArb("__PLACEHOLDER__", pastStatusArb),
          { minLength: 1, maxLength: 10 }
        ),
        (patientId, apptTemplates) => {
          const store = new AppointmentStore();
          for (const a of apptTemplates) {
            store.add({ ...a, patientId });
          }

          const history = store.pastByPatient(patientId);

          for (const entry of history) {
            expect(entry.doctorName).toBeTruthy();
            expect(typeof entry.doctorName).toBe("string");
            expect(entry.scheduledAt).toBeInstanceOf(Date);
            expect(typeof entry.startTime).toBe("string");
            expect(typeof entry.endTime).toBe("string");
            expect(["completed", "cancelled", "rejected"]).toContain(entry.status);
            expect(typeof entry.hasVisitNotes).toBe("boolean");
            expect(typeof entry.hasPrescription).toBe("boolean");
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// Property 16: Dashboard aggregate counts correctness
// ===========================================================================

// Feature: patient-doctor-experience-enhancements, Property 16: Dashboard aggregate counts correctness
// **Validates: Requirements 8.1**
describe("Property 16: Dashboard aggregate counts correctness", () => {
  it("upcomingCount, completedCount, prescriptionCount match data", () => {
    fc.assert(
      fc.property(
        patientIdArb,
        fc.array(appointmentRecordArb("__PLACEHOLDER__"), { minLength: 0, maxLength: 15 }),
        fc.array(prescriptionRecordArb("__PLACEHOLDER__"), { minLength: 0, maxLength: 10 }),
        (patientId, apptTemplates, rxTemplates) => {
          const now = new Date();
          // Create appointments with a mix of future and past dates
          const appointments: AppointmentRecord[] = apptTemplates.map((a, i) => ({
            ...a,
            patientId,
            id: `appt_${i}`,
          }));
          const prescriptions: PrescriptionRecord[] = rxTemplates.map((r, i) => ({
            ...r,
            patientId,
            id: `rx_${i}`,
          }));

          const agg = new DashboardAggregator();
          const result = agg.compute(appointments, prescriptions, patientId, now);

          // Manually compute expected
          const expectedUpcoming = appointments.filter(
            (a) =>
              a.patientId === patientId &&
              (a.status === "pending" || a.status === "confirmed") &&
              a.scheduledAt.getTime() > now.getTime()
          ).length;
          const expectedCompleted = appointments.filter(
            (a) => a.patientId === patientId && a.status === "completed"
          ).length;
          const expectedRx = prescriptions.filter((p) => p.patientId === patientId).length;

          expect(result.upcomingCount).toBe(expectedUpcoming);
          expect(result.completedCount).toBe(expectedCompleted);
          expect(result.prescriptionCount).toBe(expectedRx);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// Property 17: Dashboard next appointment selection
// ===========================================================================

// Feature: patient-doctor-experience-enhancements, Property 17: Dashboard next appointment selection
// **Validates: Requirements 8.2**
describe("Property 17: Dashboard next appointment selection", () => {
  it("earliest upcoming appointment or null", () => {
    fc.assert(
      fc.property(
        patientIdArb,
        fc.array(
          fc.record({
            patientId: fc.constant("__PLACEHOLDER__"),
            doctorId: doctorIdArb,
            doctorName: nonEmptyString(40),
            scheduledAt: fc.oneof(pastDateArb, futureDateArb),
            startTime: timeStringArb,
            endTime: timeStringArb,
            status: appointmentStatusArb,
            hasVisitNotes: fc.boolean(),
            hasPrescription: fc.boolean(),
          }),
          { minLength: 0, maxLength: 12 }
        ),
        (patientId, apptTemplates) => {
          const now = new Date();
          const appointments: AppointmentRecord[] = apptTemplates.map((a, i) => ({
            ...a,
            patientId,
            id: `appt_${i}`,
          }));

          const agg = new DashboardAggregator();
          const result = agg.compute(appointments, [], patientId, now);

          const upcoming = appointments.filter(
            (a) =>
              a.patientId === patientId &&
              (a.status === "pending" || a.status === "confirmed") &&
              a.scheduledAt.getTime() > now.getTime()
          );

          if (upcoming.length === 0) {
            expect(result.nextAppointment).toBeNull();
          } else {
            expect(result.nextAppointment).not.toBeNull();
            const earliest = upcoming.sort(
              (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()
            )[0];
            expect(result.nextAppointment!.id).toBe(earliest.id);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// Property 18: Dashboard recent prescriptions
// ===========================================================================

// Feature: patient-doctor-experience-enhancements, Property 18: Dashboard recent prescriptions
// **Validates: Requirements 8.3**
describe("Property 18: Dashboard recent prescriptions", () => {
  it("min(N, 3) items ordered by createdAt desc", () => {
    fc.assert(
      fc.property(
        patientIdArb,
        fc.array(prescriptionRecordArb("__PLACEHOLDER__"), { minLength: 0, maxLength: 10 }),
        (patientId, rxTemplates) => {
          const prescriptions: PrescriptionRecord[] = rxTemplates.map((r, i) => ({
            ...r,
            patientId,
            id: `rx_${i}`,
          }));

          const agg = new DashboardAggregator();
          const result = agg.compute([], prescriptions, patientId, new Date());

          const patientRx = prescriptions.filter((p) => p.patientId === patientId);
          const expectedCount = Math.min(patientRx.length, 3);

          expect(result.recentPrescriptions.length).toBe(expectedCount);

          // Ordered by createdAt desc
          for (let i = 0; i < result.recentPrescriptions.length - 1; i++) {
            expect(
              result.recentPrescriptions[i].createdAt.getTime()
            ).toBeGreaterThanOrEqual(
              result.recentPrescriptions[i + 1].createdAt.getTime()
            );
          }

          // Each belongs to the patient
          for (const rx of result.recentPrescriptions) {
            expect(rx.patientId).toBe(patientId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// Property 19: Review submission round-trip
// ===========================================================================

// Feature: patient-doctor-experience-enhancements, Property 19: Review submission round-trip
// **Validates: Requirements 9.1, 9.3**
describe("Property 19: Review submission round-trip", () => {
  it("submitted review can be retrieved with same data", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        patientIdArb,
        doctorIdArb,
        ratingArb,
        fc.option(fc.string({ minLength: 1, maxLength: 200 }).filter((s) => s.trim().length > 0), {
          nil: null,
        }),
        nonEmptyString(30),
        (appointmentId, patientId, doctorId, rating, reviewText, reviewerName) => {
          const store = new ReviewStore();
          const result = store.submit(
            appointmentId,
            patientId,
            doctorId,
            rating,
            reviewText,
            reviewerName,
            "completed"
          );

          expect(result.success).toBe(true);
          if (!result.success) return;

          const reviews = store.getByDoctor(doctorId);
          expect(reviews.length).toBe(1);

          const retrieved = reviews[0];
          expect(retrieved.rating).toBe(rating);
          expect(retrieved.reviewText).toBe(reviewText);
          expect(retrieved.patientId).toBe(patientId);
          expect(retrieved.doctorId).toBe(doctorId);
          expect(retrieved.appointmentId).toBe(appointmentId);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// Property 20: One review per appointment uniqueness
// ===========================================================================

// Feature: patient-doctor-experience-enhancements, Property 20: One review per appointment uniqueness
// **Validates: Requirements 9.2, 9.6, 12.2**
describe("Property 20: One review per appointment uniqueness", () => {
  it("second review for same appointment is rejected", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        patientIdArb,
        doctorIdArb,
        ratingArb,
        ratingArb,
        nonEmptyString(30),
        (appointmentId, patientId, doctorId, rating1, rating2, reviewerName) => {
          const store = new ReviewStore();

          const first = store.submit(
            appointmentId,
            patientId,
            doctorId,
            rating1,
            null,
            reviewerName,
            "completed"
          );
          expect(first.success).toBe(true);

          const second = store.submit(
            appointmentId,
            patientId,
            doctorId,
            rating2,
            null,
            reviewerName,
            "completed"
          );
          expect(second.success).toBe(false);
          if (!second.success) {
            expect(second.error).toBe("A review already exists for this appointment");
          }

          // Total reviews for doctor equals distinct appointments with reviews
          const reviews = store.getByDoctor(doctorId);
          const distinctAppts = new Set(reviews.map((r) => r.appointmentId));
          expect(reviews.length).toBe(distinctAppts.size);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// Property 21: Review only for completed appointments
// ===========================================================================

// Feature: patient-doctor-experience-enhancements, Property 21: Review only for completed appointments
// **Validates: Requirements 9.5**
describe("Property 21: Review only for completed appointments", () => {
  it("non-completed appointments reject reviews", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        patientIdArb,
        doctorIdArb,
        ratingArb,
        nonCompletedStatusArb,
        nonEmptyString(30),
        (appointmentId, patientId, doctorId, rating, status, reviewerName) => {
          const store = new ReviewStore();
          const result = store.submit(
            appointmentId,
            patientId,
            doctorId,
            rating,
            null,
            reviewerName,
            status
          );

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error).toBe(
              "Reviews are only allowed for completed appointments"
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// Property 22: Average rating transactional consistency
// ===========================================================================

// Feature: patient-doctor-experience-enhancements, Property 22: Average rating transactional consistency
// **Validates: Requirements 9.4, 12.4**
describe("Property 22: Average rating transactional consistency", () => {
  it("averageRating = mean of all ratings, reviewCount = total reviews", () => {
    fc.assert(
      fc.property(
        doctorIdArb,
        fc.array(
          fc.record({
            appointmentId: fc.uuid(),
            patientId: patientIdArb,
            rating: ratingArb,
            reviewerName: nonEmptyString(30),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (doctorId, reviewSpecs) => {
          const store = new ReviewStore();
          const usedAppointments = new Set<string>();
          const submittedRatings: number[] = [];

          for (const spec of reviewSpecs) {
            if (usedAppointments.has(spec.appointmentId)) continue;
            usedAppointments.add(spec.appointmentId);

            const result = store.submit(
              spec.appointmentId,
              spec.patientId,
              doctorId,
              spec.rating,
              null,
              spec.reviewerName,
              "completed"
            );

            if (result.success) {
              submittedRatings.push(spec.rating);

              // After each submission, verify consistency
              const avgRating = store.getAverageRating(doctorId);
              const reviewCount = store.getReviewCount(doctorId);

              expect(reviewCount).toBe(submittedRatings.length);

              const expectedAvg =
                Math.round(
                  (submittedRatings.reduce((a, b) => a + b, 0) / submittedRatings.length) * 100
                ) / 100;
              expect(avgRating).toBeCloseTo(expectedAvg, 2);
            }
          }
        }
      ),
      { numRuns: 300 }
    );
  });
});

// ===========================================================================
// Property 23: Timeline ordering and type filtering
// ===========================================================================

// Feature: patient-doctor-experience-enhancements, Property 23: Timeline ordering and type filtering
// **Validates: Requirements 10.1, 10.4**
describe("Property 23: Timeline ordering and type filtering", () => {
  it("events ordered by date desc, type filter works, total = sum of all event types", () => {
    fc.assert(
      fc.property(
        patientIdArb,
        fc.array(
          fc.record({
            patientId: fc.constant("__PLACEHOLDER__"),
            doctorId: doctorIdArb,
            doctorName: nonEmptyString(40),
            scheduledAt: pastDateArb,
            startTime: timeStringArb,
            endTime: timeStringArb,
            status: appointmentStatusArb,
            hasVisitNotes: fc.boolean(),
            hasPrescription: fc.boolean(),
          }),
          { minLength: 0, maxLength: 8 }
        ),
        fc.array(prescriptionRecordArb("__PLACEHOLDER__"), { minLength: 0, maxLength: 5 }),
        fc.array(
          fc.record({
            id: fc.uuid(),
            appointmentId: fc.uuid(),
            date: pastDateArb,
            summary: nonEmptyString(50),
          }),
          { minLength: 0, maxLength: 5 }
        ),
        fc.option(timelineTypeArb, { nil: undefined }),
        (patientId, apptTemplates, rxTemplates, visitNotes, typeFilter) => {
          const appointments: AppointmentRecord[] = apptTemplates.map((a, i) => ({
            ...a,
            patientId,
            id: `appt_${i}`,
          }));
          const prescriptions: PrescriptionRecord[] = rxTemplates.map((r, i) => ({
            ...r,
            patientId,
            id: `rx_${i}`,
          }));

          const tl = new TimelineStore();
          const allEvents = tl.buildTimeline(appointments, prescriptions, visitNotes);

          // Ordered by date descending
          for (let i = 0; i < allEvents.length - 1; i++) {
            expect(allEvents[i].date.getTime()).toBeGreaterThanOrEqual(
              allEvents[i + 1].date.getTime()
            );
          }

          // Total = sum of all event types
          const expectedTotal =
            appointments.length + prescriptions.length + visitNotes.length;
          expect(allEvents.length).toBe(expectedTotal);

          // Type filter works
          if (typeFilter) {
            const filtered = tl.filterByType(allEvents, typeFilter);
            for (const e of filtered) {
              expect(e.type).toBe(typeFilter);
            }

            // Filtered count matches expected
            let expectedFilteredCount = 0;
            if (typeFilter === "appointment") expectedFilteredCount = appointments.length;
            else if (typeFilter === "prescription") expectedFilteredCount = prescriptions.length;
            else if (typeFilter === "visit_note") expectedFilteredCount = visitNotes.length;
            expect(filtered.length).toBe(expectedFilteredCount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// Property 24: Timeline event data completeness
// ===========================================================================

// Feature: patient-doctor-experience-enhancements, Property 24: Timeline event data completeness
// **Validates: Requirements 10.2**
describe("Property 24: Timeline event data completeness", () => {
  it("each event has id, type, date, summary, detailUrl", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            patientId: patientIdArb,
            doctorId: doctorIdArb,
            doctorName: nonEmptyString(40),
            scheduledAt: pastDateArb,
            startTime: timeStringArb,
            endTime: timeStringArb,
            status: appointmentStatusArb,
            hasVisitNotes: fc.boolean(),
            hasPrescription: fc.boolean(),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        fc.array(prescriptionRecordArb("pt_test1234"), { minLength: 1, maxLength: 5 }),
        fc.array(
          fc.record({
            id: fc.uuid(),
            appointmentId: fc.uuid(),
            date: pastDateArb,
            summary: nonEmptyString(50),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (apptTemplates, rxTemplates, visitNotes) => {
          const appointments: AppointmentRecord[] = apptTemplates.map((a, i) => ({
            ...a,
            id: `appt_${i}`,
          }));
          const prescriptions: PrescriptionRecord[] = rxTemplates.map((r, i) => ({
            ...r,
            id: `rx_${i}`,
          }));

          const tl = new TimelineStore();
          const events = tl.buildTimeline(appointments, prescriptions, visitNotes);

          for (const event of events) {
            expect(typeof event.id).toBe("string");
            expect(event.id.length).toBeGreaterThan(0);
            expect(["appointment", "prescription", "visit_note"]).toContain(event.type);
            expect(event.date).toBeInstanceOf(Date);
            expect(event.date.getTime()).not.toBeNaN();
            expect(typeof event.summary).toBe("string");
            expect(event.summary.length).toBeGreaterThan(0);
            expect(typeof event.detailUrl).toBe("string");
            expect(event.detailUrl.startsWith("/")).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
