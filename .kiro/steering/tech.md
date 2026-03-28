---
inclusion: always
---

# Tech Stack

- **Framework**: Next.js (latest) with App Router
- **Language**: TypeScript 5
- **UI**: React 19, Tailwind CSS 4 (via `@tailwindcss/postcss`)
- **Fonts**: Geist Sans and Geist Mono (via `next/font/google`)
- **Build output**: Standalone mode (`output: "standalone"` in next.config.ts)
- **Containerization**: Docker with multi-stage builds (Node.js 24 slim and Bun 1)
- **Orchestration**: Docker Compose (`compose.yml`)
- **Package manager**: npm (package-lock.json present), pnpm lock also available

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start local dev server |
| `npm run build` | Production build (standalone output) |
| `npm run start` | Start production server |
| `docker compose up nextjs-standalone --build` | Build and run with Node.js |
| `docker compose up nextjs-standalone-with-bun --build` | Build and run with Bun |

## Key Conventions

- No linter or test runner is configured yet — add ESLint/Prettier/Vitest as needed.
- TypeScript strict mode is currently disabled in tsconfig.json.
- PostCSS config uses `@tailwindcss/postcss` plugin (Tailwind v4 style).
- Tailwind theme tokens are defined inline in `globals.css` using `@theme inline`.
