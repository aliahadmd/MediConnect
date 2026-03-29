import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import {
  StethoscopeIllustration,
  HeroIllustration,
  VideoCallIllustration,
  PillsIllustration,
  CalendarIllustration,
  ShieldIllustration,
} from "@/components/illustrations";

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
    <div className="flex min-h-screen flex-col bg-background">
      {/* Navigation Bar */}
      <nav data-testid="nav-bar" className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <StethoscopeIllustration size={32} decorative />
            <span className="text-xl font-bold tracking-tight">MediConnect</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Register
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero Section */}
        <section data-testid="hero-section" className="w-full py-16 sm:py-24 lg:py-32">
          <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
            <div className="flex flex-col gap-6">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Your Health, Connected
              </h1>
              <p className="max-w-lg text-lg text-muted-foreground">
                Book appointments, consult with doctors via video, and manage
                prescriptions — all from one secure platform. Healthcare made
                simple.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/login"
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-primary px-8 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-input bg-background px-8 text-base font-semibold transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Create Account
                </Link>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <HeroIllustration size={360} className="h-auto w-full max-w-[360px]" />
            </div>
          </div>
        </section>

        {/* Feature Highlights */}
        <section data-testid="feature-cards" className="w-full border-t bg-muted/30 py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold tracking-tight">Everything You Need</h2>
              <p className="mt-2 text-muted-foreground">
                A complete virtual clinic experience at your fingertips
              </p>
            </div>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* Video Consultations Card */}
              <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card p-6 text-center shadow-sm">
                <VideoCallIllustration size={80} />
                <h3 className="text-xl font-semibold">Video Consultations</h3>
                <p className="text-sm text-muted-foreground">
                  Connect face-to-face with your doctor from anywhere. Secure,
                  high-quality video calls with no downloads required.
                </p>
              </div>
              {/* Prescriptions Card */}
              <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card p-6 text-center shadow-sm">
                <PillsIllustration size={80} />
                <h3 className="text-xl font-semibold">Digital Prescriptions</h3>
                <p className="text-sm text-muted-foreground">
                  Receive and manage prescriptions digitally. View history,
                  track medications, and never lose a prescription again.
                </p>
              </div>
              {/* Booking Card */}
              <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card p-6 text-center shadow-sm">
                <CalendarIllustration size={80} />
                <h3 className="text-xl font-semibold">Easy Booking</h3>
                <p className="text-sm text-muted-foreground">
                  Find the right doctor and book an appointment in minutes.
                  Browse specializations, check availability, and confirm instantly.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Indicators */}
        <section data-testid="trust-indicators" className="w-full border-t py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
                <ShieldIllustration size={96} />
                <h3 className="text-2xl font-bold">Your Data is Secure</h3>
                <p className="max-w-md text-muted-foreground">
                  We take your privacy seriously. All consultations are
                  encrypted end-to-end, and your medical records are stored
                  securely following healthcare data protection standards.
                </p>
              </div>
              <div className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
                <div className="flex size-16 items-center justify-center rounded-full bg-kiosk-primary/10">
                  <StethoscopeIllustration size={40} />
                </div>
                <h3 className="text-2xl font-bold">Trusted by Patients &amp; Doctors</h3>
                <p className="max-w-md text-muted-foreground">
                  Join a growing community of healthcare professionals and
                  patients. Verified doctors, transparent reviews, and a
                  seamless experience from booking to consultation.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer data-testid="footer" className="w-full border-t bg-muted/30 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 text-center sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <StethoscopeIllustration size={24} decorative />
            <span className="text-lg font-semibold">MediConnect</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Your virtual clinic platform — book appointments, consult with
            doctors, and manage prescriptions all in one place.
          </p>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} MediConnect. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
