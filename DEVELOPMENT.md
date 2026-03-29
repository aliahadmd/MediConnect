# Development Guide

## Prerequisites

- Node.js 20+ (24 recommended)
- npm
- Docker & Docker Compose (for infrastructure services)
- Git

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd mediconnect
npm install
```

### 2. Start infrastructure services

The app depends on PostgreSQL, LiveKit (WebRTC), and MinIO (S3-compatible storage). Start them all with Docker Compose:

```bash
docker compose up postgres livekit minio -d
```

This starts:
- **PostgreSQL 16** on `localhost:5432` (user: `mediconnect`, password: `mediconnect`)
- **LiveKit** on `localhost:7880` (API key: `devkey`, secret: `secret`)
- **MinIO** on `localhost:9000` (console: `localhost:9001`, user: `minioadmin`, password: `minioadmin`)

### 3. Configure environment

```bash
cp .env.example .env
```

The defaults in `.env.example` match the Docker Compose services — no changes needed for local dev.

### 4. Set up the database

Push the schema to PostgreSQL and seed demo data:

```bash
npm run db:push
npm run db:seed
```

The seed creates 1 admin, 6 doctors, 8 patients with appointments, prescriptions, reviews, and notifications. All demo users share the password: `Password123!`

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo Accounts

| Role    | Email                          | Password      |
|---------|--------------------------------|---------------|
| Admin   | admin@mediconnect.demo         | Password123!  |
| Doctor  | dr.carter@mediconnect.demo     | Password123!  |
| Doctor  | dr.sharma@mediconnect.demo     | Password123!  |
| Patient | alex@example.demo              | Password123!  |
| Patient | maria@example.demo             | Password123!  |

## Available Scripts

| Command               | Description                                    |
|-----------------------|------------------------------------------------|
| `npm run dev`         | Start development server (hot reload)          |
| `npm run build`       | Production build (standalone output)           |
| `npm run start`       | Start production server                        |
| `npm run test`        | Run all tests once                             |
| `npm run test:watch`  | Run tests in watch mode                        |
| `npm run db:generate` | Generate Drizzle migration files               |
| `npm run db:migrate`  | Run pending migrations                         |
| `npm run db:push`     | Push schema directly to database (dev)         |
| `npm run db:seed`     | Seed database with demo data                   |

## Tech Stack

| Layer          | Technology                                          |
|----------------|-----------------------------------------------------|
| Framework      | Next.js (App Router, standalone output)             |
| Language       | TypeScript 5                                        |
| UI             | React 19, Tailwind CSS 4, Radix UI, Framer Motion  |
| Auth           | better-auth (email/password, session-based)         |
| Database       | PostgreSQL 16 via Drizzle ORM                       |
| Video          | LiveKit (WebRTC) with `@livekit/components-react`   |
| Storage        | MinIO (S3-compatible) for profile photos & PDFs     |
| Notifications  | Server-Sent Events (SSE)                            |
| Validation     | Zod                                                 |
| PDF            | pdf-lib (prescription generation)                   |
| Testing        | Vitest, Testing Library, fast-check (PBT)           |

## Project Structure

```
app/                          # Next.js App Router
├── (auth)/                   # Login & registration pages
├── (dashboard)/              # Authenticated pages
│   ├── admin/                # Admin: users, appointments, availability, analytics
│   ├── doctor/               # Doctor: appointments, availability, prescriptions
│   ├── patient/              # Patient: dashboard, booking, history, timeline
│   ├── consultation/         # Video consultation room
│   └── settings/             # Profile & notification settings
├── api/                      # API route handlers
├── doctors/                  # Public doctor search & profile pages
└── page.tsx                  # Landing page

components/                   # React components
├── admin/                    # Admin-specific components
├── appointments/             # Booking stepper, appointment lists
├── auth/                     # Login & register forms
├── consultation/             # Video room, waiting room, notes panel
├── dashboard/                # Patient dashboard content
├── doctors/                  # Specialization browser
├── illustrations/            # 14 inline SVG illustration components
├── layout/                   # Sidebar, header
├── prescriptions/            # Prescription cards & list
├── profiles/                 # Profile forms, photo upload, doctor card
├── reviews/                  # Rating stars, review cards
├── settings/                 # Notification preferences
├── timeline/                 # Timeline events
└── ui/                       # shadcn/ui primitives (Button, Card, Input, etc.)

lib/                          # Shared utilities
├── animation-variants.ts     # Framer Motion animation presets
├── auth.ts / auth-client.ts  # better-auth server & client config
├── db/                       # Drizzle schema, migrations, seed
├── validators.ts             # Zod schemas
├── video-state-machine.ts    # Consultation connection state machine
└── utils.ts                  # cn() and helpers

__tests__/
├── unit/                     # Component & page unit tests
├── properties/               # Property-based tests (fast-check)
└── integration/              # API integration tests
```

## Database

Schema is defined in `lib/db/schema.ts` using Drizzle ORM. Key tables:

- `users` — All users (patients, doctors, admins) with role enum
- `doctor_profiles` / `patient_profiles` — Role-specific profile data
- `availability_slots` — Doctor time slots
- `appointments` — Bookings with status workflow (pending → confirmed → completed)
- `prescriptions` — Medications JSON + optional PDF
- `visit_notes` — Doctor notes per appointment
- `reviews` — Patient reviews with ratings
- `notifications` / `notification_preferences` — Real-time notification system

### Schema changes

```bash
# Edit lib/db/schema.ts, then:
npm run db:generate   # Generate migration SQL
npm run db:migrate    # Apply migration
# OR for quick dev iteration:
npm run db:push       # Push schema directly (destructive)
```

## Testing

The project uses Vitest with jsdom environment, Testing Library for component tests, and fast-check for property-based testing.

```bash
# Run all tests
npm run test

# Run specific test file
npx vitest run __tests__/unit/landing-page.test.tsx

# Run property tests only
npx vitest run __tests__/properties/

# Watch mode
npm run test:watch
```

Test config is in `vitest.config.ts`. Path alias `@/` maps to the project root.

## Illustrations

The project includes 14 custom inline SVG illustration components in `components/illustrations/`. They use CSS custom property colors (`hsl(var(--primary))`, `hsl(var(--kiosk-primary))`) so they adapt to light/dark mode automatically. Each accepts `className`, `size`, `decorative`, and `title` props.

## Environment Variables

| Variable              | Description                        | Default (dev)                                    |
|-----------------------|------------------------------------|--------------------------------------------------|
| `DATABASE_URL`        | PostgreSQL connection string       | `postgresql://mediconnect:mediconnect@localhost:5432/mediconnect` |
| `LIVEKIT_URL`         | LiveKit server WebSocket URL       | `ws://localhost:7880`                            |
| `LIVEKIT_API_KEY`     | LiveKit API key                    | `devkey`                                         |
| `LIVEKIT_API_SECRET`  | LiveKit API secret                 | `secret`                                         |
| `MINIO_ENDPOINT`      | MinIO hostname                     | `localhost`                                      |
| `MINIO_PORT`          | MinIO port                         | `9000`                                           |
| `MINIO_ACCESS_KEY`    | MinIO access key                   | `minioadmin`                                     |
| `MINIO_SECRET_KEY`    | MinIO secret key                   | `minioadmin`                                     |
| `BETTER_AUTH_SECRET`  | Auth session encryption secret     | (see .env.example)                               |
| `BETTER_AUTH_URL`     | Public URL for auth callbacks      | `http://localhost:3000`                          |
