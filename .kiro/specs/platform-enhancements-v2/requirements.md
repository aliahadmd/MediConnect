# Requirements Document

## Introduction

Platform Enhancements V2 extends the existing MediConnect Virtual Clinic with four major improvement areas: (1) robust real-time video consultation with proper connection state management, reconnection logic, and call quality indicators; (2) a real-time notification system using Server-Sent Events (SSE) to replace the current 30-second polling mechanism; (3) admin-level availability and appointment cascade management allowing admins to delete doctor availability slots with automatic appointment cancellation; and (4) rich user profile and account management for doctors and patients including profile photos stored in MinIO. These enhancements build on the existing Next.js 14 App Router, Drizzle ORM/PostgreSQL, LiveKit, MinIO, better-auth, and shadcn/ui stack.

## Glossary

- **Platform**: The MediConnect Virtual Clinic web application built with Next.js App Router
- **Patient**: A registered user with the "patient" role who books appointments and joins consultations
- **Doctor**: A registered user with the "doctor" role who manages availability and conducts consultations
- **Admin**: A registered user with the "admin" role who manages platform users, availability, and views analytics
- **Video_Room**: The WebRTC-based video consultation room powered by LiveKit with connection state management
- **Connection_State_Manager**: The client-side module responsible for tracking and displaying video connection states (connecting, connected, poor_connection, reconnecting, disconnected)
- **Reconnection_Handler**: The module responsible for managing automatic reconnection attempts during network disruptions in the Video_Room
- **Call_Quality_Monitor**: The module that monitors and displays network quality, audio status, and video status during a video consultation
- **SSE_Service**: The Server-Sent Events service that pushes real-time notifications from the server to connected clients
- **Notification_Service**: The module responsible for creating in-app notifications and dispatching them via the SSE_Service
- **Notification_Preferences**: The user-configurable settings that control which notification types a user receives
- **Availability_Manager**: The admin-facing module for viewing and deleting doctor availability slots with cascade logic
- **Cascade_Handler**: The server-side module that automatically cancels appointments and notifies affected users when an availability slot is deleted
- **Doctor_Profile**: The extended profile data for doctors including specialization, qualifications, bio, phone number, profile photo, consultation fee, and years of experience
- **Patient_Profile**: The extended profile data for patients including date of birth, gender, phone number, address, emergency contact, blood type, allergies, and medical history notes
- **Profile_Photo_Store**: The MinIO-based storage for user profile photos
- **Profile_Settings**: The user-facing page where doctors and patients can view and update their profile information

## Requirements

### Requirement 1: Video Connection State Management

**User Story:** As a patient or doctor, I want to see clear indicators of my video connection state, so that I understand the current status of my consultation session.

#### Acceptance Criteria

1. WHEN a user clicks the "Join" button, THE Connection_State_Manager SHALL transition the Video_Room state to "connecting" and display a connecting indicator
2. WHEN the LiveKit client successfully connects to the server, THE Connection_State_Manager SHALL transition the Video_Room state to "connected" and display a connected indicator
3. WHEN the LiveKit client detects degraded network quality during an active session, THE Connection_State_Manager SHALL transition the Video_Room state to "poor_connection" and display a poor connection warning with the current quality level
4. WHEN a network disconnection occurs during an active session, THE Connection_State_Manager SHALL transition the Video_Room state to "reconnecting" and display a reconnecting overlay
5. WHEN the reconnection timeout expires without successful reconnection, THE Connection_State_Manager SHALL transition the Video_Room state to "disconnected" and display a disconnection notice with an option to retry
6. THE Connection_State_Manager SHALL display the current connection state as a persistent visual indicator within the Video_Room interface at all times during a session

### Requirement 2: Robust Reconnection Logic

**User Story:** As a patient or doctor, I want the video consultation to automatically recover from network disruptions, so that temporary connectivity issues do not end my consultation prematurely.

#### Acceptance Criteria

1. WHEN a network disconnection occurs during an active video session, THE Reconnection_Handler SHALL initiate automatic reconnection attempts using exponential backoff starting at 1 second up to a maximum interval of 10 seconds
2. WHILE the Reconnection_Handler is attempting to reconnect, THE Video_Room SHALL display the elapsed time since disconnection and the number of reconnection attempts
3. WHEN a reconnection attempt succeeds, THE Reconnection_Handler SHALL restore the video session and transition the Connection_State_Manager to "connected"
4. IF the Reconnection_Handler fails to reconnect within 45 seconds, THEN THE Video_Room SHALL display a disconnection notice with a manual "Retry Connection" button
5. WHEN a user clicks the "Retry Connection" button after a failed reconnection, THE Reconnection_Handler SHALL request a new LiveKit token and attempt to establish a fresh connection
6. IF the LiveKit server is unreachable during initial connection, THEN THE Video_Room SHALL display an error message indicating the video service is unavailable and provide a "Retry" button

### Requirement 3: Participant Awareness and Call Quality

**User Story:** As a doctor, I want to see which patient is calling and the connection quality of both participants, so that I can manage my consultations effectively.

#### Acceptance Criteria

1. WHEN a Patient joins the Video_Room for a confirmed appointment, THE Platform SHALL display the patient name and appointment details on the Doctor's consultation interface
2. WHILE a video session is active, THE Call_Quality_Monitor SHALL display the local participant's network quality as a signal strength indicator (good, fair, poor)
3. WHILE a video session is active, THE Call_Quality_Monitor SHALL display the remote participant's network quality as a signal strength indicator (good, fair, poor)
4. WHILE a video session is active, THE Call_Quality_Monitor SHALL display the mute status of both the local and remote participant's audio and video tracks
5. WHEN a participant's connection quality changes, THE Call_Quality_Monitor SHALL update the quality indicator within 3 seconds
6. WHILE a Doctor is on the appointments dashboard and a Patient joins the Video_Room for a confirmed appointment, THE Platform SHALL display a "Patient is calling" indicator on the corresponding appointment card with the patient name

### Requirement 4: Real-Time Notification Delivery via SSE

**User Story:** As a user, I want to receive notifications instantly when events occur, so that I can respond to appointment changes and consultation events without delay.

#### Acceptance Criteria

1. WHEN an authenticated user opens the Platform, THE SSE_Service SHALL establish a Server-Sent Events connection from the client to the server at the `/api/notifications/stream` endpoint
2. WHEN a new notification is created for a user, THE SSE_Service SHALL push the notification to the user's active SSE connection within 2 seconds
3. IF the SSE connection is lost, THEN THE SSE_Service client SHALL automatically attempt to reconnect using the browser's native EventSource reconnection mechanism
4. WHILE the SSE connection is active, THE SSE_Service SHALL send a heartbeat event every 30 seconds to keep the connection alive
5. THE SSE_Service SHALL support multiple concurrent SSE connections for the same user across different browser tabs
6. WHEN the SSE connection cannot be established, THE Platform SHALL fall back to polling notifications every 15 seconds

### Requirement 5: Instant Event Notifications

**User Story:** As a patient or doctor, I want to be notified instantly about appointment bookings, status changes, and consultation events, so that I can take timely action.

#### Acceptance Criteria

1. WHEN a Patient books an appointment, THE Notification_Service SHALL create a notification for the Doctor and deliver the notification via the SSE_Service within 2 seconds
2. WHEN a Doctor accepts an appointment, THE Notification_Service SHALL create a notification for the Patient and deliver the notification via the SSE_Service within 2 seconds
3. WHEN a Doctor rejects an appointment, THE Notification_Service SHALL create a notification for the Patient and deliver the notification via the SSE_Service within 2 seconds
4. WHEN a Patient joins the Video_Room for a confirmed appointment, THE Notification_Service SHALL create a "patient_calling" notification for the Doctor and deliver the notification via the SSE_Service within 2 seconds
5. WHEN a new notification is delivered via SSE, THE Platform SHALL play an audible notification sound and display a visual toast alert for notification types classified as important (appointment_confirmed, appointment_rejected, appointment_cancelled, patient_calling, prescription_ready)
6. WHEN a new notification is delivered via SSE, THE Platform SHALL update the notification bell unread count without requiring a page refresh

### Requirement 6: Notification Management

**User Story:** As a user, I want to manage my notifications and control which notifications I receive, so that I can reduce noise and focus on relevant events.

#### Acceptance Criteria

1. WHEN a user clicks "Mark all as read" in the notification dropdown, THE Notification_Service SHALL update all unread notifications for that user to read status
2. THE Platform SHALL provide a notification preferences page where users can enable or disable specific notification types
3. WHEN a user disables a notification type in Notification_Preferences, THE Notification_Service SHALL skip creating in-app notifications of that type for that user
4. THE Notification_Preferences SHALL store preferences per user in the database with default values of enabled for all notification types
5. WHEN a user updates notification preferences, THE Platform SHALL apply the changes immediately to subsequent notifications without requiring a logout

### Requirement 7: Admin Availability Slot Management

**User Story:** As an admin, I want to view and delete doctor availability slots, so that I can manage scheduling when doctors are unavailable or have scheduling conflicts.

#### Acceptance Criteria

1. WHILE an Admin is logged in, THE Availability_Manager SHALL display a list of all doctor availability slots with doctor name, date, start time, end time, and booking status
2. THE Availability_Manager SHALL allow an Admin to filter availability slots by doctor name and date range
3. WHEN an Admin selects a single availability slot for deletion, THE Availability_Manager SHALL display a confirmation dialog showing the slot details and any associated booked appointment
4. WHEN an Admin confirms deletion of an availability slot that has no booked appointment, THE Availability_Manager SHALL remove the slot from the database
5. WHEN an Admin selects multiple availability slots for a doctor for bulk deletion, THE Availability_Manager SHALL display a confirmation dialog listing all selected slots and the total number of affected appointments
6. WHEN an Admin confirms bulk deletion of availability slots, THE Availability_Manager SHALL process all deletions in a single database transaction

### Requirement 8: Availability Deletion Cascade

**User Story:** As an admin, I want appointments to be automatically cancelled when I delete an availability slot, so that patients and doctors are properly notified and the schedule remains consistent.

#### Acceptance Criteria

1. WHEN an Admin deletes an availability slot that has a booked appointment, THE Cascade_Handler SHALL automatically cancel the associated appointment by setting the appointment status to "cancelled"
2. WHEN the Cascade_Handler cancels an appointment due to slot deletion, THE Cascade_Handler SHALL release the slot booking and remove the slot from the database within the same database transaction
3. WHEN the Cascade_Handler cancels an appointment due to slot deletion, THE Notification_Service SHALL create a notification for the Patient indicating the appointment was cancelled due to schedule changes
4. WHEN the Cascade_Handler cancels an appointment due to slot deletion, THE Notification_Service SHALL create a notification for the Doctor indicating the appointment was cancelled due to an admin action on the availability slot
5. IF a bulk deletion includes slots with booked appointments, THEN THE Cascade_Handler SHALL cancel all affected appointments, notify all affected patients and doctors, and remove all selected slots in a single database transaction
6. IF the cascade transaction fails, THEN THE Availability_Manager SHALL roll back all changes and display an error message indicating the deletion could not be completed

### Requirement 9: Doctor Profile

**User Story:** As a doctor, I want to maintain a detailed professional profile, so that patients can learn about my qualifications and expertise before booking.

#### Acceptance Criteria

1. THE Platform SHALL store Doctor_Profile data including specialization, qualifications, bio, phone number, consultation fee, and years of experience in a dedicated profile table linked to the user record
2. WHEN a Doctor accesses the Profile_Settings page, THE Platform SHALL display the current Doctor_Profile data in an editable form
3. WHEN a Doctor submits updated profile information, THE Platform SHALL validate all fields and save the changes to the database
4. IF a Doctor submits a profile update with invalid data (empty specialization, negative consultation fee, negative years of experience), THEN THE Platform SHALL reject the update and display field-level validation errors
5. THE Platform SHALL display Doctor_Profile information (specialization, years of experience, consultation fee) on doctor cards visible to Patients during the appointment booking flow
6. WHEN an Admin views a Doctor's user details, THE Platform SHALL display the full Doctor_Profile information

### Requirement 10: Patient Profile

**User Story:** As a patient, I want to maintain my personal and medical information, so that doctors have relevant context for my consultations.

#### Acceptance Criteria

1. THE Platform SHALL store Patient_Profile data including date of birth, gender, phone number, address, emergency contact name, emergency contact phone, blood type, allergies, and medical history notes in a dedicated profile table linked to the user record
2. WHEN a Patient accesses the Profile_Settings page, THE Platform SHALL display the current Patient_Profile data in an editable form
3. WHEN a Patient submits updated profile information, THE Platform SHALL validate all fields and save the changes to the database
4. IF a Patient submits a profile update with an invalid date of birth (future date) or invalid phone number format, THEN THE Platform SHALL reject the update and display field-level validation errors
5. WHEN a Doctor views appointment details for a Patient, THE Platform SHALL display the Patient_Profile medical information (blood type, allergies, medical history notes) in a read-only panel
6. WHEN an Admin views a Patient's user details, THE Platform SHALL display the full Patient_Profile information

### Requirement 11: Profile Photo Upload

**User Story:** As a user, I want to upload a profile photo, so that other users can identify me visually on the platform.

#### Acceptance Criteria

1. WHEN a user uploads a profile photo on the Profile_Settings page, THE Platform SHALL accept image files in JPEG, PNG, or WebP format with a maximum file size of 5 MB
2. WHEN a valid profile photo is uploaded, THE Platform SHALL resize the image to a maximum dimension of 256x256 pixels and upload the processed image to the Profile_Photo_Store (MinIO)
3. WHEN a profile photo is successfully stored, THE Platform SHALL update the user's image field in the database with the MinIO object key
4. WHEN a user's profile photo is requested for display, THE Platform SHALL generate a pre-signed URL from the Profile_Photo_Store to serve the image
5. IF a user uploads a new profile photo while an existing photo is stored, THEN THE Platform SHALL delete the previous photo from the Profile_Photo_Store before storing the new photo
6. IF the Profile_Photo_Store is unavailable during upload, THEN THE Platform SHALL return an error message indicating that photo upload is temporarily unavailable

### Requirement 12: Profile Settings Page

**User Story:** As a user, I want a dedicated settings page to manage my profile, so that I can update my information from a single location.

#### Acceptance Criteria

1. THE Platform SHALL provide a Profile_Settings page accessible from the dashboard sidebar navigation for all authenticated users
2. WHEN a Doctor accesses the Profile_Settings page, THE Platform SHALL display sections for personal information (name, email), professional information (specialization, qualifications, bio, phone, consultation fee, years of experience), profile photo, and notification preferences
3. WHEN a Patient accesses the Profile_Settings page, THE Platform SHALL display sections for personal information (name, email), medical information (date of birth, gender, phone, address, emergency contact, blood type, allergies, medical history notes), profile photo, and notification preferences
4. WHEN a user saves profile changes, THE Platform SHALL display a success confirmation message
5. IF a save operation fails due to a server error, THEN THE Platform SHALL display an error message and preserve the user's unsaved form data

### Requirement 13: Doctor Profile Cards in Booking Flow

**User Story:** As a patient, I want to see doctor profile information when booking, so that I can make an informed choice about which doctor to consult.

#### Acceptance Criteria

1. WHEN a Patient views the list of available doctors during the booking flow, THE Platform SHALL display a profile card for each Doctor showing the doctor's name, profile photo, specialization, years of experience, and consultation fee
2. IF a Doctor has not completed the Doctor_Profile, THEN THE Platform SHALL display the doctor's name with a "Profile not yet completed" label and omit the missing profile fields
3. WHEN a Patient selects a Doctor from the booking flow, THE Platform SHALL display the full Doctor_Profile (bio, qualifications, specialization, years of experience, consultation fee) on the slot selection step

### Requirement 14: Profile Data Schema

**User Story:** As a developer, I want well-defined database tables for profile data, so that profile information is stored consistently and linked to user records.

#### Acceptance Criteria

1. THE Platform SHALL define a `doctor_profiles` table with columns for user_id (foreign key to users), specialization, qualifications, bio, phone, consultation_fee, years_of_experience, created_at, and updated_at using Drizzle ORM schema definitions
2. THE Platform SHALL define a `patient_profiles` table with columns for user_id (foreign key to users), date_of_birth, gender, phone, address, emergency_contact_name, emergency_contact_phone, blood_type, allergies, medical_history_notes, created_at, and updated_at using Drizzle ORM schema definitions
3. THE Platform SHALL define a `notification_preferences` table with columns for user_id (foreign key to users), notification_type, enabled (boolean default true), created_at, and updated_at using Drizzle ORM schema definitions
4. THE Platform SHALL enforce a one-to-one relationship between users and doctor_profiles via a unique constraint on user_id
5. THE Platform SHALL enforce a one-to-one relationship between users and patient_profiles via a unique constraint on user_id
