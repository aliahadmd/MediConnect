import { IllustrationProps } from "./index";

export function CalendarIllustration({
  className,
  size = 200,
  decorative = true,
  title = "Calendar",
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
      {/* Shadow */}
      <rect
        x="38"
        y="42"
        width="130"
        height="130"
        rx="14"
        fill="hsl(var(--muted-foreground))"
        opacity="0.08"
      />
      {/* Calendar body */}
      <rect
        x="35"
        y="38"
        width="130"
        height="130"
        rx="14"
        fill="hsl(var(--primary))"
        opacity="0.1"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeOpacity="0.3"
      />
      {/* Calendar header bar */}
      <rect
        x="35"
        y="38"
        width="130"
        height="35"
        rx="14"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.85"
      />
      {/* Bottom corners fix for header */}
      <rect
        x="35"
        y="58"
        width="130"
        height="15"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.85"
      />
      {/* Calendar rings */}
      <rect x="65" y="30" width="8" height="20" rx="4" fill="hsl(var(--muted-foreground))" opacity="0.5" />
      <rect x="127" y="30" width="8" height="20" rx="4" fill="hsl(var(--muted-foreground))" opacity="0.5" />
      {/* Grid dots for dates */}
      <circle cx="62" cy="100" r="4" fill="hsl(var(--muted-foreground))" opacity="0.2" />
      <circle cx="82" cy="100" r="4" fill="hsl(var(--muted-foreground))" opacity="0.2" />
      <circle cx="102" cy="100" r="4" fill="hsl(var(--muted-foreground))" opacity="0.2" />
      <circle cx="122" cy="100" r="4" fill="hsl(var(--muted-foreground))" opacity="0.2" />
      <circle cx="142" cy="100" r="4" fill="hsl(var(--muted-foreground))" opacity="0.2" />
      <circle cx="62" cy="120" r="4" fill="hsl(var(--muted-foreground))" opacity="0.2" />
      <circle cx="82" cy="120" r="4" fill="hsl(var(--muted-foreground))" opacity="0.2" />
      <circle cx="122" cy="120" r="4" fill="hsl(var(--muted-foreground))" opacity="0.2" />
      <circle cx="142" cy="120" r="4" fill="hsl(var(--muted-foreground))" opacity="0.2" />
      <circle cx="62" cy="140" r="4" fill="hsl(var(--muted-foreground))" opacity="0.2" />
      <circle cx="82" cy="140" r="4" fill="hsl(var(--muted-foreground))" opacity="0.2" />
      <circle cx="102" cy="140" r="4" fill="hsl(var(--muted-foreground))" opacity="0.2" />
      {/* Checkmark highlight on a date */}
      <circle cx="102" cy="120" r="12" fill="hsl(var(--kiosk-primary))" opacity="0.2" />
      <path
        d="M95 120 L100 126 L112 114"
        stroke="hsl(var(--primary))"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
