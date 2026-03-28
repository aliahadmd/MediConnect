import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { VisitHistory } from "@/components/appointments/visit-history";

export default async function PatientHistoryPage() {
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Visit History</h1>
        <p className="text-muted-foreground">
          View your past consultations, visit notes, and prescriptions.
        </p>
      </div>
      <VisitHistory />
    </div>
  );
}
