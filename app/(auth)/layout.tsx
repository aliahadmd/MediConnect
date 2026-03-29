import { ShieldIllustration } from "@/components/illustrations";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* Illustration panel */}
      <div
        data-testid="auth-illustration-panel"
        className="flex flex-col items-center justify-center gap-6 bg-accent/50 px-8 py-12 md:py-0"
      >
        <ShieldIllustration size={180} className="text-kiosk-primary" />
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Your health, secured
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Join thousands of patients and doctors on MediConnect — your trusted
            virtual clinic.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div
        data-testid="auth-form-panel"
        className="flex items-center justify-center bg-background px-4 py-12"
      >
        {children}
      </div>
    </div>
  );
}
