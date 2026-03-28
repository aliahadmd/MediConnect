import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Toaster } from "sonner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const userName = session.user.name ?? "User";
  const userRole = (session.user as Record<string, unknown>).role as string ?? "patient";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userName={userName} userRole={userRole} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userName={userName} userRole={userRole} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}
