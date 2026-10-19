# 7K Re Community — Web client

React + TypeScript + Vite. Talks to the Go API (separate `api` repo); in development Vite proxies `/api` and `/media`
to it, and in production the static host rewrites `/api/*` to it, so the browser always sees one origin.

## Run

```bash
# in the api repo
docker compose up -d db          # PostgreSQL on :5433
go run ./cmd/seed                # sample users + groups (password123); add -sample for game data
go run ./cmd/server              # API on :8787

# here
npm install && npm run dev       # http://localhost:5173
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

Production: a static site built with `npm ci && npm run build` (publish `dist/`) that rewrites `/api/*` to the API
and everything else to `/index.html` — see `docs/deploy.md` in the api repo.

## Structure

```
src/
  api/         one module per API area; client.ts wraps fetch and API errors
  types/       domain types, kept in sync with api/internal/app/domain.go
  hooks/       React Query hooks and toast hook
  components/  UI building blocks (Formation, FormationEditor, ImageSlot, BuildCard, VotePanel, ...)
  pages/       routes; pages/admin = Admin + Master Data
```
