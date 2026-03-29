import { IllustrationProps } from "./index";

export function StethoscopeIllustration({
  className,
  size = 200,
  decorative = true,
  title = "Stethoscope",
}: IllustrationProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      aria-hidden={decorative ? "true" : undefined}
      role={decorative ? undefined : "img"}
    >
      {!decorative && <title>{title}</title>}
      {/* Earpieces */}
      <circle cx="60" cy="30" r="10" fill="hsl(var(--muted-foreground))" opacity="0.3" />
      <circle cx="140" cy="30" r="10" fill="hsl(var(--muted-foreground))" opacity="0.3" />
      {/* Ear tubes */}
      <path
        d="M60 40 Q60 70 80 80"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M140 40 Q140 70 120 80"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      {/* Y-junction */}
      <path
        d="M80 80 Q100 95 120 80"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      {/* Main tube */}
      <path
        d="M100 90 L100 140"
        stroke="hsl(var(--primary))"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Chest piece outer ring */}
      <circle
        cx="100"
        cy="160"
        r="28"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.15"
      />
      <circle
        cx="100"
        cy="160"
        r="22"
        fill="hsl(var(--primary))"
        opacity="0.2"
      />
      {/* Chest piece inner */}
      <circle
        cx="100"
        cy="160"
        r="16"
        fill="hsl(var(--kiosk-primary))"
      />
      <circle
        cx="100"
        cy="160"
        r="8"
        fill="hsl(var(--primary))"
        opacity="0.6"
      />
    </svg>
  );
}
