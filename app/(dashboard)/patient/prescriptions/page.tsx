import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PrescriptionList } from "@/components/prescriptions/prescription-list";
import { PageTransition } from "@/components/ui/page-transition";

export default async function PatientPrescriptionsPage() {
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

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">My Prescriptions</h1>
          <p className="text-muted-foreground">
            View and download prescriptions from your completed appointments.
          </p>
        </div>
        <PrescriptionList />
      </div>
    </PageTransition>
  );
}
