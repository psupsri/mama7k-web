# 7K Re Community — Web client

React + TypeScript + Vite. Talks to the Go API in `../api`; in development Vite proxies `/api` and `/media` to it.

## Run

```bash
docker compose up -d db                       # repo root: PostgreSQL on :5433
(cd api && go run ./cmd/seed)                 # sample users + groups (password123); add -sample for game data
(cd api && go run ./cmd/server)               # API on :8787
cd web && npm install && npm run dev          # http://localhost:5173
```

`API_URL` overrides the proxy target (default `http://localhost:8787`).

```bash
npm test         # unit tests for pure helpers (business rules are tested in the Go API)
npm run build
```

## Dev login

In development a **Dev** button (bottom left) signs in as any seeded user, to check what each one can see:

| User | Username | Role | Groups |
| --- | --- | --- | --- |
| Pisit | pisit | SUPER_ADMIN | owner กิลด์มาม่า, member Night Raid |
| หมีน้อย | mee | USER | member กิลด์มาม่า |
| ShadowBlade | shadow | MODERATOR | owner Night Raid |
| สายฟ้า | fah | USER | owner ห้องลับสายฟ้า |
| โดนแบน | banned | USER (suspended) | — |

In production the Go API serves the built app (`npm run build` → `dist/`) from the same origin; see the root
`Dockerfile`.

## Structure

```
src/
  api/         one module per API area; client.ts wraps fetch and API errors
  types/       domain types, kept in sync with api/internal/app/domain.go
  hooks/       React Query hooks and toast hook
  components/  UI building blocks (Formation, FormationEditor, ImageSlot, BuildCard, VotePanel, ...)
  pages/       routes; pages/admin = Admin + Master Data
```
