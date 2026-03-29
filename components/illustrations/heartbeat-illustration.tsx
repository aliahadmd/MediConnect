import { IllustrationProps } from "./index";

export function HeartbeatIllustration({
  className,
  size = 200,
  decorative = true,
  title = "Heartbeat",
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
      {/* Background circle */}
      <circle
        cx="100"
        cy="90"
        r="55"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.1"
      />
      {/* Heart shape */}
      <path
        d="M100 65 C100 45, 75 35, 65 50 C55 65, 65 80, 100 105 C135 80, 145 65, 135 50 C125 35, 100 45, 100 65Z"
        fill="hsl(var(--primary))"
        opacity="0.85"
      />
      {/* Heart highlight */}
      <path
        d="M85 55 C85 48, 78 45, 74 52"
        stroke="hsl(var(--kiosk-primary))"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.5"
      />
      {/* Pulse line */}
      <path
        d="M20 150 L60 150 L72 150 L80 130 L90 170 L100 120 L110 165 L118 145 L125 150 L180 150"
        stroke="hsl(var(--kiosk-primary))"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Pulse line shadow */}
      <path
        d="M20 150 L60 150 L72 150 L80 130 L90 170 L100 120 L110 165 L118 145 L125 150 L180 150"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.3"
        transform="translate(0, 3)"
      />
    </svg>
  );
}
