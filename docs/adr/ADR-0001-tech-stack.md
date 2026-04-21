# ADR-0001 — Izbor tech stacka

- Status: Accepted
- Datum: 2026-04-21
- Kontekst: PZ poglavlje 6 (tri opcije stacka)

## Odluka

Opcija 1 iz PZ: **Next.js 14 (App Router) + TypeScript + Prisma + PostgreSQL + tRPC + NextAuth + Tailwind + shadcn/ui**.

## Razlozi

- Jedan jezik (TypeScript) na klijentu i serveru → niža kognitivna opterećenost; jedinstveni tipovi domena (Zod + Prisma generisani tipovi + tRPC type safety end-to-end).
- App Router + Server Components → informaciono-gusti ekrani (Pipeline, MediaBook) se renderuju na serveru sa minimalnim JS payload-om → zadovoljava NFR dashboard < 1.5 s.
- Prisma: deklarativne migracije sa `up`/`down` (zahtev DoD 14.3), strog tipski model za 30+ entiteta iz PZ 8.
- NextAuth: podrška za credentials + TOTP 2FA + buduća OIDC/SAML integracija (PZ 4.1).
- shadcn/ui + Tailwind: brz vizuelni razvoj, jedan design-token set, WCAG-prijateljske komponente (PZ 5).
- Playwright: obavezni E2E scenariji iz PZ 12 (multi-country izolacija, RBAC leak, inventory hold konflikt).

## Alternative (odbijene)

- Opcija 2 (.NET + Angular): ostaje blizu CODIS stacka, ali duža inicijalna konfiguracija multi-schema tenant-a.
- Opcija 3 (Laravel + Vue/Inertia): odličan za MVP, ali slabije type-safety kroz celi stack.

## Posledice

- Razvojni tim mora biti senior na TS; junior devovi mogu ući preko shadcn/ui i Prisma modela.
- Migracija u budući .NET (ako bi se tražilo) zahteva port backend sloja.
- Sve Server Actions i tRPC pozivi moraju proći kroz RBAC middleware (nema iznimke).
