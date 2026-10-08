# Trading CRM — Standalone Frontend

A standalone Vue 3 SPA extracted from the Laravel/Inertia CRM
(`trading-crm-v2`). It talks to the **unchanged** backend over the existing
`/api/v1` REST contract (`{ code, msg, data }` envelope) using Sanctum
bearer-token auth. The original Laravel/Inertia app is untouched and keeps
working as-is.

## Stack

Vue 3 · Vue Router · Pinia · TanStack Vue Query · Tailwind CSS 4 · Reka UI ·
vue-sonner · Vite 7 · TypeScript.

## Quick start

```bash
cp .env.example .env        # then set VITE_API_URL to your backend
npm install
npm run dev                 # http://localhost:5173
```

## Environment

| Variable                    | Required | Example                     | Purpose                                   |
| --------------------------- | -------- | --------------------------- | ----------------------------------------- |
| `VITE_API_URL`              | yes      | `http://localhost/api/v1`   | Absolute backend API base (incl. version) |
| `VITE_APP_NAME`             | no       | `BPPrime CRM`        | Document/tab title                        |
| `VITE_API_WITH_CREDENTIALS` | no       | `false`                     | `true` only for Sanctum cookie auth       |

## Commands

| Command              | Description                          |
| -------------------- | ------------------------------------ |
| `npm run dev`        | Dev server with HMR (port 5173)      |
| `npm run build`      | Production build → `dist/`           |
| `npm run preview`    | Preview the production build locally |
| `npm run type-check` | `vue-tsc` strict type check          |

## How the Inertia → Vue Router migration works

The codebase was already API-driven (all data via `/api/v1`); Inertia was only
a routing/navigation shell. Rather than rewrite ~50 components, Inertia's thin
surface (`Link`, `router`, `usePage`) is re-implemented on top of Vue Router in
`src/shims/inertia.ts`, and `@inertiajs/vue3` is **aliased** to that shim in
`vite.config.ts` + `tsconfig.json`. Inertia is no longer a dependency; all
navigation is real client-side Vue Router routing. The route table in
`src/router/index.ts` mirrors the former `routes/web.php` one-for-one.

Call sites can be progressively codemodded to native `<RouterLink>` /
`useRouter()` / `useRoute()`, after which the shim can be deleted.

## Production deployment

Serve `dist/` as static files with an SPA history fallback (rewrite unknown
paths to `/index.html`), e.g. nginx `try_files $uri /index.html;`. Ensure the
backend's CORS policy allows the SPA origin (Laravel's default `api/*` +
`origins: *` already permits bearer-token requests).
