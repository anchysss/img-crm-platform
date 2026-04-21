# CLAUDE.md — IMG CRM Platform

Ovaj dokument služi kao kontekst za Claude Code agenta. Originalni Projektni zadatak (PZ) je u `docs/pz/07_Prompt_ClaudeCode_IMG_platforma.md`.

## Pravila rada (iz PZ poglavlje 16)

1. **Pre koda — plan.** Svaki milestone otvara brief plan u `docs/plans/M<N>.md`.
2. **Male izmene, česti komitovi.** Nema komitova preko 400 LOC izmene bez opravdanja.
3. **PR-ovi sa opisom.** Šablon u `.github/PULL_REQUEST_TEMPLATE.md`.
4. **Nema tajni u repozitorijumu.** `.env.example` da, `.env` ne.
5. **Nikad direktno u `main`.** Feature grane + PR.
6. **Ako PZ nije dovoljno precizan — pitanje u `docs/open-questions.md`.**
7. **Kopiranje iz postojećeg Mediabook-a (CODIS) je zabranjeno.**
8. **Strogi FK:** Stage, Rola, tip partnera, Lost reason — nema slobodnog teksta.

## Tech stack (odluka ADR-0001)

- Next.js 14 (App Router) + TypeScript
- Prisma + PostgreSQL
- tRPC za interni API
- NextAuth za sesiju/2FA
- Tailwind + shadcn/ui
- Zod za validaciju
- Vitest (unit/integration) + Playwright (e2e)

## Struktura

Vidi `docs/domain-model.md` i PZ poglavlje 7.

## Definition of Done (obavezno za svaki M)

Vidi PZ poglavlje 14. Sažetak: testovi + CI zelen + migracije reverzibilne + seed + dokumentacija + manualni smoke + RBAC test + audit log + OWASP check.
