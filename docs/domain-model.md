# Domain model

Mapiranje PZ poglavlje 8 na Prisma modele u `prisma/schema.prisma`.

## Glavni entiteti (grupe)

### Tenancy & Auth
- `PravnoLice` — IMG MNE/SRB/HRV/BIH (valuta, PDV, TZ, jezik, šablon fakture).
- `Korisnik` — lokalni nalog, argon2 hash, opcioni TOTP secret.
- `Rola` — FK lista: `Admin`, `SalesRep`, `SalesManager`, `CountryManager`, `Finance`, `ReadOnly`.
- `KorisnikRola` — M:N, vezano za konkretno `PravnoLice` (korisnik može imati različite role po zemljama).
- `Dozvola` — trojka (rola, modul, akcija); CRUD kroz Admin UI.

### Komercijalni
- `Partner` — diskriminator `tip`: DIRECT / AGENCY / RESELLER / PROVIDER; segment A/B/C; status.
- `Kontakt` — N:1 sa Partner; jedan primarni; `legalBasis`.
- `Aktivnost` — polimorfna na (partner, kontakt, opportunity); tip: POZIV/SASTANAK/MAIL/PONUDA/POSETA.

### Pipeline
- `Opportunity` — sa Stage-om (FK na `Stage`), probability, expValue, expCloseDate, lostReason (FK).
- `Stage` — fiksna konfigurabilna lista (NEW, QUALIFIED, PROPOSAL_SENT, NEGOTIATION, VERBALLY_CONFIRMED, WON, LOST).
- `LostReason` — predefinisana lista iz PZ 4.4.

### Operativno
- `Kampanja` — opciono FK na Opportunity; status po automatici iz datuma.
- `KampanjaStavka` — veza kampanja ↔ pozicija ↔ termin.

### Inventar
- `Vozilo` — registracija, tip (BUS/MINI/DRUGO), grad, agencijaVlasnikId, slika.
- `Pozicija` — tip (CELO/ZADNJI/BOK_LEVO/BOK_DESNO/UNUTRA/DRUGO), dimenzije, minPeriodDana, cenaPoPeriodu.
- `Rezervacija` — dualni FK (kampanjaId | opportunityId), status: HOLD/CONFIRMED/RUNNING/CANCELLED, od–do.
- `KomunalnaNaknada` — po voziluId, od–do, iznos, statusPlacanja.

### Finansije
- `Dokument` — tip (PREDRACUN/FAKTURA/AVANS/STORNO), broj, partner, kampanja, valuta, status.
- `DokumentStavka` — FK ka KampanjaStavka ili ručna.
- `NumeracijaSkok` — per (pravnoLice, tip, godina) → rbr.
- `HandoffBatch` — ERP izvoz: zemlja, period, format, status, retry count.

### Cross-cutting
- `Notifikacija` — per korisnik, tip, pročitano.
- `AuditLog` — append-only, 24+ mesečna retencija.
- `LicniPodatakPristup` — read log za PII entitete (PZ 4.15).

## ERD

Vidi generisani dijagram iz Prisma ERD-a (`pnpm prisma generate`); glavne veze:

```
PravnoLice 1──∞ Korisnik ─∞ KorisnikRola ∞──1 Rola
PravnoLice 1──∞ Partner 1──∞ Kontakt
Partner 1──∞ Opportunity 1──0..1 Kampanja 1──∞ KampanjaStavka ∞──1 Pozicija ∞──1 Vozilo
Opportunity 1──∞ Rezervacija (HOLD)
Kampanja 1──∞ Rezervacija (CONFIRMED/RUNNING)
Kampanja 1──∞ Dokument
```

## Audit

Svi entiteti imaju `createdAt / updatedAt / deletedAt? / createdBy / updatedBy`. Mutacije prolaze kroz `src/server/audit.ts` middleware.
