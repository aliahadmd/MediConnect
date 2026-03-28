import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Stethoscope } from "lucide-react";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

function getRoleDashboard(role: string): string {
  switch (role) {
    case "doctor":
      return "/doctor/appointments";
    case "admin":
      return "/admin/users";
    case "patient":
    default:
      return "/patient/appointments";
  }
}

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    const role = (session.user as Record<string, unknown>).role as string ?? "patient";
    redirect(getRoleDashboard(role));
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-linear-to-b from-background to-muted p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center">
          <div className="mb-2 flex size-14 items-center justify-center rounded-full bg-primary/10">
            <Stethoscope className="size-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">MediConnect</CardTitle>
          <CardDescription>
            Your virtual clinic platform. Book appointments, consult with doctors via video, and manage prescriptions — all in one place.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild size="lg" className="w-full">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/register">Create an account</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
