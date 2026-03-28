import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments, users, availabilitySlots, patientProfiles } from "@/lib/db/schema";
import { getSession } from "@/lib/auth-helpers";
import { VideoRoom } from "@/components/consultation/video-room";
import { PatientProfilePanel } from "@/components/consultation/patient-profile-panel";

export default async function ConsultationPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  let session;
  try {
    session = await getSession();
  } catch {
    redirect("/login");
  }

  const { appointmentId } = await params;

  const [appointment] = await db
    .select({
      id: appointments.id,
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      status: appointments.status,
      scheduledAt: appointments.scheduledAt,
      slotDate: availabilitySlots.date,
      slotStartTime: availabilitySlots.startTime,
      slotEndTime: availabilitySlots.endTime,
    })
    .from(appointments)
    .innerJoin(availabilitySlots, eq(appointments.slotId, availabilitySlots.id))
    .where(eq(appointments.id, appointmentId));

  if (!appointment) {
    redirect("/patient/appointments");
  }

  const userId = session.user.id;
  if (appointment.patientId !== userId && appointment.doctorId !== userId) {
    redirect("/patient/appointments");
  }

  // Fetch the other participant's name
  const otherUserId =
    appointment.patientId === userId
      ? appointment.doctorId
      : appointment.patientId;

  const [otherUser] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, otherUserId));

  const isDoctor = appointment.doctorId === userId;
  const otherParticipantLabel = isDoctor
    ? `Patient: ${otherUser?.name ?? "Unknown"}`
    : `Dr. ${otherUser?.name ?? "Unknown"}`;

  // Fetch patient profile for doctors
  let patientProfile: {
    bloodType: string | null;
    allergies: string | null;
    medicalHistoryNotes: string | null;
  } | null = null;

  if (isDoctor) {
    const [profile] = await db
      .select({
        bloodType: patientProfiles.bloodType,
        allergies: patientProfiles.allergies,
        medicalHistoryNotes: patientProfiles.medicalHistoryNotes,
      })
      .from(patientProfiles)
      .where(eq(patientProfiles.userId, appointment.patientId));

    patientProfile = profile
      ? {
          bloodType: profile.bloodType,
          allergies: profile.allergies,
          medicalHistoryNotes: profile.medicalHistoryNotes,
        }
      : null;
  }

  return (
    <div className={`mx-auto space-y-6 ${isDoctor ? "max-w-7xl" : "max-w-5xl"}`}>
      <div>
        <h1 className="text-2xl font-semibold">Video Consultation</h1>
        <p className="text-muted-foreground">{otherParticipantLabel}</p>
      </div>
      {isDoctor ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          <VideoRoom
            appointmentId={appointmentId}
            isDoctor={isDoctor}
            status={appointment.status}
            scheduledAt={appointment.scheduledAt.toISOString()}
            slotDate={appointment.slotDate}
            slotStartTime={appointment.slotStartTime}
            slotEndTime={appointment.slotEndTime}
            participantName={otherUser?.name ?? undefined}
          />
          <PatientProfilePanel
            patientName={otherUser?.name ?? "Unknown"}
            bloodType={patientProfile?.bloodType ?? null}
            allergies={patientProfile?.allergies ?? null}
            medicalHistoryNotes={patientProfile?.medicalHistoryNotes ?? null}
          />
        </div>
      ) : (
        <VideoRoom
          appointmentId={appointmentId}
          isDoctor={isDoctor}
          status={appointment.status}
          scheduledAt={appointment.scheduledAt.toISOString()}
          slotDate={appointment.slotDate}
          slotStartTime={appointment.slotStartTime}
          slotEndTime={appointment.slotEndTime}
          participantName={otherUser?.name ?? undefined}
        />
      )}
    </div>
  );
}
