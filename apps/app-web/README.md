# Stravyx App (Next.js)

Next.js port of the Stravyx v.2 Pre-alpha Figma Make export — a platform connecting
customers with drone operators, with real-time job tracking, customer/operator/admin
view modes, and booking flows.

## Stack
- Next.js 14 (App Router) + React 18 + TypeScript
- Tailwind CSS v4 (via `@tailwindcss/postcss`)
- shadcn/ui (Radix primitives) in `src/stravyx/components/ui`

## Getting started
```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm start        # serve production build
```

## Structure
```
app/                    Next.js App Router (layout + entry page)
src/stravyx/            The application (App.tsx is the client entry)
  components/customer/  Customer screens (home, booking, tracking, ...)
  components/operator/  Operator dashboard + navigation
  components/admin/     Admin dashboard
  components/ui/        shadcn/ui component library
src/styles/             Tailwind v4 setup, theme tokens, fonts
src/imports/            Logo / image assets from the Figma export
```

## Migration notes (Vite → Next.js)
- `src/main.tsx` + `index.html` replaced by `app/layout.tsx` / `app/page.tsx`;
  page metadata moved into the Next `metadata` export.
- `src/app` renamed to `src/stravyx` to avoid clashing with the App Router directory;
  all internal imports were already relative, so no component changes were needed.
- `App.tsx` is marked `"use client"` — the whole tree runs as a client component,
  matching the original SPA behaviour. It still prerenders statically.
- Tailwind v4 switched from `@tailwindcss/vite` to `@tailwindcss/postcss`;
  `@source` globs updated to scan both `src/` and `app/`.
- Unused dependencies from the export (MUI, react-router, react-dnd, react-slick,
  @vis.gl/react-google-maps, etc.) were dropped.
- `next.config.mjs` sets `typescript.ignoreBuildErrors` because the Figma Make
  export was authored without strict type-checking — remove it as you harden types.
