# Implementation Plan

- [x] 1. Write bug condition exploration tests
  - **Property 1: Bug Condition** - Project-Wide Bug Audit
  - **CRITICAL**: These tests MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: These tests encode the expected behavior — they will validate the fixes when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate each bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope properties to concrete failing cases
  - Test cases to write in `__tests__/properties/bug-audit.property.test.ts`:
    - Bug 2: Generate appointments with null `slotId`, call detail endpoint — assert returns data with null slot fields instead of 500/404 (from `isBugCondition_2`)
    - Bug 3/4: Generate requests where caller is assigned doctor or admin — assert 200 with `queuePosition`/`doctorReady` instead of 403 (from `isBugCondition_3_4`)
    - Bug 7: Generate unauthenticated GET requests to `/api/availability` — assert 401 instead of 200 (from `isBugCondition_7`)
    - Bug 8: Generate invalid IANA timezone strings (e.g., `"NotATimezone/Fake"`, `"Invalid/Zone"`) — assert 400 validation error instead of silent acceptance (from `isBugCondition_8`)
    - Bug 11: Generate non-OK, non-503 responses with non-JSON bodies — assert graceful error message with status context instead of JSON parse crash (from `isBugCondition_11`)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found to understand root causes
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.2, 1.3, 1.4, 1.7, 1.8, 1.11_

- [x] 2. Write preservation property tests (BEFORE implementing fixes)
  - **Property 2: Preservation** - Project-Wide Bug Audit Preservation
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs, then write property-based tests capturing observed behavior
  - Test cases to write in `__tests__/properties/bug-audit-preservation.property.test.ts`:
    - Observe: Appointment detail with valid non-null `slotId` returns full data including slot fields on unfixed code (from Preservation Req 3.2)
    - Observe: Patient who owns appointment gets 200 from consultation status on unfixed code (from Preservation Req 3.3)
    - Observe: Unrelated user gets 403 from consultation status on unfixed code (from Preservation Req 3.4)
    - Observe: Successful detail fetch in visit-history renders correctly on unfixed code (from Preservation Req 3.5)
    - Observe: Authenticated user gets availability slots on unfixed code (from Preservation Req 3.7)
    - Observe: Valid IANA timezone (e.g., `"America/New_York"`) produces correct UTC `scheduledAt` on unfixed code (from Preservation Req 3.8)
    - Observe: Successful download (200) opens PDF URL on unfixed code (from Preservation Req 3.11)
    - Observe: 503 download shows storage unavailable message on unfixed code (from Preservation Req 3.12)
  - Write property-based tests asserting observed behavior across the input domain
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.7, 3.8, 3.11, 3.12_

- [ ] 3. Schema changes — Database indexes, cascade deletes (Bugs 6, 10)

  - [x] 3.1 Add database indexes to `lib/db/schema.ts`
    - Add index on `appointments.patientId` (`idx_appointments_patient_id`)
    - Add index on `appointments.doctorId` (`idx_appointments_doctor_id`)
    - Add index on `appointments.status` (`idx_appointments_status`)
    - Add index on `reviews.doctorId` (`idx_reviews_doctor_id`)
    - Add index on `notifications.userId` (`idx_notifications_user_id`)
    - Use Drizzle's third argument to `pgTable()` for index definitions
    - _Bug_Condition: queries filtering on these columns perform full table scans without indexes_
    - _Expected_Behavior: indexes exist on all frequently queried FK/filter columns_
    - _Preservation: query results remain semantically identical (indexes are transparent)_
    - _Requirements: 2.6, 3.6_

  - [x] 3.2 Add cascade delete rules to `lib/db/schema.ts`
    - Add `{ onDelete: "cascade" }` to `prescriptions.appointmentId` reference
    - Add `{ onDelete: "cascade" }` to `visitNotes.appointmentId` reference
    - Add `{ onDelete: "cascade" }` to `reviews.appointmentId` reference
    - _Bug_Condition: appointment deletion leaves orphaned child rows_
    - _Expected_Behavior: deleting an appointment cascades to prescriptions, visitNotes, reviews_
    - _Preservation: normal CRUD on child records continues to work_
    - _Requirements: 2.10, 3.10_

  - [x] 3.3 Add timezone validation to `lib/validators.ts`
    - Change `timezone: z.string().optional()` in `createAppointmentSchema` to include `.refine()` that validates against `Intl.DateTimeFormat` with the provided timezone
    - Return `true` for `undefined` (optional field), `false` for invalid IANA strings
    - Error message: `"Invalid IANA timezone identifier"`
    - _Bug_Condition: `timezone NOT IN Intl.supportedValuesOf("timeZone")`_
    - _Expected_Behavior: 400 validation error for invalid timezone strings_
    - _Preservation: valid IANA timezone strings continue to produce correct scheduledAt_
    - _Requirements: 2.8, 3.8_

  - [x] 3.4 Create shared status constants in `lib/constants.ts`
    - Export `APPOINTMENT_STATUS` object with `PENDING`, `CONFIRMED`, `REJECTED`, `COMPLETED`, `CANCELLED` keys
    - Export `AppointmentStatus` type derived from the constants
    - Values must map to the exact same strings: `"pending"`, `"confirmed"`, `"rejected"`, `"completed"`, `"cancelled"`
    - _Bug_Condition: hardcoded status strings across multiple files_
    - _Expected_Behavior: shared constants used instead of string literals_
    - _Preservation: all status comparisons evaluate to the same string values_
    - _Requirements: 2.9, 3.9_

- [x] 4. Checkpoint — Verify schema changes
  - Run `npx drizzle-kit generate` to create migration for index and cascade changes
  - Run `npx drizzle-kit push` to apply migration to dev database
  - Verify `lib/constants.ts` exports correct values
  - Verify `lib/validators.ts` timezone refinement compiles
  - Ensure no type errors in modified files
  - Ask the user if questions arise

- [ ] 5. API fixes — Review race condition, null slotId, consultation auth, availability auth (Bugs 1, 2, 3, 4, 7)

  - [x] 5.1 Fix review race condition in `app/api/reviews/route.ts`
    - Move the appointment existence check, status check, ownership check, and existing review check INSIDE `db.transaction()`
    - Add `.for("update")` on the appointment select to serialize concurrent requests
    - Check for existing review inside the transaction — return 409 if found
    - Remove the pre-transaction checks that are now inside the transaction
    - _Bug_Condition: two concurrent POST requests for the same appointmentId both pass existence check_
    - _Expected_Behavior: only one review inserted, second request gets 409_
    - _Preservation: single review submissions continue to insert and return 201_
    - _Requirements: 2.1, 3.1_

  - [x] 5.2 Fix null slotId query in `app/api/appointments/[id]/detail/route.ts`
    - Change `.innerJoin(availabilitySlots, eq(availabilitySlots.id, appointments.slotId))` to `.leftJoin(availabilitySlots, eq(availabilitySlots.id, appointments.slotId))`
    - No other changes needed — response already handles null slot fields from leftJoin
    - _Bug_Condition: appointment.slotId IS NULL_
    - _Expected_Behavior: returns appointment data with null slotDate/slotStartTime/slotEndTime_
    - _Preservation: appointments with non-null slotId continue to return full slot data_
    - _Requirements: 2.2, 3.2_

  - [x] 5.3 Fix consultation status authorization in `app/api/consultation/[id]/status/route.ts`
    - Replace `if (appointment.patientId !== session.user.id)` with compound check:
      - Allow if `appointment.patientId === session.user.id` (patient)
      - Allow if `appointment.doctorId === session.user.id` (assigned doctor)
      - Allow if `session.user.role === "admin"` (admin)
      - Return 403 only if none of the above match
    - _Bug_Condition: caller is assigned doctor OR caller is admin_
    - _Expected_Behavior: doctor and admin get 200 with queuePosition and doctorReady_
    - _Preservation: patient access continues to work; unrelated users still get 403_
    - _Requirements: 2.3, 2.4, 3.3, 3.4_

  - [x] 5.4 Fix unauthenticated availability access in `app/api/availability/route.ts`
    - Add `getSession()` call at the start of the GET handler
    - Return 401 Unauthorized if no valid session exists
    - Import `getSession` from `@/lib/auth-helpers`
    - _Bug_Condition: request.method == "GET" AND request.session IS NULL_
    - _Expected_Behavior: 401 Unauthorized for unauthenticated requests_
    - _Preservation: authenticated users continue to get availability slots_
    - _Requirements: 2.7, 3.7_

- [x] 6. Checkpoint — Verify API fixes
  - Ensure no type errors in all modified API route files
  - Verify review route transaction structure is correct
  - Verify detail route uses leftJoin
  - Verify consultation status has compound auth check
  - Verify availability GET requires session
  - Ask the user if questions arise

- [ ] 7. Frontend fixes — Visit history error handling, prescription download error handling (Bugs 5, 11)

  - [x] 7.1 Fix visit history silent fetch failure in `components/appointments/visit-history.tsx`
    - Add `detailError` state variable (`string | null`) to track which appointment ID had a fetch error
    - In `toggleDetail()`: set `detailError` to the appointment ID when fetch fails (network error or `!res.ok`)
    - In `toggleDetail()`: clear `detailError` when retrying a failed appointment (if `detailError === appointmentId`, clear error and re-fetch)
    - In `AppointmentList` expanded card content: render error message ("Unable to load appointment details") with a "Retry" button when `detailError` matches the appointment ID
    - Pass `detailError` and a retry handler to `AppointmentList`
    - _Bug_Condition: fetch in toggleDetail fails (network error or non-OK response)_
    - _Expected_Behavior: error state set, spinner cleared, error message with retry button displayed_
    - _Preservation: successful detail fetches continue to render correctly_
    - _Requirements: 2.5, 3.5_

  - [x] 7.2 Fix prescription download error handling in `components/prescriptions/prescription-detail-view.tsx`
    - Restructure `handleDownload()` to check `res.status` BEFORE calling `res.json()`
    - Check for 503 first (preserve existing behavior)
    - For all other non-OK statuses: wrap `res.json()` in try/catch to handle non-JSON response bodies
    - Map status codes to user-friendly messages: 404 → "Prescription not found", 400 → "Invalid request", others → `"Server error (${res.status})"`
    - Fall back to generic message if JSON parse fails
    - _Bug_Condition: response.status != 200 AND response.status != 503 AND body may not be valid JSON_
    - _Expected_Behavior: graceful error message with HTTP status context_
    - _Preservation: 200 continues to open PDF; 503 continues to show storage unavailable message_
    - _Requirements: 2.11, 3.11, 3.12_

- [x] 8. Checkpoint — Verify frontend fixes
  - Ensure no type errors in modified component files
  - Verify visit-history has error state, retry button, and proper error clearing
  - Verify prescription-detail-view checks status before JSON parse
  - Ask the user if questions arise

- [ ] 9. Fix implementation verification

  - [x] 9.1 Verify bug condition exploration tests now pass
    - **Property 1: Expected Behavior** - Project-Wide Bug Audit
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior for each bug
    - When these tests pass, it confirms the expected behavior is satisfied
    - Run bug condition exploration tests from `__tests__/properties/bug-audit.property.test.ts`
    - **EXPECTED OUTCOME**: Tests PASS (confirms bugs are fixed)
    - _Requirements: 2.2, 2.3, 2.4, 2.7, 2.8, 2.11_

  - [x] 9.2 Verify preservation tests still pass
    - **Property 2: Preservation** - Project-Wide Bug Audit Preservation
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from `__tests__/properties/bug-audit-preservation.property.test.ts`
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all preservation tests still pass after fixes (no regressions)
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.7, 3.8, 3.11, 3.12_

- [x] 10. Write unit tests for all fixes
  - Create `__tests__/unit/bug-audit.test.ts` with unit tests covering:
    - Review POST: test concurrent request handling (mocked transaction), single submission success (201), duplicate returns 409
    - Appointment detail: test null slotId returns data with null slot fields, non-null slotId returns full data
    - Consultation status: test patient access (200), doctor access (200), admin access (200), unauthorized user (403)
    - Visit history: test toggleDetail error state, retry clears error and re-fetches, successful fetch renders details
    - Availability GET: test unauthenticated returns 401, authenticated returns slots
    - Timezone validation: test invalid IANA string returns 400, valid string passes, undefined passes
    - Prescription download: test 200 opens PDF, 503 shows storage message, 404 shows "not found", 500 with HTML body shows "Server error (500)"
    - Shared constants: test `APPOINTMENT_STATUS` values map to correct strings
    - Cascade deletes: test schema has `onDelete: "cascade"` on prescriptions, visitNotes, reviews FK references
  - _Requirements: 2.1–2.11, 3.1–3.12_

- [x] 11. Generate and apply database migration
  - Run `npx drizzle-kit generate` to create migration for:
    - New indexes on appointments, reviews, notifications tables
    - Cascade delete rules on prescriptions, visitNotes, reviews foreign keys
  - Run `npx drizzle-kit push` to apply migration to development database
  - Verify migration applies cleanly with no errors
  - _Requirements: 2.6, 2.10_

- [x] 12. Final checkpoint — Ensure all tests pass
  - Run full test suite: `npx vitest --run`
  - Verify all bug condition tests pass (bugs are fixed)
  - Verify all preservation tests pass (no regressions)
  - Verify all unit tests pass
  - Verify no type errors across the codebase
  - Ensure all tests pass, ask the user if questions arise
