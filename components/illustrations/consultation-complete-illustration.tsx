import { IllustrationProps } from "./index";

export function ConsultationCompleteIllustration({
  className,
  size = 200,
  decorative = true,
  title = "Consultation Complete",
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
      {/* Clipboard body */}
      <rect
        x="55"
        y="40"
        width="90"
        height="125"
        rx="8"
        fill="hsl(var(--primary))"
        opacity="0.1"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeOpacity="0.3"
      />
      {/* Clipboard clip */}
      <rect
        x="82"
        y="32"
        width="36"
        height="16"
        rx="4"
        fill="hsl(var(--muted-foreground))"
        opacity="0.3"
      />
      {/* Document lines */}
      <rect x="70" y="65" width="60" height="4" rx="2" fill="hsl(var(--muted-foreground))" opacity="0.15" />
      <rect x="70" y="78" width="45" height="4" rx="2" fill="hsl(var(--muted-foreground))" opacity="0.15" />
      <rect x="70" y="91" width="55" height="4" rx="2" fill="hsl(var(--muted-foreground))" opacity="0.15" />
      {/* Checkmark circle */}
      <circle
        cx="100"
        cy="130"
        r="22"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.15"
      />
      <circle
        cx="100"
        cy="130"
        r="16"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.25"
      />
      {/* Checkmark */}
      <path
        d="M90 130 L97 138 L112 122"
        stroke="hsl(var(--primary))"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      {/* Sparkle accents */}
      <circle cx="150" cy="50" r="3" fill="hsl(var(--kiosk-primary))" opacity="0.3" />
      <circle cx="45" cy="65" r="2" fill="hsl(var(--primary))" opacity="0.2" />
      <circle cx="155" cy="80" r="2" fill="hsl(var(--kiosk-primary))" opacity="0.2" />
    </svg>
  );
}
