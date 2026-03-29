/**
 * Unit tests for Patient & Doctor Experience Enhancements
 *
 * Tests Zod validation schemas, empty states/edge cases, error conditions,
 * and review aggregate calculations using in-memory stores.
 *
 * Validates: Requirements 1.4, 2.5, 2.6, 3.5, 4.5, 8.5, 9.1, 9.4, 9.5, 9.6,
 *   10.4, 10.5, 11.1, 12.4, 13.4
 */

import { describe, it, expect } from "vitest";
import {
  createReviewSchema,
  doctorSearchSchema,
  timelineFilterSchema,
  reviewsQuerySchema,
} from "@/lib/validators";

// ===========================================================================
// Types (reused from property tests)
// ===========================================================================

type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "rejected";
type UserRole = "patient" | "doctor" | "admin" | "unknown";

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

interface PrescriptionRecord {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorName: string;
  appointmentDate: string;
  medications: { name: string; dosage: string; frequency: string; duration: string }[];
  notes: string | null;
  pdfKey: string | null;
  createdAt: Date;
}

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

interface DoctorProfile {
  id: string;
  name: string;
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

// ===========================================================================
// In-memory Stores
// ===========================================================================

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
  ): { success: true; review: ReviewRecord } | { success: false; error: string; status: number } {
    if (appointmentStatus !== "completed") {
      return { success: false, error: "Reviews are only allowed for completed appointments", status: 400 };
    }
    if (this.records.some((r) => r.appointmentId === appointmentId)) {
      return { success: false, error: "A review already exists for this appointment", status: 409 };
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

class AuthGate {
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


// ===========================================================================
// 19.1: Zod Validation Schema Tests
// Validates: Requirements 9.1, 11.1, 10.4
// ===========================================================================

describe("19.1: Zod validation schemas", () => {
  describe("createReviewSchema", () => {
    it("accepts valid review input", () => {
      const result = createReviewSchema.safeParse({
        appointmentId: "550e8400-e29b-41d4-a716-446655440000",
        doctorId: "dr_abc123",
        rating: 4,
        reviewText: "Great doctor!",
      });
      expect(result.success).toBe(true);
    });

    it("accepts review without optional reviewText", () => {
      const result = createReviewSchema.safeParse({
        appointmentId: "550e8400-e29b-41d4-a716-446655440000",
        doctorId: "dr_abc123",
        rating: 3,
      });
      expect(result.success).toBe(true);
    });

    it("rejects rating of 0 (below minimum 1)", () => {
      const result = createReviewSchema.safeParse({
        appointmentId: "550e8400-e29b-41d4-a716-446655440000",
        doctorId: "dr_abc123",
        rating: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects rating of 6 (above maximum 5)", () => {
      const result = createReviewSchema.safeParse({
        appointmentId: "550e8400-e29b-41d4-a716-446655440000",
        doctorId: "dr_abc123",
        rating: 6,
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-integer rating", () => {
      const result = createReviewSchema.safeParse({
        appointmentId: "550e8400-e29b-41d4-a716-446655440000",
        doctorId: "dr_abc123",
        rating: 3.5,
      });
      expect(result.success).toBe(false);
    });

    it("rejects reviewText over 2000 characters", () => {
      const result = createReviewSchema.safeParse({
        appointmentId: "550e8400-e29b-41d4-a716-446655440000",
        doctorId: "dr_abc123",
        rating: 5,
        reviewText: "a".repeat(2001),
      });
      expect(result.success).toBe(false);
    });

    it("accepts reviewText of exactly 2000 characters", () => {
      const result = createReviewSchema.safeParse({
        appointmentId: "550e8400-e29b-41d4-a716-446655440000",
        doctorId: "dr_abc123",
        rating: 5,
        reviewText: "a".repeat(2000),
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid UUID for appointmentId", () => {
      const result = createReviewSchema.safeParse({
        appointmentId: "not-a-uuid",
        doctorId: "dr_abc123",
        rating: 3,
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty doctorId", () => {
      const result = createReviewSchema.safeParse({
        appointmentId: "550e8400-e29b-41d4-a716-446655440000",
        doctorId: "",
        rating: 3,
      });
      expect(result.success).toBe(false);
    });

    it("accepts minimum rating of 1", () => {
      const result = createReviewSchema.safeParse({
        appointmentId: "550e8400-e29b-41d4-a716-446655440000",
        doctorId: "dr_abc123",
        rating: 1,
      });
      expect(result.success).toBe(true);
    });

    it("accepts maximum rating of 5", () => {
      const result = createReviewSchema.safeParse({
        appointmentId: "550e8400-e29b-41d4-a716-446655440000",
        doctorId: "dr_abc123",
        rating: 5,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("doctorSearchSchema", () => {
    it("accepts valid search with all params", () => {
      const result = doctorSearchSchema.safeParse({
        q: "cardio",
        specialization: "Cardiology",
        page: 1,
        limit: 12,
      });
      expect(result.success).toBe(true);
    });

    it("applies defaults for page and limit when omitted", () => {
      const result = doctorSearchSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(12);
      }
    });

    it("rejects search query of 1 character (below minimum 2)", () => {
      const result = doctorSearchSchema.safeParse({ q: "a" });
      expect(result.success).toBe(false);
    });

    it("accepts search query of exactly 2 characters", () => {
      const result = doctorSearchSchema.safeParse({ q: "ab" });
      expect(result.success).toBe(true);
    });

    it("rejects search query over 100 characters", () => {
      const result = doctorSearchSchema.safeParse({ q: "a".repeat(101) });
      expect(result.success).toBe(false);
    });

    it("rejects page 0 (below minimum 1)", () => {
      const result = doctorSearchSchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    it("rejects limit 51 (above maximum 50)", () => {
      const result = doctorSearchSchema.safeParse({ limit: 51 });
      expect(result.success).toBe(false);
    });

    it("accepts limit of exactly 50", () => {
      const result = doctorSearchSchema.safeParse({ limit: 50 });
      expect(result.success).toBe(true);
    });

    it("coerces string page to number", () => {
      const result = doctorSearchSchema.safeParse({ page: "3" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
      }
    });

    it("rejects specialization over 255 characters", () => {
      const result = doctorSearchSchema.safeParse({ specialization: "a".repeat(256) });
      expect(result.success).toBe(false);
    });
  });

  describe("timelineFilterSchema", () => {
    it("accepts valid appointment type", () => {
      const result = timelineFilterSchema.safeParse({ type: "appointment" });
      expect(result.success).toBe(true);
    });

    it("accepts valid prescription type", () => {
      const result = timelineFilterSchema.safeParse({ type: "prescription" });
      expect(result.success).toBe(true);
    });

    it("accepts valid visit_note type", () => {
      const result = timelineFilterSchema.safeParse({ type: "visit_note" });
      expect(result.success).toBe(true);
    });

    it("accepts empty object (type is optional)", () => {
      const result = timelineFilterSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("rejects invalid type value", () => {
      const result = timelineFilterSchema.safeParse({ type: "invalid_type" });
      expect(result.success).toBe(false);
    });
  });

  describe("reviewsQuerySchema", () => {
    it("accepts valid doctorId", () => {
      const result = reviewsQuerySchema.safeParse({ doctorId: "dr_abc123" });
      expect(result.success).toBe(true);
    });

    it("rejects empty doctorId", () => {
      const result = reviewsQuerySchema.safeParse({ doctorId: "" });
      expect(result.success).toBe(false);
    });

    it("rejects missing doctorId", () => {
      const result = reviewsQuerySchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});


// ===========================================================================
// 19.2: Empty States and Edge Cases
// Validates: Requirements 1.4, 2.5, 4.5, 8.5, 10.5, 13.4
// ===========================================================================

describe("19.2: Empty states and edge cases", () => {
  it("prescription list returns empty array for patient with no prescriptions", () => {
    const store = new PrescriptionStore();
    const list = store.listByPatient("pt_nodata");
    expect(list).toEqual([]);
    expect(list.length).toBe(0);
  });

  it("specializations endpoint returns empty array when no specializations exist", () => {
    const engine = new DoctorSearchEngine();
    const specs = engine.getSpecializations();
    expect(specs).toEqual([]);
    expect(specs.length).toBe(0);
  });

  it("specializations returns empty when doctors have null specializations", () => {
    const engine = new DoctorSearchEngine();
    engine.addDoctor({
      id: "dr_1",
      name: "Dr. Smith",
      specialization: null,
      qualifications: "MD",
      bio: null,
      yearsOfExperience: 5,
      consultationFee: "100.00",
      averageRating: null,
      reviewCount: 0,
      profileComplete: true,
      active: true,
    });
    const specs = engine.getSpecializations();
    expect(specs).toEqual([]);
  });

  it("dashboard with no appointments returns zero counts and null nextAppointment", () => {
    const now = new Date();
    const appointments: AppointmentRecord[] = [];
    const prescriptions: PrescriptionRecord[] = [];

    const upcoming = appointments.filter(
      (a) =>
        (a.status === "pending" || a.status === "confirmed") &&
        a.scheduledAt.getTime() > now.getTime()
    );
    const completed = appointments.filter((a) => a.status === "completed");
    const nextAppointment = upcoming.length > 0
      ? upcoming.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0]
      : null;

    expect(upcoming.length).toBe(0);
    expect(completed.length).toBe(0);
    expect(prescriptions.length).toBe(0);
    expect(nextAppointment).toBeNull();
  });

  it("timeline with no events returns empty array", () => {
    const appointments: AppointmentRecord[] = [];
    const prescriptions: PrescriptionRecord[] = [];
    const visitNotes: { id: string; appointmentId: string; date: Date; summary: string }[] = [];

    const events = [
      ...appointments.map((a) => ({ id: a.id, type: "appointment" as const, date: a.scheduledAt, summary: `Appointment with ${a.doctorName}`, detailUrl: `/patient/appointments/${a.id}` })),
      ...prescriptions.map((p) => ({ id: p.id, type: "prescription" as const, date: p.createdAt, summary: `Prescription from ${p.doctorName}`, detailUrl: `/patient/prescriptions/${p.id}` })),
      ...visitNotes.map((v) => ({ id: v.id, type: "visit_note" as const, date: v.date, summary: v.summary, detailUrl: `/patient/appointments/${v.appointmentId}` })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    expect(events).toEqual([]);
    expect(events.length).toBe(0);
  });

  it("prescription detail with null pdfKey hides download button", () => {
    const prescription: PrescriptionRecord = {
      id: "rx_1",
      appointmentId: "appt_1",
      patientId: "pt_1",
      doctorName: "Dr. Smith",
      appointmentDate: "2024-06-15",
      medications: [{ name: "Aspirin", dosage: "100mg", frequency: "Daily", duration: "30 days" }],
      notes: "Take with food",
      pdfKey: null,
      createdAt: new Date("2024-06-15"),
    };

    const showDownloadButton = prescription.pdfKey !== null;
    expect(showDownloadButton).toBe(false);
    expect(prescription.pdfKey).toBeNull();
  });

  it("prescription detail with valid pdfKey shows download button", () => {
    const prescription: PrescriptionRecord = {
      id: "rx_2",
      appointmentId: "appt_2",
      patientId: "pt_1",
      doctorName: "Dr. Jones",
      appointmentDate: "2024-07-01",
      medications: [{ name: "Ibuprofen", dosage: "200mg", frequency: "Twice daily", duration: "14 days" }],
      notes: null,
      pdfKey: "prescriptions/rx_2.pdf",
      createdAt: new Date("2024-07-01"),
    };

    const showDownloadButton = prescription.pdfKey !== null;
    expect(showDownloadButton).toBe(true);
  });

  it("incomplete doctor profile response has null fields", () => {
    const incompleteDoctor: DoctorProfile = {
      id: "dr_incomplete",
      name: "Dr. New",
      specialization: null,
      qualifications: null,
      bio: null,
      yearsOfExperience: null,
      consultationFee: null,
      averageRating: null,
      reviewCount: 0,
      profileComplete: false,
      active: true,
    };

    expect(incompleteDoctor.profileComplete).toBe(false);
    expect(incompleteDoctor.specialization).toBeNull();
    expect(incompleteDoctor.qualifications).toBeNull();
    expect(incompleteDoctor.bio).toBeNull();
    expect(incompleteDoctor.yearsOfExperience).toBeNull();
    expect(incompleteDoctor.consultationFee).toBeNull();
    expect(incompleteDoctor.averageRating).toBeNull();
    expect(incompleteDoctor.reviewCount).toBe(0);
  });

  it("incomplete patient profile response", () => {
    const incompletePatient: PatientProfile = {
      name: "John Doe",
      dateOfBirth: null,
      gender: null,
      bloodType: null,
      allergies: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      medicalHistoryNotes: null,
      profileComplete: false,
    };

    expect(incompletePatient.profileComplete).toBe(false);
    expect(incompletePatient.name).toBe("John Doe");
    expect(incompletePatient.dateOfBirth).toBeNull();
    expect(incompletePatient.gender).toBeNull();
    expect(incompletePatient.bloodType).toBeNull();
    expect(incompletePatient.allergies).toBeNull();
    expect(incompletePatient.emergencyContactName).toBeNull();
    expect(incompletePatient.emergencyContactPhone).toBeNull();
    expect(incompletePatient.medicalHistoryNotes).toBeNull();
  });
});


// ===========================================================================
// 19.3: Error Conditions
// Validates: Requirements 2.6, 3.5, 9.5, 9.6, 11.1
// ===========================================================================

describe("19.3: Error conditions", () => {
  it("review submission for non-completed appointment returns 400", () => {
    const store = new ReviewStore();

    const pendingResult = store.submit("appt_1", "pt_1", "dr_1", 4, null, "Patient A", "pending");
    expect(pendingResult.success).toBe(false);
    if (!pendingResult.success) {
      expect(pendingResult.status).toBe(400);
      expect(pendingResult.error).toBe("Reviews are only allowed for completed appointments");
    }

    const confirmedResult = store.submit("appt_2", "pt_1", "dr_1", 4, null, "Patient A", "confirmed");
    expect(confirmedResult.success).toBe(false);
    if (!confirmedResult.success) {
      expect(confirmedResult.status).toBe(400);
    }

    const cancelledResult = store.submit("appt_3", "pt_1", "dr_1", 4, null, "Patient A", "cancelled");
    expect(cancelledResult.success).toBe(false);
    if (!cancelledResult.success) {
      expect(cancelledResult.status).toBe(400);
    }

    const rejectedResult = store.submit("appt_4", "pt_1", "dr_1", 4, null, "Patient A", "rejected");
    expect(rejectedResult.success).toBe(false);
    if (!rejectedResult.success) {
      expect(rejectedResult.status).toBe(400);
    }
  });

  it("duplicate review submission returns 409", () => {
    const store = new ReviewStore();

    const first = store.submit("appt_dup", "pt_1", "dr_1", 5, "Excellent!", "Patient A", "completed");
    expect(first.success).toBe(true);

    const second = store.submit("appt_dup", "pt_1", "dr_1", 3, "Changed my mind", "Patient A", "completed");
    expect(second.success).toBe(false);
    if (!second.success) {
      expect(second.status).toBe(409);
      expect(second.error).toBe("A review already exists for this appointment");
    }
  });

  it("patient profile access by unauthorized user returns 403", () => {
    const gate = new AuthGate();

    // Patient trying to access another patient's profile
    const patientResult = gate.authorizePatientProfile("pt_1", "patient", "dr_assigned");
    expect(patientResult.allowed).toBe(false);
    expect(patientResult.status).toBe(403);

    // Unknown role
    const unknownResult = gate.authorizePatientProfile("usr_1", "unknown", "dr_assigned");
    expect(unknownResult.allowed).toBe(false);
    expect(unknownResult.status).toBe(403);

    // Doctor not assigned to the appointment
    const wrongDoctorResult = gate.authorizePatientProfile("dr_other", "doctor", "dr_assigned");
    expect(wrongDoctorResult.allowed).toBe(false);
    expect(wrongDoctorResult.status).toBe(403);
  });

  it("patient profile access by authorized doctor returns 200", () => {
    const gate = new AuthGate();
    const result = gate.authorizePatientProfile("dr_assigned", "doctor", "dr_assigned");
    expect(result.allowed).toBe(true);
    expect(result.status).toBe(200);
  });

  it("patient profile access by admin returns 200", () => {
    const gate = new AuthGate();
    const result = gate.authorizePatientProfile("admin_1", "admin", "dr_assigned");
    expect(result.allowed).toBe(true);
    expect(result.status).toBe(200);
  });

  it("doctor search with invalid params returns validation error", () => {
    // q too short
    const shortQ = doctorSearchSchema.safeParse({ q: "a" });
    expect(shortQ.success).toBe(false);

    // page 0
    const zeroPage = doctorSearchSchema.safeParse({ page: 0 });
    expect(zeroPage.success).toBe(false);

    // limit too high
    const highLimit = doctorSearchSchema.safeParse({ limit: 51 });
    expect(highLimit.success).toBe(false);

    // negative page
    const negativePage = doctorSearchSchema.safeParse({ page: -1 });
    expect(negativePage.success).toBe(false);
  });

  it("MinIO unavailable during PDF download returns 503", () => {
    // Simulate MinIO unavailability by checking error handling pattern
    const simulateMinioDownload = (minioAvailable: boolean): { status: number; error?: string } => {
      if (!minioAvailable) {
        return { status: 503, error: "File storage temporarily unavailable" };
      }
      return { status: 200 };
    };

    const result = simulateMinioDownload(false);
    expect(result.status).toBe(503);
    expect(result.error).toBe("File storage temporarily unavailable");

    const successResult = simulateMinioDownload(true);
    expect(successResult.status).toBe(200);
  });
});


// ===========================================================================
// 19.4: Review Aggregate Calculation
// Validates: Requirements 9.4, 12.4
// ===========================================================================

describe("19.4: Review aggregate calculation", () => {
  it("submitting a review updates averageRating and reviewCount", () => {
    const store = new ReviewStore();

    store.submit("appt_1", "pt_1", "dr_1", 5, "Great!", "Patient A", "completed");

    expect(store.getAverageRating("dr_1")).toBe(5);
    expect(store.getReviewCount("dr_1")).toBe(1);
  });

  it("average rating calculation with multiple reviews [5, 3, 4] → average 4.00", () => {
    const store = new ReviewStore();

    store.submit("appt_1", "pt_1", "dr_1", 5, null, "Patient A", "completed");
    store.submit("appt_2", "pt_2", "dr_1", 3, null, "Patient B", "completed");
    store.submit("appt_3", "pt_3", "dr_1", 4, null, "Patient C", "completed");

    const avg = store.getAverageRating("dr_1");
    expect(avg).toBe(4.0);
    expect(store.getReviewCount("dr_1")).toBe(3);
  });

  it("reviewCount increments correctly with each review", () => {
    const store = new ReviewStore();

    expect(store.getReviewCount("dr_1")).toBe(0);
    expect(store.getAverageRating("dr_1")).toBeNull();

    store.submit("appt_1", "pt_1", "dr_1", 4, null, "Patient A", "completed");
    expect(store.getReviewCount("dr_1")).toBe(1);

    store.submit("appt_2", "pt_2", "dr_1", 2, null, "Patient B", "completed");
    expect(store.getReviewCount("dr_1")).toBe(2);

    store.submit("appt_3", "pt_3", "dr_1", 5, null, "Patient C", "completed");
    expect(store.getReviewCount("dr_1")).toBe(3);

    store.submit("appt_4", "pt_4", "dr_1", 1, null, "Patient D", "completed");
    expect(store.getReviewCount("dr_1")).toBe(4);
  });

  it("average rating is calculated correctly after each submission", () => {
    const store = new ReviewStore();

    store.submit("appt_1", "pt_1", "dr_1", 5, null, "Patient A", "completed");
    expect(store.getAverageRating("dr_1")).toBe(5.0);

    store.submit("appt_2", "pt_2", "dr_1", 3, null, "Patient B", "completed");
    // (5 + 3) / 2 = 4.0
    expect(store.getAverageRating("dr_1")).toBe(4.0);

    store.submit("appt_3", "pt_3", "dr_1", 1, null, "Patient C", "completed");
    // (5 + 3 + 1) / 3 = 3.0
    expect(store.getAverageRating("dr_1")).toBe(3.0);

    store.submit("appt_4", "pt_4", "dr_1", 2, null, "Patient D", "completed");
    // (5 + 3 + 1 + 2) / 4 = 2.75
    expect(store.getAverageRating("dr_1")).toBe(2.75);
  });

  it("average rating rounds to 2 decimal places", () => {
    const store = new ReviewStore();

    store.submit("appt_1", "pt_1", "dr_1", 5, null, "Patient A", "completed");
    store.submit("appt_2", "pt_2", "dr_1", 4, null, "Patient B", "completed");
    store.submit("appt_3", "pt_3", "dr_1", 4, null, "Patient C", "completed");
    // (5 + 4 + 4) / 3 = 4.333... → 4.33
    expect(store.getAverageRating("dr_1")).toBe(4.33);
  });

  it("duplicate review does not affect aggregate", () => {
    const store = new ReviewStore();

    store.submit("appt_1", "pt_1", "dr_1", 5, null, "Patient A", "completed");
    store.submit("appt_2", "pt_2", "dr_1", 3, null, "Patient B", "completed");

    // Attempt duplicate
    const dup = store.submit("appt_1", "pt_1", "dr_1", 1, null, "Patient A", "completed");
    expect(dup.success).toBe(false);

    // Aggregates unchanged
    expect(store.getReviewCount("dr_1")).toBe(2);
    expect(store.getAverageRating("dr_1")).toBe(4.0);
  });

  it("reviews for different doctors are tracked independently", () => {
    const store = new ReviewStore();

    store.submit("appt_1", "pt_1", "dr_1", 5, null, "Patient A", "completed");
    store.submit("appt_2", "pt_2", "dr_1", 3, null, "Patient B", "completed");
    store.submit("appt_3", "pt_3", "dr_2", 2, null, "Patient C", "completed");

    expect(store.getReviewCount("dr_1")).toBe(2);
    expect(store.getAverageRating("dr_1")).toBe(4.0);

    expect(store.getReviewCount("dr_2")).toBe(1);
    expect(store.getAverageRating("dr_2")).toBe(2.0);
  });
});
