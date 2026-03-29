import { IllustrationProps } from "./index";

export function EmptyStateIllustration({
  className,
  size = 200,
  decorative = true,
  title = "No Data",
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
      {/* Box back */}
      <path
        d="M55 75 L100 55 L145 75 L145 140 L100 160 L55 140Z"
        fill="hsl(var(--primary))"
        opacity="0.08"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeOpacity="0.3"
      />
      {/* Box front face */}
      <path
        d="M55 75 L100 95 L100 160 L55 140Z"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.1"
      />
      {/* Box right face */}
      <path
        d="M100 95 L145 75 L145 140 L100 160Z"
        fill="hsl(var(--primary))"
        opacity="0.12"
      />
      {/* Box top edge */}
      <path
        d="M55 75 L100 95 L145 75 L100 55Z"
        fill="hsl(var(--muted-foreground))"
        opacity="0.08"
      />
      {/* Open flap left */}
      <path
        d="M55 75 L75 50 L100 65 L100 95Z"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.12"
        stroke="hsl(var(--kiosk-primary))"
        strokeWidth="1.5"
        strokeOpacity="0.2"
      />
      {/* Open flap right */}
      <path
        d="M145 75 L125 50 L100 65 L100 95Z"
        fill="hsl(var(--primary))"
        opacity="0.1"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeOpacity="0.2"
      />
      {/* Sparkle accents */}
      <circle cx="80" cy="42" r="3" fill="hsl(var(--kiosk-primary))" opacity="0.3" />
      <circle cx="120" cy="38" r="2" fill="hsl(var(--primary))" opacity="0.25" />
      <circle cx="68" cy="55" r="2" fill="hsl(var(--muted-foreground))" opacity="0.2" />
    </svg>
  );
}
