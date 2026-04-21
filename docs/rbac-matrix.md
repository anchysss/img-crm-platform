# RBAC matrica dozvola

Osnovna matrica seed-ovana u `prisma/seed.ts`. Admin može menjati kroz UI (PZ 4.2).

Akcije: `READ`, `CREATE`, `UPDATE`, `DELETE`, `EXPORT`, `APPROVE`.

| Modul / Rola          | Admin | CountryManager | SalesManager | SalesRep | Finance | ReadOnly |
|-----------------------|-------|----------------|--------------|----------|---------|----------|
| partners              | CRUD+EX+AP | CRUD+EX   | CRU+EX       | CRU (svoji) | R      | R        |
| contacts              | CRUD+EX+AP | CRUD+EX   | CRU+EX       | CRU (svoji) | R      | R        |
| activities            | CRUD  | CRUD           | CRUD         | CRU (svoji) | R     | R        |
| opportunities         | CRUD+EX+AP | CRUD+EX   | CRU+EX+AP    | CRU (svoji) | R     | R        |
| pipeline              | R+EX  | R+EX           | R+EX         | R (svoji) | R       | R        |
| campaigns             | CRUD+EX | CRUD+EX      | RU           | R        | R+EX    | R        |
| vehicles              | CRUD+EX | CRUD+EX      | R            | R        | R       | R        |
| positions             | CRUD  | CRUD           | R            | R        | R       | R        |
| mediabook             | R+AP  | R+AP           | R+AP (hold)  | R+AP (hold) | R    | R        |
| invoices              | CRUD+EX+AP | R+EX      | R            | R        | CRUD+EX+AP | R      |
| handoff (ERP)         | R+EX+AP | R+EX         | —            | —        | CRUD+EX+AP | —      |
| reports               | R+EX  | R+EX           | R+EX         | R (svoji) | R+EX   | R+EX     |
| dashboard             | R     | R (zemlja)     | R (tim)      | R (lično) | R      | R        |
| users                 | CRUD  | R              | R (tim)      | —        | —       | —        |
| roles & permissions   | CRUD  | —              | —            | —        | —       | —        |
| audit_log             | R+EX  | R (zemlja)     | —            | —        | R       | —        |
| gdpr_operations       | CRUD+EX+AP | R+EX      | —            | —        | —       | —        |
| system_settings       | CRUD  | —              | —            | —        | —       | —        |

## Tenant izolacija

Sve role osim Admin imaju implicit filter `pravnoLiceId = userTenant.id`. Admin traži eksplicitni override (query param `?tenant=...`) koji se beleži u audit log (ADR-0002).

## Nasleđivanje

Eksplicitno zabranjeno (PZ 4.2). Svaka dodela dozvole je zapisnik u `Dozvola`.

## Sprovođenje

1. `src/server/rbac.ts` — `requirePermission(rola, modul, akcija)` helper.
2. tRPC middleware u `src/server/trpc.ts` — `protectedProcedure.meta({ permission: [modul, akcija] })`.
3. UI skriva akcije na koje korisnik nema pravo (defense in depth, ali backend je izvor istine).
