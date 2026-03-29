import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AnalyticsCharts } from "@/components/admin/analytics-charts";
import { AnalyticsIllustration } from "@/components/illustrations";

export default async function AdminAnalyticsPage() {
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
      <div className="flex items-center gap-4" data-testid="admin-analytics-header">
        <AnalyticsIllustration size={64} decorative />
        <div>
          <h1 className="text-2xl font-semibold">Platform Analytics</h1>
          <p className="text-muted-foreground">
            Monitor your platform&apos;s health and growth
          </p>
        </div>
      </div>
      <AnalyticsCharts />
    </div>
  );
}
