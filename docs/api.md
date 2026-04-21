# API specifikacija

Interni API: **tRPC** (`/api/trpc/*`). OpenAPI/Swagger auto-generisan iz `src/server/router.ts` kroz `trpc-to-openapi` i serviran na `/api/docs` (samo Admin u produkciji).

## Konvencije

- JSON body; kursor paginacija gde je izvodljiva (`take` + `cursor`); offset inače.
- Greške: `{ code, message, details? }`; kodovi iz `src/server/errors.ts` (`VALIDATION`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMIT`).
- Zod validacija svake procedure.
- Svaki write prolazi kroz audit log middleware.

## Routers (groupe)

- `auth` — login, 2FA setup/verify, logout, refresh.
- `users` — list, create, update, disable (Admin).
- `roles` — list, setPermissions (Admin).
- `partners` — CRUD, search, lifecycle statusa.
- `contacts` — CRUD, setPrimary, pseudonymize (GDPR).
- `activities` — list per entity, create, update outcome.
- `opportunities` — CRUD, setStage (side-effect: hold na MediaBook), convertToCampaign.
- `pipeline` — getKanban, getFunnel, saveFilter.
- `dashboard` — today, kpis, hotItems.
- `campaigns` — CRUD, setStatus, cancel (oslobađa pozicije).
- `vehicles` — CRUD, listFree(filter).
- `positions` — CRUD.
- `mediabook` — getGrid(from,to,country), setHold, conflictCheck.
- `invoices` — CRUD, storno, listAging.
- `handoff` — triggerBatch(country, period), listBatches.
- `reports` — pipeline, winRate, cycleDuration, inventoryUtilization, top10, aging.
- `gdpr` — rightToErasure, rightToAccess, listProcessing.
- `audit` — query(filters).
- `notifications` — list, markRead, updatePrefs.

## Sessions

- Cookie `img.sid` (HttpOnly, Secure, SameSite=Lax); trajanje konfigurabilno.
- 2FA (TOTP) obavezno za Admin/Finance/CountryManager (PZ 4.1).
- Rate limit login-a: 5 pokušaja / 15 min / IP.
