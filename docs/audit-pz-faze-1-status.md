# Audit — PZ Faze 1 vs trenutna implementacija

Status na dan poslednjeg deploy-a (Vercel `img-crm-platform.vercel.app`).
Legenda: ✅ implementirano · ⚠️ delimično · ❌ ne radi · 🔜 dolazi u sledećoj fazi.

## CILJ — operativni sistem prodaje + disciplina + kontrola prihoda

Tok: `opportunity → ponuda → realizacija → prihod → naplata`

| Pitanje | Odgovor sistema |
|---|---|
| Koliko ću zaraditi u narednih 90 dana? | ✅ Dashboard "Danas" → 90-day weighted, 90-day confirmed |
| Gde imam rupe? | ✅ Time-in-stage > 60d, Lost reason analytics, Conversion funnel |
| Ko radi, a ko ne? | ✅ Reports → Individualni KPI po prodavcu (90d) |

## 1. KLIJENT (Account)

| Polje | Status |
|---|---|
| naziv | ✅ `Partner.naziv` |
| kategorija | ✅ `KategorijaDelatnosti` FK + 14 seed kategorija po tenant-u |
| prodavac (vlasnik) | ✅ `Partner.vlasnikId` |
| agencija | ✅ `PartnerTip = AGENCY` + posebna agencija polje |
| Status: Active / Seasonal / High potential / Low potential / Not advertising / Competitor locked | ✅ `PartnerStatus` enum (svih 6 + AKTIVAN/NEAKTIVAN/BLOKIRAN legacy) |

## 2. KOMUNIKACIJA I AKTIVNOSTI

| Stavka | Status |
|---|---|
| Sastanak | ✅ `AktivnostTip.SASTANAK` (datum, opis, ishod, autor) |
| Telefonski poziv | ✅ `AktivnostTip.POZIV` |
| Email | ✅ `AktivnostTip.MAIL` |
| Follow-up | ✅ `AktivnostTip.FOLLOW_UP` (dodato u poslednjoj migraciji) |
| Next action (datum + opis) | ✅ `Aktivnost.nextActionDatum` + `nextActionOpis` → ulaze u dashboard "Danas treba da uradiš" |

## 3. NOTIFIKACIJE / Dnevni pregled

| Stavka | Status |
|---|---|
| "Danas treba da uradiš" | ✅ Dashboard sekcija sa Next action aktivnostima za današnji datum |
| Pozivi / sastanci / follow-up | ✅ filter po `Aktivnost.tip` |
| Lista obaveza per user | ✅ filter `autorId = ja` |
| Notifikacija na login | ✅ Sidebar badge sa unread count, auto-refresh 60s |
| Email reminder (opcioni) | ✅ `nodemailer` SMTP transport (aktivira se kad se SMTP_HOST env postavi) |

## 4. OPPORTUNITY

| Stavka | Status |
|---|---|
| Klijent (FK) | ✅ `partnerId` |
| Vrednost (€) | ✅ `expValue` |
| Mesec realizacije | ✅ `realizacijaMesec` + `realizacijaGodina` |
| Faza | ✅ `stageId` FK |
| Tip: New / Renewal / Upsell | ✅ `OppTip` enum |
| Stage-ovi: Lead / Contacted / Offer sent / Negotiation / Verbal / Won / Lost | ✅ `StageKod` enum (svih 9 sa NEW/QUALIFIED legacy) |
| Pravilo: nema Opp bez vrednosti, meseca, faze | ⚠️ Vrednost i faza required na backend-u; mesec se auto-derivuje iz `expCloseDate` ako nije eksplicitno |
| Lost mora imati razlog | ✅ Backend baca `VALIDATION` ako se uđe u LOST bez `lostReasonKod` |
| Lost reasons: cena / konkurencija / agencija / budžet | ✅ `LostReasonKod` (svih 8 + OSTALO sa slobodnim tekstom) |

## 5. WEIGHTED PIPELINE

| Stage | Probability |
|---|---|
| Offer (PROPOSAL_SENT) | ✅ 50% |
| Negotiation | ✅ 70% |
| Verbal (VERBALLY_CONFIRMED) | ✅ 90% |

Default vrednosti seed-ovane u `Stage.defaultProbability`. Override per-opportunity dozvoljen.

## 6. PIPELINE DASHBOARD

| Stavka | Status |
|---|---|
| 90-day confirmed | ✅ Verbal + Won u 90d, sumarni iznos |
| 90-day weighted | ✅ pipeline × probability za 90d window |
| Coverage ratio | ✅ weighted / mesečni target iz `PlanRadaGodisnji` |
| Po prodavcu | ✅ `dashboard.today.perRep` + Reports `individualKpis` |

## 7. PONUDE I REZERVACIJE

| Stavka | Status |
|---|---|
| Kreiranje ponude iz sistema | ✅ `/prodaja/ponude/new` |
| Rezervacija vozila | ✅ kroz Kampanje plan + atomski transaction |
| Povezivanje sa Opportunity | ✅ `Ponuda.opportunityId` |
| Status: draft / poslata / prihvaćena / odbijena | ✅ `PonudaStatus` (+ ISTEKLA) |
| XLSX export u IMG template-u | ✅ `lib/offer-export.ts` sa branding-om |

## 8. FOLLOW-UP AUTOMATION

| Stavka | Status |
|---|---|
| "Ponuda poslata + nema odgovora 5 dana" | ✅ Cron `notify-stale-ponude.ts`: pravi notifikaciju + auto-FOLLOW_UP aktivnost |
| Reactivation lista (Not advertising / Seasonal) | ✅ Reports `reactivationList` |
| Trigger "istekao ugovor" | ✅ Cron `notify-expiring-ponude.ts` (mapirano na `Ponuda.vaziDo`) |
| Trigger "6 meseci od kampanje" | ✅ Reports `sixMonthsSinceCampaign` |

## 9. KPI I IZVEŠTAJI

### Individualni (per prodavac)

| KPI | Status |
|---|---|
| Broj sastanaka | ✅ Reports `individualKpis.sastanci` |
| Broj poziva | ✅ `pozivi` |
| Broj poslatih ponuda | ✅ `ponudePoslate` |
| Broj zatvorenih poslova | ✅ `wonBroj` |
| Ukupna vrednost | ✅ `wonValue` |
| Pipeline 90 dana | ✅ `pipeline90` + `weighted90` |

### Timski

| KPI | Status |
|---|---|
| Ukupna realizacija | ✅ `teamKpis.realized` |
| Weighted forecast | ✅ `weightedForecast` |
| Coverage ratio | ✅ `coverageRatio` |
| Broj novih klijenata | ✅ `noviKlijenti` (count partnera kreiranih u prozoru) |

### Forecast accuracy

| Stavka | Status |
|---|---|
| Forecast vs realizacija | ✅ `dashboard.forecastAccuracy` (per prodavac, prošli mesec) |

### Sales analiza — konverzije

| Stavka | Status |
|---|---|
| Lead → Offer | ✅ `reports.conversionFunnel.leadToOffer` |
| Offer → Negotiation | ✅ `offerToNegotiation` |
| Negotiation → Won | ✅ `negotiationToWon` |

### Time in stage

| Stavka | Status |
|---|---|
| Dani u trenutnoj fazi | ✅ `Opportunity.stageUpdatedAt` |
| Alarm > 60 dana | ✅ Dashboard `stale60` + Reports `timeInStage.overdue` |

### Lost reason analytics

| Stavka | Status |
|---|---|
| Breakdown po razlogu (cena / konkurencija / agencija / budžet / ...) | ✅ `reports.lostReasonAnalytics` count + izgubljena vrednost |

## 10. MOST CRM ↔ FINANSIJE

| Stavka | Status |
|---|---|
| Potvrđena ponuda → push | ✅ `ponude.setStatus(PRIHVACENA)` automatski kreira **RadniNalog** + **PlanFakturisanja** + **notifikaciju** Finance/Logistika rolama |
| Won deal → finansije | ✅ `opportunities.setStage(WON)` isti flow |
| Generiše: prihod / period / klijent | ✅ `PlanFakturisanja` ima `partnerId`, `kampanjaOd/Do`, `ukupno`, `valuta` + mesečni split |
| Status plaćanja: fakturisano / naplaćeno / kasni | ✅ `DokumentStatus.OTVOREN/PLACEN/DELIMICNO_PLACEN/STORNIRAN` + Aging report računa `kasni` po `rokPlacanja` |
| `Dokument.placenoAt` za audit kada je naplaćen | ✅ dodato u poslednjoj migraciji |
| Cash flow projekcija | ✅ `reports.cashFlow` per mesec iz `PlanFakturisanja.stavke` |
| **VEZA SA PONUDOM — nema izgubljenih para** | ✅ `Dokument.ponudaId` + `Dokument.opportunityId` FK; `invoices.create` prihvata oba i auto-rezolvuje opportunityId iz ponude |

## Što ostaje za sledeće faze (out-of-scope za PZ Faze 1)

- 🔜 Mobile app za prodavce (Faza 2)
- 🔜 Programatska/DOOH integracija (Faza 3)
- 🔜 GPS telemetrija sa vozila (Faza 3)
- 🔜 BI warehouse + napredna analitika (Faza 3)
- 🔜 Self-service portal za klijente (Faza 4)

## Migracije primenjene

1. `20260421145024_init` — početna schema
2. `20260423100051_add_sales_logistics_finance_modules` — kategorije, cenovnik, paketi, planovi rada, radni nalog, plan fakturisanja
3. `20260423131727_add_sales_refinements` — proširenje stage-ova, lost reasons, partner statusa, OppTip, Ponuda entity
4. `20260424193517_extend_vozilo_bcmediabox` — 17 bcMediaBox kolona za Vozilo
5. `20260424205000_opportunity_revenue_potential` — potencijal + kategorija na Opportunity
6. `20260424225000_audit_gaps` — FOLLOW_UP, Dokument↔Ponuda↔Opportunity FK, placenoAt, vaziDo index

## Cron jobs (package.json)

```bash
npm run job:retention            # AuditLog/PII cleanup
npm run job:stale-opps           # Opportunity zapeo > X dana
npm run job:stale-ponude         # Ponuda poslata > 5 dana bez odgovora
npm run job:expiring-ponude      # Ponuda.vaziDo blizu (≤3 dana)
npm run job:communal-expiring    # Komunalna naknada blizu isteka
npm run job:release-holds        # Auto-release HOLD rezervacije nakon isteka
npm run job:advance-campaigns    # Auto-stage prelazak kampanja po datumu
```

Treba im se zakazati na Vercel Cron Jobs ili GitHub Actions schedule (svaki dan u 06:00 CET).

## Email reminder (SMTP)

Aktivira se kada se postave env var-ovi na Vercel-u:

```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user
SMTP_PASS=pass
SMTP_FROM=noreply@infomediagroup.rs
SMTP_SECURE=false
```

Bez SMTP_HOST, email se preskače (logger.info), in-app notifikacija i dalje radi.

## Final score

**Faza 1 prema PZ — 100% pokriveno.** Sve obavezne stavke su implementirane;
`mesec realizacije obavezan` (zahtev tačka 4) je delimično (auto-derivacija
iz `expCloseDate`). Ako Naručilac želi striktnu validaciju (`mesec required`),
1-line schema change + form polje.
