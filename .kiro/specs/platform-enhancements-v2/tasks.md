# Implementation Plan: Platform Enhancements V2

## Overview

Incremental enhancement of the existing MediConnect Virtual Clinic across four areas: robust video consultation with connection state management, real-time SSE notifications replacing polling, admin availability cascade management, and user profiles with photo upload. All tasks modify or extend existing files where appropriate. TypeScript throughout, with Vitest + fast-check for testing.

## Tasks

- [x] 1. Database schema additions and dependency installation
  - [x] 1.1 Install sharp dependency for image processing
    - Run `npm install sharp` to add server-side image resizing capability
    - _Requirements: 11.2_

  - [x] 1.2 Add new database tables to Drizzle schema
    - Add `genderEnum` and `bloodTypeEnum` pgEnum definitions to `lib/db/schema.ts`
    - Add `doctorProfiles` table with columns: id, userId (unique FK to users), specialization, qualifications, bio, phone, consultationFee (numeric 10,2), yearsOfExperience (integer), createdAt, updatedAt
    - Add `patientProfiles` table with columns: id, userId (unique FK to users), dateOfBirth, gender, phone, address, emergencyContactName, emergencyContactPhone, bloodType, allergies, medicalHistoryNotes, createdAt, updatedAt
    - Add `notificationPreferences` table with columns: id, userId (FK to users), notificationType (varchar 50), enabled (boolean default true), createdAt, updatedAt
    - Import `numeric`, `integer` from `drizzle-orm/pg-core` as needed
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 1.3 Add new Zod validation schemas to `lib/validators.ts`
    - Add `updateDoctorProfileSchema` — specialization required min(1), qualifications optional, bio optional, phone regex, consultationFee min(0), yearsOfExperience int min(0)
    - Add `updatePatientProfileSchema` — dateOfBirth optional (must be past date), gender enum optional, phone regex optional, address optional, emergency contact fields optional, bloodType enum optional, allergies optional, medicalHistoryNotes optional
    - Add `updateNotificationPreferencesSchema` — array of { notificationType, enabled }
    - _Requirements: 9.4, 10.4, 6.2_

  - [x] 1.4 Generate and apply database migration
    - Run `npm run db:generate` to create migration files for the new tables
    - Run `npm run db:push` to apply schema changes to the database
    - _Requirements: 14.1, 14.2, 14.3_

- [x] 2. Video consultation enhancements
  - [x] 2.1 Implement connection state machine and reconnection handler
    - Create `lib/video-state-machine.ts` with:
      - `ConnectionState` type: idle, connecting, connected, poor_connection, reconnecting, disconnected, ended
      - `ConnectionEvent` discriminated union type for all events (JOIN_CLICKED, CONNECTED, QUALITY_CHANGED, DISCONNECTED, RECONNECT_SUCCESS, RECONNECT_TIMEOUT, RETRY_CLICKED, END_CALL)
      - `transitionState(current, event)` pure function returning next state or null for invalid transitions
      - `computeNextDelay(attempt, config)` pure function for exponential backoff (1s base, 2x multiplier, 10s cap)
      - `mapConnectionQuality(livekitQuality)` mapping function from LiveKit ConnectionQuality to "good" | "fair" | "poor"
      - `ReconnectionConfig` interface with initialDelayMs=1000, maxDelayMs=10000, timeoutMs=45000, backoffMultiplier=2
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1_

  - [x] 2.2 Create connection state indicator component
    - Create `components/consultation/connection-state-indicator.tsx`
    - Display persistent visual indicator showing current connection state (colored dot + label)
    - Show quality level (good/fair/poor) when in connected or poor_connection state
    - _Requirements: 1.6, 1.3_

  - [x] 2.3 Create reconnection overlay component
    - Create `components/consultation/reconnection-overlay.tsx`
    - Display elapsed time since disconnection and reconnection attempt count
    - Show "Retry Connection" button when reconnection timeout (45s) expires
    - _Requirements: 2.2, 2.4, 2.5_

  - [x] 2.4 Create call quality monitor component
    - Create `components/consultation/call-quality-monitor.tsx`
    - Use LiveKit `useConnectionQualityIndicator` and room context to read local/remote participant quality
    - Display signal strength indicator (good/fair/poor) for both local and remote participants
    - Display mute status for audio and video tracks of both participants
    - Update quality indicators within 3 seconds of change
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

  - [x] 2.5 Enhance existing video-room.tsx with state machine integration
    - Modify `components/consultation/video-room.tsx`:
      - Replace existing `RoomState` type with `ConnectionState` from `lib/video-state-machine.ts`
      - Replace 30-second reconnect timeout with exponential backoff reconnection handler using `computeNextDelay`
      - Extend timeout to 45 seconds with attempt tracking
      - Add `poor_connection` state handling using LiveKit `RoomEvent.ConnectionQualityChanged`
      - Integrate `ConnectionStateIndicator` as persistent overlay in the video room
      - Integrate `ReconnectionOverlay` for reconnecting/disconnected states
      - Integrate `CallQualityMonitor` in the connected state view
      - Add "Retry Connection" flow: request new token via `/api/consultation/token` and re-establish connection
      - Show "Video service unavailable" error with Retry button when LiveKit server is unreachable on initial connect
      - Display patient name and appointment details on doctor's interface
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1_

  - [x] 2.6 Add "Patient is calling" indicator to doctor appointment cards
    - Modify `components/appointments/doctor-appointment-list.tsx`:
      - Add a "Patient is calling" visual indicator on confirmed appointment cards when a patient_calling notification is received
      - Display the patient name in the calling indicator
    - _Requirements: 3.6_

  - [x] 2.7 Write property tests for video state machine
    - **Property 1: Connection state machine transitions** — for any valid state and event, transitionState returns the correct next state; for invalid combinations, returns null
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 2.3, 2.4, 2.5, 2.6**
    - **Property 2: Exponential backoff delay computation** — for any non-negative attempt, computeNextDelay returns min(1000 * 2^attempt, 10000), always between initialDelayMs and maxDelayMs
    - **Validates: Requirements 2.1**
    - **Property 3: Connection quality mapping** — for any LiveKit ConnectionQuality value, mapConnectionQuality returns deterministic "good", "fair", or "poor"
    - **Validates: Requirements 3.2, 3.3**
    - Create test file: `__tests__/properties/video-state-machine.property.test.ts`

  - [x] 2.8 Write unit tests for video room edge cases
    - Test specific state transition sequences (idle → connecting → connected → poor_connection → reconnecting → connected)
    - Test boundary condition at exactly 45 seconds timeout
    - Test retry flow requesting new token
    - Create test file: `__tests__/unit/video-room.test.ts` (extend existing)
    - _Requirements: 1.5, 2.4, 2.5_

- [x] 3. Checkpoint — Verify video consultation enhancements
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. SSE notification system
  - [x] 4.1 Create SSE event emitter singleton
    - Create `lib/sse.ts` with `SSEEventEmitter` class:
      - `connections` Map<string, Set<SSEConnection>> mapping userId to active ReadableStreamControllers
      - `register(userId, controller)` — add connection to user's set
      - `unregister(userId, controller)` — remove connection from user's set
      - `emit(userId, data)` — push JSON-serialized data to all of user's active connections
      - `getConnectionCount(userId)` — return number of active connections for a user
    - Export singleton `sseEmitter` instance
    - _Requirements: 4.1, 4.5_

  - [x] 4.2 Create SSE stream endpoint
    - Create `app/api/notifications/stream/route.ts`:
      - GET handler that authenticates the user via session
      - Return a `ReadableStream` with `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive` headers
      - Register the stream controller with `sseEmitter` for the authenticated userId
      - Send heartbeat (`:heartbeat\n\n`) every 30 seconds to keep connection alive
      - Unregister on stream cancel/close
    - _Requirements: 4.1, 4.4_

  - [x] 4.3 Enhance notification creation to emit via SSE
    - Modify `lib/notifications.ts`:
      - Import `sseEmitter` from `lib/sse.ts`
      - After inserting notification into DB in `createNotification`, call `sseEmitter.emit(userId, notification)` to push to active SSE connections
      - Add notification preference check: before creating notification, query `notificationPreferences` table; if user has disabled that type, skip creation
    - _Requirements: 4.2, 5.1, 5.2, 5.3, 5.4, 6.3_

  - [x] 4.4 Enhance notification bell with SSE support
    - Modify `components/layout/notification-bell.tsx`:
      - On mount, establish `EventSource` connection to `/api/notifications/stream`
      - On SSE message, parse notification JSON and prepend to local notifications state
      - Update unread count in real-time without page refresh
      - For important notification types (appointment_confirmed, appointment_rejected, appointment_cancelled, patient_calling, prescription_ready), play an audio notification sound and show a toast alert
      - Fall back to 15-second polling if EventSource fails to connect (after 3 failed attempts)
      - Add "Mark all as read" button in the dropdown header
    - _Requirements: 4.3, 4.6, 5.5, 5.6, 6.1_

  - [x] 4.5 Create mark-all-read API endpoint
    - Create `app/api/notifications/mark-all-read/route.ts`:
      - POST handler that authenticates user and updates all unread notifications for that user to read=true
    - _Requirements: 6.1_

  - [x] 4.6 Write property tests for SSE emitter
    - **Property 4: SSE fan-out delivery** — for any user with N registered connections, emitting a notification delivers to all N connections; emitting for a different user delivers to none
    - **Validates: Requirements 4.2, 4.5**
    - Create test file: `__tests__/properties/sse-emitter.property.test.ts`

  - [x] 4.7 Write property tests for notification creation and preferences
    - **Property 5: Notification creation on state-changing actions** — booking/accept/reject/cancel/patient-joining each create correct notification count, type, and recipient
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
    - **Property 6: Mark all notifications as read** — for any user with N unread notifications, mark-all-read sets all to read=true without affecting other users
    - **Validates: Requirements 6.1**
    - **Property 7: Notification preference filtering** — disabled notification type skips creation for that user
    - **Validates: Requirements 6.3**
    - **Property 8: Default notification preferences** — unset preferences default to enabled
    - **Validates: Requirements 6.4**
    - Create test file: `__tests__/properties/notifications-v2.property.test.ts`

  - [x] 4.8 Write unit tests for SSE endpoint
    - Test connection lifecycle (register, heartbeat, unregister)
    - Test error handling when controller is closed
    - Test fallback polling behavior
    - Create test file: `__tests__/unit/sse.test.ts`
    - _Requirements: 4.1, 4.3, 4.4, 4.6_

- [x] 5. Checkpoint — Verify SSE notification system
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Admin availability management with cascade deletion
  - [x] 6.1 Create admin availability API route
    - Create `app/api/admin/availability/route.ts`:
      - GET handler: list all availability slots with doctor name, date, start time, end time, booking status; support filtering by doctorName (substring match) and date range (dateFrom, dateTo); paginated with page/limit params
      - DELETE handler: accept `{ slotIds: string[] }` body; validate at least one ID provided
      - For each slotId: if slot has a booked appointment, cancel the appointment (set status "cancelled"), release the slot (isBooked=false), create notifications for patient and doctor
      - Delete all selected slots
      - Execute all operations in a single database transaction; rollback on any failure
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 6.2 Build admin availability management page and component
    - Create `app/(dashboard)/admin/availability/page.tsx` — admin availability management page
    - Create `components/admin/availability-manager.tsx`:
      - Display table of all availability slots with doctor name, date, time range, booking status
      - Add filter controls: doctor name text input, date range picker
      - Support single slot deletion with confirmation dialog showing slot details and associated appointment
      - Support multi-select with bulk deletion; confirmation dialog lists all selected slots and total affected appointments
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

  - [x] 6.3 Add admin availability link to sidebar
    - Modify `components/layout/sidebar.tsx`:
      - Add "Availability" nav item to the admin role's navigation array with href `/admin/availability` and Calendar icon
    - _Requirements: 7.1_

  - [x] 6.4 Write property tests for admin availability
    - **Property 9: Admin availability slot filtering** — for any set of slots and filter criteria (doctor name substring, date range), API returns only matching slots with complete result set
    - **Validates: Requirements 7.2**
    - **Property 10: Admin bulk slot deletion with cascade** — bulk deletion removes all selected slots, cancels associated appointments, creates exactly 2 notifications per cancelled appointment
    - **Validates: Requirements 7.4, 7.6, 8.1, 8.2, 8.3, 8.4, 8.5**
    - Create test file: `__tests__/properties/admin-availability.property.test.ts`

- [x] 7. User profiles — doctor and patient
  - [x] 7.1 Create doctor profile API route
    - Create `app/api/profiles/doctor/route.ts`:
      - GET: return current doctor's profile (or null if not yet created); require "doctor" role
      - PUT: upsert doctor profile — validate with `updateDoctorProfileSchema`, insert or update using ON CONFLICT on userId; require "doctor" role
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 7.2 Create patient profile API route
    - Create `app/api/profiles/patient/route.ts`:
      - GET: return current patient's profile (or null if not yet created); require "patient" role
      - PUT: upsert patient profile — validate with `updatePatientProfileSchema`, insert or update using ON CONFLICT on userId; require "patient" role
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 7.3 Build doctor profile form component
    - Create `components/profiles/doctor-profile-form.tsx`:
      - Editable form with fields: specialization, qualifications, bio, phone, consultation fee, years of experience
      - Client-side validation matching Zod schema; display field-level errors on invalid submission
      - On save, PUT to `/api/profiles/doctor`; show success/error toast
    - _Requirements: 9.2, 9.3, 9.4_

  - [x] 7.4 Build patient profile form component
    - Create `components/profiles/patient-profile-form.tsx`:
      - Editable form with fields: date of birth, gender, phone, address, emergency contact name, emergency contact phone, blood type, allergies, medical history notes
      - Client-side validation matching Zod schema; display field-level errors on invalid submission
      - On save, PUT to `/api/profiles/patient`; show success/error toast
    - _Requirements: 10.2, 10.3, 10.4_

  - [x] 7.5 Build profile settings page
    - Create `app/(dashboard)/settings/page.tsx`:
      - Server component that fetches session and renders role-appropriate profile form
      - For doctors: personal info section (name, email read-only), professional info section (DoctorProfileForm), photo upload section, notification preferences section
      - For patients: personal info section (name, email read-only), medical info section (PatientProfileForm), photo upload section, notification preferences section
      - Show success confirmation on save; preserve unsaved data on server error
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 7.6 Add settings link to sidebar for all roles
    - Modify `components/layout/sidebar.tsx`:
      - Add "Settings" nav item to patient, doctor, and admin role navigation arrays with href `/settings` and Settings icon
    - _Requirements: 12.1_

  - [x] 7.7 Display patient profile in doctor's appointment detail view
    - Create `app/api/appointments/[id]/detail/route.ts` or modify existing to include patient profile data (blood type, allergies, medical history notes) in the response when requested by a doctor
    - Display patient medical info in a read-only panel on the doctor's consultation page
    - _Requirements: 10.5_

  - [x] 7.8 Display full profiles in admin user details
    - Modify `app/api/admin/users/route.ts` or create a detail endpoint to include doctor/patient profile data when viewing a specific user
    - Update `components/admin/user-table.tsx` to show profile information in an expandable row or detail modal
    - _Requirements: 9.6, 10.6_

  - [x] 7.9 Write property tests for profiles
    - **Property 11: Profile save/retrieve round-trip** — for any valid doctor or patient profile data, saving then retrieving returns identical data
    - **Validates: Requirements 9.3, 10.3**
    - **Property 12: Profile validation rejection** — negative consultation fee, negative years, empty specialization rejected for doctor; future date of birth, invalid phone rejected for patient
    - **Validates: Requirements 9.4, 10.4**
    - **Property 16: Profile uniqueness constraint** — attempting to create a second profile for the same userId is rejected, preserving existing profile
    - **Validates: Requirements 14.4, 14.5**
    - Create test file: `__tests__/properties/profiles.property.test.ts`

  - [x] 7.10 Write unit tests for profile validation edge cases
    - Test boundary values: fee=0, years=0, phone with country code
    - Test specific invalid inputs for both doctor and patient schemas
    - Create test file: `__tests__/unit/profile-validators.test.ts`
    - _Requirements: 9.4, 10.4_

- [x] 8. Checkpoint — Verify admin availability and user profiles
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Profile photo upload
  - [x] 9.1 Create profile photo processing utility
    - Create `lib/profile-photo.ts`:
      - Define constants: ALLOWED_TYPES (image/jpeg, image/png, image/webp), MAX_FILE_SIZE (5MB), MAX_DIMENSION (256), PHOTO_BUCKET ("profile-photos")
      - `processAndUploadPhoto(userId, file)` function:
        - Validate file type and size; throw descriptive errors for invalid inputs
        - Resize image to max 256x256 pixels using `sharp`, output as WebP
        - Ensure MinIO "profile-photos" bucket exists (create if not)
        - If user already has a stored photo, delete the old object from MinIO
        - Upload processed image to MinIO with key `{userId}.webp`
        - Return the MinIO object key
      - `getProfilePhotoUrl(key)` function: generate pre-signed URL from MinIO
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x] 9.2 Create profile photo upload API route
    - Create `app/api/profiles/photo/route.ts`:
      - POST handler: accept multipart/form-data with image file
      - Call `processAndUploadPhoto` and update `users.image` column with the returned key
      - Return the pre-signed URL for the uploaded photo
      - Handle MinIO unavailable with 503 status
    - _Requirements: 11.1, 11.2, 11.3, 11.5, 11.6_

  - [x] 9.3 Build photo upload component
    - Create `components/profiles/photo-upload.tsx`:
      - Display current profile photo (via pre-signed URL) or placeholder avatar
      - File input accepting JPEG, PNG, WebP with 5MB client-side size check
      - Upload preview before submission
      - POST to `/api/profiles/photo` on submit; show success/error feedback
    - _Requirements: 11.1, 11.2_

  - [x] 9.4 Integrate photo upload into profile settings page
    - Update `app/(dashboard)/settings/page.tsx` to include the PhotoUpload component in the photo section
    - Fetch current photo URL on page load using the user's image key
    - _Requirements: 12.2, 12.3_

  - [x] 9.5 Write property tests for photo upload
    - **Property 13: Photo upload lifecycle** — valid image produces output ≤ 256x256; re-upload results in exactly one photo in storage
    - **Validates: Requirements 11.2, 11.3, 11.5**
    - **Property 14: Photo upload file validation** — invalid MIME type rejected; file > 5MB rejected; valid file accepted
    - **Validates: Requirements 11.1**
    - Create test file: `__tests__/properties/photo-upload.property.test.ts`

  - [x] 9.6 Write unit tests for photo processing edge cases
    - Test 0-byte file, exactly 5MB file, non-image file with image extension
    - Test resize of very small images (< 256px)
    - Create test file: `__tests__/unit/photo-processing.test.ts`
    - _Requirements: 11.1, 11.2_

- [x] 10. Doctor profile cards in booking flow
  - [x] 10.1 Enhance doctors API to include profile data
    - Modify `app/api/doctors/route.ts`:
      - LEFT JOIN `doctorProfiles` on userId to include specialization, yearsOfExperience, consultationFee, and user image key in the response
      - For doctors without a profile, include a `profileComplete: false` flag
      - Generate pre-signed photo URLs for doctors with profile photos
    - _Requirements: 13.1, 13.2_

  - [x] 10.2 Build doctor profile card component
    - Create `components/profiles/doctor-profile-card.tsx`:
      - Display doctor photo (or placeholder), name, specialization, years of experience, consultation fee
      - Show "Profile not yet completed" label for doctors without a profile
    - _Requirements: 13.1, 13.2_

  - [x] 10.3 Enhance booking stepper with doctor profile cards
    - Modify `components/appointments/booking-stepper.tsx`:
      - Replace simple doctor name/email buttons in Step 1 with `DoctorProfileCard` components
      - In Step 2 (slot selection), display the full doctor profile (bio, qualifications, specialization, years of experience, consultation fee) alongside the available slots
      - Update the Doctor interface to include profile fields
    - _Requirements: 13.1, 13.2, 13.3_

  - [x] 10.4 Write property test for doctor list with profiles
    - **Property 15: Doctor list API includes profile data** — doctors with profiles include specialization, years, fee; doctors without profiles indicate incomplete
    - **Validates: Requirements 13.1, 13.2**
    - Create test file: `__tests__/properties/profiles.property.test.ts` (append to existing)

- [x] 11. Notification preferences
  - [x] 11.1 Create notification preferences API routes
    - Create `app/api/notifications/preferences/route.ts`:
      - GET: return current user's notification preferences; for types without explicit preference, return default enabled=true
      - PUT: upsert preferences — validate with `updateNotificationPreferencesSchema`, insert or update each preference row
    - _Requirements: 6.2, 6.4, 6.5_

  - [x] 11.2 Build notification preferences UI component
    - Create `components/settings/notification-preferences.tsx`:
      - Display toggle switches for each notification type: appointment_booked, appointment_confirmed, appointment_rejected, appointment_cancelled, patient_calling, prescription_ready
      - Fetch current preferences on mount; default all to enabled
      - On toggle change, PUT to `/api/notifications/preferences`; apply changes immediately
    - _Requirements: 6.2, 6.5_

  - [x] 11.3 Integrate notification preferences into settings page
    - Update `app/(dashboard)/settings/page.tsx` to include the NotificationPreferences component in the notification preferences section for all roles
    - _Requirements: 12.2, 12.3_

- [x] 12. Checkpoint — Verify photo upload, booking cards, and notification preferences
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Integration and final wiring
  - [x] 13.1 Wire patient_calling notification into video consultation flow
    - Modify `app/api/consultation/token/route.ts`:
      - When a patient requests a token (patient role), create a "patient_calling" notification for the doctor using `createNotification`
    - _Requirements: 5.4, 3.6_

  - [x] 13.2 Wire SSE notifications into existing appointment flows
    - Verify that all existing notification creation calls in appointment booking (`app/api/appointments/route.ts`), accept/reject (`app/api/appointments/[id]/route.ts`), and admin cancel (`app/api/admin/appointments/route.ts`) use the updated `createNotification` from `lib/notifications.ts` which now emits via SSE
    - Ensure prescription_ready notification is created when a prescription is saved
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 13.3 Write integration tests for new flows
    - Create `__tests__/integration/sse-notification-flow.test.ts` — test SSE connection, notification delivery on appointment booking, real-time bell update
    - Create `__tests__/integration/profile-flow.test.ts` — test profile creation, update, photo upload, and display in booking flow
    - Create `__tests__/integration/cascade-deletion-flow.test.ts` — test admin slot deletion with cascade: slot removed, appointment cancelled, notifications created
    - _Requirements: 4.2, 5.1, 8.1, 8.3, 9.3, 11.2_

- [x] 14. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster delivery
- Each task references specific requirement clauses for traceability
- Property tests map to the 16 correctness properties defined in the design document
- This is an enhancement to an existing working system — tasks modify existing files (video-room.tsx, notification-bell.tsx, schema.ts, sidebar.tsx, booking-stepper.tsx, doctors/route.ts, notifications.ts) where appropriate
- Checkpoints are placed after video enhancements, SSE system, profiles/admin, and final integration
- All API routes follow existing patterns: Zod validation, structured JSON error responses, better-auth session checks
