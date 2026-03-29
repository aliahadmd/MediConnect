import { IllustrationProps } from "./index";

export function WaitingIllustration({
  className,
  size = 200,
  decorative = true,
  title = "Waiting",
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
      {/* Clock face */}
      <circle
        cx="100"
        cy="95"
        r="52"
        fill="hsl(var(--primary))"
        opacity="0.08"
        stroke="hsl(var(--primary))"
        strokeWidth="3"
        strokeOpacity="0.3"
      />
      <circle
        cx="100"
        cy="95"
        r="45"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.06"
      />
      {/* Hour markers */}
      <circle cx="100" cy="55" r="3" fill="hsl(var(--muted-foreground))" opacity="0.4" />
      <circle cx="140" cy="95" r="3" fill="hsl(var(--muted-foreground))" opacity="0.4" />
      <circle cx="100" cy="135" r="3" fill="hsl(var(--muted-foreground))" opacity="0.4" />
      <circle cx="60" cy="95" r="3" fill="hsl(var(--muted-foreground))" opacity="0.4" />
      {/* Hour hand */}
      <line
        x1="100"
        y1="95"
        x2="100"
        y2="68"
        stroke="hsl(var(--primary))"
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      {/* Minute hand */}
      <line
        x1="100"
        y1="95"
        x2="125"
        y2="82"
        stroke="hsl(var(--kiosk-primary))"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.5"
      />
      {/* Center dot */}
      <circle cx="100" cy="95" r="4" fill="hsl(var(--kiosk-primary))" opacity="0.7" />
      {/* Peaceful leaf accents */}
      <path
        d="M45 155 Q55 140 65 155 Q55 160 45 155Z"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.2"
      />
      <path
        d="M135 155 Q145 140 155 155 Q145 160 135 155Z"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.15"
      />
      {/* Calming dots */}
      <circle cx="55" cy="170" r="2" fill="hsl(var(--muted-foreground))" opacity="0.15" />
      <circle cx="100" cy="175" r="2" fill="hsl(var(--muted-foreground))" opacity="0.15" />
      <circle cx="145" cy="170" r="2" fill="hsl(var(--muted-foreground))" opacity="0.15" />
    </svg>
  );
}
