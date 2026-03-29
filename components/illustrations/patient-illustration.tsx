import { IllustrationProps } from "./index";

export function PatientIllustration({
  className,
  size = 200,
  decorative = true,
  title = "Patient",
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
      {/* Background glow */}
      <circle
        cx="100"
        cy="100"
        r="80"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.06"
      />
      {/* Head */}
      <circle
        cx="100"
        cy="55"
        r="22"
        fill="hsl(var(--primary))"
        opacity="0.35"
      />
      {/* Body */}
      <path
        d="M68 92 Q68 78 100 74 Q132 78 132 92 L136 155 L64 155Z"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.12"
        stroke="hsl(var(--kiosk-primary))"
        strokeWidth="2"
        strokeOpacity="0.3"
      />
      {/* Wellness heart */}
      <path
        d="M92 110 Q92 102 100 108 Q108 102 108 110 Q108 120 100 126 Q92 120 92 110Z"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.5"
      />
      {/* Arms relaxed */}
      <path
        d="M68 95 Q55 110 58 130"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.3"
      />
      <path
        d="M132 95 Q145 110 142 130"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.3"
      />
      {/* Smile */}
      <path
        d="M92 60 Q100 68 108 60"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.5"
      />
      {/* Base */}
      <rect
        x="72"
        y="153"
        width="56"
        height="8"
        rx="4"
        fill="hsl(var(--muted-foreground))"
        opacity="0.15"
      />
    </svg>
  );
}
