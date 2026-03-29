import { z } from "zod";

/**
 * Availability slot validation utilities.
 *
 * Pure functions for overlap detection and past-date checking,
 * designed to be used by the availability API routes.
 */

/**
 * Parse an "HH:mm" time string into total minutes since midnight.
 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Check whether `newSlot` overlaps with any slot in `existingSlots`.
 *
 * Two time ranges overlap when one starts before the other ends
 * AND ends after the other starts (open-interval semantics —
 * adjacent slots like 09:00-10:00 and 10:00-11:00 do NOT overlap).
 */
export function hasTimeOverlap(
  existingSlots: Array<{ startTime: string; endTime: string }>,
  newSlot: { startTime: string; endTime: string }
): boolean {
  const newStart = timeToMinutes(newSlot.startTime);
  const newEnd = timeToMinutes(newSlot.endTime);

  return existingSlots.some((slot) => {
    const existingStart = timeToMinutes(slot.startTime);
    const existingEnd = timeToMinutes(slot.endTime);
    return newStart < existingEnd && newEnd > existingStart;
  });
}

/**
 * Check whether a slot's date + start time is in the past
 * relative to `now` (defaults to current time).
 * Parses the date+time as local time (matching the doctor's intent).
 */
export function isSlotInPast(
  date: string,
  startTime: string,
  now: Date = new Date()
): boolean {
  const slotDate = new Date(`${date}T${startTime}`);
  return slotDate.getTime() < now.getTime();
}

/**
 * Zod schema for creating an availability slot.
 * Validates date format (YYYY-MM-DD), time format (HH:mm),
 * and ensures startTime is before endTime.
 */
export const createAvailabilitySlotSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
  })
  .refine((data) => timeToMinutes(data.startTime) < timeToMinutes(data.endTime), {
    message: "Start time must be before end time",
  });

export const createAppointmentSchema = z.object({
  slotId: z.string().uuid(),
  doctorId: z.string().min(1),
  timezone: z.string().optional().refine(
    (tz) => {
      if (!tz) return true;
      try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    },
    { message: "Invalid IANA timezone identifier" }
  ),
});

export const updateAppointmentSchema = z.object({
  action: z.enum(["accept", "reject"]),
});

export const createPrescriptionSchema = z.object({
  appointmentId: z.string().uuid(),
  medications: z
    .array(
      z.object({
        name: z.string().min(1),
        dosage: z.string().min(1),
        frequency: z.string().min(1),
        duration: z.string().min(1),
      })
    )
    .min(1),
  notes: z.string().optional(),
});

export const updateDoctorProfileSchema = z.object({
  specialization: z.string().min(1, "Specialization is required").max(255),
  qualifications: z.string().max(2000).optional(),
  bio: z.string().max(2000).optional(),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-()]{7,20}$/, "Invalid phone number")
    .optional(),
  consultationFee: z.number().min(0, "Fee cannot be negative"),
  yearsOfExperience: z.number().int().min(0, "Years cannot be negative"),
});

export const updatePatientProfileSchema = z.object({
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((d) => {
      return new Date(d) < new Date();
    }, "Date of birth cannot be in the future")
    .optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-()]{7,20}$/, "Invalid phone number")
    .optional(),
  address: z.string().max(500).optional(),
  emergencyContactName: z.string().max(255).optional(),
  emergencyContactPhone: z
    .string()
    .regex(/^\+?[\d\s\-()]{7,20}$/, "Invalid phone number")
    .optional(),
  bloodType: z
    .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])
    .optional(),
  allergies: z.string().max(2000).optional(),
  medicalHistoryNotes: z.string().max(5000).optional(),
});

export const updateNotificationPreferencesSchema = z.object({
  preferences: z.array(
    z.object({
      notificationType: z.string().min(1),
      enabled: z.boolean(),
    })
  ),
});

export const createReviewSchema = z.object({
  appointmentId: z.string().uuid(),
  doctorId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().max(2000).optional(),
});

export const doctorSearchSchema = z.object({
  q: z.string().min(2).max(100).optional(),
  specialization: z.string().max(255).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const timelineFilterSchema = z.object({
  type: z.enum(["appointment", "prescription", "visit_note"]).optional(),
});

export const reviewsQuerySchema = z.object({
  doctorId: z.string().min(1),
});
