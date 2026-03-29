import { IllustrationProps } from "./index";

export function DoctorIllustration({
  className,
  size = 200,
  decorative = true,
  title = "Doctor",
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
        opacity="0.4"
      />
      {/* Lab coat body */}
      <path
        d="M65 90 Q65 75 100 72 Q135 75 135 90 L140 160 L60 160Z"
        fill="hsl(var(--primary))"
        opacity="0.15"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeOpacity="0.3"
      />
      {/* Coat lapels */}
      <path
        d="M85 90 L100 115 L115 90"
        stroke="hsl(var(--kiosk-primary))"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Coat buttons */}
      <circle cx="100" cy="120" r="3" fill="hsl(var(--kiosk-primary))" opacity="0.5" />
      <circle cx="100" cy="135" r="3" fill="hsl(var(--kiosk-primary))" opacity="0.5" />
      {/* Stethoscope around neck */}
      <path
        d="M88 85 Q82 100 85 115"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.5"
      />
      <circle
        cx="85"
        cy="118"
        r="6"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.6"
      />
      {/* Name badge */}
      <rect
        x="108"
        y="100"
        width="18"
        height="12"
        rx="2"
        fill="hsl(var(--muted-foreground))"
        opacity="0.2"
      />
      {/* Base/feet */}
      <rect
        x="70"
        y="158"
        width="60"
        height="8"
        rx="4"
        fill="hsl(var(--muted-foreground))"
        opacity="0.15"
      />
    </svg>
  );
}
