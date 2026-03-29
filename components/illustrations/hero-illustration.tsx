import { IllustrationProps } from "./index";

export function HeroIllustration({
  className,
  size = 200,
  decorative = true,
  title = "Connected Healthcare",
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
        r="85"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.06"
      />
      {/* Central medical cross */}
      <rect
        x="90"
        y="70"
        width="20"
        height="60"
        rx="4"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.3"
      />
      <rect
        x="70"
        y="90"
        width="60"
        height="20"
        rx="4"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.3"
      />
      {/* Person node - top left (patient) */}
      <circle
        cx="45"
        cy="50"
        r="14"
        fill="hsl(var(--primary))"
        opacity="0.15"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeOpacity="0.3"
      />
      <circle cx="45" cy="46" r="5" fill="hsl(var(--primary))" opacity="0.35" />
      <path
        d="M37 58 Q37 52 45 51 Q53 52 53 58"
        fill="hsl(var(--primary))"
        opacity="0.25"
      />
      {/* Person node - top right (doctor) */}
      <circle
        cx="155"
        cy="50"
        r="14"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.15"
        stroke="hsl(var(--kiosk-primary))"
        strokeWidth="2"
        strokeOpacity="0.3"
      />
      <circle cx="155" cy="46" r="5" fill="hsl(var(--kiosk-primary))" opacity="0.4" />
      <path
        d="M147 58 Q147 52 155 51 Q163 52 163 58"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.3"
      />
      {/* Person node - bottom left */}
      <circle
        cx="45"
        cy="155"
        r="14"
        fill="hsl(var(--primary))"
        opacity="0.15"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeOpacity="0.3"
      />
      <circle cx="45" cy="151" r="5" fill="hsl(var(--primary))" opacity="0.3" />
      <path
        d="M37 163 Q37 157 45 156 Q53 157 53 163"
        fill="hsl(var(--primary))"
        opacity="0.2"
      />
      {/* Person node - bottom right */}
      <circle
        cx="155"
        cy="155"
        r="14"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.15"
        stroke="hsl(var(--kiosk-primary))"
        strokeWidth="2"
        strokeOpacity="0.3"
      />
      <circle cx="155" cy="151" r="5" fill="hsl(var(--kiosk-primary))" opacity="0.35" />
      <path
        d="M147 163 Q147 157 155 156 Q163 157 163 163"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.25"
      />
      {/* Connection lines to center */}
      <line
        x1="58"
        y1="58"
        x2="85"
        y2="85"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        opacity="0.3"
      />
      <line
        x1="142"
        y1="58"
        x2="115"
        y2="85"
        stroke="hsl(var(--kiosk-primary))"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        opacity="0.3"
      />
      <line
        x1="58"
        y1="148"
        x2="85"
        y2="118"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        opacity="0.3"
      />
      <line
        x1="142"
        y1="148"
        x2="115"
        y2="118"
        stroke="hsl(var(--kiosk-primary))"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        opacity="0.3"
      />
      {/* Pulse line accent */}
      <path
        d="M30 100 L60 100 L68 85 L76 115 L84 100 L90 100"
        stroke="hsl(var(--kiosk-primary))"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.25"
      />
    </svg>
  );
}
