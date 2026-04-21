# ADR-0003 — Numerisanje predračuna i faktura

- Status: Accepted
- Datum: 2026-04-21
- Kontekst: PZ 4.10 (autogeneracija broja po pravilima države)

## Odluka

Format: `{prefiksTip}-{ISOZemlja}-{godina}-{rbr:06}` (npr. `INV-MNE-2026-000042`).

Prefiksi:
- `PRE` — predračun
- `INV` — faktura
- `ADV` — avans
- `CRN` — storno (credit note)

Redni broj je **per (pravnoLiceId, tip, godina)** atomski povećan kroz Postgres advisory lock + `NumeracijaSkok` tabelu.

## Razlozi

- Odvojene sekvence po zemlji/tipu → poštuje lokalne fiskalne norme (SRB SEF format, HR eRačun Fina).
- Advisory lock garantuje nema praznih brojeva (zahtev fiskalnih zakona).

## Alternative (odbijene)

- UUID kao broj fakture: ne zadovoljava fiskalne zahteve.
- Sekvenca po instanci bez per-tenant izolacije: rizik preklapanja.

## Posledice

- Uklanjanje fakture zahteva kreiranje storna (`CRN`), ne brisanje zapisa.
- Fiskalni format (QR / PDF header) konfigurabilan per `PravnoLice` (šablon).
