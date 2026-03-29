# Bugfix Requirements Document

## Introduction

A comprehensive audit of the MediConnect Virtual Clinic project has identified 10 bugs and issues spanning data integrity, authorization, error handling, performance, and maintainability. These range from critical race conditions and 500 errors to missing auth checks and absent database indexes. This document captures the defective behavior, expected corrections, and preservation constraints for each issue using the bug condition methodology.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN two concurrent review submission requests arrive for the same appointment THEN the system allows both to pass the existence check (`SELECT` outside the transaction) and inserts duplicate reviews, violating the unique constraint on `reviews.appointmentId`

1.2 WHEN an appointment has a null `slotId` (made nullable in migration 0002) and the detail endpoint is called THEN the system returns a 500 error because `innerJoin` with `availabilitySlots` fails to match, returning no rows

1.3 WHEN a doctor assigned to an appointment calls `GET /api/consultation/[id]/status` THEN the system returns 403 Forbidden because it only checks `appointment.patientId === session.user.id`

1.4 WHEN an admin calls `GET /api/consultation/[id]/status` THEN the system returns 403 Forbidden because the endpoint has no admin access path

1.5 WHEN the detail fetch in `visit-history.tsx` `toggleDetail()` fails (network error or non-OK response) THEN the system silently catches the error, leaving the user stuck on "Loading details…" spinner with no error message and no way to recover

1.6 WHEN the database has many appointments, reviews, or notifications THEN the system performs full table scans on `appointments.patientId`, `appointments.doctorId`, `appointments.status`, `reviews.doctorId`, and `notifications.userId` because no indexes exist on these frequently queried columns

1.7 WHEN an unauthenticated user calls `GET /api/availability?doctorId=X` THEN the system returns the doctor's availability slots without requiring authentication

1.8 WHEN a patient books an appointment with an invalid timezone string (e.g., "NotATimezone/Fake") THEN the system silently produces incorrect `scheduledAt` values because the `timezone` parameter is used in `toLocaleString()` without validation

1.9 WHEN appointment status values are used across the codebase THEN the system relies on hardcoded strings like `"pending"`, `"confirmed"`, `"completed"` etc. in multiple files, making refactoring error-prone and inconsistent

1.10 WHEN an appointment is deleted THEN the system leaves orphaned records in `prescriptions`, `visitNotes`, and `reviews` tables because no cascade delete rules are defined on their foreign key references to `appointments`

1.11 WHEN the prescription download endpoint returns a non-503 error (400, 404, 500) THEN the system attempts `res.json()` which may fail if the response body is not valid JSON, and the specific error status is not communicated to the user


### Expected Behavior (Correct)

2.1 WHEN two concurrent review submission requests arrive for the same appointment THEN the system SHALL move the existence check inside the database transaction (using `SELECT ... FOR UPDATE` or equivalent) so that only one review is inserted and the second request receives a 409 Conflict response

2.2 WHEN an appointment has a null `slotId` and the detail endpoint is called THEN the system SHALL use `leftJoin` with `availabilitySlots` instead of `innerJoin`, returning the appointment data with null slot fields (`slotDate`, `slotStartTime`, `slotEndTime`) instead of a 500 error

2.3 WHEN a doctor assigned to an appointment calls `GET /api/consultation/[id]/status` THEN the system SHALL allow access and return the queue position and doctor-ready status

2.4 WHEN an admin calls `GET /api/consultation/[id]/status` THEN the system SHALL allow access and return the queue position and doctor-ready status

2.5 WHEN the detail fetch in `visit-history.tsx` `toggleDetail()` fails THEN the system SHALL set an error state, clear the loading spinner, and display an actionable error message (e.g., "Unable to load appointment details") with a retry option

2.6 WHEN the database has many records THEN the system SHALL have indexes on `appointments.patientId`, `appointments.doctorId`, `appointments.status`, `reviews.doctorId`, and `notifications.userId` to ensure efficient query performance

2.7 WHEN an unauthenticated user calls `GET /api/availability?doctorId=X` THEN the system SHALL require authentication and return 401 Unauthorized if no valid session exists

2.8 WHEN a patient books an appointment with an invalid timezone string THEN the system SHALL validate the timezone parameter against the IANA timezone database and return a 400 validation error if the timezone is invalid

2.9 WHEN appointment status values are used across the codebase THEN the system SHALL use shared constants (e.g., `APPOINTMENT_STATUS`) exported from a central module instead of hardcoded strings

2.10 WHEN an appointment is deleted THEN the system SHALL cascade the deletion to related `prescriptions`, `visitNotes`, and `reviews` records via `onDelete: "cascade"` foreign key rules in the schema

2.11 WHEN the prescription download endpoint returns any non-OK response THEN the system SHALL handle JSON parse failures gracefully and display a user-friendly error message that includes the HTTP status context (e.g., "Prescription not found" for 404, "Server error" for 500)

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a single review submission request arrives for a completed appointment with no existing review THEN the system SHALL CONTINUE TO insert the review, update doctor profile aggregates, and return 201

3.2 WHEN an appointment has a non-null `slotId` and the detail endpoint is called THEN the system SHALL CONTINUE TO return the full appointment data including slot date, start time, and end time

3.3 WHEN a patient who owns the appointment calls `GET /api/consultation/[id]/status` THEN the system SHALL CONTINUE TO return the queue position and doctor-ready status

3.4 WHEN a user who is neither the patient, the assigned doctor, nor an admin calls `GET /api/consultation/[id]/status` THEN the system SHALL CONTINUE TO return 403 Forbidden

3.5 WHEN the detail fetch in `visit-history.tsx` succeeds THEN the system SHALL CONTINUE TO display the appointment details (visit notes, prescription info) without error messages

3.6 WHEN queries use the indexed columns THEN the system SHALL CONTINUE TO return the same results as before (indexes are transparent to query semantics)

3.7 WHEN an authenticated user calls `GET /api/availability?doctorId=X` THEN the system SHALL CONTINUE TO return the doctor's availability slots

3.8 WHEN a patient books an appointment with a valid IANA timezone string (e.g., "America/New_York") THEN the system SHALL CONTINUE TO correctly compute `scheduledAt` in UTC

3.9 WHEN appointment status values are compared or used in queries THEN the system SHALL CONTINUE TO produce the same behavior as before (constants map to the same string values)

3.10 WHEN an appointment exists with related prescriptions, visit notes, and reviews THEN the system SHALL CONTINUE TO allow normal CRUD operations on those related records

3.11 WHEN the prescription download succeeds (200 OK) THEN the system SHALL CONTINUE TO open the PDF download URL in a new tab

3.12 WHEN the prescription download returns 503 THEN the system SHALL CONTINUE TO display the "File storage is temporarily unavailable" message

