# Implementation Plan: Kiosk-Style UI Overhaul

## Overview

Transform MediConnect's minimal UI into a polished kiosk-style healthcare application. All changes are frontend-only — no API, database, or backend modifications. Work proceeds in layers: global foundations first (CSS tokens, animation variants, illustration library), then page-by-page component modifications, then tests.

## Tasks

- [x] 1. Global CSS foundations and animation variants
  - [x] 1.1 Add healthcare color palette and kiosk tokens to `app/globals.css`
    - Add `--kiosk-primary`, `--kiosk-primary-foreground`, `--kiosk-success`, `--kiosk-warning`, `--kiosk-info` custom properties to `:root` and `.dark`
    - Add `--kiosk-card-padding`, `--kiosk-card-radius`, `--kiosk-touch-min`, `--kiosk-body-min` spacing/typography tokens
    - Register new color tokens in the `@theme inline` block as `--color-kiosk-*`
    - _Requirements: 15.1, 15.2, 15.3_

  - [x] 1.2 Create animation variants module `lib/animation-variants.ts`
    - Export `pageVariants`, `staggerContainer`, `cardVariants`, `illustrationVariants`, `slideInLeft`, `slideInRight` framer-motion variant objects
    - _Requirements: 15.4_

- [x] 2. SVG illustration library
  - [x] 2.1 Create `components/illustrations/` directory with shared `IllustrationProps` interface and barrel export `index.ts`
    - Define `IllustrationProps` with `className`, `size`, `decorative`, `title` props
    - _Requirements: 11.1, 11.2, 11.4_

  - [x] 2.2 Implement core illustration components: `stethoscope-illustration.tsx`, `heartbeat-illustration.tsx`, `pills-illustration.tsx`, `calendar-illustration.tsx`, `video-call-illustration.tsx`
    - Each component renders an inline SVG using CSS custom property colors (`hsl(var(--primary))`, `hsl(var(--kiosk-primary))`, etc.)
    - Each component accepts `IllustrationProps` and handles `decorative` / `title` accessibility attributes
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 2.3 Implement remaining illustration components: `doctor-illustration.tsx`, `patient-illustration.tsx`, `shield-illustration.tsx`, `analytics-illustration.tsx`, `empty-state-illustration.tsx`, `waiting-illustration.tsx`, `consultation-complete-illustration.tsx`, `connection-error-illustration.tsx`, `hero-illustration.tsx`
    - Same pattern as 2.2 — inline SVG, CSS custom property colors, `IllustrationProps` interface
    - Update barrel export `index.ts` to include all 14 components
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 2.4 Write property tests for illustration library (`__tests__/properties/kiosk-ui.property.test.ts`)
    - **Property 1: Illustration library completeness** — all required themes are exported and render valid SVG elements
    - **Validates: Requirements 11.1**

  - [x] 2.5 Write property test for illustration prop forwarding
    - **Property 2: Illustration prop forwarding** — `size` and `className` are correctly applied to rendered SVG
    - **Validates: Requirements 11.2**

  - [x] 2.6 Write property test for illustration color token usage
    - **Property 3: Illustration color token usage** — SVGs reference CSS custom properties and contain no hardcoded hex colors
    - **Validates: Requirements 11.3**

  - [x] 2.7 Write property test for illustration accessibility
    - **Property 4: Illustration accessibility** — `decorative=true` sets `aria-hidden`, `decorative=false` renders `<title>`
    - **Validates: Requirements 11.4**

- [x] 3. Checkpoint — Ensure foundations are solid
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Landing page rebuild
  - [x] 4.1 Rebuild `app/page.tsx` with full-width kiosk landing page
    - Add top navigation bar with logo, platform name, login/register links
    - Add Hero_Section with headline, subheadline, two CTA buttons (min 44×44px touch targets), and `HeroIllustration`
    - Add feature highlights section with 3 feature cards (video consultations, prescriptions, booking) using illustration components
    - Add trust indicators section with security assurance and platform benefit elements
    - Add footer with platform name, description, and copyright
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3_

  - [x] 4.2 Write unit tests for landing page
    - Assert hero section, feature cards (≥3), trust indicators (≥2), nav bar, footer, CTA buttons
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3_

- [x] 5. Auth pages enhancement
  - [x] 5.1 Update `app/(auth)/layout.tsx` to split-panel kiosk layout
    - Replace centered div with split-panel: illustration panel (left) + form card (right)
    - On mobile (`< md`), stack illustration above form
    - Add background accent color to illustration panel
    - _Requirements: 3.1, 3.2_

  - [x] 5.2 Update `components/auth/login-form.tsx` with kiosk styling
    - Add `min-h-[44px]` to all `<Input>` components
    - Add `min-h-[44px] min-w-[44px]` to submit `<Button>`
    - Add engagement copy headline and subheadline above the card
    - _Requirements: 3.3, 3.4, 3.5_

  - [x] 5.3 Update `components/auth/register-form.tsx` with kiosk styling
    - Same touch target and engagement copy enhancements as login form
    - _Requirements: 3.3, 3.4, 3.5_

  - [x] 5.4 Write property test for form input touch target sizing
    - **Property 5: Form input touch target sizing** — all `<Input>` elements in auth forms have `min-h-[44px]` class
    - **Validates: Requirements 3.4, 14.3**

  - [x] 5.5 Write unit tests for auth pages
    - Assert illustration presence, split-panel layout, engagement copy text in both login and register forms
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 6. Sidebar and header visual enhancement
  - [x] 6.1 Update `components/layout/sidebar.tsx` with kiosk styling
    - Replace `<Stethoscope>` Lucide icon with `StethoscopeIllustration` (size 32)
    - Add `min-h-[44px]` padding to nav links, enhanced hover (`hover:bg-accent/80 transition-colors duration-200`)
    - Add subtle gradient background via `bg-gradient-to-b from-card to-accent/5`
    - _Requirements: 12.1, 12.2, 12.4_

  - [x] 6.2 Update `components/layout/header.tsx` with kiosk styling
    - Increase height to `h-16`, bolder user name, more prominent role badge
    - _Requirements: 12.3_

  - [x] 6.3 Write unit tests for sidebar and header
    - Assert SVG logo, nav link sizing, gradient background in sidebar; increased height and styling in header
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [x] 7. Patient dashboard visual overhaul
  - [x] 7.1 Update `app/(dashboard)/patient/page.tsx` with personalized greeting
    - Pass `userName` to `PatientDashboardContent` component
    - Add engagement copy header with patient name and contextual message
    - _Requirements: 4.1_

  - [x] 7.2 Update `components/dashboard/patient-dashboard-content.tsx` with kiosk styling
    - Wrap summary cards in `<motion.div variants={staggerContainer}>` with `cardVariants` on each card
    - Enlarge icons to `size-8`, bold values to `text-3xl font-bold`, add `bg-{accent}/10` backgrounds
    - Add `EmptyStateIllustration` + engagement copy to "No Upcoming Appointments" state
    - Add illustration + engagement copy to empty prescriptions state
    - Add `min-h-[44px] min-w-[44px]` to Quick Actions buttons
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 7.3 Write unit tests for patient dashboard
    - Assert personalized greeting, kiosk card styling, empty state illustrations and copy
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 8. Doctor dashboard visual overhaul
  - [x] 8.1 Update `app/(dashboard)/doctor/appointments/page.tsx` with kiosk styling
    - Add header illustration (`DoctorIllustration`) and engagement copy
    - _Requirements: 5.1, 5.2_

  - [x] 8.2 Update `components/appointments/doctor-appointment-list.tsx` empty state
    - Add `EmptyStateIllustration` + engagement copy guiding doctor to set up availability
    - _Requirements: 5.3_

  - [x] 8.3 Write unit tests for doctor dashboard
    - Assert header illustration, engagement copy, empty state illustration
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 9. Admin dashboard visual overhaul
  - [x] 9.1 Update `app/(dashboard)/admin/analytics/page.tsx` with kiosk styling
    - Add `AnalyticsIllustration` in header area
    - _Requirements: 6.2_

  - [x] 9.2 Update `components/admin/analytics-charts.tsx` with kiosk stat card styling
    - Enlarge stat card typography, add colored accent icons, subtle background differentiation
    - _Requirements: 6.1_

  - [x] 9.3 Add empty state illustrations to admin list views (users, appointments, availability pages)
    - Add `EmptyStateIllustration` + engagement copy to each admin list empty state
    - _Requirements: 6.3_

  - [x] 9.4 Write unit tests for admin dashboard
    - Assert kiosk stat styling, header illustration, empty state illustrations
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 10. Checkpoint — Ensure all dashboard changes work
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Booking flow visual enhancement
  - [x] 11.1 Update `components/appointments/booking-stepper.tsx` with kiosk styling
    - Increase step indicator circles to `h-10 w-10`, add connecting line via `border-t-2`
    - Add engagement copy below each step title
    - Doctor cards: `min-h-[44px]` touch target, `hover:shadow-md hover:-translate-y-0.5 transition-all`
    - Time slot buttons: `min-h-[44px] min-w-[44px]`
    - Success state: replace `CheckCircle2` with `CalendarIllustration` + celebratory copy
    - Empty states (no doctors, no slots): add illustrations + guidance copy
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 11.2 Write property test for booking flow engagement copy
    - **Property 8: Booking flow engagement copy per step** — each active step renders distinct engagement copy
    - **Validates: Requirements 7.2**

  - [x] 11.3 Write unit tests for booking flow
    - Assert step indicator sizing, engagement copy per step, success illustration, empty state illustrations, touch targets
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 12. Waiting room visual enhancement
  - [x] 12.1 Update `components/consultation/waiting-room.tsx` with kiosk styling
    - Add calming engagement copy (primary + secondary text)
    - Add `WaitingIllustration` in waiting state
    - Ensure "Join Now" button has `min-h-[44px] min-w-[44px]` with prominent styling
    - Add engagement copy to doctor-ready state
    - Increase queue position to `text-6xl font-black`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 12.2 Write unit tests for waiting room
    - Assert engagement copy, illustration, queue position typography, button sizing in both waiting and doctor-ready states
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 13. Consultation page visual enhancement
  - [x] 13.1 Update `components/consultation/video-room.tsx` with kiosk styling
    - Idle state: replace `Video` icon with `VideoCallIllustration` + engagement copy
    - "Join Consultation" button: `min-h-[44px] min-w-[44px]` with prominent styling
    - Ended state: replace `PhoneOff` with `ConsultationCompleteIllustration` + thank-you copy with next-step suggestions
    - Disconnected state: replace `WifiOff` with `ConnectionErrorIllustration` + reassuring copy
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [x] 13.2 Write unit tests for consultation page
    - Assert illustrations and engagement copy in idle, ended, and disconnected states
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [x] 14. Doctor search and profile pages enhancement
  - [x] 14.1 Update `app/doctors/search/page.tsx` with kiosk styling
    - Enhanced header engagement copy
    - Specialization buttons: `min-h-[44px] min-w-[44px]`
    - No-results state: add `EmptyStateIllustration`
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 14.2 Update doctor profile page (`app/doctors/[doctorId]/page.tsx`) with kiosk styling
    - Add trust indicators, prominent book button (`min-h-[44px] min-w-[44px]`), no-reviews illustration
    - _Requirements: 9.4, 9.5, 9.6_

  - [x] 14.3 Write unit tests for doctor search and profile pages
    - Assert header copy, specialization button sizing, no-results illustration, trust indicators, no-reviews illustration
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 15. Settings page visual enhancement
  - [x] 15.1 Update `app/(dashboard)/settings/page.tsx` with kiosk styling
    - Add header engagement copy
    - Section cards: larger icons (`size-6`), bolder titles, increased padding
    - Form inputs: `min-h-[44px]`
    - Photo upload: larger avatar (`size-24` = 96px), prominent upload button
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x] 15.2 Write unit tests for settings page
    - Assert header copy, section card styling, photo upload sizing
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [x] 16. Empty states across the application
  - [x] 16.1 Add illustration empty states to Visit History, Prescriptions, and Timeline pages
    - Each empty state: `EmptyStateIllustration` + engagement copy + CTA button, wrapped in `illustrationVariants` animation
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 16.2 Add illustration empty states to patient and doctor appointment lists
    - Same consistent empty state pattern with contextual engagement copy
    - _Requirements: 10.4_

  - [x] 16.3 Add skeleton loaders to notification preferences loading state on Settings page
    - Use kiosk-consistent skeleton styling
    - _Requirements: 10.5_

  - [x] 16.4 Write property test for empty state illustration presence in list views
    - **Property 7: Empty state illustration presence** — empty list views contain SVG illustration and engagement copy text
    - **Validates: Requirements 6.3, 10.4**

  - [x] 16.5 Write unit tests for empty states
    - Assert illustration + engagement copy in Visit History, Prescriptions, Timeline, and appointment list empty states
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 17. Checkpoint — Ensure all page modifications work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 18. Global kiosk styling consistency pass
  - [x] 18.1 Apply kiosk card styling (`p-6`, `rounded-2xl`) and entrance animations across all remaining pages
    - Ensure all Card components use kiosk padding and radius
    - Add `pageVariants` entrance animations to dashboard and flow pages that don't yet have them
    - Ensure consistent hover/focus states on all interactive elements
    - _Requirements: 15.3, 15.4, 15.5_

  - [x] 18.2 Write property test for card kiosk styling
    - **Property 6: Card kiosk styling** — Card components apply kiosk-level padding and border-radius classes
    - **Validates: Requirements 15.3**

  - [x] 18.3 Write unit test for global CSS tokens
    - Parse `globals.css` content, assert presence of `--kiosk-primary`, `--kiosk-success`, `--kiosk-warning`, `--kiosk-info` in both `:root` and `.dark`
    - _Requirements: 15.1_

- [x] 19. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific visual states, edge cases, and integration points
- All changes are additive CSS, new wrapper/illustration components, or Tailwind class adjustments — no API or database changes
