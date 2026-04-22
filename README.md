# IMG CRM Platform

CRM + Inventar Transit Media + Finansijski Handoff + Multi-country platforma za Info Media Group.

## Brzi start

```bash
# 1. Kopiraj env
cp .env.example .env

# 2. Pokreni PostgreSQL (ako već nije)
#    macOS: brew services start postgresql@16
#    Docker: docker compose up -d db

# 3. Instaliraj zavisnosti
npm install

# 4. Pokreni migracije i seed
npx prisma migrate dev --name init
npm run seed

# 5. Pokreni dev server
npm run dev
```

App na http://localhost:3000

## Testovi

```bash
npm test           # unit + integration (vitest)
npm run test:e2e   # Playwright e2e
npm run lint
npm run typecheck
```

## Seed nalozi (razvoj)

Svi sa lozinkom `Passw0rd!` (samo za razvoj).

| Email | Rola | Pravno lice |
|---|---|---|
| admin@img.test | Admin | IMG MNE |
| rep.mne@img.test | Sales Rep | IMG MNE |
| manager.mne@img.test | Sales Manager | IMG MNE |
| country.mne@img.test | Country Manager | IMG MNE |
| finance.mne@img.test | Finance | IMG MNE |
| rep.srb@img.test | Sales Rep | IMG SRB |
| country.srb@img.test | Country Manager | IMG SRB |
| readonly@img.test | Read-only | IMG MNE |

## Struktura

Vidi `docs/` za detaljnu dokumentaciju:
- `docs/domain-model.md` — entiteti, ERD
- `docs/api.md` — API specifikacija
- `docs/rbac-matrix.md` — matrica dozvola
- `docs/adr/` — Architecture Decision Records
- `docs/uat/` — UAT plan i scenariji
- `docs/plans/` — milestone planovi

## Milestones

Vidi CLAUDE.md (poglavlje 13) za plan rada i `docs/plans/` za detalje svakog milestone-a.

| M | Status | Kratak opis |
|---|---|---|
| M0 | ✅ | Bootstrap (stack, docker-compose, ADR-ovi, CI) |
| M1 | ✅ | Autentifikacija + RBAC + Admin |
| M2 | ✅ | Partneri + kontakti + aktivnosti |
| M3 | ✅ | Opportunity + Pipeline + Lost reason |
| M4 | ✅ | Vozila + pozicije + MediaBook |
| M5 | ✅ | Kampanje + konverzija |
| M6 | ✅ | Dokumenti + finansijski handoff |
| M7 | ✅ | Dashboard + KPI + izveštaji (CSV + XLSX export) |
| M8 | ✅ | Multi-country izolacija |
| M9 | ✅ | GDPR + audit log + notifikacije |
| M10 | ✅ | i18n (6 jezika) + notifikacije cron |
| M11 | ✅ | Hardening (middleware auth + CSP, XLSX/PDF, retention cron, k6, dependabot, UAT verifier) |

## Licence

Proprietary — Info Media Group.
