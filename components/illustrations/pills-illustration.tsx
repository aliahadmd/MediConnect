import { IllustrationProps } from "./index";

export function PillsIllustration({
  className,
  size = 200,
  decorative = true,
  title = "Pills",
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
      {/* Background accent */}
      <circle
        cx="100"
        cy="100"
        r="70"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.08"
      />
      {/* Capsule 1 - large, angled */}
      <g transform="translate(100, 85) rotate(-30)">
        <rect
          x="-18"
          y="-35"
          width="36"
          height="70"
          rx="18"
          fill="hsl(var(--primary))"
          opacity="0.85"
        />
        <rect
          x="-18"
          y="0"
          width="36"
          height="35"
          rx="0"
          fill="hsl(var(--kiosk-primary))"
          opacity="0.6"
        />
        <rect
          x="-18"
          y="17"
          width="36"
          height="18"
          rx="18"
          fill="hsl(var(--kiosk-primary))"
          opacity="0.6"
        />
        {/* Divider line */}
        <line
          x1="-18"
          y1="0"
          x2="18"
          y2="0"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="1"
          opacity="0.3"
        />
      </g>
      {/* Round pill */}
      <circle
        cx="55"
        cy="140"
        r="18"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.7"
      />
      <line
        x1="40"
        y1="140"
        x2="70"
        y2="140"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="1.5"
        opacity="0.4"
      />
      {/* Small capsule */}
      <g transform="translate(145, 135) rotate(20)">
        <rect
          x="-10"
          y="-20"
          width="20"
          height="40"
          rx="10"
          fill="hsl(var(--primary))"
          opacity="0.6"
        />
        <rect
          x="-10"
          y="0"
          width="20"
          height="20"
          rx="10"
          fill="hsl(var(--muted-foreground))"
          opacity="0.3"
        />
      </g>
      {/* Sparkle dots */}
      <circle cx="40" cy="60" r="3" fill="hsl(var(--kiosk-primary))" opacity="0.4" />
      <circle cx="160" cy="70" r="2.5" fill="hsl(var(--primary))" opacity="0.3" />
      <circle cx="150" cy="170" r="2" fill="hsl(var(--kiosk-primary))" opacity="0.35" />
    </svg>
  );
}
