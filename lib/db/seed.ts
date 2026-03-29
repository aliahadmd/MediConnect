/**
 * MediConnect Virtual Clinic — Seed Data
 *
 * Populates the database with realistic demo data for development and client showcases.
 *
 * Usage:
 *   Development (default):
 *     npm run db:seed
 *
 *   Production showcase (requires explicit confirmation):
 *     NODE_ENV=production SEED_CONFIRM=yes-seed-production npm run db:seed
 *
 *   Custom DATABASE_URL:
 *     DATABASE_URL=postgresql://user:pass@host:5432/db npm run db:seed
 *
 * All demo users share the password: Password123!
 *
 * Creates:
 *   - 1 admin, 6 doctors, 8 patients
 *   - Doctor profiles with specializations, bios, ratings
 *   - Patient profiles with medical history
 *   - Availability slots (past + future)
 *   - Appointments across all statuses
 *   - Visit notes and prescriptions for completed appointments
 *   - Reviews with realistic text
 *   - Notifications
 *
 * Environment behavior:
 *   - development: Wipes all data and re-seeds. No confirmation needed.
 *   - production:  Requires SEED_CONFIRM=yes-seed-production env var.
 *                  Wipes all data and re-seeds with showcase data.
 *                  Intended for demo/staging instances, NOT live patient databases.
 */

import { db } from "./index";
import * as schema from "./schema";
import { randomUUID } from "crypto";
import { scryptSync, randomBytes } from "crypto";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEMO_PASSWORD = "Password123!";

// better-auth uses scrypt with specific params. We replicate the hash format.
// Params must match: N=16384, r=16, p=1, dkLen=64 (from better-auth/dist/crypto/password.mjs)
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const N = 16384, r = 16, p = 1, keyLen = 64;
  const derived = scryptSync(password.normalize("NFKC"), salt, keyLen, { N, r, p, maxmem: 128 * N * r * 2 });
  return `${salt}:${derived.toString("hex")}`;
}

const hashedPassword = hashPassword(DEMO_PASSWORD);

// ---------------------------------------------------------------------------
// Deterministic IDs for cross-referencing
// ---------------------------------------------------------------------------

const ADMIN_ID = "admin_001";
const DOCTOR_IDS = ["doc_001", "doc_002", "doc_003", "doc_004", "doc_005", "doc_006"];
const PATIENT_IDS = ["pat_001", "pat_002", "pat_003", "pat_004", "pat_005", "pat_006", "pat_007", "pat_008"];

// ---------------------------------------------------------------------------
// Helper: date arithmetic
// ---------------------------------------------------------------------------

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function scheduledAt(dateString: string, time: string): Date {
  return new Date(`${dateString}T${time}:00Z`);
}


// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

const usersData = [
  // Admin
  { id: ADMIN_ID, name: "Sarah Mitchell", email: "admin@mediconnect.demo", role: "admin" as const },
  // Doctors
  { id: DOCTOR_IDS[0], name: "James Carter", email: "dr.carter@mediconnect.demo", role: "doctor" as const },
  { id: DOCTOR_IDS[1], name: "Priya Sharma", email: "dr.sharma@mediconnect.demo", role: "doctor" as const },
  { id: DOCTOR_IDS[2], name: "Michael Chen", email: "dr.chen@mediconnect.demo", role: "doctor" as const },
  { id: DOCTOR_IDS[3], name: "Amara Okafor", email: "dr.okafor@mediconnect.demo", role: "doctor" as const },
  { id: DOCTOR_IDS[4], name: "Elena Rodriguez", email: "dr.rodriguez@mediconnect.demo", role: "doctor" as const },
  { id: DOCTOR_IDS[5], name: "David Kim", email: "dr.kim@mediconnect.demo", role: "doctor" as const },
  // Patients
  { id: PATIENT_IDS[0], name: "Alex Thompson", email: "alex@example.demo", role: "patient" as const },
  { id: PATIENT_IDS[1], name: "Maria Garcia", email: "maria@example.demo", role: "patient" as const },
  { id: PATIENT_IDS[2], name: "Liam O'Brien", email: "liam@example.demo", role: "patient" as const },
  { id: PATIENT_IDS[3], name: "Yuki Tanaka", email: "yuki@example.demo", role: "patient" as const },
  { id: PATIENT_IDS[4], name: "Fatima Al-Hassan", email: "fatima@example.demo", role: "patient" as const },
  { id: PATIENT_IDS[5], name: "Noah Williams", email: "noah@example.demo", role: "patient" as const },
  { id: PATIENT_IDS[6], name: "Sofia Petrov", email: "sofia@example.demo", role: "patient" as const },
  { id: PATIENT_IDS[7], name: "Ethan Brown", email: "ethan@example.demo", role: "patient" as const },
];

// ---------------------------------------------------------------------------
// Doctor Profiles
// ---------------------------------------------------------------------------

const doctorProfilesData = [
  {
    userId: DOCTOR_IDS[0],
    specialization: "Cardiology",
    qualifications: "MD, FACC — Johns Hopkins University",
    bio: "Board-certified cardiologist with over 15 years of experience in interventional cardiology and heart failure management. Passionate about preventive cardiac care and patient education.",
    phone: "+1-555-0101",
    consultationFee: "150.00",
    yearsOfExperience: 15,
    averageRating: "4.80",
    reviewCount: 12,
  },
  {
    userId: DOCTOR_IDS[1],
    specialization: "Dermatology",
    qualifications: "MBBS, MD Dermatology — AIIMS New Delhi",
    bio: "Experienced dermatologist specializing in acne treatment, skin cancer screening, and cosmetic dermatology. Combines evidence-based medicine with a holistic approach to skin health.",
    phone: "+1-555-0102",
    consultationFee: "120.00",
    yearsOfExperience: 10,
    averageRating: "4.90",
    reviewCount: 18,
  },
  {
    userId: DOCTOR_IDS[2],
    specialization: "Orthopedics",
    qualifications: "MD, Fellowship in Sports Medicine — Stanford",
    bio: "Sports medicine specialist focused on minimally invasive joint repair and rehabilitation. Team physician for collegiate athletes with expertise in ACL reconstruction and shoulder injuries.",
    phone: "+1-555-0103",
    consultationFee: "175.00",
    yearsOfExperience: 12,
    averageRating: "4.70",
    reviewCount: 9,
  },
  {
    userId: DOCTOR_IDS[3],
    specialization: "Pediatrics",
    qualifications: "MD, Board Certified Pediatrician — University of Lagos",
    bio: "Dedicated pediatrician with a warm, family-centered approach. Specializes in childhood development, vaccinations, and managing chronic conditions in children.",
    phone: "+1-555-0104",
    consultationFee: "100.00",
    yearsOfExperience: 8,
    averageRating: "4.95",
    reviewCount: 22,
  },
  {
    userId: DOCTOR_IDS[4],
    specialization: "Psychiatry",
    qualifications: "MD, Psychiatry Residency — Columbia University",
    bio: "Compassionate psychiatrist specializing in anxiety disorders, depression, and PTSD. Integrates cognitive behavioral therapy with medication management for comprehensive mental health care.",
    phone: "+1-555-0105",
    consultationFee: "200.00",
    yearsOfExperience: 14,
    averageRating: "4.85",
    reviewCount: 15,
  },
  {
    userId: DOCTOR_IDS[5],
    specialization: "General Practice",
    qualifications: "MD, Family Medicine — Seoul National University",
    bio: "Family medicine physician providing comprehensive primary care for patients of all ages. Focused on preventive medicine, chronic disease management, and building long-term patient relationships.",
    phone: "+1-555-0106",
    consultationFee: "80.00",
    yearsOfExperience: 6,
    averageRating: "4.60",
    reviewCount: 7,
  },
];


// ---------------------------------------------------------------------------
// Patient Profiles
// ---------------------------------------------------------------------------

const patientProfilesData = [
  {
    userId: PATIENT_IDS[0],
    dateOfBirth: "1990-03-15",
    gender: "male" as const,
    phone: "+1-555-0201",
    address: "742 Evergreen Terrace, Springfield, IL 62704",
    emergencyContactName: "Jessica Thompson",
    emergencyContactPhone: "+1-555-0211",
    bloodType: "A+" as const,
    allergies: "Penicillin",
    medicalHistoryNotes: "Mild asthma since childhood. Appendectomy in 2015.",
  },
  {
    userId: PATIENT_IDS[1],
    dateOfBirth: "1985-07-22",
    gender: "female" as const,
    phone: "+1-555-0202",
    address: "1600 Pennsylvania Ave, Washington, DC 20500",
    emergencyContactName: "Carlos Garcia",
    emergencyContactPhone: "+1-555-0212",
    bloodType: "O+" as const,
    allergies: "Sulfa drugs, Latex",
    medicalHistoryNotes: "Type 2 diabetes diagnosed 2019. Managed with metformin. Family history of heart disease.",
  },
  {
    userId: PATIENT_IDS[2],
    dateOfBirth: "1998-11-08",
    gender: "male" as const,
    phone: "+1-555-0203",
    address: "221B Baker Street, London, ON N6A 1B5",
    emergencyContactName: "Siobhan O'Brien",
    emergencyContactPhone: "+1-555-0213",
    bloodType: "B-" as const,
    allergies: null,
    medicalHistoryNotes: "ACL tear (right knee) repaired 2022. Currently in physical therapy.",
  },
  {
    userId: PATIENT_IDS[3],
    dateOfBirth: "1992-04-30",
    gender: "female" as const,
    phone: "+1-555-0204",
    address: "1-1 Marunouchi, Chiyoda, Tokyo 100-0005",
    emergencyContactName: "Kenji Tanaka",
    emergencyContactPhone: "+1-555-0214",
    bloodType: "AB+" as const,
    allergies: "Shellfish",
    medicalHistoryNotes: "Generalized anxiety disorder. Currently on sertraline 50mg daily.",
  },
  {
    userId: PATIENT_IDS[4],
    dateOfBirth: "1988-09-12",
    gender: "female" as const,
    phone: "+1-555-0205",
    address: "45 Sunset Boulevard, Los Angeles, CA 90028",
    emergencyContactName: "Omar Al-Hassan",
    emergencyContactPhone: "+1-555-0215",
    bloodType: "O-" as const,
    allergies: "Aspirin, Ibuprofen",
    medicalHistoryNotes: "Migraine disorder. Eczema. Two pregnancies (2018, 2021), both uncomplicated.",
  },
  {
    userId: PATIENT_IDS[5],
    dateOfBirth: "2001-01-25",
    gender: "male" as const,
    phone: "+1-555-0206",
    address: "350 Fifth Avenue, New York, NY 10118",
    emergencyContactName: "Linda Williams",
    emergencyContactPhone: "+1-555-0216",
    bloodType: "A-" as const,
    allergies: null,
    medicalHistoryNotes: "No significant medical history. Annual checkups up to date.",
  },
  {
    userId: PATIENT_IDS[6],
    dateOfBirth: "1995-06-18",
    gender: "female" as const,
    phone: "+1-555-0207",
    address: "12 Nevsky Prospect, St. Petersburg, FL 33701",
    emergencyContactName: "Ivan Petrov",
    emergencyContactPhone: "+1-555-0217",
    bloodType: "B+" as const,
    allergies: "Codeine",
    medicalHistoryNotes: "Iron deficiency anemia. Thyroid nodule under observation.",
  },
  {
    userId: PATIENT_IDS[7],
    dateOfBirth: "1993-12-03",
    gender: "male" as const,
    phone: "+1-555-0208",
    address: "100 Main Street, Anytown, TX 75001",
    emergencyContactName: "Sarah Brown",
    emergencyContactPhone: "+1-555-0218",
    bloodType: "AB-" as const,
    allergies: "Peanuts, Tree nuts",
    medicalHistoryNotes: "Severe nut allergy (carries EpiPen). Seasonal allergies. Wisdom teeth removed 2020.",
  },
];


// ---------------------------------------------------------------------------
// Availability Slots — past (for completed appointments) + future (bookable)
// ---------------------------------------------------------------------------

function generateSlots() {
  const slots: Array<{
    id: string;
    doctorId: string;
    date: string;
    startTime: string;
    endTime: string;
    isBooked: boolean;
  }> = [];

  const timeBlocks = [
    { start: "09:00", end: "09:30" },
    { start: "09:30", end: "10:00" },
    { start: "10:00", end: "10:30" },
    { start: "10:30", end: "11:00" },
    { start: "11:00", end: "11:30" },
    { start: "14:00", end: "14:30" },
    { start: "14:30", end: "15:00" },
    { start: "15:00", end: "15:30" },
    { start: "15:30", end: "16:00" },
    { start: "16:00", end: "16:30" },
  ];

  for (const docId of DOCTOR_IDS) {
    // Past slots (last 30 days) — most booked
    for (let d = -30; d <= -1; d++) {
      const date = dateStr(daysFromNow(d));
      // Each doctor has 6 slots per past day
      for (let t = 0; t < 6; t++) {
        const block = timeBlocks[t];
        slots.push({
          id: randomUUID(),
          doctorId: docId,
          date,
          startTime: block.start,
          endTime: block.end,
          isBooked: t < 4, // first 4 booked, last 2 unbooked
        });
      }
    }

    // Future slots (next 14 days) — some booked, most available
    for (let d = 1; d <= 14; d++) {
      const date = dateStr(daysFromNow(d));
      for (let t = 0; t < timeBlocks.length; t++) {
        const block = timeBlocks[t];
        slots.push({
          id: randomUUID(),
          doctorId: docId,
          date,
          startTime: block.start,
          endTime: block.end,
          isBooked: t < 2, // first 2 booked (pending/confirmed), rest available
        });
      }
    }
  }

  return slots;
}


// ---------------------------------------------------------------------------
// Appointments — spread across statuses for a realistic dashboard
// ---------------------------------------------------------------------------

function generateAppointments(slots: ReturnType<typeof generateSlots>) {
  const appointments: Array<{
    id: string;
    patientId: string;
    doctorId: string;
    slotId: string;
    status: "pending" | "confirmed" | "rejected" | "completed" | "cancelled";
    scheduledAt: Date;
  }> = [];

  const bookedSlots = slots.filter((s) => s.isBooked);

  // Distribute patients across doctors
  let patientIdx = 0;
  const nextPatient = () => {
    const p = PATIENT_IDS[patientIdx % PATIENT_IDS.length];
    patientIdx++;
    return p;
  };

  for (const slot of bookedSlots) {
    const isPast = new Date(slot.date) < new Date();
    let status: "pending" | "confirmed" | "rejected" | "completed" | "cancelled";

    if (isPast) {
      // Past appointments: mostly completed, some cancelled/rejected
      const roll = patientIdx % 10;
      if (roll < 7) status = "completed";
      else if (roll < 8) status = "cancelled";
      else if (roll < 9) status = "rejected";
      else status = "completed";
    } else {
      // Future appointments: pending or confirmed
      status = patientIdx % 3 === 0 ? "pending" : "confirmed";
    }

    appointments.push({
      id: randomUUID(),
      patientId: nextPatient(),
      doctorId: slot.doctorId,
      slotId: slot.id,
      status,
      scheduledAt: scheduledAt(slot.date, slot.startTime),
    });
  }

  return appointments;
}

// ---------------------------------------------------------------------------
// Visit Notes — for completed appointments
// ---------------------------------------------------------------------------

const visitNoteTemplates = [
  "Patient presents with mild upper respiratory symptoms. No fever. Advised rest and hydration. Follow-up in 1 week if symptoms persist.",
  "Routine follow-up for hypertension management. BP 128/82. Current medication regimen effective. Continue lisinopril 10mg daily. Next visit in 3 months.",
  "Patient reports persistent lower back pain for 2 weeks. Physical exam reveals mild muscle spasm. Prescribed physical therapy 2x/week for 4 weeks. Ibuprofen 400mg as needed.",
  "Annual wellness exam. All vitals within normal range. Lab work ordered: CBC, CMP, lipid panel, HbA1c. Discussed importance of regular exercise and balanced diet.",
  "Patient experiencing anxiety and sleep disturbance. Discussed cognitive behavioral strategies. Started sertraline 25mg daily with plan to titrate to 50mg after 2 weeks.",
  "Skin examination for suspicious mole on left shoulder. Dermoscopy shows irregular borders. Excisional biopsy scheduled for next week. Patient counseled on sun protection.",
  "Post-operative follow-up after arthroscopic knee surgery. Incision healing well. Range of motion improving. Continue physical therapy. Return in 4 weeks.",
  "Child presents for 5-year well-child visit. Growth and development on track. Vaccinations updated per CDC schedule. Vision and hearing screening normal.",
  "Patient reports chest tightness during exercise. ECG normal. Stress test ordered. Discussed cardiac risk factors. Advised to avoid strenuous activity until results available.",
  "Follow-up for Type 2 diabetes. HbA1c improved from 7.8 to 7.1. Continue current regimen. Reinforced dietary guidelines and glucose monitoring schedule.",
  "Patient presents with recurrent migraine headaches. Frequency increased to 3-4 per month. Started sumatriptan 50mg for acute episodes. Discussed preventive options.",
  "Consultation for persistent eczema flare on hands and forearms. Prescribed triamcinolone 0.1% cream twice daily. Recommended fragrance-free moisturizer. Follow-up in 3 weeks.",
];

// ---------------------------------------------------------------------------
// Prescriptions — for completed appointments
// ---------------------------------------------------------------------------

const prescriptionTemplates = [
  {
    medications: [
      { name: "Amoxicillin", dosage: "500mg", frequency: "Three times daily", duration: "10 days" },
      { name: "Ibuprofen", dosage: "400mg", frequency: "As needed for pain", duration: "7 days" },
    ],
    notes: "Take amoxicillin with food. Complete the full course even if symptoms improve.",
  },
  {
    medications: [
      { name: "Lisinopril", dosage: "10mg", frequency: "Once daily", duration: "Ongoing" },
    ],
    notes: "Monitor blood pressure at home. Report any persistent cough or dizziness.",
  },
  {
    medications: [
      { name: "Metformin", dosage: "500mg", frequency: "Twice daily with meals", duration: "Ongoing" },
      { name: "Atorvastatin", dosage: "20mg", frequency: "Once daily at bedtime", duration: "Ongoing" },
    ],
    notes: "Check fasting glucose weekly. Follow up with lab work in 3 months.",
  },
  {
    medications: [
      { name: "Sertraline", dosage: "50mg", frequency: "Once daily in the morning", duration: "Ongoing" },
    ],
    notes: "May take 2-4 weeks to feel full effect. Do not stop abruptly. Report any worsening mood.",
  },
  {
    medications: [
      { name: "Sumatriptan", dosage: "50mg", frequency: "At onset of migraine, max 2 per day", duration: "As needed" },
      { name: "Topiramate", dosage: "25mg", frequency: "Once daily at bedtime", duration: "Ongoing" },
    ],
    notes: "Preventive therapy with topiramate. Increase to 50mg after 2 weeks if tolerated.",
  },
  {
    medications: [
      { name: "Triamcinolone Acetonide Cream", dosage: "0.1%", frequency: "Apply twice daily to affected areas", duration: "3 weeks" },
      { name: "Cetirizine", dosage: "10mg", frequency: "Once daily", duration: "30 days" },
    ],
    notes: "Apply thin layer of cream. Use fragrance-free moisturizer between applications.",
  },
  {
    medications: [
      { name: "Omeprazole", dosage: "20mg", frequency: "Once daily before breakfast", duration: "8 weeks" },
    ],
    notes: "Take 30 minutes before first meal. Avoid spicy foods and late-night eating.",
  },
  {
    medications: [
      { name: "Azithromycin", dosage: "250mg", frequency: "Once daily", duration: "5 days (2 tablets day 1, then 1 tablet days 2-5)" },
    ],
    notes: "Z-pack regimen. Take on empty stomach or 2 hours after meals.",
  },
];


// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

const reviewTemplates = [
  { rating: 5, text: "Excellent doctor. Very thorough examination and took time to explain everything clearly. Highly recommend." },
  { rating: 5, text: "Dr. was incredibly patient and knowledgeable. Made me feel comfortable throughout the entire visit." },
  { rating: 4, text: "Great experience overall. Wait time was a bit long but the consultation itself was very helpful." },
  { rating: 5, text: "Best doctor I've seen in years. Really listens to concerns and provides practical advice." },
  { rating: 4, text: "Professional and caring. Explained my treatment options thoroughly. Would visit again." },
  { rating: 5, text: "Amazing bedside manner. My child was nervous but the doctor made the whole experience fun and stress-free." },
  { rating: 3, text: "Decent consultation. Got the help I needed but felt a bit rushed. The prescription worked well though." },
  { rating: 5, text: "Incredibly knowledgeable and up-to-date with the latest treatments. Solved a problem other doctors couldn't." },
  { rating: 4, text: "Very good experience. The video consultation was smooth and the doctor was attentive. Minor audio issues." },
  { rating: 5, text: "Life-changing consultation. The treatment plan has made a huge difference in my daily life. So grateful." },
  { rating: 4, text: "Solid medical advice and follow-up care. Appreciated the detailed visit notes shared after the appointment." },
  { rating: 5, text: "Warm, empathetic, and extremely competent. This is what healthcare should feel like." },
];

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

const notificationTemplates = [
  { type: "appointment_booked", message: "Your appointment has been booked and is pending confirmation." },
  { type: "appointment_confirmed", message: "Your appointment has been confirmed by the doctor." },
  { type: "appointment_rejected", message: "Unfortunately, your appointment request was declined. Please book another slot." },
  { type: "appointment_cancelled", message: "Your appointment has been cancelled." },
  { type: "appointment_completed", message: "Your consultation has been completed. Visit notes are now available." },
  { type: "prescription_created", message: "A new prescription has been added to your account. You can download the PDF." },
  { type: "review_reminder", message: "How was your recent consultation? Leave a review to help other patients." },
];


// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function seed() {
  const env = process.env.NODE_ENV || "development";
  const isProduction = env === "production";
  const dbUrl = process.env.DATABASE_URL || "(not set)";
  const maskedUrl = dbUrl.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@");

  console.log("🌱 MediConnect Database Seeder\n");
  console.log(`  Environment:  ${env}`);
  console.log(`  Database:     ${maskedUrl}\n`);

  // -----------------------------------------------------------------------
  // Production safety gate
  // -----------------------------------------------------------------------
  if (isProduction) {
    const confirm = process.env.SEED_CONFIRM;
    if (confirm !== "yes-seed-production") {
      console.error("⛔ Production seed requires explicit confirmation.");
      console.error("   Set SEED_CONFIRM=yes-seed-production to proceed.");
      console.error("   This will WIPE ALL DATA in the production database.\n");
      console.error("   Example:");
      console.error("   NODE_ENV=production SEED_CONFIRM=yes-seed-production npm run db:seed\n");
      process.exit(1);
    }
    console.log("  ⚠️  Production mode confirmed. Proceeding with data wipe + seed...\n");
  }

  // -----------------------------------------------------------------------
  // 1. Clean existing data (reverse FK order)
  // -----------------------------------------------------------------------
  console.log("  Cleaning existing data...");
  await db.delete(schema.reviews);
  await db.delete(schema.prescriptions);
  await db.delete(schema.visitNotes);
  await db.delete(schema.notifications);
  await db.delete(schema.notificationPreferences);
  await db.delete(schema.appointments);
  await db.delete(schema.availabilitySlots);
  await db.delete(schema.patientProfiles);
  await db.delete(schema.doctorProfiles);
  await db.delete(schema.sessions);
  await db.delete(schema.accounts);
  await db.delete(schema.verifications);
  await db.delete(schema.users);

  // -----------------------------------------------------------------------
  // 2. Insert users
  // -----------------------------------------------------------------------
  console.log("  Creating users...");
  const now = new Date();

  for (const u of usersData) {
    await db.insert(schema.users).values({
      id: u.id,
      name: u.name,
      email: u.email,
      emailVerified: true,
      role: u.role,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Create account record (email+password provider for better-auth)
    await db.insert(schema.accounts).values({
      id: randomUUID(),
      userId: u.id,
      accountId: u.id,
      providerId: "credential",
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log(`    ✓ ${usersData.length} users created`);

  // -----------------------------------------------------------------------
  // 3. Insert doctor profiles
  // -----------------------------------------------------------------------
  console.log("  Creating doctor profiles...");
  for (const dp of doctorProfilesData) {
    await db.insert(schema.doctorProfiles).values({
      userId: dp.userId,
      specialization: dp.specialization,
      qualifications: dp.qualifications,
      bio: dp.bio,
      phone: dp.phone,
      consultationFee: dp.consultationFee,
      yearsOfExperience: dp.yearsOfExperience,
      averageRating: dp.averageRating,
      reviewCount: dp.reviewCount,
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log(`    ✓ ${doctorProfilesData.length} doctor profiles created`);

  // -----------------------------------------------------------------------
  // 4. Insert patient profiles
  // -----------------------------------------------------------------------
  console.log("  Creating patient profiles...");
  for (const pp of patientProfilesData) {
    await db.insert(schema.patientProfiles).values({
      userId: pp.userId,
      dateOfBirth: pp.dateOfBirth,
      gender: pp.gender,
      phone: pp.phone,
      address: pp.address,
      emergencyContactName: pp.emergencyContactName,
      emergencyContactPhone: pp.emergencyContactPhone,
      bloodType: pp.bloodType,
      allergies: pp.allergies,
      medicalHistoryNotes: pp.medicalHistoryNotes,
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log(`    ✓ ${patientProfilesData.length} patient profiles created`);

  // -----------------------------------------------------------------------
  // 5. Insert availability slots
  // -----------------------------------------------------------------------
  console.log("  Creating availability slots...");
  const slots = generateSlots();
  // Batch insert in chunks of 100
  for (let i = 0; i < slots.length; i += 100) {
    const chunk = slots.slice(i, i + 100);
    await db.insert(schema.availabilitySlots).values(chunk);
  }
  console.log(`    ✓ ${slots.length} availability slots created`);

  // -----------------------------------------------------------------------
  // 6. Insert appointments
  // -----------------------------------------------------------------------
  console.log("  Creating appointments...");
  const appts = generateAppointments(slots);
  for (let i = 0; i < appts.length; i += 100) {
    const chunk = appts.slice(i, i + 100);
    await db.insert(schema.appointments).values(chunk);
  }
  console.log(`    ✓ ${appts.length} appointments created`);

  // -----------------------------------------------------------------------
  // 7. Insert visit notes for completed appointments
  // -----------------------------------------------------------------------
  console.log("  Creating visit notes...");
  const completedAppts = appts.filter((a) => a.status === "completed");
  let noteCount = 0;
  for (const appt of completedAppts) {
    const template = visitNoteTemplates[noteCount % visitNoteTemplates.length];
    await db.insert(schema.visitNotes).values({
      appointmentId: appt.id,
      content: template,
      createdAt: appt.scheduledAt,
      updatedAt: appt.scheduledAt,
    });
    noteCount++;
  }
  console.log(`    ✓ ${noteCount} visit notes created`);

  // -----------------------------------------------------------------------
  // 8. Insert prescriptions for ~60% of completed appointments
  // -----------------------------------------------------------------------
  console.log("  Creating prescriptions...");
  let rxCount = 0;
  for (let i = 0; i < completedAppts.length; i++) {
    if (i % 5 >= 3) continue; // skip ~40%
    const appt = completedAppts[i];
    const template = prescriptionTemplates[rxCount % prescriptionTemplates.length];
    await db.insert(schema.prescriptions).values({
      appointmentId: appt.id,
      medications: JSON.stringify(template.medications),
      notes: template.notes,
      pdfKey: null, // No actual PDF in seed — would need MinIO
      createdAt: appt.scheduledAt,
    });
    rxCount++;
  }
  console.log(`    ✓ ${rxCount} prescriptions created`);

  // -----------------------------------------------------------------------
  // 9. Insert reviews for ~50% of completed appointments
  // -----------------------------------------------------------------------
  console.log("  Creating reviews...");
  let reviewCount = 0;
  for (let i = 0; i < completedAppts.length; i++) {
    if (i % 2 !== 0) continue; // every other completed appointment
    const appt = completedAppts[i];
    const template = reviewTemplates[reviewCount % reviewTemplates.length];
    await db.insert(schema.reviews).values({
      appointmentId: appt.id,
      patientId: appt.patientId,
      doctorId: appt.doctorId,
      rating: template.rating,
      reviewText: template.text,
      createdAt: appt.scheduledAt,
      updatedAt: appt.scheduledAt,
    });
    reviewCount++;
  }
  console.log(`    ✓ ${reviewCount} reviews created`);

  // -----------------------------------------------------------------------
  // 10. Insert notifications for patients
  // -----------------------------------------------------------------------
  console.log("  Creating notifications...");
  let notifCount = 0;
  for (const patientId of PATIENT_IDS) {
    // Each patient gets a mix of notifications
    for (let i = 0; i < 5; i++) {
      const template = notificationTemplates[notifCount % notificationTemplates.length];
      const createdAt = daysFromNow(-(notifCount % 14));
      await db.insert(schema.notifications).values({
        userId: patientId,
        type: template.type,
        message: template.message,
        read: i < 2, // first 2 read, rest unread
        createdAt,
      });
      notifCount++;
    }
  }
  console.log(`    ✓ ${notifCount} notifications created`);

  // -----------------------------------------------------------------------
  // 11. Insert notification preferences
  // -----------------------------------------------------------------------
  console.log("  Creating notification preferences...");
  const notifTypes = ["appointment_booked", "appointment_confirmed", "appointment_rejected", "appointment_completed", "prescription_created", "review_reminder"];
  let prefCount = 0;
  for (const userId of [...PATIENT_IDS, ...DOCTOR_IDS]) {
    for (const notifType of notifTypes) {
      await db.insert(schema.notificationPreferences).values({
        userId,
        notificationType: notifType,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      });
      prefCount++;
    }
  }
  console.log(`    ✓ ${prefCount} notification preferences created`);

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  console.log("\n✅ Seed complete!\n");
  console.log(`  Environment: ${env}`);
  console.log(`  Database:    ${maskedUrl}\n`);
  console.log("  Demo accounts (password: Password123!):");
  console.log("  ─────────────────────────────────────────");
  console.log("  Admin:    admin@mediconnect.demo");
  console.log("  Doctors:  dr.carter@mediconnect.demo");
  console.log("            dr.sharma@mediconnect.demo");
  console.log("            dr.chen@mediconnect.demo");
  console.log("            dr.okafor@mediconnect.demo");
  console.log("            dr.rodriguez@mediconnect.demo");
  console.log("            dr.kim@mediconnect.demo");
  console.log("  Patients: alex@example.demo");
  console.log("            maria@example.demo");
  console.log("            liam@example.demo");
  console.log("            yuki@example.demo");
  console.log("            fatima@example.demo");
  console.log("            noah@example.demo");
  console.log("            sofia@example.demo");
  console.log("            ethan@example.demo\n");

  if (isProduction) {
    console.log("  🔒 Production note: Change demo passwords before exposing to real users.\n");
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
