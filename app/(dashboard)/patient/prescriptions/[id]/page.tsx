import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { appointments, prescriptions, users } from "@/lib/db/schema";
import { PrescriptionDetailView } from "@/components/prescriptions/prescription-detail-view";

export default async function PatientPrescriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const userRole = (session.user as Record<string, unknown>).role as string;
  if (userRole !== "patient") {
    redirect("/login");
  }

  const { id } = await params;

  // Fetch prescription with appointment and doctor info
  const [result] = await db
    .select({
      id: prescriptions.id,
      appointmentId: prescriptions.appointmentId,
      medications: prescriptions.medications,
      notes: prescriptions.notes,
      pdfKey: prescriptions.pdfKey,
      createdAt: prescriptions.createdAt,
      appointmentDate: appointments.scheduledAt,
      patientId: appointments.patientId,
      doctorName: users.name,
    })
    .from(prescriptions)
    .innerJoin(appointments, eq(prescriptions.appointmentId, appointments.id))
    .innerJoin(users, eq(appointments.doctorId, users.id))
    .where(eq(prescriptions.id, id));

  if (!result) {
    notFound();
  }

  // Verify this prescription belongs to the authenticated patient
  if (result.patientId !== session.user.id) {
    redirect("/patient/prescriptions");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PrescriptionDetailView
        prescription={{
          id: result.id,
          doctorName: result.doctorName,
          appointmentDate: result.appointmentDate.toISOString(),
          medications: result.medications as Array<{
            name: string;
            dosage: string;
            frequency: string;
            duration: string;
          }>,
          notes: result.notes,
          pdfKey: result.pdfKey,
          createdAt: result.createdAt.toISOString(),
        }}
      />
    </div>
  );
}
