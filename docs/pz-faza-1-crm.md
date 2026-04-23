# Projektni zadatak — Faza 1 CRM (operativni sistem prodaje)

## Cilj

**Ne klasičan CRM već operativni sistem prodaje / logistike + disciplina prodaje + kontrola prihoda.**

Sistem mora omogućiti praćenje kompletnog toka:

```
opportunity → ponuda → realizacija → prihod → naplata
```

i dati odgovore na tri operativna pitanja:

1. **Koliko ću zaraditi u narednih 90 dana?**
2. **Gde imam rupe?**
3. **Ko radi, a ko ne?**

## 1. Klijent (Account)

Obavezna polja:

- `naziv`
- `kategorija delatnosti` (FK, ne slobodan tekst)
- `prodavac` (vlasnik)
- `agencija` (opciono, FK ka drugom partneru)
- `status`:
  - `ACTIVE`
  - `SEASONAL`
  - `HIGH_POTENTIAL`
  - `LOW_POTENTIAL`
  - `NOT_ADVERTISING`
  - `COMPETITOR_LOCKED`

## 2. Komunikacija i aktivnosti

Svaki kontakt sa klijentom se evidentira. Tipovi (FK):

- `SASTANAK`
- `POZIV`
- `MAIL`
- `FOLLOW_UP`
- `PONUDA`
- `POSETA`

Polja aktivnosti:
- `datum`, `tip`, `opis`, `ishod`, `autor`
- **Next action**: `nextActionDatum`, `nextActionOpis` (dospeće — ulazi u dashboard "Danas")

## 3. Notifikacije i dnevni pregled

Dashboard ekran "Danas treba da uradiš":

- pozivi
- sastanci
- follow-up

Izvori:
- `Aktivnost.nextActionDatum = today` za trenutno ulogovanog korisnika.

Automatski:
- lista obaveza per user
- notifikacija na login (sidebar badge + `/notifications` stranica)
- opcionalno email reminder (hook u SMTP kada se konfiguriše)

## 4. Opportunity

Obavezna polja:
- `klijent` (FK Partner)
- `vrednost (€)`
- `mesec realizacije` (1–12) + `godina`
- `faza` (FK Stage)
- `tip`: `NEW` / `RENEWAL` / `UPSELL`

**Stage-ovi (strogi FK):**
- `LEAD` (5%)
- `CONTACTED` (15%)
- `NEW` (20%)
- `QUALIFIED` (30%)
- `PROPOSAL_SENT` (Offer) — **50%**
- `NEGOTIATION` — **70%**
- `VERBALLY_CONFIRMED` (Verbal) — **90%**
- `WON` (100%)
- `LOST` (0%)

**Pravila:**
- Nema Opportunity bez vrednosti, meseca, faze.
- LOST mora imati razlog (FK LostReason):
  - `CENA`
  - `KONKURENCIJA`
  - `AGENCIJA`
  - `BUDZET_NIJE_ODOBREN`
  - `TIMING`
  - `BEZ_ODLUKE`
  - `OSTALO` (traži slobodan tekst)

## 5. Weighted pipeline

Fiksne vrednosti (ne konfigurabilne bez promene šeme):
- Offer (PROPOSAL_SENT) → 50%
- Negotiation → 70%
- Verbal → 90%

Weighted value = `expValue × probability / 100`.

## 6. Pipeline Dashboard

1. **90-day confirmed** = Σ expValue gde `stage IN (VERBAL, WON)` i `expCloseDate ≤ today + 90d`
2. **90-day weighted** = Σ (expValue × probability/100) gde `expCloseDate ≤ today + 90d`
3. **Coverage ratio** = `weighted / mesečni target (PlanRadaGodisnjiStavka)`
4. **Po prodavcu** = grupisano po `Opportunity.vlasnikId`

## 7. Ponude i rezervacije

- Kreiranje ponude iz sistema + rezervacija vozila u istom toku
- Povezivanje ponude sa Opportunity (`Ponuda.opportunityId`)
- Status ponude (strogi FK enum):
  - `DRAFT`
  - `POSLATA`
  - `PRIHVACENA`
  - `ODBIJENA`
  - `ISTEKLA`
- Export ponude: **XLSX** (IMG template) i **PDF** (štampa)

## 8. Follow-up automation

Cron dnevno:

- **Ponuda poslata** + nema odgovora **5 dana** → notifikacija vlasniku
- **Reactivation**:
  - klijenti `NOT_ADVERTISING` → lista u Reports → "pozovi"
  - klijenti `SEASONAL` → lista u Reports
- **Trigeri**:
  - "istekao ugovor" (manuelan event + kalendarski reminder)
  - "6 meseci od poslednje kampanje" (reactivation list)

## 9. KPI i izveštaji

**Individualni (per prodavac):**
- broj sastanaka / poziva / poslatih ponuda / zatvorenih poslova
- ukupna vrednost
- pipeline (90 dana)

**Timski:**
- ukupna realizacija
- weighted forecast
- coverage ratio
- broj novih klijenata

**Forecast accuracy** (per prodavac):
- poredi `weighted forecast` vs. `realizaciju` za prošli mesec
- rangira "ko naduvava pipeline" / "ko dobro predviđa"

**Sales analiza (konverzije):**
- Lead → Offer
- Offer → Negotiation
- Negotiation → Won

**Time in stage:**
- koliko dana opportunity stoji u trenutnoj fazi
- **alarm > 60 dana**

**Lost reason analytics:**
- automatski breakdown:
  - CENA / KONKURENCIJA / AGENCIJA / BUDZET_NIJE_ODOBREN / ostalo
- broj prilika + ukupno izgubljena vrednost per razlog

## 10. Most CRM ↔ Finansije

**Won Deal → Finansije:**
kada je `Opportunity.stageKod = WON` i `Ponuda.status = PRIHVACENA`, automatski:

- generiše se **PlanFakturisanja** sa:
  - `prihod` (expValue)
  - `period` (kampanja od–do)
  - `klijent` (partnerId)
  - **mesečna podela** (auto-split ako kampanja prelazi iz meseca u mesec)
- **Radni nalog** za logistiku
- notifikacija Finance + SalesManager + CountryManager + Admin

**Status plaćanja** (minimum):
- `FAKTURISANO`
- `NAPLACENO`
- `KASNI`

**Projekcija cash flow** iz CRM-a:
- šta dolazi (planirani iznosi per mesec iz PlanFakturisanja)
- kada dolazi
- razlika planirano vs. fakturisano

**Veza sa ponudom — "nema izgubljenih para":**
Svaki prihod (Dokument/faktura) mora imati vezu sa:
- Opportunity
- Ponuda
Bez ovih veza, sistem ne prihvata kreiranje fakture.

## 11. Kriterijumi prihvatanja

Faza 1 se smatra isporučenom **samo ako** su ispunjeni svi sledeći kriterijumi:

1. ✅ Svi entiteti iz poglavlja 1–10 postoje kao strogi FK (bez slobodnog teksta za predefinisane liste).
2. ✅ Weighted pipeline računa se automatski sa PZ vrednostima (50/70/90).
3. ✅ LOST opportunity ne može da se sačuva bez razloga.
4. ✅ Dashboard "Danas" prikazuje 90-day confirmed + weighted + coverage ratio + po prodavcu.
5. ✅ Conversion funnel, time-in-stage alarm, lost reason breakdown, forecast accuracy dostupni.
6. ✅ Won → automatska generacija Radnog naloga (logistika) + Plan fakturisanja (finansije) + notifikacije po roli.
7. ✅ Cash flow projekcija iz PlanFakturisanja po mesecima.
8. ✅ RBAC matrica sa 6 rola (Admin, CountryManager, SalesManager, SalesRep, Finance, ReadOnly).
9. ✅ Multi-country tenant izolacija (MNE, SRB, HRV, BIH).
10. ✅ Audit log svake mutacije.
11. ✅ Bulk import/export (CSV/XLSX) za partnere, kontakte, vozila.
12. ✅ Offer XLSX (IMG template) + PDF štampa.
13. ✅ 2FA obavezan za Admin, Finance, CountryManager.
14. ✅ E2E demo prolazi 8 UAT scenarija (videti `docs/uat/uat-scenarios.md`).

## 12. Šta je van obima Faze 1 (Faza 2+)

- DOOH/programatska integracija
- Mobile app za vozače/kontrolore
- Telemetrija sa vozila (GPS)
- BI warehouse iznad CRM-a
- Samouslužni portal za klijenta

---

**Ovaj PZ je kriterijum prihvatanja.** Bilo koji izvođač je vezan ispunjenjem svih 14
tačaka iz poglavlja 11. Stabilizacioni period 30 dana per fazu bez naknade.
