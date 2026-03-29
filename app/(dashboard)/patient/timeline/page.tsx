import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MedicalTimelineContent } from "@/components/timeline/medical-timeline-content";
import { PageTransition } from "@/components/ui/page-transition";

export default async function PatientTimelinePage() {
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
          <h1 className="text-2xl font-semibold">Medical Timeline</h1>
          <p className="text-muted-foreground">
            A chronological view of your appointments, prescriptions, and visit
            notes.
          </p>
        </div>
        <MedicalTimelineContent />
      </div>
    </PageTransition>
  );
}
