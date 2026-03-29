# Implementation Plan: Patient & Doctor Experience Enhancements

## Overview

This plan implements the patient and doctor experience enhancements for MediConnect in incremental steps: schema changes first, then API routes, shared components, pages, sidebar navigation, and finally tests. Each task references specific requirements and builds on previous steps so there is no orphaned code.

## Tasks

- [x] 1. Database schema changes and validation schemas
  - [x] 1.1 Add `reviews` table and extend `doctorProfiles` in `lib/db/schema.ts`
    - Add the `reviews` table with columns: `id` (uuid PK), `appointmentId` (uuid FK unique to appointments), `patientId` (text FK to users), `doctorId` (text FK to users), `rating` (integer), `reviewText` (text nullable), `createdAt`, `updatedAt`
    - Add `averageRating` (numeric precision 3 scale 2, nullable) and `reviewCount` (integer default 0) columns to the existing `doctorProfiles` table
    - _Requirements: 12.1, 12.2, 12.3_

  - [x] 1.2 Add new Zod validation schemas in `lib/validators.ts`
    - Add `createReviewSchema`: appointmentId (uuid), doctorId (string min 1), rating (int 1-5), reviewText (string max 2000 optional)
    - Add `doctorSearchSchema`: q (string min 2 max 100 optional), specialization (string max 255 optional), page (coerce int min 1 default 1), limit (coerce int min 1 max 50 default 12)
    - Add `timelineFilterSchema`: type (enum appointment/prescription/visit_note optional)
    - Add `reviewsQuerySchema`: doctorId (string min 1)
    - _Requirements: 9.1, 11.1, 10.4, 4.3_

  - [x] 1.3 Run `npm run db:generate` and `npm run db:push` to apply schema changes
    - Generate Drizzle migration for the new `reviews` table and `doctorProfiles` column additions
    - Push schema to the database
    - _Requirements: 12.1, 12.2, 12.3_

- [x] 2. Checkpoint - Verify schema changes
  - Ensure all schema changes compile and migrations apply cleanly, ask the user if questions arise.

- [x] 3. API routes — Prescriptions list and Doctor detail
  - [x] 3.1 Create `GET /api/prescriptions` list endpoint at `app/api/prescriptions/route.ts`
    - Add a GET handler to the existing prescriptions route file (which already has POST)
    - Use `requireRole("patient")` for auth; query prescriptions joined with appointments and doctor users for the authenticated patient
    - Return `PrescriptionListItem[]` ordered by `createdAt` descending with fields: id, appointmentId, doctorName, appointmentDate, medications, notes, pdfKey, createdAt
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

  - [x] 3.2 Create `GET /api/doctors/[id]` endpoint at `app/api/doctors/[id]/route.ts`
    - No auth required; fetch doctor by ID joined with `doctorProfiles` for full profile data
    - Return `DoctorProfileDetail` with: id, name, photoUrl, specialization, qualifications, bio, yearsOfExperience, consultationFee, averageRating, reviewCount, profileComplete
    - Return 404 if doctor not found or not active
    - _Requirements: 4.1, 4.2, 4.5, 4.6_

- [x] 4. API routes — Doctor search and Specializations
  - [x] 4.1 Create `GET /api/doctors/search` endpoint at `app/api/doctors/search/route.ts`
    - No auth required; validate query params with `doctorSearchSchema`
    - Implement case-insensitive text search on doctor name and specialization using SQL `ILIKE`
    - Implement exact specialization filter, pagination with page/limit, return total count
    - Return `DoctorSearchResponse` with doctors array, total, page, limit
    - Each doctor result includes: id, name, photoUrl, specialization, qualifications, yearsOfExperience, consultationFee, averageRating, reviewCount
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x] 4.2 Create `GET /api/specializations` endpoint at `app/api/specializations/route.ts`
    - No auth required; query distinct non-null specializations from `doctorProfiles` joined with active users
    - Return `SpecializationItem[]` with specialization name and doctorCount, ordered alphabetically
    - Return empty array when no specializations exist
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [x] 5. API routes — Reviews
  - [x] 5.1 Create `POST /api/reviews` endpoint at `app/api/reviews/route.ts`
    - Use `requireRole("patient")` for auth; validate body with `createReviewSchema`
    - Verify appointment exists, is completed, belongs to the patient, and has no existing review
    - Insert review and update `doctorProfiles.averageRating` and `reviewCount` in a single transaction
    - Return created review with 201 status
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 12.4_

  - [x] 5.2 Create `GET /api/reviews` endpoint at `app/api/reviews/route.ts`
    - No auth required; validate query params with `reviewsQuerySchema`
    - Fetch reviews for the given doctorId joined with users for reviewer name
    - Return `ReviewItem[]` with: id, rating, reviewText, reviewerName, createdAt
    - _Requirements: 4.3, 8_

- [x] 6. API routes — Patient profile, Timeline, and Dashboard
  - [x] 6.1 Create `GET /api/patients/[id]/profile` endpoint at `app/api/patients/[id]/profile/route.ts`
    - Use `getSession()` for auth; verify requesting user is the doctor assigned to the appointment (via `appointmentId` query param) or an admin
    - Return `PatientProfileData` with: name, dateOfBirth, gender, bloodType, allergies, emergencyContactName, emergencyContactPhone, medicalHistoryNotes, profileComplete
    - Return 403 for unauthorized access, 404 for patient not found
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

  - [x] 6.2 Create `GET /api/patient/timeline` endpoint at `app/api/patient/timeline/route.ts`
    - Use `requireRole("patient")` for auth; validate optional type filter with `timelineFilterSchema`
    - Query appointments, prescriptions, and visit notes for the patient; assemble into unified `TimelineEventData[]` ordered by date descending
    - Each event has: id, type, date, summary, detailUrl
    - Apply type filter if provided
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 6.3 Create `GET /api/patient/dashboard` endpoint at `app/api/patient/dashboard/route.ts`
    - Use `requireRole("patient")` for auth
    - Compute: upcomingCount (pending/confirmed with future scheduledAt), completedCount, prescriptionCount
    - Fetch nextAppointment (earliest upcoming) with doctor name, date, time
    - Fetch 3 most recent prescriptions as `PrescriptionListItem[]`
    - Return `PatientDashboardData`
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

- [x] 7. Checkpoint - Verify all API routes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Shared components — PrescriptionCard, RatingStars, ReviewCard, ReviewForm
  - [x] 8.1 Create `PrescriptionCard` component at `components/prescriptions/prescription-card.tsx`
    - Props: id, doctorName, appointmentDate, medicationCount, createdAt, onClick
    - Render a Card with doctor name, date, medication count badge, and creation date
    - _Requirements: 1.2, 8.3_

  - [x] 8.2 Create `RatingStars` component at `components/reviews/rating-stars.tsx`
    - Props: rating (0-5), maxRating (default 5), interactive (boolean), onRate callback, size (sm/md/lg)
    - Render filled/empty star icons; when interactive, allow clicking to set rating
    - Use `lucide-react` Star icons with appropriate aria labels for accessibility
    - _Requirements: 4.2, 9.1_

  - [x] 8.3 Create `ReviewCard` component at `components/reviews/review-card.tsx`
    - Props: reviewerName, rating, reviewText, createdAt
    - Render reviewer name, RatingStars (read-only), review text, and formatted date
    - _Requirements: 4.3_

  - [x] 8.4 Create `ReviewForm` component at `components/reviews/review-form.tsx`
    - Props: appointmentId, doctorId, onSubmitted callback
    - Interactive RatingStars for rating selection, optional textarea for review text (max 2000 chars)
    - Submit via `POST /api/reviews`; handle validation errors, duplicate review (409), and non-completed appointment (400) errors
    - _Requirements: 9.1, 9.2, 9.5, 9.6_

- [x] 9. Shared components — TimelineEvent, SpecializationBrowser, PatientProfileViewer
  - [x] 9.1 Create `TimelineEvent` component at `components/timeline/timeline-event.tsx`
    - Props: type, date, summary, detailUrl, icon
    - Render a timeline item with type icon, formatted date, summary text, and link to detail
    - _Requirements: 10.2_

  - [x] 9.2 Create `SpecializationBrowser` component at `components/doctors/specialization-browser.tsx`
    - Props: onSelectSpecialization callback, selectedSpecialization
    - Fetch specializations from `GET /api/specializations`; render as selectable category cards with doctor count
    - Muted style for categories with zero doctors
    - _Requirements: 6.1, 6.3, 6.4, 6.5_

  - [x] 9.3 Create `PatientProfileViewer` component at `components/profiles/patient-profile-viewer.tsx`
    - Props: patientId, appointmentId, open, onClose
    - Render as a Dialog/Sheet; fetch `GET /api/patients/[id]/profile?appointmentId=[apptId]`
    - Display read-only patient medical profile fields; show incomplete notice if profileComplete is false
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 10. Extend existing `DoctorProfileCard` with average rating
  - Modify `components/profiles/doctor-profile-card.tsx` to accept optional `averageRating` and `reviewCount` props
  - When `averageRating` is provided, render a small RatingStars (read-only, size "sm") and review count next to existing info
  - _Requirements: 4.2, 5.3_

- [x] 11. Pages — Prescription history and detail
  - [x] 11.1 Create prescription history page at `app/(dashboard)/patient/prescriptions/page.tsx`
    - Auth: patient role required (server-side check, redirect to /login)
    - Fetch `GET /api/prescriptions`; render list of `PrescriptionCard` components
    - Empty state when no prescriptions; clicking a card navigates to `/patient/prescriptions/[id]`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 11.2 Create prescription detail page at `app/(dashboard)/patient/prescriptions/[id]/page.tsx`
    - Auth: patient role required
    - Fetch prescription by ID; display medications table (name, dosage, frequency, duration), doctor notes section, summary header with doctor name/date
    - Conditional PDF download button (hidden when pdfKey is null, shows notice); handle MinIO errors
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 12. Pages — Doctor profile and search
  - [x] 12.1 Create doctor profile page at `app/doctors/[doctorId]/page.tsx`
    - No auth required for viewing; fetch `GET /api/doctors/[id]` and `GET /api/reviews?doctorId=[id]`
    - Display full profile using extended `DoctorProfileCard`, average rating with `RatingStars`, review list with `ReviewCard` components
    - "Book Appointment" button for authenticated patients linking to booking flow
    - Incomplete profile notice when profileComplete is false
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 12.2 Create doctor search page at `app/doctors/search/page.tsx`
    - No auth required; text search input (debounced 500ms, min 2 chars) calling `GET /api/doctors/search`
    - Specialization filter chips via `SpecializationBrowser` component
    - Results as `DoctorProfileCard` grid; clicking navigates to `/doctors/[doctorId]`
    - Empty state when no results match
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 13. Pages — Enhanced appointment history
  - Modify `app/(dashboard)/patient/history/page.tsx` and `components/appointments/visit-history.tsx`
  - Extend to show all past statuses (completed, cancelled, rejected) instead of only completed
  - Add status filter tabs (All, Completed, Cancelled, Rejected)
  - Add expandable detail view with visit notes and prescription links (link to `/patient/prescriptions/[id]`)
  - Show empty state when no past appointments
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 14. Pages — Patient dashboard and medical timeline
  - [x] 14.1 Create patient dashboard page at `app/(dashboard)/patient/page.tsx`
    - Auth: patient role required
    - Fetch `GET /api/patient/dashboard`; render summary cards (upcoming, completed, prescriptions counts)
    - Next appointment card with doctor name, date, time, quick action
    - 3 most recent prescriptions as `PrescriptionCard` components linking to detail
    - "Quick Book" action linking to `/doctors/search`
    - Empty state prompts when no upcoming appointments
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 14.2 Create medical timeline page at `app/(dashboard)/patient/timeline/page.tsx`
    - Auth: patient role required
    - Fetch `GET /api/patient/timeline`; render `TimelineEvent` components with type icons
    - Filter toggles for event types (appointments, prescriptions, visit notes)
    - Clicking an event navigates to the relevant detail view
    - Empty state when no medical events
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 15. Pages — Add "View Patient Profile" to doctor appointments
  - Modify `app/(dashboard)/doctor/appointments/page.tsx` to add a "View Patient Profile" button on upcoming/confirmed appointments
  - Clicking opens the `PatientProfileViewer` dialog with the patient's ID and appointment ID
  - _Requirements: 3.1, 3.4_

- [x] 16. Sidebar navigation updates
  - Modify `components/layout/sidebar.tsx` to add new patient nav items:
    - "Dashboard" → `/patient` (with LayoutDashboard icon, placed first)
    - "Prescriptions" → `/patient/prescriptions` (with Pill icon)
    - "Timeline" → `/patient/timeline` (with Clock icon)
    - "Find Doctors" → `/doctors/search` (with Search icon)
  - Keep existing items (Appointments, Book Appointment, Visit History, Settings)
  - _Requirements: 1.3, 5.6, 8.4, 10.3_

- [x] 17. Checkpoint - Verify all pages and navigation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 18. Property-based tests
  - [x] 18.1 Write property test for prescription list ordering
    - **Property 1: Prescription list ordering invariant**
    - **Validates: Requirements 1.1**

  - [x] 18.2 Write property test for prescription list item fields
    - **Property 2: Prescription list item contains required fields**
    - **Validates: Requirements 1.2, 2.4**

  - [x] 18.3 Write property test for patient role authorization gate
    - **Property 3: Patient role authorization gate**
    - **Validates: Requirements 1.5**

  - [x] 18.4 Write property test for medication table data completeness
    - **Property 4: Medication table data completeness**
    - **Validates: Requirements 2.1, 2.2**

  - [x] 18.5 Write property test for patient profile viewer authorization
    - **Property 5: Patient profile viewer authorization**
    - **Validates: Requirements 3.4, 3.5**

  - [x] 18.6 Write property test for patient profile data completeness
    - **Property 6: Patient profile data completeness**
    - **Validates: Requirements 3.2**

  - [x] 18.7 Write property test for doctor profile required fields
    - **Property 7: Doctor profile contains required fields**
    - **Validates: Requirements 4.1, 4.2**

  - [x] 18.8 Write property test for review list data completeness
    - **Property 8: Review list data completeness**
    - **Validates: Requirements 4.3**

  - [x] 18.9 Write property test for doctor search text matching
    - **Property 9: Doctor search text matching**
    - **Validates: Requirements 5.1, 11.2**

  - [x] 18.10 Write property test for doctor search specialization filter
    - **Property 10: Doctor search specialization filter**
    - **Validates: Requirements 5.5, 6.2, 11.3**

  - [x] 18.11 Write property test for doctor search pagination invariant
    - **Property 11: Doctor search pagination invariant**
    - **Validates: Requirements 11.4, 11.6**

  - [x] 18.12 Write property test for search result fields completeness
    - **Property 12: Search result fields completeness**
    - **Validates: Requirements 5.3, 11.5**

  - [x] 18.13 Write property test for specializations with correct counts
    - **Property 13: Specializations derived from data with correct counts**
    - **Validates: Requirements 6.3, 6.5, 13.1, 13.2, 13.3**

  - [x] 18.14 Write property test for appointment history ordering and status filtering
    - **Property 14: Appointment history ordering and status filtering**
    - **Validates: Requirements 7.1, 7.4**

  - [x] 18.15 Write property test for appointment history entry completeness
    - **Property 15: Appointment history entry completeness**
    - **Validates: Requirements 7.2**

  - [x] 18.16 Write property test for dashboard aggregate counts correctness
    - **Property 16: Dashboard aggregate counts correctness**
    - **Validates: Requirements 8.1**

  - [x] 18.17 Write property test for dashboard next appointment selection
    - **Property 17: Dashboard next appointment selection**
    - **Validates: Requirements 8.2**

  - [x] 18.18 Write property test for dashboard recent prescriptions
    - **Property 18: Dashboard recent prescriptions**
    - **Validates: Requirements 8.3**

  - [x] 18.19 Write property test for review submission round-trip
    - **Property 19: Review submission round-trip**
    - **Validates: Requirements 9.1, 9.3**

  - [x] 18.20 Write property test for one review per appointment uniqueness
    - **Property 20: One review per appointment uniqueness**
    - **Validates: Requirements 9.2, 9.6, 12.2**

  - [x] 18.21 Write property test for review only for completed appointments
    - **Property 21: Review only for completed appointments**
    - **Validates: Requirements 9.5**

  - [x] 18.22 Write property test for average rating transactional consistency
    - **Property 22: Average rating transactional consistency**
    - **Validates: Requirements 9.4, 12.4**

  - [x] 18.23 Write property test for timeline ordering and type filtering
    - **Property 23: Timeline ordering and type filtering**
    - **Validates: Requirements 10.1, 10.4**

  - [x] 18.24 Write property test for timeline event data completeness
    - **Property 24: Timeline event data completeness**
    - **Validates: Requirements 10.2**

- [x] 19. Unit tests
  - [x] 19.1 Write unit tests for Zod validation schemas
    - Test `createReviewSchema`, `doctorSearchSchema`, `timelineFilterSchema`, `reviewsQuerySchema` with valid and invalid inputs
    - Test edge cases: rating 0 and 6, reviewText over 2000 chars, search query of 1 char, page 0, limit 51
    - _Requirements: 9.1, 11.1, 10.4_

  - [x] 19.2 Write unit tests for empty states and edge cases
    - Test prescription list returns empty array for patient with no prescriptions
    - Test specializations endpoint returns empty array when no specializations exist
    - Test dashboard with no appointments returns zero counts and null nextAppointment
    - Test timeline with no events returns empty array
    - Test prescription detail with null pdfKey hides download button
    - Test incomplete doctor profile response
    - Test incomplete patient profile response
    - _Requirements: 1.4, 2.5, 4.5, 8.5, 10.5, 13.4_

  - [x] 19.3 Write unit tests for error conditions
    - Test review submission for non-completed appointment returns 400
    - Test duplicate review submission returns 409
    - Test patient profile access by unauthorized user returns 403
    - Test doctor search with invalid params returns 400
    - Test MinIO unavailable during PDF download returns 503
    - _Requirements: 2.6, 3.5, 9.5, 9.6, 11.1_

  - [x] 19.4 Write unit tests for review aggregate calculation
    - Test that submitting a review correctly updates averageRating and reviewCount on doctorProfiles
    - Test average rating calculation with multiple reviews (e.g., ratings [5, 3, 4] → average 4.00)
    - Test reviewCount increments correctly
    - _Requirements: 9.4, 12.4_

- [x] 20. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using `fast-check`
- Unit tests validate specific examples, edge cases, and error conditions
- All property tests go in `__tests__/properties/patient-doctor-experience.property.test.ts`
- All unit tests go in `__tests__/unit/patient-doctor-experience.test.ts`
- The design uses TypeScript throughout — all code examples and implementations use TypeScript
