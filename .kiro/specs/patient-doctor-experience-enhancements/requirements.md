# Requirements Document

## Introduction

Patient & Doctor Experience Enhancements extends the MediConnect Virtual Clinic platform with features that improve the day-to-day experience for both patients and doctors. The enhancements cover six areas: (1) a dedicated prescription history page where patients can browse, view details, and download past prescriptions; (2) a pre-appointment patient profile view so doctors can review medical context before consultations; (3) enhanced public-facing doctor profile pages with detailed qualifications, bio, and reviews; (4) doctor search with filtering by name, specialization, and availability; (5) doctor categorization and specialization browsing; and (6) additional experience improvements including appointment history with consultation notes, a medical records timeline, and a doctor ratings/reviews system.

These features build on the existing infrastructure: the `doctorProfiles` and `patientProfiles` tables already store extended profile data, the `prescriptions` table and PDF generation/download pipeline already exist, and the `visit-history` component already shows completed appointments with prescription details in a dialog. The enhancements focus on surfacing this data through dedicated pages, adding search/filter capabilities, and introducing new features like reviews and medical timelines.

## Glossary

- **Platform**: The MediConnect Virtual Clinic web application built with Next.js 14 App Router
- **Patient**: A registered user with the "patient" role who books appointments and receives care
- **Doctor**: A registered user with the "doctor" role who provides consultations and writes prescriptions
- **Admin**: A registered user with the "admin" role who manages platform operations
- **Prescription_History_Page**: The patient-facing page that lists all past prescriptions with filtering and download capabilities
- **Prescription_Detail_View**: The detailed view of a single prescription showing medications, dosage, doctor info, and download option
- **Patient_Profile_Viewer**: The read-only view of a patient's medical profile accessible to doctors before and during appointments
- **Doctor_Profile_Page**: The public-facing detailed profile page for a doctor, accessible to patients
- **Doctor_Search**: The search and filtering system that allows patients to find doctors by name, specialization, or availability
- **Specialization_Browser**: The categorized browsing interface that groups doctors by medical specialization
- **Appointment_History**: The enhanced appointment history view showing past consultations with notes and outcomes
- **Medical_Timeline**: The chronological timeline view of a patient's medical interactions on the platform
- **Review_System**: The ratings and reviews system where patients can rate doctors after completed consultations
- **Doctor_Card**: The summary card component displaying doctor information in search results and browsing views
- **Dashboard**: The role-specific landing page shown after login for patients, doctors, and admins

## Requirements

### Requirement 1: Patient Prescription History Page

**User Story:** As a patient, I want a dedicated page listing all my past prescriptions, so that I can easily find and review medications prescribed to me.

#### Acceptance Criteria

1. WHEN a Patient navigates to the Prescription_History_Page, THE Platform SHALL display a list of all prescriptions associated with the Patient's completed appointments, ordered by creation date descending
2. THE Prescription_History_Page SHALL display each prescription entry with the doctor name, appointment date, number of medications, and creation date
3. WHEN a Patient clicks on a prescription entry in the list, THE Platform SHALL navigate to the Prescription_Detail_View for that prescription
4. WHEN the Patient has no prescriptions, THE Prescription_History_Page SHALL display an empty state message indicating no prescriptions are available
5. IF the Patient is not authenticated or does not have the "patient" role, THEN THE Platform SHALL redirect the user to the login page

### Requirement 2: Prescription Detail View

**User Story:** As a patient, I want to view the full details of a prescription including all medications and dosage instructions, so that I can follow my treatment plan accurately.

#### Acceptance Criteria

1. WHEN a Patient opens the Prescription_Detail_View, THE Platform SHALL display the prescription medications in a table with columns for medication name, dosage, frequency, and duration
2. WHEN the prescription includes doctor notes, THE Prescription_Detail_View SHALL display the notes in a dedicated section below the medications table
3. WHEN the prescription has an associated PDF file, THE Prescription_Detail_View SHALL display a "Download PDF" button that initiates a download of the prescription document from MinIO storage
4. THE Prescription_Detail_View SHALL display the prescribing doctor's name, appointment date, and prescription creation date in a summary header
5. IF the prescription PDF is not available (pdfKey is null), THEN THE Prescription_Detail_View SHALL hide the download button and display a notice that the PDF is not available
6. IF the MinIO storage is unavailable during a download request, THEN THE Platform SHALL display an error message indicating the file storage is temporarily unavailable

### Requirement 3: Pre-Appointment Patient Profile View for Doctors

**User Story:** As a doctor, I want to view a patient's medical profile before an appointment begins, so that I can prepare for the consultation with relevant medical context.

#### Acceptance Criteria

1. WHEN a Doctor views an upcoming or confirmed appointment on the Doctor's appointments page, THE Platform SHALL display a "View Patient Profile" action for that appointment
2. WHEN a Doctor clicks "View Patient Profile", THE Patient_Profile_Viewer SHALL display the patient's name, date of birth, gender, blood type, allergies, emergency contact information, and medical history notes in a read-only format
3. IF the Patient has not completed the Patient_Profile, THEN THE Patient_Profile_Viewer SHALL display the patient's name with a notice indicating the medical profile is incomplete
4. THE Patient_Profile_Viewer SHALL only be accessible to the Doctor assigned to the appointment and to Admin users
5. IF an unauthorized user attempts to access the Patient_Profile_Viewer, THEN THE Platform SHALL return a 403 Forbidden response

### Requirement 4: Enhanced Doctor Profile Page

**User Story:** As a patient, I want to view a detailed doctor profile page before booking, so that I can make an informed decision about which doctor to consult.

#### Acceptance Criteria

1. THE Doctor_Profile_Page SHALL display the doctor's name, profile photo, specialization, qualifications, bio, years of experience, and consultation fee
2. WHEN a Patient navigates to a Doctor_Profile_Page, THE Platform SHALL display the doctor's average rating and total number of reviews from the Review_System
3. WHEN a Doctor has received reviews, THE Doctor_Profile_Page SHALL display the list of reviews with the reviewer's name (or "Anonymous"), rating, review text, and date
4. THE Doctor_Profile_Page SHALL include a "Book Appointment" button that navigates the Patient to the booking flow with the doctor pre-selected
5. IF the Doctor has not completed the Doctor_Profile, THEN THE Doctor_Profile_Page SHALL display the doctor's name and a notice indicating the profile is not yet complete
6. THE Doctor_Profile_Page SHALL be accessible via a public URL in the format `/doctors/[doctorId]` without requiring authentication for viewing basic profile information

### Requirement 5: Doctor Search

**User Story:** As a patient, I want to search for doctors by name, specialization, or other criteria, so that I can quickly find a doctor suited to my needs.

#### Acceptance Criteria

1. THE Doctor_Search SHALL provide a text input field that filters doctors by name or specialization as the Patient types, with a minimum of 2 characters before triggering the search
2. WHEN a Patient enters a search query, THE Doctor_Search SHALL return matching doctors within 500 milliseconds of the last keystroke (debounced)
3. THE Doctor_Search SHALL display results as a list of Doctor_Card components showing the doctor's name, photo, specialization, years of experience, consultation fee, and average rating
4. WHEN no doctors match the search query, THE Doctor_Search SHALL display a message indicating no results were found
5. THE Doctor_Search SHALL allow filtering results by specialization using a dropdown or chip-based filter
6. WHEN a Patient clicks on a Doctor_Card in the search results, THE Platform SHALL navigate to the Doctor_Profile_Page for that doctor

### Requirement 6: Doctor Categorization by Specialization

**User Story:** As a patient, I want to browse doctors grouped by medical specialization, so that I can find a specialist in the area I need.

#### Acceptance Criteria

1. THE Specialization_Browser SHALL display a list of available medical specializations (e.g., Cardiology, Dermatology, Neurology, Pediatrics, Orthopedics, General Practice) as selectable category cards
2. WHEN a Patient selects a specialization category, THE Specialization_Browser SHALL display all doctors with that specialization as Doctor_Card components
3. THE Specialization_Browser SHALL display the count of available doctors next to each specialization category
4. WHEN a specialization category has no doctors, THE Specialization_Browser SHALL display the category with a count of zero and a muted visual style
5. THE Specialization_Browser SHALL derive the list of specializations dynamically from the existing Doctor_Profile data in the database
6. WHEN a Patient selects a doctor from the Specialization_Browser, THE Platform SHALL navigate to the Doctor_Profile_Page for that doctor



### Requirement 7: Enhanced Appointment History

**User Story:** As a patient, I want to view my complete appointment history with consultation notes and outcomes, so that I can track my healthcare journey on the platform.

#### Acceptance Criteria

1. WHEN a Patient navigates to the Appointment_History page, THE Platform SHALL display all past appointments (completed, cancelled, rejected) ordered by scheduled date descending
2. THE Appointment_History SHALL display each appointment with the doctor name, date, time slot, status, and whether visit notes or a prescription are available
3. WHEN a Patient clicks on a completed appointment, THE Platform SHALL display the appointment details including visit notes content and prescription summary in an expandable detail view
4. THE Appointment_History SHALL allow filtering appointments by status (completed, cancelled, rejected) using a tab or dropdown filter
5. WHEN a Patient clicks on a prescription link within the Appointment_History detail view, THE Platform SHALL navigate to the Prescription_Detail_View for that prescription
6. WHEN the Patient has no past appointments, THE Appointment_History SHALL display an empty state message encouraging the Patient to book a consultation

### Requirement 8: Patient Dashboard Improvements

**User Story:** As a patient, I want a dashboard that gives me a quick overview of my upcoming appointments, recent prescriptions, and health summary, so that I can stay on top of my healthcare.

#### Acceptance Criteria

1. WHEN a Patient accesses the Dashboard, THE Platform SHALL display a summary section showing the count of upcoming appointments, total completed consultations, and total prescriptions
2. THE Dashboard SHALL display the next upcoming appointment (if any) with the doctor name, date, time, and a quick action to join the waiting room or view details
3. THE Dashboard SHALL display the three most recent prescriptions with the doctor name, date, and a link to the Prescription_Detail_View
4. THE Dashboard SHALL display a "Quick Book" action that navigates the Patient to the Doctor_Search page
5. WHEN the Patient has no upcoming appointments, THE Dashboard SHALL display a prompt to book a new appointment with a link to the booking flow

### Requirement 9: Doctor Ratings and Reviews

**User Story:** As a patient, I want to rate and review doctors after my consultation, so that I can share my experience and help other patients make informed choices.

#### Acceptance Criteria

1. WHEN a Patient has a completed appointment with a Doctor, THE Review_System SHALL allow the Patient to submit a rating (1 to 5 stars) and an optional text review for that Doctor
2. THE Review_System SHALL enforce that a Patient can submit only one review per completed appointment
3. WHEN a Patient submits a review, THE Review_System SHALL store the rating, review text, patient ID, doctor ID, and appointment ID in the database
4. THE Review_System SHALL calculate and store the Doctor's average rating based on all reviews received by that Doctor
5. IF a Patient attempts to submit a review for an appointment that is not completed, THEN THE Review_System SHALL reject the submission with an error message indicating reviews are only allowed for completed appointments
6. IF a Patient attempts to submit a review for an appointment that already has a review, THEN THE Review_System SHALL reject the submission with an error message indicating a review already exists for that appointment
7. WHEN a Doctor views the Doctor's own profile, THE Platform SHALL display the average rating and total review count

### Requirement 10: Medical Records Timeline

**User Story:** As a patient, I want to see a chronological timeline of all my medical interactions, so that I can have a unified view of my healthcare history on the platform.

#### Acceptance Criteria

1. WHEN a Patient navigates to the Medical_Timeline page, THE Platform SHALL display a chronological list of medical events including appointments, prescriptions, and visit notes ordered by date descending
2. THE Medical_Timeline SHALL display each event with an icon indicating the event type (appointment, prescription, visit note), the date, and a brief summary
3. WHEN a Patient clicks on a timeline event, THE Platform SHALL navigate to the relevant detail view (appointment detail, Prescription_Detail_View, or visit notes)
4. THE Medical_Timeline SHALL support filtering by event type (appointments, prescriptions, visit notes) using toggle filters
5. WHEN the Patient has no medical events, THE Medical_Timeline SHALL display an empty state message indicating no medical records are available

### Requirement 11: Doctor Search API

**User Story:** As a developer, I want a search API endpoint for doctors that supports filtering and pagination, so that the frontend can efficiently query and display doctor results.

#### Acceptance Criteria

1. THE Platform SHALL provide a GET endpoint at `/api/doctors/search` that accepts query parameters for search text, specialization filter, and pagination (page, limit)
2. WHEN a search text parameter is provided, THE endpoint SHALL return doctors whose name or specialization contains the search text (case-insensitive partial match)
3. WHEN a specialization filter parameter is provided, THE endpoint SHALL return only doctors whose specialization matches the filter value exactly
4. THE endpoint SHALL return paginated results with a default page size of 12 and include the total count of matching doctors in the response
5. THE endpoint SHALL return each doctor with the fields: id, name, photoUrl, specialization, qualifications, yearsOfExperience, consultationFee, averageRating, and reviewCount
6. WHEN no query parameters are provided, THE endpoint SHALL return all active doctors with completed profiles, paginated

### Requirement 12: Reviews Data Schema

**User Story:** As a developer, I want a well-defined database table for doctor reviews, so that review data is stored consistently and linked to appointments and users.

#### Acceptance Criteria

1. THE Platform SHALL define a `reviews` table with columns for id (uuid primary key), appointment_id (foreign key to appointments, unique), patient_id (foreign key to users), doctor_id (foreign key to users), rating (integer 1-5), review_text (text, nullable), created_at (timestamptz), and updated_at (timestamptz) using Drizzle ORM schema definitions
2. THE Platform SHALL enforce a unique constraint on appointment_id in the reviews table to prevent duplicate reviews per appointment
3. THE Platform SHALL add an `average_rating` column (numeric, precision 3, scale 2, nullable) and a `review_count` column (integer, default 0) to the `doctor_profiles` table to cache aggregated review data
4. WHEN a new review is submitted, THE Platform SHALL recalculate the Doctor's average_rating and review_count in the doctor_profiles table within the same database transaction

### Requirement 13: Specializations API

**User Story:** As a developer, I want an API endpoint that returns available specializations with doctor counts, so that the frontend can render the specialization browser dynamically.

#### Acceptance Criteria

1. THE Platform SHALL provide a GET endpoint at `/api/specializations` that returns a list of distinct specializations from the doctor_profiles table
2. THE endpoint SHALL return each specialization with the count of active doctors who have that specialization
3. THE endpoint SHALL order specializations alphabetically
4. WHEN no doctors have any specialization set, THE endpoint SHALL return an empty array
