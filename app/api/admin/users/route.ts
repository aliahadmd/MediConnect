import { NextRequest, NextResponse } from "next/server";
import { eq, or, ilike, and, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, doctorProfiles, patientProfiles } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const role = searchParams.get("role");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const offset = (page - 1) * limit;

  const conditions = [];

  if (search) {
    conditions.push(
      or(
        ilike(users.name, `%${search}%`),
        ilike(users.email, `%${search}%`)
      )
    );
  }

  if (role && ["patient", "doctor", "admin"].includes(role)) {
    conditions.push(eq(users.role, role as "patient" | "doctor" | "admin"));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        doctorProfile: {
          specialization: doctorProfiles.specialization,
          qualifications: doctorProfiles.qualifications,
          bio: doctorProfiles.bio,
          phone: doctorProfiles.phone,
          consultationFee: doctorProfiles.consultationFee,
          yearsOfExperience: doctorProfiles.yearsOfExperience,
        },
        patientProfile: {
          dateOfBirth: patientProfiles.dateOfBirth,
          gender: patientProfiles.gender,
          phone: patientProfiles.phone,
          address: patientProfiles.address,
          emergencyContactName: patientProfiles.emergencyContactName,
          emergencyContactPhone: patientProfiles.emergencyContactPhone,
          bloodType: patientProfiles.bloodType,
          allergies: patientProfiles.allergies,
          medicalHistoryNotes: patientProfiles.medicalHistoryNotes,
        },
      })
      .from(users)
      .leftJoin(doctorProfiles, eq(users.id, doctorProfiles.userId))
      .leftJoin(patientProfiles, eq(users.id, patientProfiles.userId))
      .where(where)
      .orderBy(users.createdAt)
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(users).where(where),
  ]);

  // Clean up null profiles — only include profile data when it exists
  const cleaned = rows.map((row) => {
    const hasDoctor = row.doctorProfile?.specialization !== null ||
      row.doctorProfile?.qualifications !== null ||
      row.doctorProfile?.bio !== null ||
      row.doctorProfile?.phone !== null;
    const hasPatient = row.patientProfile?.dateOfBirth !== null ||
      row.patientProfile?.gender !== null ||
      row.patientProfile?.phone !== null ||
      row.patientProfile?.address !== null;

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      isActive: row.isActive,
      createdAt: row.createdAt,
      doctorProfile: hasDoctor ? row.doctorProfile : null,
      patientProfile: hasPatient ? row.patientProfile : null,
    };
  });

  return NextResponse.json({
    users: cleaned,
    total: totalRow.total,
    page,
    limit,
  });
}

export async function PATCH(request: NextRequest) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: { userId?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { userId, action } = body;

  if (!userId || !action || !["activate", "deactivate"].includes(action)) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: [
          ...(!userId ? [{ field: "userId", message: "userId is required" }] : []),
          ...(!action || !["activate", "deactivate"].includes(action ?? "")
            ? [{ field: "action", message: 'action must be "activate" or "deactivate"' }]
            : []),
        ],
      },
      { status: 400 }
    );
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId));

  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isActive = action === "activate";

  const [updated] = await db
    .update(users)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
    });

  return NextResponse.json(updated);
}
