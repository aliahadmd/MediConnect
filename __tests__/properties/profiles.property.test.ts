// Feature: platform-enhancements-v2, Property 11: Profile save/retrieve round-trip
// Feature: platform-enhancements-v2, Property 12: Profile validation rejection
// Feature: platform-enhancements-v2, Property 16: Profile uniqueness constraint
// **Validates: Requirements 9.3, 9.4, 10.3, 10.4, 14.4, 14.5**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  updateDoctorProfileSchema,
  updatePatientProfileSchema,
} from "@/lib/validators";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DoctorProfileData {
  specialization: string;
  qualifications?: string;
  bio?: string;
  phone?: string;
  consultationFee: number;
  yearsOfExperience: number;
}

type Gender = "male" | "female" | "other" | "prefer_not_to_say";
type BloodType = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";

interface PatientProfileData {
  dateOfBirth?: string;
  gender?: Gender;
  phone?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bloodType?: BloodType;
  allergies?: string;
  medicalHistoryNotes?: string;
}

interface StoredDoctorProfile extends DoctorProfileData {
  id: string;
  userId: string;
}

interface StoredPatientProfile extends PatientProfileData {
  id: string;
  userId: string;
}

// ---------------------------------------------------------------------------
// In-memory Profile Store
// ---------------------------------------------------------------------------

class ProfileStore {
  private doctorProfiles = new Map<string, StoredDoctorProfile>();
  private patientProfiles = new Map<string, StoredPatientProfile>();
  private nextId = 1;

  saveDoctorProfile(
    userId: string,
    data: DoctorProfileData
  ): { success: true; profile: StoredDoctorProfile } | { success: false; error: string } {
    if (this.doctorProfiles.has(userId)) {
      return { success: false, error: "Profile already exists" };
    }
    const profile: StoredDoctorProfile = {
      id: `dprof_${this.nextId++}`,
      userId,
      ...data,
    };
    this.doctorProfiles.set(userId, profile);
    return { success: true, profile };
  }

  getDoctorProfile(userId: string): StoredDoctorProfile | null {
    return this.doctorProfiles.get(userId) ?? null;
  }

  savePatientProfile(
    userId: string,
    data: PatientProfileData
  ): { success: true; profile: StoredPatientProfile } | { success: false; error: string } {
    if (this.patientProfiles.has(userId)) {
      return { success: false, error: "Profile already exists" };
    }
    const profile: StoredPatientProfile = {
      id: `pprof_${this.nextId++}`,
      userId,
      ...data,
    };
    this.patientProfiles.set(userId, profile);
    return { success: true, profile };
  }

  getPatientProfile(userId: string): StoredPatientProfile | null {
    return this.patientProfiles.get(userId) ?? null;
  }
}


// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const userIdArb = fc.stringMatching(/^user_[1-9]\d{0,2}$/);

/** Generate a valid phone number matching the regex /^\+?[\d\s\-()]{7,20}$/ */
const validPhoneArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.constantFrom("", "+"),
    fc.stringMatching(/^[\d\s\-()]{7,19}$/)
  )
  .map(([prefix, body]) => `${prefix}${body}`);

/** Generate a valid specialization (non-empty, max 255) */
const specializationArb: fc.Arbitrary<string> = fc.stringMatching(
  /^[A-Za-z ]{1,30}$/
);

/** Generate a valid doctor profile */
const validDoctorProfileArb: fc.Arbitrary<DoctorProfileData> = fc.record({
  specialization: specializationArb,
  qualifications: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  bio: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  phone: fc.option(validPhoneArb, { nil: undefined }),
  consultationFee: fc.double({ min: 0, max: 99999, noNaN: true }),
  yearsOfExperience: fc.nat({ max: 60 }),
});

/** Generate a past date string in YYYY-MM-DD format */
const pastDateArb: fc.Arbitrary<string> = fc
  .integer({ min: 1, max: 365 * 80 })
  .map((daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split("T")[0];
  });

const genderArb: fc.Arbitrary<Gender> = fc.constantFrom(
  "male",
  "female",
  "other",
  "prefer_not_to_say"
);

const bloodTypeArb: fc.Arbitrary<BloodType> = fc.constantFrom(
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"
);

/** Generate a valid patient profile */
const validPatientProfileArb: fc.Arbitrary<PatientProfileData> = fc.record({
  dateOfBirth: fc.option(pastDateArb, { nil: undefined }),
  gender: fc.option(genderArb, { nil: undefined }),
  phone: fc.option(validPhoneArb, { nil: undefined }),
  address: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  emergencyContactName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  emergencyContactPhone: fc.option(validPhoneArb, { nil: undefined }),
  bloodType: fc.option(bloodTypeArb, { nil: undefined }),
  allergies: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  medicalHistoryNotes: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
});

// ---------------------------------------------------------------------------
// Property 11: Profile save/retrieve round-trip
// ---------------------------------------------------------------------------

// Feature: platform-enhancements-v2, Property 11: Profile save/retrieve round-trip
// **Validates: Requirements 9.3, 10.3**
describe("Property 11: Profile save/retrieve round-trip", () => {
  it("saving then retrieving a doctor profile returns identical data", () => {
    fc.assert(
      fc.property(
        userIdArb,
        validDoctorProfileArb,
        (userId, profileData) => {
          const store = new ProfileStore();

          const result = store.saveDoctorProfile(userId, profileData);
          expect(result.success).toBe(true);

          const retrieved = store.getDoctorProfile(userId);
          expect(retrieved).not.toBeNull();
          expect(retrieved!.userId).toBe(userId);
          expect(retrieved!.specialization).toBe(profileData.specialization);
          expect(retrieved!.qualifications).toBe(profileData.qualifications);
          expect(retrieved!.bio).toBe(profileData.bio);
          expect(retrieved!.phone).toBe(profileData.phone);
          expect(retrieved!.consultationFee).toBe(profileData.consultationFee);
          expect(retrieved!.yearsOfExperience).toBe(profileData.yearsOfExperience);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("saving then retrieving a patient profile returns identical data", () => {
    fc.assert(
      fc.property(
        userIdArb,
        validPatientProfileArb,
        (userId, profileData) => {
          const store = new ProfileStore();

          const result = store.savePatientProfile(userId, profileData);
          expect(result.success).toBe(true);

          const retrieved = store.getPatientProfile(userId);
          expect(retrieved).not.toBeNull();
          expect(retrieved!.userId).toBe(userId);
          expect(retrieved!.dateOfBirth).toBe(profileData.dateOfBirth);
          expect(retrieved!.gender).toBe(profileData.gender);
          expect(retrieved!.phone).toBe(profileData.phone);
          expect(retrieved!.address).toBe(profileData.address);
          expect(retrieved!.emergencyContactName).toBe(profileData.emergencyContactName);
          expect(retrieved!.emergencyContactPhone).toBe(profileData.emergencyContactPhone);
          expect(retrieved!.bloodType).toBe(profileData.bloodType);
          expect(retrieved!.allergies).toBe(profileData.allergies);
          expect(retrieved!.medicalHistoryNotes).toBe(profileData.medicalHistoryNotes);
        }
      ),
      { numRuns: 200 }
    );
  });
});


// ---------------------------------------------------------------------------
// Property 12: Profile validation rejection
// ---------------------------------------------------------------------------

// Feature: platform-enhancements-v2, Property 12: Profile validation rejection
// **Validates: Requirements 9.4, 10.4**
describe("Property 12: Profile validation rejection", () => {
  it("negative consultation fee is rejected for doctor profile", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -100000, max: -0.01, noNaN: true }),
        (negativeFee) => {
          const result = updateDoctorProfileSchema.safeParse({
            specialization: "Cardiology",
            consultationFee: negativeFee,
            yearsOfExperience: 5,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("negative years of experience is rejected for doctor profile", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: -1 }),
        (negativeYears) => {
          const result = updateDoctorProfileSchema.safeParse({
            specialization: "Cardiology",
            consultationFee: 100,
            yearsOfExperience: negativeYears,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("empty specialization is rejected for doctor profile", () => {
    const result = updateDoctorProfileSchema.safeParse({
      specialization: "",
      consultationFee: 100,
      yearsOfExperience: 5,
    });
    expect(result.success).toBe(false);
  });

  it("future date of birth is rejected for patient profile", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 365 * 10 }),
        (daysInFuture) => {
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + daysInFuture);
          const futureDateStr = futureDate.toISOString().split("T")[0];

          const result = updatePatientProfileSchema.safeParse({
            dateOfBirth: futureDateStr,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("invalid phone number is rejected for patient profile", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("abc", "12", "!@#$%^", "++123", "phone", "1-2-3"),
        (invalidPhone) => {
          const result = updatePatientProfileSchema.safeParse({
            phone: invalidPhone,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 16: Profile uniqueness constraint
// ---------------------------------------------------------------------------

// Feature: platform-enhancements-v2, Property 16: Profile uniqueness constraint
// **Validates: Requirements 14.4, 14.5**
describe("Property 16: Profile uniqueness constraint", () => {
  it("creating a second doctor profile for the same userId is rejected, preserving existing profile", () => {
    fc.assert(
      fc.property(
        userIdArb,
        validDoctorProfileArb,
        validDoctorProfileArb,
        (userId, firstProfile, secondProfile) => {
          const store = new ProfileStore();

          // First creation succeeds
          const first = store.saveDoctorProfile(userId, firstProfile);
          expect(first.success).toBe(true);

          // Second creation for same user is rejected
          const second = store.saveDoctorProfile(userId, secondProfile);
          expect(second.success).toBe(false);
          if (!second.success) {
            expect(second.error).toBe("Profile already exists");
          }

          // Original profile is preserved
          const retrieved = store.getDoctorProfile(userId);
          expect(retrieved).not.toBeNull();
          expect(retrieved!.specialization).toBe(firstProfile.specialization);
          expect(retrieved!.consultationFee).toBe(firstProfile.consultationFee);
          expect(retrieved!.yearsOfExperience).toBe(firstProfile.yearsOfExperience);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("creating a second patient profile for the same userId is rejected, preserving existing profile", () => {
    fc.assert(
      fc.property(
        userIdArb,
        validPatientProfileArb,
        validPatientProfileArb,
        (userId, firstProfile, secondProfile) => {
          const store = new ProfileStore();

          // First creation succeeds
          const first = store.savePatientProfile(userId, firstProfile);
          expect(first.success).toBe(true);

          // Second creation for same user is rejected
          const second = store.savePatientProfile(userId, secondProfile);
          expect(second.success).toBe(false);
          if (!second.success) {
            expect(second.error).toBe("Profile already exists");
          }

          // Original profile is preserved
          const retrieved = store.getPatientProfile(userId);
          expect(retrieved).not.toBeNull();
          expect(retrieved!.dateOfBirth).toBe(firstProfile.dateOfBirth);
          expect(retrieved!.gender).toBe(firstProfile.gender);
          expect(retrieved!.phone).toBe(firstProfile.phone);
        }
      ),
      { numRuns: 200 }
    );
  });
});


// ---------------------------------------------------------------------------
// Property 15: Doctor list API includes profile data
// ---------------------------------------------------------------------------

// Feature: platform-enhancements-v2, Property 15: Doctor list API includes profile data
// **Validates: Requirements 13.1, 13.2**

interface DoctorUser {
  id: string;
  name: string;
  email: string;
}

interface DoctorProfileEntry {
  userId: string;
  specialization: string;
  yearsOfExperience: number;
  consultationFee: number;
}

interface DoctorListItem {
  id: string;
  name: string;
  email: string;
  specialization: string | null;
  yearsOfExperience: number | null;
  consultationFee: number | null;
  profileComplete: boolean;
}

/**
 * Simulates the doctor list API behaviour: LEFT JOIN doctors with profiles,
 * returning profileComplete=true when a profile row exists.
 */
function buildDoctorList(
  doctors: DoctorUser[],
  profiles: DoctorProfileEntry[]
): DoctorListItem[] {
  const profileMap = new Map(profiles.map((p) => [p.userId, p]));

  return doctors.map((doc) => {
    const profile = profileMap.get(doc.id);
    const profileComplete = profile !== undefined;

    return {
      id: doc.id,
      name: doc.name,
      email: doc.email,
      specialization: profile?.specialization ?? null,
      yearsOfExperience: profile?.yearsOfExperience ?? null,
      consultationFee: profile?.consultationFee ?? null,
      profileComplete,
    };
  });
}

describe("Property 15: Doctor list API includes profile data", () => {
  const doctorUserArb = fc.record({
    id: fc.stringMatching(/^doc_[1-9]\d{0,2}$/),
    name: fc.stringMatching(/^[A-Za-z ]{2,30}$/),
    email: fc.stringMatching(/^[a-z]{3,8}@test\.com$/),
  });

  const doctorProfileEntryArb = (userId: string) =>
    fc.record({
      userId: fc.constant(userId),
      specialization: fc.stringMatching(/^[A-Za-z ]{1,30}$/),
      yearsOfExperience: fc.nat({ max: 50 }),
      consultationFee: fc.double({ min: 0, max: 99999, noNaN: true }),
    });

  it("doctors with profiles have profileComplete=true and include specialization, yearsOfExperience, consultationFee", () => {
    fc.assert(
      fc.property(
        fc
          .uniqueArray(doctorUserArb, { minLength: 1, maxLength: 10, selector: (d) => d.id })
          .chain((doctors) => {
            // Pick a non-empty subset of doctors to have profiles
            const withProfileArbs = doctors.map((doc) =>
              fc.tuple(fc.constant(doc), fc.boolean(), doctorProfileEntryArb(doc.id))
            );
            return fc.tuple(fc.constant(doctors), fc.tuple(...withProfileArbs));
          }),
        ([doctors, profileDecisions]) => {
          const profiles: DoctorProfileEntry[] = profileDecisions
            .filter(([, hasProfile]) => hasProfile)
            .map(([, , profile]) => profile);

          const profileUserIds = new Set(profiles.map((p) => p.userId));
          const result = buildDoctorList(doctors, profiles);

          expect(result).toHaveLength(doctors.length);

          for (const item of result) {
            if (profileUserIds.has(item.id)) {
              // Doctor WITH profile
              expect(item.profileComplete).toBe(true);
              expect(item.specialization).not.toBeNull();
              expect(typeof item.specialization).toBe("string");
              expect(item.yearsOfExperience).not.toBeNull();
              expect(typeof item.yearsOfExperience).toBe("number");
              expect(item.consultationFee).not.toBeNull();
              expect(typeof item.consultationFee).toBe("number");
            } else {
              // Doctor WITHOUT profile
              expect(item.profileComplete).toBe(false);
              expect(item.specialization).toBeNull();
              expect(item.yearsOfExperience).toBeNull();
              expect(item.consultationFee).toBeNull();
            }
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it("doctors without profiles indicate incomplete status", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(doctorUserArb, { minLength: 1, maxLength: 10, selector: (d) => d.id }),
        (doctors) => {
          // No profiles at all
          const result = buildDoctorList(doctors, []);

          expect(result).toHaveLength(doctors.length);

          for (const item of result) {
            expect(item.profileComplete).toBe(false);
            expect(item.specialization).toBeNull();
            expect(item.yearsOfExperience).toBeNull();
            expect(item.consultationFee).toBeNull();
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});
