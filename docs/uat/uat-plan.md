# UAT plan

## Ulazni uslovi
- Staging okruženje sa seed podacima.
- Naručilac dobija 8 test naloga (6 rola × 2 zemlje, vidi seed).
- CI zeleno na `main`.

## Faze
1. **Smoke test** (1 dan) — Naručilac prolazi osnovne rute.
2. **Scenarijski UAT** (3 dana) — scenariji UAT-01…08 iz `uat-scenarios.md`.
3. **Load i security** (2 dana) — k6 + OWASP ZAP.
4. **Sign-off** — Naručilac potpisuje izveštaj.

## Izlazni uslov
- Svi UAT scenariji prolaze.
- Nijedan OWASP High/Critical.
- P95 < 300 ms za 50 paralelnih korisnika.
