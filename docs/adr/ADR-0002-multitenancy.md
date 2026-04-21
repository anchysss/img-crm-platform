# ADR-0002 — Multi-tenancy (multi-country izolacija)

- Status: Accepted
- Datum: 2026-04-21
- Kontekst: PZ poglavlje 4.14 i 6 (PostgreSQL multi-schema vs. tenant kolone)

## Odluka

**Shared database, shared schema, diskriminator kolona `pravnoLiceId` na svim domenskim tabelama + obavezni RLS-like filter u servisnom sloju.**

## Razlozi

- Jedan schema olakšava migracije i CI (PZ DoD 14.3 traži reverzibilne migracije).
- Country Manager i Admin (sa eksplicitnim preklapanjem) mogu lakše generisati konsolidovane izveštaje (PZ 4.14) bez cross-schema upita.
- Plan backupa (PZ 5) je jednostavniji za jednu bazu.

## Izolacija

Svaki upit prolazi kroz `withTenant(ctx, query)` helper (`src/server/tenant.ts`) koji:
1. Izvlači `pravnoLiceId` iz sesije.
2. Proverava da korisnik ima rolu za taj tenant u `KorisnikRola`.
3. Prepušta upit samo ako Prisma `where` sadrži `pravnoLiceId = tenant.id` (ili Admin override eksplicitno zahtevan).
4. Beleži override u audit log (PZ 4.16).

E2E test iz PZ 12.5 verifikuje da korisnik MNE ne vidi partnere SRB.

## Alternative (odbijene)

- PostgreSQL schema-per-tenant: odlična izolacija, ali 4× više migracija, komplikacija za konsolidovane izveštaje.
- Zasebna baza po zemlji: maksimalna izolacija, neoperativna za konsolidovani dashboard grupe.

## Posledice

- Sve nove Prisma modele treba dodati `pravnoLiceId String` i indeks po toj koloni.
- Obavezna provera u svakoj tRPC proceduri: `ctx.tenant.ensure(input.pravnoLiceId)`.
- Audit log zapisuje svaki Admin override.
