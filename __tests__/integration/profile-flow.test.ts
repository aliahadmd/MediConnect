/**
 * Integration test: Profile Flow
 *
 * Simulates profile creation, update, photo upload validation,
 * and doctor profile display in the booking flow using in-memory stores.
 *
 * Uses the actual Zod validation schemas from lib/validators.ts
 * and photo validation constants from lib/profile-photo.ts
 *
 * Validates: Requirements 9.3, 11.2
 */

import { describe, it, expect, beforeEach } from "vitest";
import { randomUUID } from "crypto";
import {
  updateDoctorProfileSchema,
  updatePatientProfileSchema,
} from "@/lib/validators";
import {
  ALLOWED_TYPES,
  MAX_FILE_SIZE,
  MAX_DIMENSION,
} from "@/lib/profile-photo";

// ---------------------------------------------------------------------------
// In-memory store for profile flow
// ---------------------------------------------------------------------------

type Role = "patient" | "doctor";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  image: string | null;
}

interface DoctorProfile {
  id: string;
  userId: string;
  specialization: string;
  qualifications?: string;
  bio?: string;
  phone?: string;
  consultationFee: number;
  yearsOfExperience: number;
}

interface PatientProfile {
  id: string;
  userId: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bloodType?: string;
  allergies?: string;
  medicalHistoryNotes?: string;
}

interface StoredPhoto {
  key: string;
  size: number;
  type: string;
  width: number;
  height: number;
}

class InMemoryProfileStore {
  users: User[] = [];
  doctorProfiles: DoctorProfile[] = [];
  patientProfiles: PatientProfile[] = [];
  photos: Map<string, StoredPhoto> = new Map();

  registerUser(name: string, email: string, role: Role): User {
    const user: User = { id: randomUUID(), name, email, role, image: null };
    this.users.push(user);
    return user;
  }

  upsertDoctorProfile(userId: string, data: unknown): DoctorProfile {
    const user = this.users.find((u) => u.id === userId && u.role === "doctor");
    if (!user) throw new Error("Doctor not found");

    const parsed = updateDoctorProfileSchema.parse(data);

    const existing = this.doctorProfiles.find((p) => p.userId === userId);
    if (existing) {
      Object.assign(existing, parsed);
      return existing;
    }

    const profile: DoctorProfile = { id: randomUUID(), userId, ...parsed };
    this.doctorProfiles.push(profile);
    return profile;
  }

  getDoctorProfile(userId: string): DoctorProfile | null {
    return this.doctorProfiles.find((p) => p.userId === userId) ?? null;
  }

  upsertPatientProfile(userId: string, data: unknown): PatientProfile {
    const user = this.users.find((u) => u.id === userId && u.role === "patient");
    if (!user) throw new Error("Patient not found");

    const parsed = updatePatientProfileSchema.parse(data);

    const existing = this.patientProfiles.find((p) => p.userId === userId);
    if (existing) {
      Object.assign(existing, parsed);
      return existing;
    }

    const profile: PatientProfile = { id: randomUUID(), userId, ...parsed };
    this.patientProfiles.push(profile);
    return profile;
  }

  getPatientProfile(userId: string): PatientProfile | null {
    return this.patientProfiles.find((p) => p.userId === userId) ?? null;
  }

  /**
   * Simulates photo upload validation and storage.
   * Mirrors the validation logic from lib/profile-photo.ts processAndUploadPhoto.
   */
  uploadPhoto(userId: string, fileType: string, fileSize: number, width: number, height: number): string {
    if (!ALLOWED_TYPES.includes(fileType)) {
      throw new Error("Invalid file type. Accepted: JPEG, PNG, WebP");
    }
    if (fileSize > MAX_FILE_SIZE) {
      throw new Error("File size exceeds 5MB limit");
    }

    // Simulate resize: constrain to MAX_DIMENSION
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    const resizedWidth = Math.round(width * scale);
    const resizedHeight = Math.round(height * scale);

    const key = `${userId}.webp`;

    // Delete old photo if exists (mirrors processAndUploadPhoto behavior)
    this.photos.delete(key);

    this.photos.set(key, {
      key,
      size: fileSize,
      type: "image/webp",
      width: resizedWidth,
      height: resizedHeight,
    });

    // Update user image reference
    const user = this.users.find((u) => u.id === userId);
    if (user) user.image = key;

    return key;
  }

  getPhoto(key: string): StoredPhoto | undefined {
    return this.photos.get(key);
  }

  getDoctorsForBooking(): Array<User & { profile: DoctorProfile | null }> {
    return this.users
      .filter((u) => u.role === "doctor")
      .map((u) => ({
        ...u,
        profile: this.getDoctorProfile(u.id),
      }));
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Profile Flow Integration", () => {
  let store: InMemoryProfileStore;
  let doctor: User;
  let patient: User;

  beforeEach(() => {
    store = new InMemoryProfileStore();
    doctor = store.registerUser("Dr. Smith", "smith@example.com", "doctor");
    patient = store.registerUser("Jane Doe", "jane@example.com", "patient");
  });

  describe("Doctor profile create → retrieve round-trip", () => {
    it("creates and retrieves a doctor profile with all fields", () => {
      const profileData = {
        specialization: "Cardiology",
        qualifications: "MD, FACC",
        bio: "Board-certified cardiologist with 15 years of experience",
        phone: "+1 (555) 123-4567",
        consultationFee: 150,
        yearsOfExperience: 15,
      };

      const created = store.upsertDoctorProfile(doctor.id, profileData);
      expect(created.userId).toBe(doctor.id);
      expect(created.specialization).toBe("Cardiology");

      const retrieved = store.getDoctorProfile(doctor.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.specialization).toBe(profileData.specialization);
      expect(retrieved!.qualifications).toBe(profileData.qualifications);
      expect(retrieved!.bio).toBe(profileData.bio);
      expect(retrieved!.consultationFee).toBe(profileData.consultationFee);
      expect(retrieved!.yearsOfExperience).toBe(profileData.yearsOfExperience);
    });

    it("updates an existing doctor profile", () => {
      store.upsertDoctorProfile(doctor.id, {
        specialization: "Cardiology",
        consultationFee: 100,
        yearsOfExperience: 10,
      });

      store.upsertDoctorProfile(doctor.id, {
        specialization: "Interventional Cardiology",
        consultationFee: 200,
        yearsOfExperience: 12,
      });

      const retrieved = store.getDoctorProfile(doctor.id);
      expect(retrieved!.specialization).toBe("Interventional Cardiology");
      expect(retrieved!.consultationFee).toBe(200);
      // Only one profile exists
      expect(store.doctorProfiles.filter((p) => p.userId === doctor.id)).toHaveLength(1);
    });

    it("returns null for doctor without a profile", () => {
      expect(store.getDoctorProfile(doctor.id)).toBeNull();
    });

    it("rejects invalid doctor profile data", () => {
      expect(() =>
        store.upsertDoctorProfile(doctor.id, {
          specialization: "",
          consultationFee: -10,
          yearsOfExperience: 5,
        })
      ).toThrow();
    });
  });

  describe("Patient profile create → retrieve round-trip", () => {
    it("creates and retrieves a patient profile with all fields", () => {
      const profileData = {
        dateOfBirth: "1990-05-15",
        gender: "female" as const,
        phone: "+1 (555) 987-6543",
        address: "123 Main St, Springfield",
        emergencyContactName: "John Doe",
        emergencyContactPhone: "+1 (555) 111-2222",
        bloodType: "O+" as const,
        allergies: "Penicillin",
        medicalHistoryNotes: "No major surgeries",
      };

      const created = store.upsertPatientProfile(patient.id, profileData);
      expect(created.userId).toBe(patient.id);

      const retrieved = store.getPatientProfile(patient.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.dateOfBirth).toBe(profileData.dateOfBirth);
      expect(retrieved!.gender).toBe(profileData.gender);
      expect(retrieved!.bloodType).toBe(profileData.bloodType);
      expect(retrieved!.allergies).toBe(profileData.allergies);
      expect(retrieved!.emergencyContactName).toBe(profileData.emergencyContactName);
    });

    it("updates an existing patient profile", () => {
      store.upsertPatientProfile(patient.id, { phone: "+1 (555) 000-0000" });
      store.upsertPatientProfile(patient.id, {
        phone: "+1 (555) 999-9999",
        bloodType: "AB-" as const,
      });

      const retrieved = store.getPatientProfile(patient.id);
      expect(retrieved!.phone).toBe("+1 (555) 999-9999");
      expect(retrieved!.bloodType).toBe("AB-");
      expect(store.patientProfiles.filter((p) => p.userId === patient.id)).toHaveLength(1);
    });

    it("returns null for patient without a profile", () => {
      expect(store.getPatientProfile(patient.id)).toBeNull();
    });
  });

  describe("Photo upload validation and storage", () => {
    it("accepts valid JPEG and stores resized photo", () => {
      const key = store.uploadPhoto(doctor.id, "image/jpeg", 2 * 1024 * 1024, 800, 600);
      expect(key).toBe(`${doctor.id}.webp`);

      const photo = store.getPhoto(key);
      expect(photo).toBeDefined();
      expect(photo!.width).toBeLessThanOrEqual(MAX_DIMENSION);
      expect(photo!.height).toBeLessThanOrEqual(MAX_DIMENSION);
      expect(photo!.type).toBe("image/webp");
    });

    it("accepts valid PNG and WebP types", () => {
      expect(() => store.uploadPhoto(doctor.id, "image/png", 1024, 100, 100)).not.toThrow();
      expect(() => store.uploadPhoto(doctor.id, "image/webp", 1024, 100, 100)).not.toThrow();
    });

    it("rejects invalid file type", () => {
      expect(() => store.uploadPhoto(doctor.id, "image/gif", 1024, 100, 100)).toThrow(
        "Invalid file type"
      );
      expect(() => store.uploadPhoto(doctor.id, "application/pdf", 1024, 100, 100)).toThrow(
        "Invalid file type"
      );
    });

    it("rejects file exceeding 5MB", () => {
      expect(() =>
        store.uploadPhoto(doctor.id, "image/jpeg", MAX_FILE_SIZE + 1, 800, 600)
      ).toThrow("File size exceeds 5MB limit");
    });

    it("re-upload replaces old photo (exactly one photo in storage)", () => {
      store.uploadPhoto(doctor.id, "image/jpeg", 1024, 400, 400);
      expect(store.photos.size).toBe(1);

      store.uploadPhoto(doctor.id, "image/png", 2048, 500, 500);
      expect(store.photos.size).toBe(1);

      const key = `${doctor.id}.webp`;
      const photo = store.getPhoto(key);
      expect(photo).toBeDefined();
    });

    it("updates user image reference on upload", () => {
      store.uploadPhoto(doctor.id, "image/jpeg", 1024, 200, 200);
      const user = store.users.find((u) => u.id === doctor.id);
      expect(user!.image).toBe(`${doctor.id}.webp`);
    });

    it("constrains large images to max 256x256", () => {
      store.uploadPhoto(doctor.id, "image/jpeg", 1024, 2000, 1000);
      const photo = store.getPhoto(`${doctor.id}.webp`);
      expect(photo!.width).toBeLessThanOrEqual(MAX_DIMENSION);
      expect(photo!.height).toBeLessThanOrEqual(MAX_DIMENSION);
    });

    it("does not upscale small images", () => {
      store.uploadPhoto(doctor.id, "image/jpeg", 1024, 100, 50);
      const photo = store.getPhoto(`${doctor.id}.webp`);
      expect(photo!.width).toBe(100);
      expect(photo!.height).toBe(50);
    });
  });

  describe("Doctor profile display in booking flow", () => {
    it("shows profile data for doctors with completed profiles", () => {
      store.upsertDoctorProfile(doctor.id, {
        specialization: "Dermatology",
        consultationFee: 120,
        yearsOfExperience: 8,
        bio: "Skin care specialist",
      });
      store.uploadPhoto(doctor.id, "image/jpeg", 1024, 200, 200);

      const doctors = store.getDoctorsForBooking();
      expect(doctors).toHaveLength(1);
      expect(doctors[0].profile).not.toBeNull();
      expect(doctors[0].profile!.specialization).toBe("Dermatology");
      expect(doctors[0].profile!.consultationFee).toBe(120);
      expect(doctors[0].image).toBe(`${doctor.id}.webp`);
    });

    it("shows null profile for doctors without a profile", () => {
      const doctors = store.getDoctorsForBooking();
      expect(doctors).toHaveLength(1);
      expect(doctors[0].profile).toBeNull();
      expect(doctors[0].name).toBe("Dr. Smith");
    });

    it("lists multiple doctors with mixed profile states", () => {
      const doctor2 = store.registerUser("Dr. Lee", "lee@example.com", "doctor");
      store.upsertDoctorProfile(doctor.id, {
        specialization: "Cardiology",
        consultationFee: 150,
        yearsOfExperience: 15,
      });

      const doctors = store.getDoctorsForBooking();
      expect(doctors).toHaveLength(2);

      const withProfile = doctors.find((d) => d.id === doctor.id);
      const withoutProfile = doctors.find((d) => d.id === doctor2.id);
      expect(withProfile!.profile).not.toBeNull();
      expect(withoutProfile!.profile).toBeNull();
    });
  });
});
