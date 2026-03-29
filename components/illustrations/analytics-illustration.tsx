import { IllustrationProps } from "./index";

export function AnalyticsIllustration({
  className,
  size = 200,
  decorative = true,
  title = "Analytics",
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
      {/* Chart base line */}
      <line
        x1="35"
        y1="160"
        x2="165"
        y2="160"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.3"
      />
      {/* Y-axis */}
      <line
        x1="35"
        y1="40"
        x2="35"
        y2="160"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.3"
      />
      {/* Bar 1 */}
      <rect
        x="50"
        y="110"
        width="22"
        height="50"
        rx="4"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.5"
      />
      {/* Bar 2 */}
      <rect
        x="82"
        y="75"
        width="22"
        height="85"
        rx="4"
        fill="hsl(var(--primary))"
        opacity="0.4"
      />
      {/* Bar 3 */}
      <rect
        x="114"
        y="55"
        width="22"
        height="105"
        rx="4"
        fill="hsl(var(--kiosk-primary))"
        opacity="0.6"
      />
      {/* Bar 4 */}
      <rect
        x="146"
        y="85"
        width="22"
        height="75"
        rx="4"
        fill="hsl(var(--primary))"
        opacity="0.35"
      />
      {/* Trend line */}
      <path
        d="M61 105 L93 70 L125 48 L157 80"
        stroke="hsl(var(--kiosk-primary))"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      {/* Trend dots */}
      <circle cx="61" cy="105" r="4" fill="hsl(var(--kiosk-primary))" opacity="0.8" />
      <circle cx="93" cy="70" r="4" fill="hsl(var(--kiosk-primary))" opacity="0.8" />
      <circle cx="125" cy="48" r="4" fill="hsl(var(--kiosk-primary))" opacity="0.8" />
      <circle cx="157" cy="80" r="4" fill="hsl(var(--kiosk-primary))" opacity="0.8" />
    </svg>
  );
}
