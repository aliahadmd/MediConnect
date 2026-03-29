import { IllustrationProps } from "./index";

export function ConnectionErrorIllustration({
  className,
  size = 200,
  decorative = true,
  title = "Connection Error",
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
      {/* Outer signal arc */}
      <path
        d="M40 85 Q40 35 100 35 Q160 35 160 85"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        opacity="0.2"
      />
      {/* Middle signal arc */}
      <path
        d="M58 95 Q58 55 100 55 Q142 55 142 95"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        opacity="0.25"
      />
      {/* Inner signal arc */}
      <path
        d="M76 105 Q76 78 100 78 Q124 78 124 105"
        stroke="hsl(var(--primary))"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        opacity="0.3"
      />
      {/* Signal dot */}
      <circle
        cx="100"
        cy="115"
        r="8"
        fill="hsl(var(--primary))"
        opacity="0.35"
      />
      {/* Diagonal slash (disconnected) */}
      <line
        x1="55"
        y1="140"
        x2="145"
        y2="50"
        stroke="hsl(var(--kiosk-primary))"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.5"
      />
      {/* X mark */}
      <path
        d="M85 148 L115 148"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.3"
      />
      {/* Warning triangle */}
      <path
        d="M100 155 L88 172 L112 172Z"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.2"
        stroke="hsl(var(--kiosk-primary))"
        strokeWidth="1.5"
        strokeOpacity="0.4"
      />
      {/* Exclamation in triangle */}
      <line
        x1="100"
        y1="160"
        x2="100"
        y2="166"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <circle cx="100" cy="169" r="1.5" fill="hsl(var(--primary))" opacity="0.5" />
    </svg>
  );
}
