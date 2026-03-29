# MediConnect — Virtual Clinic Platform

A full-stack telemedicine platform built with Next.js, featuring real-time video consultations, appointment booking, digital prescriptions, and a polished kiosk-style UI. Designed for patients, doctors, and administrators.

![Next.js](https://img.shields.io/badge/Next.js-latest-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwindcss)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)
![Tests](https://img.shields.io/badge/Tests-674_passing-brightgreen)

---

## What This Project Does

MediConnect is a production-ready virtual clinic that connects patients with doctors through a modern web interface. It handles the complete healthcare workflow — from finding a doctor and booking an appointment, to joining a live video consultation, receiving a digital prescription, and leaving a review.

### For Patients
- Browse doctors by specialization, view profiles and reviews
- Book appointments with real-time availability
- Join video consultations directly in the browser (WebRTC)
- Wait in a live waiting room with queue position updates
- Receive and download digital prescriptions as PDF
- Track medical history via a timeline view
- Get real-time notifications (SSE) for appointment updates

### For Doctors
- Manage availability slots and appointment schedule
- Accept or reject appointment requests
- Conduct video consultations with patients
- Write visit notes during consultations (rich text editor)
- Issue digital prescriptions with medication details
- View patient profiles and medical history during calls

### For Administrators
- Platform analytics dashboard with consultation trends
- User management (activate/deactivate accounts)
- Appointment oversight with status filtering
- Availability slot management with bulk operations

---

## Tech Stack

| Layer            | Technology                                                    |
|------------------|---------------------------------------------------------------|
| Frontend         | Next.js (App Router), React 19, TypeScript 5                 |
| Styling          | Tailwind CSS 4, Radix UI, Framer Motion, custom SVG illustrations |
| Authentication   | better-auth (email/password, session-based)                   |
| Database         | PostgreSQL 16 with Drizzle ORM                                |
| Video Calls      | LiveKit (WebRTC) with connection quality monitoring           |
| File Storage     | MinIO (S3-compatible) for photos and prescription PDFs        |
| Notifications    | Server-Sent Events (SSE) for real-time updates                |
| PDF Generation   | pdf-lib for prescription documents                            |
| Validation       | Zod schemas (shared client/server)                            |
| Testing          | Vitest, Testing Library, fast-check (property-based testing)  |
| Deployment       | Docker multi-stage builds (Node.js & Bun), Docker Compose     |

---

## Features at a Glance

- **Role-based access** — Three distinct dashboards for patients, doctors, and admins
- **Video consultations** — WebRTC via LiveKit with reconnection handling, quality monitoring, and connection state machine
- **Appointment workflow** — Full lifecycle: book → pending → confirmed → consultation → completed
- **Waiting room** — Real-time queue position with animated UI and doctor-ready notifications
- **Digital prescriptions** — Structured medication data with PDF generation and download
- **Doctor search** — Text search + specialization browser with doctor profiles and reviews
- **Real-time notifications** — SSE-based notification system with preferences management
- **Profile management** — Photo upload (with server-side processing via Sharp), medical/professional profiles
- **Kiosk-style UI** — Custom healthcare color palette, 14 inline SVG illustrations, touch-friendly targets (44px minimum), entrance animations
- **Dark mode** — Full dark mode support via CSS custom properties
- **674 automated tests** — Unit tests, property-based tests (fast-check), and integration tests
- **Docker-ready** — Multi-stage builds for both Node.js and Bun runtimes

---

## Quick Start

### Prerequisites

- Node.js 20+ and npm
- Docker & Docker Compose

### Setup

```bash
# Clone the repo
git clone <repo-url>
cd mediconnect

# Install dependencies
npm install

# Start infrastructure (PostgreSQL, LiveKit, MinIO)
docker compose up postgres livekit minio -d

# Configure environment
cp .env.example .env

# Set up database and seed demo data
npm run db:push
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with any demo account (password: `Password123!`):

| Role    | Email                      |
|---------|----------------------------|
| Admin   | admin@mediconnect.demo     |
| Doctor  | dr.carter@mediconnect.demo |
| Patient | alex@example.demo          |

### Run with Docker (full stack)

```bash
docker compose up nextjs-standalone --build
```

---

## Screenshots & Pages

| Page | Description |
|------|-------------|
| `/` | Landing page with hero section, feature cards, and trust indicators |
| `/login`, `/register` | Split-panel auth pages with illustrations |
| `/patient` | Patient dashboard with health overview and quick actions |
| `/patient/book` | 3-step booking flow (select doctor → pick slot → confirm) |
| `/patient/waiting-room/[id]` | Animated waiting room with queue position |
| `/consultation/[id]` | Live video consultation with WebRTC |
| `/doctor/appointments` | Doctor appointment management with accept/reject |
| `/doctor/prescriptions/[id]` | Prescription creation with medication builder |
| `/admin/analytics` | Platform analytics with charts and stats |
| `/admin/users` | User management with profile expansion |
| `/doctors/search` | Doctor search with specialization browser |
| `/doctors/[id]` | Doctor profile with reviews and trust indicators |
| `/settings` | Profile, photo upload, and notification preferences |

---

## Project Structure

```
app/                    # Next.js App Router (pages + API routes)
components/             # React components organized by feature
├── illustrations/      # 14 custom SVG illustration components
├── consultation/       # Video room, waiting room, notes panel
├── appointments/       # Booking stepper, appointment lists
└── ui/                 # shadcn/ui primitives
lib/                    # Shared utilities, auth, DB, validators
__tests__/              # Unit, property-based, and integration tests
```

---

## Testing

```bash
npm run test          # Run all 674 tests
npm run test:watch    # Watch mode
```

The test suite includes:
- Unit tests for all pages and components
- Property-based tests (fast-check) for illustration library, form touch targets, card styling, booking flow, and empty states
- Integration tests for booking flow, consultation flow, prescription flow, and more

---

## Deployment

The app ships with Docker multi-stage builds optimized for production. See [DEPLOYMENT.md](./DEPLOYMENT.md) for a complete VPS deployment guide with Nginx, SSL, and database management.

```bash
# Node.js runtime
docker compose up nextjs-standalone --build -d

# Bun runtime
docker compose up nextjs-standalone-with-bun --build -d
```

---

## Documentation

- [DEVELOPMENT.md](./DEVELOPMENT.md) — Local development setup, scripts, project structure
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Production deployment on VPS with Docker, Nginx, SSL

---

## License

This project is proprietary. All rights reserved.
