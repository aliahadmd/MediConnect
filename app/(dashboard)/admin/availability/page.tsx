import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AvailabilityManager } from "@/components/admin/availability-manager";

export default async function AdminAvailabilityPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const userRole = (session.user as Record<string, unknown>).role as string;
  if (userRole !== "admin") {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Availability Management</h1>
        <p className="text-muted-foreground">
          View and manage doctor availability slots. Filter by doctor name or
          date range, and delete slots when needed.
        </p>
      </div>
      <AvailabilityManager />
    </div>
  );
}
