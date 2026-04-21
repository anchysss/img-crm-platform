# UAT scenariji

Minimum iz PZ poglavlja 15, mapirano na automatske E2E (Playwright) gde je moguće.

## UAT-01 — Multi-rola izolacija (PZ 15.1)
Naručilac prijavljuje 3 korisnika različitih rola i verifikuje da svako vidi samo svoje. **E2E:** `tests/e2e/01-rbac-isolation.spec.ts`.

## UAT-02 — Pun ciklus Sales Rep (PZ 15.2)
Partner → Opportunity → Stage-ovi → Won → Kampanja. **E2E:** `tests/e2e/02-opportunity-to-campaign.spec.ts`.

## UAT-03 — Country Manager KPI (PZ 15.3)
Filtriran dashboard i pipeline po zemlji. **E2E:** `tests/e2e/03-country-manager-dashboard.spec.ts`.

## UAT-04 — Finance batch izvoz (PZ 15.4)
Finance generiše ERP izvoz, dobija fajl u pravom formatu po zemlji. **E2E:** `tests/e2e/04-handoff-export.spec.ts`.

## UAT-05 — Pravo na zaborav (PZ 15.5)
Admin pokreće pseudonimizaciju; audit ostavlja trag. **E2E:** `tests/e2e/05-right-to-erasure.spec.ts`.

## UAT-06 — Backup/restore (PZ 15.6)
Admin procedura; dokumentovano u `docs/deployment.md`. (Manualni UAT.)

## UAT-07 — Performance 50 paralelnih (PZ 15.7)
k6 scenario `tests/perf/50-concurrent.js`. Kriterij: P95 < 300 ms.

## UAT-08 — Security (PZ 15.8)
OWASP ZAP baseline + autentikacijski scan; bez High/Critical.

## Dodatni e2e (PZ 12)

- `06-invoice-to-erp.spec.ts` (12.6)
- `07-communal-fee-notification.spec.ts` (12.8)
- `08-opportunity-lost-reason.spec.ts` (12.3)
