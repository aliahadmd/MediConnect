import { IllustrationProps } from "./index";

export function ShieldIllustration({
  className,
  size = 200,
  decorative = true,
  title = "Security Shield",
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
        r="78"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.06"
      />
      {/* Shield body */}
      <path
        d="M100 25 L155 50 L155 105 Q155 155 100 180 Q45 155 45 105 L45 50Z"
        fill="hsl(var(--primary))"
        opacity="0.1"
        stroke="hsl(var(--primary))"
        strokeWidth="2.5"
        strokeOpacity="0.4"
      />
      {/* Shield inner */}
      <path
        d="M100 38 L145 58 L145 102 Q145 145 100 168 Q55 145 55 102 L55 58Z"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.08"
      />
      {/* Medical cross */}
      <rect
        x="90"
        y="72"
        width="20"
        height="56"
        rx="4"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.6"
      />
      <rect
        x="72"
        y="90"
        width="56"
        height="20"
        rx="4"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.6"
      />
      {/* Checkmark accent */}
      <path
        d="M130 55 L140 45"
        stroke="hsl(var(--primary))"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.3"
      />
    </svg>
  );
}
