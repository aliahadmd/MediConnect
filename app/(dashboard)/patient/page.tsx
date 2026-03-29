import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PatientDashboardContent } from "@/components/dashboard/patient-dashboard-content";

export default async function PatientDashboardPage() {
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

  const userName = session.user.name || "there";

  return (
    <div className="space-y-6">
      <div data-testid="patient-greeting">
        <h1 className="text-2xl font-semibold">
          Welcome back, {userName}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s your health overview
        </p>
      </div>
      <PatientDashboardContent userName={userName} />
    </div>
  );
}
