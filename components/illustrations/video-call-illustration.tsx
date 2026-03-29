import { IllustrationProps } from "./index";

export function VideoCallIllustration({
  className,
  size = 200,
  decorative = true,
  title = "Video Call",
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
        r="75"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.06"
      />
      {/* Monitor/screen body */}
      <rect
        x="28"
        y="40"
        width="144"
        height="95"
        rx="10"
        fill="hsl(var(--primary))"
        opacity="0.12"
        stroke="hsl(var(--primary))"
        strokeWidth="2.5"
        strokeOpacity="0.4"
      />
      {/* Screen inner */}
      <rect
        x="36"
        y="48"
        width="128"
        height="79"
        rx="6"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.1"
      />
      {/* Person silhouette on screen */}
      <circle
        cx="100"
        cy="75"
        r="14"
        fill="hsl(var(--primary))"
        opacity="0.5"
      />
      <path
        d="M75 115 Q75 95 100 92 Q125 95 125 115"
        fill="hsl(var(--primary))"
        opacity="0.35"
      />
      {/* Monitor stand */}
      <rect
        x="90"
        y="135"
        width="20"
        height="15"
        fill="hsl(var(--muted-foreground))"
        opacity="0.25"
      />
      <rect
        x="75"
        y="148"
        width="50"
        height="6"
        rx="3"
        fill="hsl(var(--muted-foreground))"
        opacity="0.3"
      />
      {/* Camera indicator */}
      <circle
        cx="100"
        cy="44"
        r="3"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.7"
      />
      {/* Signal waves */}
      <path
        d="M155 55 Q165 50 165 65"
        stroke="hsl(var(--kiosk-primary))"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.4"
      />
      <path
        d="M160 48 Q175 42 175 72"
        stroke="hsl(var(--kiosk-primary))"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.25"
      />
      {/* Play/call button */}
      <circle
        cx="100"
        cy="170"
        r="14"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.2"
      />
      <path
        d="M95 163 L110 170 L95 177Z"
        fill="hsl(var(--primary))"
        opacity="0.6"
      />
    </svg>
  );
}
