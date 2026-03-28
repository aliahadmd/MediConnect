---
inclusion: always
---

# Project Structure

```
├── app/                  # Next.js App Router directory
│   ├── layout.tsx        # Root layout (HTML shell, fonts, metadata)
│   ├── page.tsx          # Home page (landing/demo page)
│   ├── globals.css       # Global styles and Tailwind config
│   └── favicon.ico
├── public/               # Static assets served at /
│   └── next.svg
├── Dockerfile            # Multi-stage Docker build (Node.js)
├── Dockerfile.bun        # Multi-stage Docker build (Bun)
├── compose.yml           # Docker Compose with Node.js and Bun services
├── app.json              # Cloud Run deployment config
├── next.config.ts        # Next.js config (standalone output)
├── tsconfig.json         # TypeScript config
├── postcss.config.js     # PostCSS / Tailwind v4 plugin
└── package.json          # Dependencies and scripts
```

## Routing

This project uses the Next.js App Router. All routes live under `app/`. Each route is a folder with a `page.tsx` file. Layouts are defined via `layout.tsx` and nest automatically.

## Styling

Tailwind CSS v4 is used via PostCSS. Global theme tokens and CSS custom properties are defined in `app/globals.css`. Use Tailwind utility classes directly in JSX — no separate CSS modules or styled-components.
