# Requirements Document

## Introduction

MediConnect is a Virtual Clinic Platform (MVP) built on the existing Next.js 14 App Router project. The platform enables patients to book appointments, join live video consultations via WebRTC (LiveKit), and view prescriptions. Doctors manage availability, accept or reject appointments, conduct video consultations with in-call note-taking, and issue prescriptions. Admins oversee doctors, patients, appointments, and view analytics. The system uses better-auth for role-based authentication, Drizzle ORM with PostgreSQL for persistence, MinIO for PDF prescription storage, and Framer Motion for UI animations. All infrastructure services (PostgreSQL, LiveKit, MinIO) run via Docker.

## Glossary

- **Platform**: The MediConnect Virtual Clinic web application built with Next.js App Router
- **Patient**: A registered user with the "patient" role who books appointments and joins consultations
- **Doctor**: A registered user with the "doctor" role who manages availability and conducts consultations
- **Admin**: A registered user with the "admin" role who manages platform users and views analytics
- **Auth_System**: The authentication and authorization module powered by better-auth with role-based access control
- **Appointment_System**: The module responsible for creating, updating, and managing appointment records
- **Availability_Calendar**: The UI and data layer that allows doctors to define and patients to view open time slots
- **Video_Room**: The WebRTC-based video consultation room powered by LiveKit
- **Waiting_Room**: The animated pre-consultation queue interface showing queue position to patients
- **Prescription_Pad**: The rich-text editor used by doctors during or after a call to write prescriptions
- **Prescription_Store**: The MinIO-based file storage service for PDF prescriptions
- **Analytics_Dashboard**: The admin-facing dashboard displaying platform metrics via Recharts
- **Notification_Service**: The module responsible for sending confirmation emails and in-app notifications

## Requirements

### Requirement 1: User Registration and Authentication

**User Story:** As a user, I want to register and log in with role-based access, so that I can securely use the platform according to my role.

#### Acceptance Criteria

1. THE Auth_System SHALL allow users to register with an email, password, and role selection (Patient or Doctor)
2. THE Auth_System SHALL authenticate users via email and password and issue a session token upon successful login
3. THE Auth_System SHALL enforce role-based access control so that Patient, Doctor, and Admin users can only access routes and actions permitted for their role
4. IF a user provides invalid credentials, THEN THE Auth_System SHALL reject the login attempt and display a descriptive error message
5. IF an unauthenticated user attempts to access a protected route, THEN THE Auth_System SHALL redirect the user to the login page
6. THE Auth_System SHALL store passwords using a secure hashing algorithm provided by better-auth
7. WHEN a user logs out, THE Auth_System SHALL invalidate the session token and redirect the user to the login page

### Requirement 2: Doctor Availability Management

**User Story:** As a doctor, I want to manage my availability slots, so that patients can see when I am available for consultations.

#### Acceptance Criteria

1. WHILE a Doctor is logged in, THE Availability_Calendar SHALL display the doctor's existing availability slots in a weekly calendar view
2. WHEN a Doctor creates a new availability slot, THE Availability_Calendar SHALL save the slot with a start time, end time, and date to the database
3. WHEN a Doctor deletes an availability slot that has no booked appointment, THE Availability_Calendar SHALL remove the slot from the database
4. THE Availability_Calendar SHALL prevent a Doctor from creating overlapping availability slots
5. IF a Doctor attempts to create a slot in the past, THEN THE Availability_Calendar SHALL reject the request and display a validation error

### Requirement 3: Appointment Booking

**User Story:** As a patient, I want to book an appointment from a doctor's available slots, so that I can schedule a video consultation.

#### Acceptance Criteria

1. WHEN a Patient selects a Doctor, THE Platform SHALL display the doctor's available time slots from the Availability_Calendar
2. WHEN a Patient selects an available time slot and confirms the booking, THE Appointment_System SHALL create an appointment record with status "pending"
3. THE Appointment_System SHALL prevent double-booking by marking a slot as unavailable once an appointment is confirmed for that slot
4. WHEN an appointment is successfully created, THE Notification_Service SHALL send a confirmation email to the Patient with appointment details
5. THE Platform SHALL present the appointment booking flow as an animated multi-step UI using Framer Motion
6. IF a Patient attempts to book a slot that has already been taken, THEN THE Appointment_System SHALL reject the booking and display an availability error

### Requirement 4: Appointment Management by Doctor

**User Story:** As a doctor, I want to accept or reject pending appointments, so that I can control my consultation schedule.

#### Acceptance Criteria

1. WHILE a Doctor is logged in, THE Appointment_System SHALL display a list of pending appointments for that Doctor
2. WHEN a Doctor accepts a pending appointment, THE Appointment_System SHALL update the appointment status to "confirmed"
3. WHEN a Doctor rejects a pending appointment, THE Appointment_System SHALL update the appointment status to "rejected" and release the time slot back to available
4. WHEN an appointment status changes, THE Notification_Service SHALL notify the Patient of the updated status via email

### Requirement 5: Video Consultation Room

**User Story:** As a patient or doctor, I want to join a live video consultation, so that I can conduct a medical appointment remotely.

#### Acceptance Criteria

1. WHEN a confirmed appointment's scheduled time arrives, THE Platform SHALL enable a "Join" button for both the Patient and the Doctor
2. WHEN a user clicks the "Join" button, THE Video_Room SHALL connect the user to a LiveKit WebRTC video session associated with that appointment
3. WHILE a video session is active, THE Video_Room SHALL display both participant video streams with audio
4. WHEN either participant ends the call, THE Video_Room SHALL disconnect both participants and update the appointment status to "completed"
5. IF a network disconnection occurs during a video session, THEN THE Video_Room SHALL attempt to reconnect for up to 30 seconds before displaying a disconnection notice
6. THE Video_Room SHALL generate a unique LiveKit room token for each appointment to ensure session isolation

### Requirement 6: Waiting Room

**User Story:** As a patient, I want to see an animated waiting room with my queue position, so that I know when the doctor is ready for my consultation.

#### Acceptance Criteria

1. WHILE a Patient is waiting for a confirmed appointment to start, THE Waiting_Room SHALL display an animated waiting interface using Framer Motion
2. WHILE a Patient is in the Waiting_Room, THE Waiting_Room SHALL display the patient's current queue position relative to other waiting patients for the same Doctor
3. WHEN the Doctor is ready and starts the video session, THE Waiting_Room SHALL display a "Doctor is ready" notification to the Patient
4. WHEN the Patient receives the "Doctor is ready" notification, THE Waiting_Room SHALL present a button to join the Video_Room

### Requirement 7: In-Call Note-Taking

**User Story:** As a doctor, I want to take notes during a video consultation, so that I can record observations while speaking with the patient.

#### Acceptance Criteria

1. WHILE a Doctor is in an active Video_Room session, THE Platform SHALL display a side panel with a rich-text note-taking editor
2. WHEN a Doctor types notes during a call, THE Platform SHALL auto-save the notes to the database at regular intervals
3. WHEN the video call ends, THE Platform SHALL persist the final version of the notes associated with the appointment record

### Requirement 8: Prescription Writing and Storage

**User Story:** As a doctor, I want to write and send prescriptions after a consultation, so that the patient receives a documented treatment plan.

#### Acceptance Criteria

1. WHEN a Doctor completes a video consultation, THE Prescription_Pad SHALL allow the Doctor to write a prescription using a rich-text editor
2. WHEN a Doctor submits a prescription, THE Platform SHALL save the prescription content to the PostgreSQL database linked to the appointment
3. WHEN a Doctor submits a prescription, THE Platform SHALL generate a PDF version of the prescription and upload the PDF to the Prescription_Store (MinIO)
4. WHEN a prescription is saved, THE Notification_Service SHALL notify the Patient that a new prescription is available
5. THE Prescription_Pad SHALL include fields for medication name, dosage, frequency, and duration

### Requirement 9: Patient Visit History

**User Story:** As a patient, I want to view my past prescriptions and visit notes, so that I can reference my medical history.

#### Acceptance Criteria

1. WHILE a Patient is logged in, THE Platform SHALL provide a visit history page listing all past completed appointments for that Patient
2. WHEN a Patient selects a past appointment, THE Platform SHALL display the visit notes and prescription details associated with that appointment
3. WHEN a Patient requests to download a prescription, THE Platform SHALL retrieve the PDF from the Prescription_Store and serve the file for download

### Requirement 10: Admin User Management

**User Story:** As an admin, I want to manage doctors and patients, so that I can maintain the platform's user base.

#### Acceptance Criteria

1. WHILE an Admin is logged in, THE Platform SHALL display a user management table listing all Doctors and Patients with their status and role
2. WHEN an Admin searches or filters the user table, THE Platform SHALL update the displayed results to match the search criteria
3. WHEN an Admin deactivates a user account, THE Auth_System SHALL prevent that user from logging in until reactivated
4. WHEN an Admin activates a previously deactivated account, THE Auth_System SHALL restore login access for that user

### Requirement 11: Admin Appointment Oversight

**User Story:** As an admin, I want to view and manage all appointments, so that I can oversee platform operations.

#### Acceptance Criteria

1. WHILE an Admin is logged in, THE Platform SHALL display a list of all appointments across all Doctors with status filters
2. WHEN an Admin selects an appointment, THE Platform SHALL display the full appointment details including patient, doctor, status, and associated notes
3. WHEN an Admin cancels an appointment, THE Appointment_System SHALL update the appointment status to "cancelled" and notify both the Patient and the Doctor

### Requirement 12: Analytics Dashboard

**User Story:** As an admin, I want to view platform analytics, so that I can monitor business performance and usage.

#### Acceptance Criteria

1. WHILE an Admin is logged in, THE Analytics_Dashboard SHALL display the total number of completed consultations
2. WHILE an Admin is logged in, THE Analytics_Dashboard SHALL display total revenue generated from consultations
3. WHILE an Admin is logged in, THE Analytics_Dashboard SHALL display the count of currently active Doctors
4. THE Analytics_Dashboard SHALL render charts using Recharts for visual representation of consultation trends over time
5. WHEN an Admin selects a date range filter, THE Analytics_Dashboard SHALL update all displayed metrics to reflect the selected period

### Requirement 13: Database Schema and Operations

**User Story:** As a developer, I want a well-defined database schema, so that all platform data is stored consistently and safely.

#### Acceptance Criteria

1. THE Platform SHALL define database tables for users, appointments, availability slots, prescriptions, and visit notes using Drizzle ORM schema definitions
2. THE Platform SHALL use Drizzle ORM for all database read and write operations to ensure type-safe queries
3. THE Platform SHALL run PostgreSQL as a Docker container defined in compose.yml
4. THE Platform SHALL apply database migrations using Drizzle Kit before the application starts serving requests

### Requirement 14: File Storage for Prescriptions

**User Story:** As a developer, I want prescription PDFs stored in object storage, so that files are managed separately from the database.

#### Acceptance Criteria

1. THE Platform SHALL run MinIO as a Docker container defined in compose.yml for S3-compatible object storage
2. WHEN a prescription PDF is generated, THE Platform SHALL upload the PDF to a dedicated MinIO bucket
3. WHEN a Patient or Doctor requests a prescription PDF, THE Platform SHALL generate a pre-signed URL from MinIO to serve the file securely
4. IF the MinIO service is unavailable, THEN THE Platform SHALL return an error message indicating that file storage is temporarily unavailable

### Requirement 15: Docker Infrastructure

**User Story:** As a developer, I want all infrastructure services defined in Docker Compose, so that the development environment is reproducible.

#### Acceptance Criteria

1. THE Platform SHALL define PostgreSQL, LiveKit, and MinIO services in compose.yml alongside the existing Next.js service
2. THE Platform SHALL configure environment variables for database connection, LiveKit API keys, and MinIO credentials via the compose.yml file
3. WHEN `docker compose up` is executed, THE Platform SHALL start all required services with correct networking between containers
