import { headers } from "next/headers";
import { auth } from "./auth";

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    throw new Error("Unauthenticated");
  }
  return session;
}

export async function requireRole(role: "patient" | "doctor" | "admin") {
  const session = await getSession();
  if (session.user.role !== role) {
    throw new Error("Unauthorized");
  }
  return session;
}
