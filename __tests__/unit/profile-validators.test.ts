/**
 * Unit tests for profile validation edge cases.
 *
 * Tests boundary values and specific invalid inputs for both
 * doctor and patient Zod schemas from lib/validators.ts.
 *
 * Validates: Requirements 9.4, 10.4
 */

import { describe, it, expect } from "vitest";
import {
  updateDoctorProfileSchema,
  updatePatientProfileSchema,
} from "@/lib/validators";

// ---------------------------------------------------------------------------
// Helper: valid base objects
// ---------------------------------------------------------------------------
const validDoctor = {
  specialization: "Cardiology",
  consultationFee: 100,
  yearsOfExperience: 5,
};

// ---------------------------------------------------------------------------
// 1. Doctor profile — boundary values
// Validates: Requirement 9.4
// ---------------------------------------------------------------------------
describe("Doctor profile validation", () => {
  describe("consultationFee boundaries", () => {
    it("accepts fee = 0", () => {
      const result = updateDoctorProfileSchema.safeParse({
        ...validDoctor,
        consultationFee: 0,
      });
      expect(result.success).toBe(true);
    });

    it("rejects fee = -0.01", () => {
      const result = updateDoctorProfileSchema.safeParse({
        ...validDoctor,
        consultationFee: -0.01,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("yearsOfExperience boundaries", () => {
    it("accepts years = 0", () => {
      const result = updateDoctorProfileSchema.safeParse({
        ...validDoctor,
        yearsOfExperience: 0,
      });
      expect(result.success).toBe(true);
    });

    it("rejects years = -1", () => {
      const result = updateDoctorProfileSchema.safeParse({
        ...validDoctor,
        yearsOfExperience: -1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("specialization", () => {
    it("rejects empty specialization", () => {
      const result = updateDoctorProfileSchema.safeParse({
        ...validDoctor,
        specialization: "",
      });
      expect(result.success).toBe(false);
    });

    it("accepts specialization with 1 character", () => {
      const result = updateDoctorProfileSchema.safeParse({
        ...validDoctor,
        specialization: "X",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("phone with country code", () => {
    it('accepts phone with country code "+1 (555) 123-4567"', () => {
      const result = updateDoctorProfileSchema.safeParse({
        ...validDoctor,
        phone: "+1 (555) 123-4567",
      });
      expect(result.success).toBe(true);
    });

    it('rejects phone "abc"', () => {
      const result = updateDoctorProfileSchema.safeParse({
        ...validDoctor,
        phone: "abc",
      });
      expect(result.success).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// 2. Patient profile — date of birth
// Validates: Requirement 10.4
// ---------------------------------------------------------------------------
describe("Patient profile validation", () => {
  describe("dateOfBirth", () => {
    it("accepts today's date (midnight UTC is before current time)", () => {
      // The schema checks `new Date(d) < new Date()`. Parsing "YYYY-MM-DD"
      // yields midnight UTC, which is earlier than the current wall-clock
      // time (unless the test runs exactly at midnight UTC).
      const today = new Date().toISOString().split("T")[0];
      const result = updatePatientProfileSchema.safeParse({
        dateOfBirth: today,
      });
      expect(result.success).toBe(true);
    });

    it("accepts yesterday's date", () => {
      const yesterday = new Date(Date.now() - 86_400_000)
        .toISOString()
        .split("T")[0];
      const result = updatePatientProfileSchema.safeParse({
        dateOfBirth: yesterday,
      });
      expect(result.success).toBe(true);
    });

    it("rejects a future date", () => {
      const future = new Date(Date.now() + 86_400_000 * 30)
        .toISOString()
        .split("T")[0];
      const result = updatePatientProfileSchema.safeParse({
        dateOfBirth: future,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("bloodType", () => {
    it.each(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const)(
      "accepts valid blood type %s",
      (bt) => {
        const result = updatePatientProfileSchema.safeParse({ bloodType: bt });
        expect(result.success).toBe(true);
      }
    );

    it("rejects invalid blood type", () => {
      const result = updatePatientProfileSchema.safeParse({
        bloodType: "C+",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("gender", () => {
    it.each(["male", "female", "other", "prefer_not_to_say"] as const)(
      "accepts valid gender %s",
      (g) => {
        const result = updatePatientProfileSchema.safeParse({ gender: g });
        expect(result.success).toBe(true);
      }
    );

    it("rejects invalid gender", () => {
      const result = updatePatientProfileSchema.safeParse({
        gender: "unknown",
      });
      expect(result.success).toBe(false);
    });
  });
});
