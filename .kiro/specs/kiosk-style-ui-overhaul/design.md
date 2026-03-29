# Design Document: Kiosk-Style UI Overhaul

## Overview

This design transforms MediConnect's functional but minimal UI into a polished, kiosk-style healthcare application. The overhaul is entirely frontend — no API, database, or backend changes are needed. The work spans:

1. A new **SVG illustration library** (`components/illustrations/`) providing inline React SVG components for medical themes
2. **Global CSS/theme changes** in `globals.css` adding a healthcare color palette, kiosk spacing tokens, and typography scale
3. **Page-by-page component modifications** to inject illustrations, engagement copy, kiosk layout patterns, and touch-target sizing
4. **Consistent framer-motion animation patterns** for page transitions, card entrances, and illustration reveals
5. **Landing page rebuild** from a single centered card to a full-width hero + features + trust + footer layout

The existing component APIs, data fetching, routing, and business logic remain untouched. Every change is additive CSS, new wrapper/illustration components, or Tailwind class adjustments on existing elements.

## Architecture

### High-Level Change Map

```mermaid
graph TD
    subgraph "New Files"
        IL[components/illustrations/*.tsx]
        AN[lib/animation-variants.ts]
    end

    subgraph "Modified Global"
        GC[app/globals.css — new tokens]
    end

    subgraph "Modified Pages"
        LP[app/page.tsx — Landing]
        AL[app/(auth)/layout.tsx]
        PD[app/(dashboard)/patient/page.tsx]
        DD[app/(dashboard)/doctor/appointments/page.tsx]
        AD[app/(dashboard)/admin/analytics/page.tsx]
        BP[app/(dashboard)/patient/book/page.tsx]
        WR[app/(dashboard)/patient/waiting-room/...]
        CP[app/(dashboard)/consultation/...]
        SP[app/(dashboard)/settings/page.tsx]
        DS[app/doctors/search/page.tsx]
    end

    subgraph "Modified Components"
        LF[components/auth/login-form.tsx]
        RF[components/auth/register-form.tsx]
        SB[components/layout/sidebar.tsx]
        HD[components/layout/header.tsx]
        BS[components/appointments/booking-stepper.tsx]
        WC[components/consultation/waiting-room.tsx]
        VR[components/consultation/video-room.tsx]
        PDC[components/dashboard/patient-dashboard-content.tsx]
        AC[components/admin/analytics-charts.tsx]
    end

    IL --> LP
    IL --> AL
    IL --> PD
    IL --> DD
    IL --> AD
    IL --> BP
    IL --> WR
    IL --> CP
    IL --> DS
    AN --> BS
    AN --> PDC
    AN --> WC
    AN --> VR
    GC --> LP
    GC --> AL
    GC --> PD
```

### Design Principles

- **Additive only**: No existing props, state, or data-fetching logic is changed. We add classes, wrap elements, and insert new child components.
- **Token-driven**: All new colors, spacing, and radii are CSS custom properties so dark mode and future theming work automatically.
- **Shared animation config**: A single `lib/animation-variants.ts` file exports reusable framer-motion variant objects so every page animates consistently.
- **Illustration as components**: SVGs are inline React components (not `<img>` tags) so they can consume CSS custom property colors and accept `className`/`size` props.

## Components and Interfaces

### 1. SVG Illustration Library — `components/illustrations/`

Each illustration is a standalone React component exporting a single SVG.

```
components/illustrations/
├── index.ts                        # barrel export
├── stethoscope-illustration.tsx
├── heartbeat-illustration.tsx
├── pills-illustration.tsx
├── calendar-illustration.tsx
├── video-call-illustration.tsx
├── doctor-illustration.tsx
├── patient-illustration.tsx
├── shield-illustration.tsx
├── analytics-illustration.tsx
├── empty-state-illustration.tsx
├── waiting-illustration.tsx
├── consultation-complete-illustration.tsx
├── connection-error-illustration.tsx
└── hero-illustration.tsx
```

**Shared interface for all illustration components:**

```typescript
interface IllustrationProps {
  className?: string;
  size?: number;          // width & height in px, default 200
  decorative?: boolean;   // when true, sets aria-hidden="true"; when false, renders <title>
  title?: string;         // accessible title text (used when decorative=false)
}
```

**Implementation pattern (each component follows this):**

```tsx
export function StethoscopeIllustration({
  className,
  size = 200,
  decorative = true,
  title = "Stethoscope",
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
      {/* SVG paths using currentColor and hsl(var(--primary)) etc. */}
    </svg>
  );
}
```

**Color strategy**: SVG `fill` and `stroke` values reference CSS custom properties via `hsl(var(--primary))`, `hsl(var(--muted-foreground))`, and the new healthcare accent tokens. This ensures illustrations adapt to light/dark mode automatically.

### 2. Animation Variants — `lib/animation-variants.ts`

A shared module exporting reusable framer-motion variant objects:

```typescript
// Page-level content fade-in-up
export const pageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

// Staggered children container
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

// Individual card entrance
export const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
};

// Illustration reveal (scale + fade)
export const illustrationVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } },
};

// Slide-in from left (for split-panel auth layouts)
export const slideInLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

// Slide-in from right
export const slideInRight = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
};
```

These are consumed via `<motion.div variants={pageVariants} initial="hidden" animate="visible">` throughout the app.

### 3. Landing Page Rebuild — `app/page.tsx`

The current single-card layout is replaced with a full-width kiosk landing page:

```
┌─────────────────────────────────────────────┐
│  Nav: Logo + MediConnect    Login | Register │
├─────────────────────────────────────────────┤
│  Hero Section                                │
│  ┌──────────────────┬──────────────────┐     │
│  │ Headline         │ HeroIllustration │     │
│  │ Subheadline      │                  │     │
│  │ [Login] [Register]│                 │     │
│  └──────────────────┴──────────────────┘     │
├─────────────────────────────────────────────┤
│  Feature Cards (3-col grid)                  │
│  [Video Consult] [Prescriptions] [Booking]   │
├─────────────────────────────────────────────┤
│  Trust Indicators                            │
│  [Security] [Platform Benefits]              │
├─────────────────────────────────────────────┤
│  Footer: MediConnect · Description · ©       │
└─────────────────────────────────────────────┘
```

The page remains a server component. The hero illustration and feature cards use the new illustration components. CTA buttons use `min-h-[44px] min-w-[44px]` for touch targets.

### 4. Auth Layout & Forms — `app/(auth)/layout.tsx`, `login-form.tsx`, `register-form.tsx`

**Layout change**: The current centered `<div>` becomes a split-panel layout:

```
┌──────────────────┬──────────────────┐
│  Illustration    │  Form Card       │
│  Panel           │  (Login/Register)│
│  (bg-accent,     │                  │
│   SVG + copy)    │                  │
└──────────────────┴──────────────────┘
```

On mobile (`< md`), the illustration panel stacks above the form.

**Form changes**:
- Add `min-h-[44px]` to all `<Input>` components
- Add `min-h-[44px] min-w-[44px]` to submit `<Button>`
- Add engagement copy headline/subheadline above the card

### 5. Dashboard Pages — Patient, Doctor, Admin

**Patient Dashboard (`patient-dashboard-content.tsx`)**:
- Wrap summary cards grid in `<motion.div variants={staggerContainer}>` with each card using `cardVariants`
- Add personalized greeting header (the page already passes session data; the component receives it as a new optional `userName` prop)
- Summary cards get larger icons (`size-8`), bolder value text (`text-3xl font-bold`), and subtle `bg-{accent-color}/10` backgrounds
- Empty states get illustration components + engagement copy

**Doctor Dashboard (`doctor/appointments/page.tsx`)**:
- Add header illustration + engagement copy
- Empty state in `DoctorAppointmentList` gets illustration

**Admin Analytics (`analytics-charts.tsx`)**:
- Stat cards get kiosk styling (larger text, accent icons)
- Header area gets analytics illustration

### 6. Booking Flow — `booking-stepper.tsx`

- Step indicator circles: increase to `h-10 w-10` (40px), add connecting line via `border-t-2` between steps
- Add engagement copy below each step title
- Doctor cards: add `min-h-[44px]` touch target, hover elevation via `hover:shadow-md hover:-translate-y-0.5 transition-all`
- Time slot buttons: add `min-h-[44px] min-w-[44px]`
- Success state: replace `CheckCircle2` icon with `CalendarIllustration` + celebratory copy
- Empty states (no doctors, no slots): add illustrations + guidance copy

### 7. Waiting Room — `waiting-room.tsx`

- Add calming engagement copy ("Your doctor will be with you shortly" as primary, helpful secondary text)
- Add `WaitingIllustration` in the waiting state alongside the pulsing clock animation
- "Join Now" button: ensure `min-h-[44px] min-w-[44px]` with prominent styling
- Doctor-ready state: add engagement copy confirming readiness
- Queue position: increase to `text-6xl font-black` for kiosk-style bold display

### 8. Consultation Page — `video-room.tsx`

- Idle state: replace `Video` icon with `VideoCallIllustration` + engagement copy about the session
- "Join Consultation" button: `min-h-[44px] min-w-[44px]` with prominent styling
- Ended state: replace `PhoneOff` icon with `ConsultationCompleteIllustration` + thank-you copy with next-step suggestions
- Disconnected state: replace `WifiOff` icon with `ConnectionErrorIllustration` + reassuring copy

### 9. Sidebar & Header — `sidebar.tsx`, `header.tsx`

- Sidebar logo: replace `<Stethoscope>` Lucide icon with `StethoscopeIllustration` (size 32)
- Nav links: add `min-h-[44px]` padding, enhanced hover (`hover:bg-accent/80 transition-colors duration-200`)
- Sidebar background: add subtle gradient via `bg-gradient-to-b from-card to-accent/5`
- Header: increase height to `h-16`, bolder user name, more prominent role badge

### 10. Settings Page — `settings/page.tsx`

- Add header engagement copy
- Section cards: larger icons (`size-6`), bolder titles, increased padding via kiosk card classes
- Form inputs: `min-h-[44px]`
- Photo upload: larger avatar display (`size-24` = 96px), prominent upload button

### 11. Doctor Search & Profile — `doctors/search/page.tsx`

- Header: enhanced engagement copy
- Specialization buttons: `min-h-[44px] min-w-[44px]`
- No-results state: add `EmptyStateIllustration`
- Doctor profile page: add trust indicators, prominent book button, no-reviews illustration

### 12. Empty States Across App

Each empty state follows a consistent pattern:

```tsx
<div className="flex flex-col items-center gap-4 py-12 text-center">
  <motion.div variants={illustrationVariants} initial="hidden" animate="visible">
    <SomeIllustration size={160} className="text-muted-foreground/60" />
  </motion.div>
  <div className="space-y-1">
    <p className="text-lg font-medium">Primary message</p>
    <p className="text-sm text-muted-foreground max-w-sm">Guidance copy</p>
  </div>
  <Button>CTA</Button>
</div>
```

Pages receiving this treatment: Visit History, Prescriptions, Timeline, appointment lists (patient & doctor), notification preferences loading state.

## Data Models

This feature introduces no new data models, API endpoints, or database schema changes. All changes are purely presentational.

**New TypeScript interfaces:**

```typescript
// components/illustrations/index.ts
interface IllustrationProps {
  className?: string;
  size?: number;
  decorative?: boolean;
  title?: string;
}
```

**New CSS custom properties added to `globals.css`:**

```css
:root {
  /* Healthcare accent palette */
  --kiosk-primary: 199 89% 48%;       /* calming teal/blue */
  --kiosk-primary-foreground: 0 0% 100%;
  --kiosk-success: 152 69% 41%;       /* medical green */
  --kiosk-warning: 38 92% 50%;        /* amber */
  --kiosk-info: 217 91% 60%;          /* informational blue */

  /* Kiosk spacing tokens */
  --kiosk-card-padding: 24px;
  --kiosk-card-radius: 16px;
  --kiosk-touch-min: 44px;

  /* Typography */
  --kiosk-body-min: 16px;
}

.dark {
  --kiosk-primary: 199 89% 60%;
  --kiosk-primary-foreground: 0 0% 5%;
  --kiosk-success: 152 69% 55%;
  --kiosk-warning: 38 92% 60%;
  --kiosk-info: 217 91% 70%;
}
```

These are also registered in the `@theme inline` block:

```css
@theme inline {
  /* ... existing tokens ... */
  --color-kiosk-primary: hsl(var(--kiosk-primary));
  --color-kiosk-primary-foreground: hsl(var(--kiosk-primary-foreground));
  --color-kiosk-success: hsl(var(--kiosk-success));
  --color-kiosk-warning: hsl(var(--kiosk-warning));
  --color-kiosk-info: hsl(var(--kiosk-info));
}
```

**New framer-motion variant exports** in `lib/animation-variants.ts` (detailed above in Components section).


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The prework analysis identified that most acceptance criteria in this UI overhaul are best tested as specific examples (render a page, check for elements). However, several criteria express universal rules across all illustration components, all form inputs, all list views, and all booking steps — making them suitable for property-based testing.

### Property 1: Illustration library completeness

*For any* theme in the required set {stethoscope, heartbeat, pills, calendar, video-call, doctor, patient, shield, analytics, empty-state}, the illustration barrel export (`components/illustrations/index.ts`) should export a corresponding React component that, when called with default props, returns a valid SVG element.

**Validates: Requirements 11.1**

### Property 2: Illustration prop forwarding

*For any* illustration component in the library and *for any* valid `size` (positive integer) and *for any* `className` string, rendering the component with those props should produce an SVG element whose `width` and `height` attributes equal the given size, and whose `class` attribute contains the given className.

**Validates: Requirements 11.2**

### Property 3: Illustration color token usage

*For any* illustration component in the library, the rendered SVG markup should contain at least one reference to a CSS custom property (matching the pattern `var(--`) for fill or stroke values, and should not contain any hardcoded hex color literals (matching `#[0-9a-fA-F]{3,8}`).

**Validates: Requirements 11.3**

### Property 4: Illustration accessibility

*For any* illustration component in the library, when rendered with `decorative=true` the SVG element should have `aria-hidden="true"` and no `<title>` child, and when rendered with `decorative=false` and a given `title` string, the SVG should not have `aria-hidden` and should contain a `<title>` element whose text content equals the given title string.

**Validates: Requirements 11.4**

### Property 5: Form input touch target sizing

*For any* `<Input>` element rendered within the auth pages (LoginForm, RegisterForm) and the Settings page forms, the element should have a CSS class or inline style that sets a minimum height of at least 44 CSS pixels (i.e., the rendered element's className should contain `min-h-[44px]` or equivalent Tailwind class).

**Validates: Requirements 3.4, 14.3**

### Property 6: Card kiosk styling

*For any* Card component rendered in the application after the overhaul, the component should apply kiosk-level padding (minimum 24px, via `p-6` or equivalent) and border-radius (minimum 16px, via `rounded-2xl` or equivalent) classes.

**Validates: Requirements 15.3**

### Property 7: Empty state illustration presence in list views

*For any* list view component (admin users, admin appointments, admin availability, patient appointment list, doctor appointment list) when rendered with an empty data array, the output should contain an SVG illustration component (identifiable by `role="img"` or `aria-hidden="true"` on an `<svg>` element) and at least one text element with engagement copy.

**Validates: Requirements 6.3, 10.4**

### Property 8: Booking flow engagement copy per step

*For any* step index in {0, 1, 2} of the BookingStepper component, when that step is active, the rendered output should contain engagement copy text (a non-empty string in a designated engagement-copy element) distinct from the step title.

**Validates: Requirements 7.2**

## Error Handling

Since this feature is purely presentational, error handling focuses on graceful degradation:

1. **Illustration render failures**: Each illustration component is a pure SVG with no external dependencies. If a component fails to render (e.g., due to a React error boundary), the surrounding layout should remain functional. Illustrations are decorative — their absence does not break functionality.

2. **Missing CSS custom properties**: If a new kiosk token (e.g., `--kiosk-primary`) is not defined (perhaps due to a partial deployment), SVG fills/strokes using `hsl(var(--kiosk-primary))` will fall back to transparent. To mitigate, each SVG path should include a fallback: `fill="hsl(var(--kiosk-primary, 199 89% 48%))"`.

3. **Animation library unavailability**: framer-motion is already a dependency. The animation variants degrade gracefully — if `motion.div` is replaced with a plain `div`, the content still renders correctly without animation. No functionality depends on animations completing.

4. **Touch target enforcement**: Touch target sizing is applied via Tailwind utility classes (`min-h-[44px] min-w-[44px]`). If these classes are accidentally removed, the buttons remain functional but may not meet WCAG 2.5.8. Property tests (Property 5) catch regressions.

5. **Dark mode consistency**: All new color tokens define both light and dark variants in `globals.css`. If a dark variant is missing, the light value is inherited (CSS custom property fallback behavior). The illustration color token property test (Property 3) ensures no hardcoded colors bypass the theme system.

## Testing Strategy

### Dual Testing Approach

This feature uses both unit tests (specific examples) and property-based tests (universal properties) for comprehensive coverage.

### Unit Tests (Examples & Edge Cases)

Unit tests verify specific page renders and component states. These use `@testing-library/react` with `vitest` and `jsdom`:

- **Landing page**: Render `Home` component, assert hero section contains headline, subheadline, two CTA buttons, feature cards (≥3), trust indicators (≥2), nav bar, and footer
- **Auth pages**: Render `LoginForm` and `RegisterForm`, assert illustration presence, split-panel layout structure, engagement copy text
- **Patient dashboard**: Render `PatientDashboardContent` with mock data showing empty states, assert illustration + copy in "No Upcoming Appointments" and "No Prescriptions" states
- **Doctor dashboard**: Render doctor appointments page with empty list, assert illustration + engagement copy
- **Booking flow**: Render `BookingStepper` at each step, assert step indicator sizing (40×40), engagement copy, success state illustration, empty state illustrations
- **Waiting room**: Render `WaitingRoom` in waiting and doctor-ready states, assert engagement copy, illustration, queue position typography, button sizing
- **Consultation page**: Render `VideoRoom` in idle, ended, and disconnected states, assert illustrations and engagement copy
- **Sidebar/Header**: Render `Sidebar`, assert SVG logo, nav link sizing, gradient background. Render `Header`, assert increased height and styling
- **Settings page**: Render settings page, assert header copy, section card styling, photo upload sizing
- **Doctor search**: Render with no results, assert illustration presence
- **Global CSS**: Parse `globals.css` content, assert presence of `--kiosk-primary`, `--kiosk-success`, `--kiosk-warning`, `--kiosk-info` tokens in both `:root` and `.dark`

### Property-Based Tests

Property-based tests use `fast-check` (already in devDependencies) with `vitest`. Each test runs a minimum of 100 iterations.

**Configuration:**
- Library: `fast-check` v4.6.0 (already installed)
- Runner: `vitest` v4.1.2 (already installed)
- Minimum iterations: 100 per property
- Test file: `__tests__/properties/kiosk-ui.property.test.ts`

**Each property test is tagged with a comment referencing the design property:**

```typescript
// Feature: kiosk-style-ui-overhaul, Property 1: Illustration library completeness
test.prop("all required illustration themes are exported", [...], ...)

// Feature: kiosk-style-ui-overhaul, Property 2: Illustration prop forwarding
test.prop("illustration components forward className and size", [...], ...)

// Feature: kiosk-style-ui-overhaul, Property 3: Illustration color token usage
test.prop("illustration SVGs use CSS custom property colors", [...], ...)

// Feature: kiosk-style-ui-overhaul, Property 4: Illustration accessibility
test.prop("illustrations handle decorative vs non-decorative correctly", [...], ...)

// Feature: kiosk-style-ui-overhaul, Property 5: Form input touch target sizing
test.prop("form inputs have minimum 44px height", [...], ...)

// Feature: kiosk-style-ui-overhaul, Property 6: Card kiosk styling
test.prop("cards use kiosk padding and radius", [...], ...)

// Feature: kiosk-style-ui-overhaul, Property 7: Empty state illustration presence
test.prop("empty list views show illustration and engagement copy", [...], ...)

// Feature: kiosk-style-ui-overhaul, Property 8: Booking flow engagement copy per step
test.prop("each booking step has engagement copy", [...], ...)
```

**Property test implementation approach:**

- Properties 1-4 generate random inputs (sizes, classNames, title strings, theme selections) and render illustration components, asserting structural invariants on the output
- Property 5 renders form components and checks all `<input>` elements for touch-target classes
- Property 6 renders Card components with random content and checks for kiosk classes
- Property 7 renders list view components with empty arrays and checks for SVG + text elements
- Property 8 renders BookingStepper at each step index and checks for engagement copy elements

Each correctness property maps to exactly one property-based test. Unit tests complement these by covering specific visual states, edge cases, and integration points that don't generalize to universal properties.
