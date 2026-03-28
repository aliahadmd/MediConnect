# Implementation Plan: MediConnect Virtual Clinic Platform

## Overview

Incremental implementation of the MediConnect Virtual Clinic MVP on the existing Next.js 14 App Router project. Tasks are ordered so each step builds on the previous: infrastructure first, then data layer, authentication, core features (availability → booking → appointments → video → prescriptions), and finally admin/analytics. TypeScript throughout, with Vitest + fast-check for testing.

## Tasks

- [x] 1. Docker infrastructure and dependency setup
  - [x] 1.1 Add PostgreSQL, LiveKit, and MinIO services to compose.yml
    - Add `postgres` service with volume, health check, and environment variables (POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB)
    - Add `livekit` service with config volume and port mappings (7880, 7881, 7882)
    - Add `minio` service with volume, console port (9001), API port (9000), and credentials
    - Add shared Docker network connecting all services to the existing Next.js service
    - Add environment variables to the Next.js service for DATABASE_URL, LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY
    - _Requirements: 15.1, 15.2, 15.3_

  - [x] 1.2 Install project dependencies
    - Install runtime deps: `drizzle-orm`, `postgres`, `better-auth`, `livekit-server-sdk`, `@livekit/components-react`, `livekit-client`, `minio`, `pdf-lib`, `framer-motion`, `recharts`, `zod`, `@tiptap/react`, `@tiptap/starter-kit`, `nodemailer`
    - Install shadcn/ui CLI and initialize with default config, add needed components (Button, Input, Dialog, Calendar, Card, Table, Badge, Tabs, Select, DropdownMenu, Sheet, Separator, Label, Textarea)
    - Install dev deps: `drizzle-kit`, `vitest`, `fast-check`, `@testing-library/react`, `@testing-library/jest-dom`, `@vitejs/plugin-react`
    - Add scripts to package.json: `"db:generate"`, `"db:migrate"`, `"db:push"`, `"test"`, `"test:watch"`
    - Create `vitest.config.ts` with path aliases matching tsconfig
    - _Requirements: 13.1, 13.4_

- [x] 2. Database schema and Drizzle ORM setup
  - [x] 2.1 Create Drizzle schema and database client
    - Create `lib/db/schema.ts` with all table definitions: users, sessions, accounts, verifications, availabilitySlots, appointments, visitNotes, prescriptions, notifications (including roleEnum and appointmentStatusEnum)
    - Create `lib/db/index.ts` with Drizzle client instance using `postgres` driver and DATABASE_URL
    - Create `drizzle.config.ts` pointing to schema and PostgreSQL connection
    - Run `drizzle-kit generate` to produce initial migration files in `lib/db/migrations/`
    - _Requirements: 13.1, 13.2, 13.3_

  - [x] 2.2 Write property tests for data model constraints
    - **Property 7: No overlapping or past availability slots** — test that the overlap detection utility rejects overlapping time ranges and past dates
    - **Validates: Requirements 2.4, 2.5**

- [x] 3. Authentication with better-auth and role-based access
  - [x] 3.1 Configure better-auth server and client
    - Create `lib/auth.ts` with betterAuth config using drizzleAdapter, emailAndPassword enabled, 7-day session expiry
    - Create `lib/auth-client.ts` with client-side auth helpers (createAuthClient)
    - Create `lib/auth-helpers.ts` with `requireRole()` utility that reads session and checks role
    - Create `app/api/auth/[...all]/route.ts` as the better-auth catch-all API handler
    - Create `middleware.ts` to protect `/patient/*`, `/doctor/*`, `/admin/*` routes — redirect unauthenticated users to `/login`
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 1.7_

  - [x] 3.2 Build registration and login pages
    - Create `app/(auth)/layout.tsx` with centered card layout
    - Create `app/(auth)/login/page.tsx` with LoginForm component
    - Create `app/(auth)/register/page.tsx` with RegisterForm component
    - Create `components/auth/login-form.tsx` — email, password fields, error display, submit via auth client
    - Create `components/auth/register-form.tsx` — email, password, name, role selector (Patient/Doctor), error display
    - On successful login, redirect to role-appropriate dashboard
    - On logout, invalidate session and redirect to `/login`
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.7_

  - [x] 3.3 Create authenticated dashboard layout with sidebar navigation
    - Create `app/(dashboard)/layout.tsx` that fetches session server-side and redirects if unauthenticated
    - Create `components/layout/sidebar.tsx` with role-conditional navigation links (Patient: Appointments, Book, History; Doctor: Appointments, Availability; Admin: Users, Appointments, Analytics)
    - Create `components/layout/header.tsx` with user info and logout button
    - _Requirements: 1.3, 1.5_

  - [x] 3.4 Write property tests for authentication
    - **Property 1: Registration and login round-trip** — register user then login returns valid session with correct role
    - **Validates: Requirements 1.1, 1.2**
    - **Property 2: Role-based access control enforcement** — requests succeed iff user role is permitted
    - **Validates: Requirements 1.3**
    - **Property 3: Invalid credentials rejection** — wrong password returns error
    - **Validates: Requirements 1.4**
    - **Property 4: Unauthenticated access redirect** — no session token redirects to login
    - **Validates: Requirements 1.5**
    - **Property 5: Logout invalidates session** — after logout, old token is rejected
    - **Validates: Requirements 1.7**

  - [x] 3.5 Write unit tests for auth edge cases
    - Test invalid email formats, empty passwords, duplicate registration
    - Test session expiry behavior
    - Test role enforcement on specific routes
    - _Requirements: 1.1, 1.2, 1.4, 1.6_

- [x] 4. Checkpoint — Verify infrastructure, schema, and auth
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Doctor availability management
  - [x] 5.1 Implement availability API routes
    - Create `lib/validators.ts` with Zod schemas for availability slot creation (date, startTime, endTime validation, startTime < endTime)
    - Create `app/api/availability/route.ts` — GET (list slots by doctorId) and POST (create slot with overlap + past-date validation)
    - Create `app/api/availability/[id]/route.ts` — DELETE (only if slot is not booked)
    - Overlap detection: query existing slots for same doctor+date, check time range intersection server-side
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

  - [x] 5.2 Build availability calendar UI
    - Create `app/(dashboard)/doctor/availability/page.tsx` — server component fetching doctor's slots
    - Create `components/availability/calendar-view.tsx` — weekly calendar view using shadcn Calendar + custom time grid
    - Create `components/availability/slot-form.tsx` — Dialog form for creating new slots (date, start time, end time)
    - Display existing slots on the calendar, allow click-to-delete for unbooked slots
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 5.3 Write property tests for availability
    - **Property 6: Availability slot create/delete round-trip** — create then delete unbooked slot leaves list unchanged
    - **Validates: Requirements 2.2, 2.3**
    - **Property 8: Doctor sees own availability slots** — query returns only that doctor's slots, complete set
    - **Validates: Requirements 2.1**

  - [x] 5.4 Write unit tests for availability validation
    - Test overlap detection with adjacent, overlapping, and identical time ranges
    - Test past-date rejection at boundary (today vs yesterday)
    - Test delete rejection when slot is booked
    - _Requirements: 2.3, 2.4, 2.5_

- [x] 6. Appointment booking flow
  - [x] 6.1 Implement appointment booking API
    - Create Zod schema for booking request (slotId, doctorId)
    - Create `app/api/appointments/route.ts` — GET (list appointments for current user by role) and POST (create appointment in a DB transaction: check slot availability, set isBooked=true, create appointment with status "pending")
    - Create `app/api/appointments/[id]/route.ts` — GET (single appointment detail) and PATCH (accept/reject by doctor)
    - Double-booking prevention via transaction: SELECT slot FOR UPDATE, check isBooked, then INSERT appointment
    - _Requirements: 3.2, 3.3, 3.6, 4.2, 4.3_

  - [x] 6.2 Build patient booking UI with Framer Motion stepper
    - Create `app/(dashboard)/patient/book/[doctorId]/page.tsx` — booking flow page
    - Create `components/appointments/booking-stepper.tsx` — 3-step animated form using Framer Motion AnimatePresence: Step 1 (select doctor), Step 2 (select available slot showing only unbooked), Step 3 (confirm booking)
    - On confirmation, POST to `/api/appointments` and show success/error
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 6.3 Build patient appointment list page
    - Create `app/(dashboard)/patient/appointments/page.tsx` — list patient's appointments with status badges
    - Create `components/appointments/appointment-card.tsx` — card showing doctor name, date, time, status
    - Create `components/appointments/appointment-list.tsx` — filterable list wrapper
    - _Requirements: 3.1_

  - [x] 6.4 Write property tests for booking
    - **Property 9: Patient sees only unbooked slots** — query returns only slots where isBooked is false
    - **Validates: Requirements 3.1**
    - **Property 10: Booking creates pending appointment** — booking sets status "pending" and isBooked true with correct IDs
    - **Validates: Requirements 3.2**
    - **Property 11: No double-booking** — booking an already-booked slot is rejected
    - **Validates: Requirements 3.3, 3.6**

- [x] 7. Appointment management by doctor
  - [x] 7.1 Build doctor appointment management UI
    - Create `app/(dashboard)/doctor/appointments/page.tsx` — list pending appointments for the logged-in doctor
    - Add accept/reject buttons to appointment cards, calling PATCH `/api/appointments/[id]` with action
    - On reject, slot.isBooked is set back to false server-side
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 7.2 Write property tests for appointment management
    - **Property 13: Appointment accept/reject state transitions** — accept → "confirmed" (slot stays booked), reject → "rejected" (slot unbooked)
    - **Validates: Requirements 4.2, 4.3**
    - **Property 14: Doctor pending appointments filter** — query returns only "pending" appointments for that doctor
    - **Validates: Requirements 4.1**

- [x] 8. Checkpoint — Verify availability, booking, and appointment management
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Video consultation room with LiveKit
  - [x] 9.1 Implement LiveKit token generation and consultation APIs
    - Create `lib/livekit.ts` — helper to create AccessToken with room grant, room name derived from appointment ID
    - Create `app/api/consultation/token/route.ts` — POST: validate appointment is confirmed + within time window, generate and return LiveKit token + server URL
    - Create `app/api/consultation/[id]/notes/route.ts` — PUT: save/update visit notes for appointment
    - Add join eligibility logic: appointment status "confirmed" AND current time within [scheduledAt - 5min, scheduledAt + 30min]
    - On call end, update appointment status to "completed"
    - _Requirements: 5.1, 5.2, 5.6, 7.2, 7.3_

  - [x] 9.2 Build video consultation room UI
    - Create `app/(dashboard)/consultation/[appointmentId]/page.tsx` — consultation page
    - Create `components/consultation/video-room.tsx` — LiveKit room component using `@livekit/components-react` (LiveKitRoom, VideoTrack, AudioTrack), connect with token from API
    - Handle call end: disconnect both participants, PATCH appointment to "completed"
    - Handle network disconnection: auto-reconnect for 30 seconds, then show disconnect notice
    - Show "Join" button only when within the time window
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 9.3 Build in-call notes panel
    - Create `components/consultation/notes-panel.tsx` — side panel with Tiptap rich-text editor
    - Implement auto-save: debounced PUT to `/api/consultation/[id]/notes` every 15 seconds
    - On call end, persist final notes version
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 9.4 Write property tests for consultation
    - **Property 15: Join eligibility based on time window** — returns true iff confirmed + within time window
    - **Validates: Requirements 5.1**
    - **Property 16: End call transitions to completed** — ending call sets status to "completed"
    - **Validates: Requirements 5.4**
    - **Property 17: Unique room tokens per appointment** — distinct appointments get distinct room names
    - **Validates: Requirements 5.6**
    - **Property 19: Notes save/retrieve round-trip** — saved notes content matches retrieved content
    - **Validates: Requirements 7.2, 7.3**

- [x] 10. Waiting room
  - [x] 10.1 Implement waiting room API and UI
    - Create `app/api/consultation/[id]/status/route.ts` — GET: return queue position (count of waiting patients for same doctor with earlier scheduledAt) and doctorReady boolean
    - Create `app/(dashboard)/patient/waiting-room/[appointmentId]/page.tsx` — waiting room page
    - Create `components/consultation/waiting-room.tsx` — Framer Motion animated waiting interface with queue position display, polling every 5 seconds
    - When doctorReady is true, show "Doctor is ready — Join Now" button with entrance animation, linking to consultation room
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 10.2 Write property test for waiting room
    - **Property 18: Queue position ordering** — N waiting patients get unique positions [1..N] ordered by scheduledAt
    - **Validates: Requirements 6.2**

- [x] 11. Prescription writing, PDF generation, and MinIO storage
  - [x] 11.1 Configure MinIO client and PDF generation
    - Create `lib/minio.ts` — MinIO client instance, helper to upload PDF buffer, helper to generate pre-signed download URL, bucket initialization on first use
    - Create `lib/pdf.ts` — function to generate prescription PDF from PrescriptionData using pdf-lib (medication table, doctor/patient info, date)
    - _Requirements: 14.1, 14.2, 14.3_

  - [x] 11.2 Implement prescription API routes
    - Create Zod schema for prescription data (medications array with name, dosage, frequency, duration; notes)
    - Create `app/api/prescriptions/route.ts` — POST: validate data, save prescription to DB, generate PDF, upload to MinIO, store pdfKey
    - Create `app/api/prescriptions/[id]/download/route.ts` — GET: generate pre-signed URL from MinIO and redirect/return URL
    - Handle MinIO unavailable: return 503 with descriptive error
    - _Requirements: 8.2, 8.3, 8.5, 14.2, 14.3, 14.4_

  - [x] 11.3 Build prescription editor and viewer UI
    - Create `app/(dashboard)/doctor/prescriptions/[appointmentId]/page.tsx` — prescription writing page (only for completed appointments)
    - Create `components/prescriptions/prescription-editor.tsx` — form with medication fields (name, dosage, frequency, duration) as repeatable rows, plus notes textarea
    - Create `components/prescriptions/prescription-viewer.tsx` — read-only view of prescription with download button
    - _Requirements: 8.1, 8.5_

  - [x] 11.4 Write property tests for prescriptions
    - **Property 20: Prescription submission persists data and generates PDF key** — valid prescription data results in DB record with all fields + non-null pdfKey
    - **Validates: Requirements 8.2, 8.3, 8.5**
    - **Property 21: Prescription PDF upload/download round-trip** — stored pdfKey yields valid pre-signed URL returning PDF content
    - **Validates: Requirements 9.3, 14.2, 14.3**

- [x] 12. Patient visit history
  - [x] 12.1 Build visit history page and detail view
    - Create `app/(dashboard)/patient/history/page.tsx` — list of completed appointments for the patient with date, doctor name, status
    - Add click-through to appointment detail showing visit notes and prescription (with download link)
    - Fetch prescription PDF download via pre-signed URL from `/api/prescriptions/[id]/download`
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 12.2 Write property tests for visit history
    - **Property 22: Patient visit history returns only completed appointments** — filter returns only "completed" for that patient
    - **Validates: Requirements 9.1**
    - **Property 23: Appointment detail retrieval includes notes and prescription** — completed appointment with notes+prescription returns both
    - **Validates: Requirements 9.2**

- [x] 13. Checkpoint — Verify consultation, prescriptions, and visit history
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Admin user management
  - [x] 14.1 Implement admin user management API and UI
    - Create `app/api/admin/users/route.ts` — GET: paginated user list with search (name/email) and role filter; PATCH `[id]`: activate/deactivate user (set isActive flag)
    - Create `app/(dashboard)/admin/users/page.tsx` — admin users page
    - Create `components/admin/user-table.tsx` — searchable, filterable, paginated table with activate/deactivate toggle per row
    - Deactivated users are blocked from login via auth check on isActive flag
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 14.2 Write property tests for admin user management
    - **Property 24: Admin user search filtering** — search + role filter returns only matching users
    - **Validates: Requirements 10.2**
    - **Property 25: User activate/deactivate round-trip** — deactivate blocks login, reactivate restores it
    - **Validates: Requirements 10.3, 10.4**

- [x] 15. Admin appointment oversight
  - [x] 15.1 Implement admin appointment oversight API and UI
    - Create `app/api/admin/appointments/route.ts` — GET: all appointments with status filter and pagination; PATCH `[id]`: cancel appointment (set status "cancelled", release slot)
    - Create `app/(dashboard)/admin/appointments/page.tsx` — admin appointments page
    - Create `components/admin/appointment-oversight.tsx` — filterable appointment table with detail view and cancel action
    - On cancel, notify both patient and doctor
    - _Requirements: 11.1, 11.2, 11.3_

  - [x] 15.2 Write property tests for admin appointment oversight
    - **Property 26: Admin appointment status filtering** — status filter returns only matching appointments with correct count
    - **Validates: Requirements 11.1**
    - **Property 27: Admin cancel appointment transitions state and notifies** — cancel sets status "cancelled" and creates notifications for both users
    - **Validates: Requirements 11.3**

- [x] 16. Analytics dashboard
  - [x] 16.1 Implement analytics API and dashboard UI
    - Create `app/api/admin/analytics/route.ts` — GET: compute totalConsultations (count completed), totalRevenue (sum of fees for completed), activeDoctors (count active doctors), consultationTrend (daily counts); support date range query params (from, to)
    - Create `app/(dashboard)/admin/analytics/page.tsx` — analytics dashboard page
    - Create `components/admin/analytics-charts.tsx` — Recharts line/bar charts for consultation trends, summary stat cards for totals
    - Add date range picker filter that updates all metrics
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 16.2 Write property tests for analytics
    - **Property 28: Analytics aggregation correctness** — totalConsultations equals count of "completed" appointments, activeDoctors equals count of active doctor users
    - **Validates: Requirements 12.1, 12.2, 12.3**
    - **Property 29: Analytics date range filtering** — filtered results include only appointments within [start, end]
    - **Validates: Requirements 12.5**

- [x] 17. Notification service
  - [x] 17.1 Implement notification service and in-app notifications
    - Create `lib/notifications.ts` — `sendEmail(to, subject, body)` using Nodemailer with SMTP config, `createNotification(userId, type, message)` to insert into notifications table
    - Create `app/api/notifications/route.ts` — GET: list notifications for current user; PATCH `[id]`: mark as read
    - Wire notification calls into existing flows: appointment booking (3.4), accept/reject (4.4), cancel (11.3), prescription ready (8.4)
    - Add notification bell icon in header with unread count badge and dropdown list
    - _Requirements: 3.4, 4.4, 8.4, 11.3_

  - [x] 17.2 Write property test for notifications
    - **Property 12: State-changing actions create notifications** — booking, accept, reject, cancel, and prescription creation each produce correct notification records
    - **Validates: Requirements 3.4, 4.4, 8.4**

- [x] 18. Checkpoint — Verify admin features, analytics, and notifications
  - Ensure all tests pass, ask the user if questions arise.

- [x] 19. Integration tests and final wiring
  - [x] 19.1 Wire landing page and role-based redirects
    - Update `app/page.tsx` to redirect authenticated users to their role dashboard, show login/register links for unauthenticated
    - Ensure all sidebar navigation links work across roles
    - Verify middleware correctly protects all dashboard routes
    - _Requirements: 1.3, 1.5_

  - [x] 19.2 Write integration tests for core flows
    - Create `__tests__/integration/booking-flow.test.ts` — test full booking flow: register patient + doctor, create slot, book appointment, accept, verify statuses
    - Create `__tests__/integration/consultation-flow.test.ts` — test consultation lifecycle: confirmed appointment → token generation → notes save → call end → completed
    - Create `__tests__/integration/prescription-flow.test.ts` — test prescription flow: create prescription → PDF generated → download via pre-signed URL
    - _Requirements: 3.2, 4.2, 5.2, 8.2, 8.3_

- [x] 20. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirement clauses for traceability
- Property tests map 1:1 to the 29 correctness properties defined in the design document
- Checkpoints are placed after infrastructure, core booking flow, consultation/prescriptions, and final integration
- All API routes use Zod validation and return structured JSON error responses as defined in the design
