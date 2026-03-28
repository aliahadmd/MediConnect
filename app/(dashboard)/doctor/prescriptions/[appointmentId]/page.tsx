import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { appointments, prescriptions, users } from "@/lib/db/schema";
import { PrescriptionEditor } from "@/components/prescriptions/prescription-editor";
import { PrescriptionViewer } from "@/components/prescriptions/prescription-viewer";

export default async function DoctorPrescriptionPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const userRole = (session.user as Record<string, unknown>).role as string;
  if (userRole !== "doctor") {
    redirect("/login");
  }

  const { appointmentId } = await params;

  // Fetch appointment and verify it belongs to this doctor
  const [appointment] = await db
    .select({
      id: appointments.id,
      doctorId: appointments.doctorId,
      patientId: appointments.patientId,
      status: appointments.status,
    })
    .from(appointments)
    .where(eq(appointments.id, appointmentId));

  if (!appointment || appointment.doctorId !== session.user.id) {
    redirect("/doctor/appointments");
  }

  if (appointment.status !== "completed") {
    redirect("/doctor/appointments");
  }

  // Fetch patient name
  const [patient] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, appointment.patientId));

  const patientName = patient?.name ?? "Patient";
  const doctorName = session.user.name ?? "Doctor";

  // Check if prescription already exists
  const [existing] = await db
    .select({
      id: prescriptions.id,
      medications: prescriptions.medications,
      notes: prescriptions.notes,
      pdfKey: prescriptions.pdfKey,
      createdAt: prescriptions.createdAt,
    })
    .from(prescriptions)
    .where(eq(prescriptions.appointmentId, appointmentId));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Prescription</h1>
        <p className="text-muted-foreground">
          {existing
            ? "View the prescription for this appointment."
            : "Write a prescription for this completed appointment."}
        </p>
      </div>

      {existing ? (
        <PrescriptionViewer
          prescription={{
            id: existing.id,
            medications: existing.medications as Array<{
              name: string;
              dosage: string;
              frequency: string;
              duration: string;
            }>,
            notes: existing.notes,
            pdfKey: existing.pdfKey,
            createdAt: existing.createdAt.toISOString(),
          }}
          patientName={patientName}
          doctorName={doctorName}
        />
      ) : (
        <PrescriptionEditor
          appointmentId={appointmentId}
          patientName={patientName}
        />
      )}
    </div>
  );
}
