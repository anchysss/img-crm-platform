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

Vidi CLAUDE.md (poglavlje 13) za plan rada.

Trenutno završeno: M0 (bootstrap), M1 (Auth + RBAC foundation), osnovni modeli za M2–M10.

## Licence

Proprietary — Info Media Group.
