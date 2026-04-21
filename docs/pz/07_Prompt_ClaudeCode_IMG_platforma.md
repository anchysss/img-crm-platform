# Projektni zadatak / prompt za Claude Code

## Izgradnja pune IMG platforme: CRM + inventar transit media + finansijski handoff + multi-country

**Naručilac:** Info Media Group (IMG)
**Oblast delatnosti Naručioca:** Reklamiranje u transportnim vozilima (transit media / transit advertising)
**Verzija prompta:** 1.0 (april 2026)
**Namena:** Direktan ulazni prompt za Claude Code agenta radi izgradnje kompletne aplikacije od nule.

---

## 0. Kako koristiti ovaj dokument

Ovaj dokument je istovremeno:

- **Projektni zadatak** — autoritativni spisak obaveznih funkcionalnosti i uslova prijema.
- **Prompt za Claude Code** — direktno čitljiv i izvršiv od strane Claude Code agenta ukoliko se smesti kao `CLAUDE.md` ili `prompt.md` u root repozitorijuma.

Kada se pokrene Claude Code nad ovim dokumentom, agent mora:

1. Pročitati ceo dokument pre nego što išta napiše.
2. Predložiti plan rada (milestone lista) i dobiti odobrenje pre pisanja koda.
3. Raditi po milestoneima, i na kraju svakog milestonea proći Definition of Done (poglavlje 14).
4. Nikada ne skraćivati obim navedenih obaveznih zahteva bez pismene saglasnosti Naručioca.

---

## 1. Kontekst i pozadina

IMG je naručio razvoj CRM-a od Izvršioca CODIS d.o.o. Banja Luka po postojećem Projektnom zadatku Faze 1 CRM. Izvršilac je isporučio aplikaciju „Mediabook" koja korektno pokriva operativno-inventarski deo (vozila, kampanje, MediaBook plan, partneri, dokumenti), ali ne ispunjava zahteve CRM dela (nema Opportunity, pipeline, dashboard „Danas", RBAC, KPI module, GDPR obaveze, finansijski handoff). Naručilac se opredelio za izgradnju pune zamenske platforme iz jednog odlivka.

Ovaj projektni zadatak obuhvata **celu aplikaciju**:

- CRM sloj (Opportunity, pipeline, dashboard „Danas", KPI, follow-up)
- Inventarski sloj za transit media (vozila, pozicije, MediaBook plan)
- Operativni sloj (kampanje, predračuni, fakture, komunalne naknade)
- Finansijski handoff (izvoz u ERP/knjigovodstvo, lokalizacija po državi)
- Multi-company / multi-country (MNE, SRB, HRV, BIH)
- RBAC sa predefinisanim rolama i matricom dozvola
- GDPR / ZoZLP obaveze
- Izveštaji i KPI

---

## 2. Poslovni domen — obavezno razumevanje

Pre pisanja koda Claude Code mora da razume sledeće:

**Inventar IMG-a su vozila, ne lokacije.** Oglasni prostor se prodaje na vozilima (autobusima, minibusevima, drugim vozilima javnog/komercijalnog prevoza). Kampanja se realizuje tako što se na određenom skupu vozila, na određenim pozicijama, u definisanom periodu, prikazuje kreativa klijenta.

**Tri tipa prodajnih partnera** (segmentacija):

1. Direktni klijenti (oglašivač plaća direktno IMG).
2. Agencije (oglašivač je klijent agencije, IMG fakturiše agenciji).
3. Posrednici / re-seller partneri iz regije (kolega provajderi u drugim državama sa kojima IMG trguje prostorom).

**Životni ciklus posla:**

`Lead → Opportunity (kroz Stage-ove) → Won → Potvrđena kampanja → U realizaciji → Završena → Fakturisanje → Naplata`

**Uz CRM tok ide i inventarski tok:**

`Opportunity u fazi Pregovori/Potvrđena → Hold pozicija u MediaBook planu → Won → konverzija u rezervaciju → Završena kampanja → oslobađanje pozicija`

**Multi-country:** IMG posluje u više zemalja (minimum: Crna Gora, Srbija, Hrvatska, BIH). Svaka zemlja ima svoj pravni entitet IMG-a, svoju valutu, svoju stopu PDV-a, svoj format fiskalne fakture, svoj pravni okvir (ZoZLP, ZZPL, HR GDPR implementacija, BiH zakon).

---

## 3. Ciljevi sistema (merljivi)

Claude Code gradi sistem tako da, po prijemu, omogućava sledeće:

**C1.** Prodavac otvara Opportunity kroz jedan ekran sa minimum 15 sekundi do save-a.
**C2.** Menadžer vidi pipeline funnel sa weighted value i forecast mesecu po roli „Sales Manager" za najviše 1 klik sa dashboard-a.
**C3.** Country Manager filtrira pipeline i izveštaje po zemlji.
**C4.** Sales Rep ne vidi Opportunity drugih prodavaca van svog teritorija, osim ako mu rola dozvoljava.
**C5.** Kada Opportunity pređe u Stage „Pregovori", sistem automatski stavlja hold na predloženu poziciju u MediaBook planu.
**C6.** Kada Opportunity pređe u Won, hold se automatski konvertuje u potvrđenu rezervaciju i otvara se kampanja sa nasleđenim podacima.
**C7.** Kada kampanja završi i faktura se izda, sistem generiše fajl u formatu pogodnom za knjigovodstveni sistem (XML/ekvivalent po standardu države).
**C8.** Admin može u svakom trenutku izvesti GDPR izveštaj za jedan lični podatak (gde se nalazi, ko je pristupao, kada).
**C9.** Svaka izmena bilo kog entiteta ostavlja trag u audit logu (ko, šta, kada, odakle).
**C10.** Sistem radi u minimum 2 zemlje paralelno na istoj instanci sa izolovanim podacima po pravnom licu.

---

## 4. Funkcionalni zahtevi po modulima

### 4.1 Modul — Autentifikacija i sesija

- Lokalna autentifikacija sa email + lozinka, bcrypt/argon2 hash.
- Opcionalno SSO (OIDC/SAML) — za kasnije faze, ali arhitektura mora dozvoljavati uključivanje.
- Obavezna 2FA za role Admin, Finance, Country Manager.
- Sesije sa rotacijom tokena; automatski logout nakon 30 min neaktivnosti (konfigurabilno).
- Rate limiting na login endpointu.

### 4.2 Modul — RBAC (role-based access control)

**Predefinisane role:**

| Rola | Pristup |
|---|---|
| Sales Rep | Svoj Opportunity, svoji partneri, MediaBook plan read, kreiranje hold-a |
| Sales Manager | Pipeline celog tima, KPI tima, aproval veliki diskont |
| Country Manager | Sve iz svoje zemlje |
| Finance | Predračuni, fakture, handoff u ERP |
| Admin | System settings, RBAC, audit, GDPR operacije |
| Read-only (Direktor/odbor) | Pregled svega, bez izmene |

- Polje „Uloga" na korisniku **mora biti strogo FK na tabelu rola**, ne slobodan tekst.
- Matrica dozvola na nivou `(rola, modul, akcija)`; akcije minimum: `read / create / update / delete / export / approve`.
- Izmena matrice dozvola mora biti mogućna kroz UI (Admin) i mora ostaviti trag u audit logu.
- Nasleđivanje dozvola unutar tima je zabranjeno; sve je eksplicitno.

### 4.3 Modul — Partneri i kontakti

- Entitet `Partner` sa poljima: naziv, matični broj, PIB/VAT, adresa, zemlja, tip partnera (direktni / agencija / posrednik / provajder iz regije), segment (A/B/C po vrednosti), status (aktivan / neaktivan / blokiran), vlasnik kontakta (Sales Rep), napomene.
- Entitet `Kontakt` (ključne osobe kod partnera) sa poljima: ime, pozicija, email, telefon, GDPR osnov obrade, datum unosa, izvor.
- Više kontakata po partneru; jedan kontakt primarni.
- Istorija interakcija (aktivnosti) povezana sa partnerom i kontaktom: poziv, sastanak, mail, ponuda, poseta; svaka aktivnost ima autora, datum, kratki opis, ishod.
- Puna full-text pretraga.
- Pravo na zaborav: brisanje/pseudonimizacija kontakta koja čuva audit trag same operacije.

### 4.4 Modul — Opportunity (prodajna prilika)

- Entitet `Opportunity` sa poljima: naziv, partner, primarni kontakt, vlasnik (Sales Rep), izvor leada (inbound / outbound / referral / postojeći klijent / agencija), zemlja, valuta, očekivana vrednost, očekivani datum zatvaranja, Stage, Probability % (automatski iz Stage-a, može override), tagovi, slobodan opis, prateći dokumenti.
- **Stage-ovi (fiksna lista, konfigurabilna od strane Admin-a):**
  - `New` (10%)
  - `Qualified` (25%)
  - `Proposal Sent` (40%)
  - `Negotiation` (60%)
  - `Verbally Confirmed` (80%)
  - `Won` (100%)
  - `Lost` (0%)
- **Weighted value:** automatski = `očekivana vrednost × Probability / 100`.
- **Lost reason:** predefinisana lista (cena, konkurencija, timing, bez odluke, duplikat, drugi razlog → slobodan tekst); obavezno polje pri prelasku u Lost.
- **Konverzija u kampanju:** pri prelasku u Won otvara se forma „Potvrđena kampanja" sa predpopunjenim podacima iz Opportunity i proširenjima (vozila, pozicije, termini, kreative).
- Aktivnosti/follow-up na Opportunity; podsetnici.
- Inventar hold: iz Opportunity forme može se predložiti skup pozicija i termina, koji se u MediaBook planu automatski obeležavaju kao hold sa trajanjem 14 dana (konfigurabilno).

### 4.5 Modul — Pipeline

- Kanban view po Stage-ovima sa drag-and-drop pomeranjem.
- Prikaz na kartici: naziv, partner, vlasnik, vrednost, Probability, dani u fazi.
- Filteri: vlasnik, zemlja, tip partnera, vremenski opseg očekivanog zatvaranja, min vrednost.
- Funnel grafikon kao alternativni view sa istim filterima.
- Brzi save filtera („moji aktivni iznad €5k", „tim MNE Q2", itd.).

### 4.6 Modul — Dashboard „Danas"

- KPI kartice (gornji red):
  - Broj otvorenih Opportunity-ja (moji / tim / zemlja)
  - Weighted pipeline value
  - Forecast ovog meseca
  - Win rate poslednjih 90 dana
  - Closed won ovog meseca vs target
- „Moje aktivnosti danas" lista (sastanci, pozivi, follow-up dospeli).
- Mini-pipeline funnel.
- „Vruće stavke" (Opportunity blizu zatvaranja, stare faze > X dana, partneri bez interakcije > Y dana).
- Country Manager vidi dashboard za zemlju; Sales Manager za tim; Sales Rep lični.

### 4.7 Modul — Kampanje (operativno)

- Entitet `Kampanja` sa poljima: naziv, partner, izvorni Opportunity (FK, nullable kada je kreirana ručno), zemlja, valuta, period (od–do), status (Potvrđena / U realizaciji / Završena / Otkazana), kreativa (fajl upload), prateći dokumenti.
- Povezuje se sa skupom pozicija i vozila kroz `KampanjaStavka`.
- Status prelazi automatski iz „Potvrđena" u „U realizaciji" kada datum početka nastupi; u „Završena" kada prođe datum kraja. Ručni override dozvoljen Country Manager-u.
- Otkazivanje kampanje oslobađa pozicije; treba potvrdu i razlog.

### 4.8 Modul — Vozila i pozicije (inventar)

- Entitet `Vozilo` sa poljima: registracija, tip (autobus/mini/drugo), vlasnik (agencija prevoza), zemlja, grad/regija, slika, status.
- Entitet `Pozicija` na vozilu: tip (celo vozilo, zadnji deo, bok levo, bok desno, unutra, drugo), dimenzije, minimalni period zakupa, cena po periodu.
- `KomunalnaNaknada` — obaveza prema gradu/opštini za eksternu reklamu (važenje od–do, iznos, status plaćenosti). Podsetnik pre isteka.
- Filter vozila po zemlji, gradu, tipu, slobodnim pozicijama u zadatom periodu.

### 4.9 Modul — MediaBook plan (matrica popunjenosti)

- Vizualizacija po vremenskoj osi (dani/nedelje), po vozilu i poziciji, sa bojama legende:
  - Slobodno (zelena)
  - Hold iz Opportunity (žuta)
  - Potvrđena rezervacija (plava)
  - U realizaciji (teget)
  - Nedostupno / servis (siva)
- Filter po zemlji, gradu, tipu vozila, tipu pozicije, periodu.
- Brz prelaz iz ćelije na Opportunity/Kampanju koja drži tu ćeliju.
- Konflikt-detekcija: ako dva prodavca pokušavaju isti termin/poziciju kroz dva Opportunity-ja, sistem sprečava drugi hold i upozorava.

### 4.10 Modul — Predračuni i fakture

- Entitet `Dokument` (predračun / faktura / avans) sa poljima: broj (po pravilima države), datum, rok plaćanja, partner, kampanja, stavke (FK ka KampanjaStavka ili ručne stavke), podzbir, PDV, ukupno, valuta, napomene, status plaćanja.
- Autogeneracija broja po pravilima države; konfigurabilno.
- Izvoz u PDF (fiskalni format države).
- Izvoz u XML/ekvivalent za handoff u ERP (vidi 4.11).
- Storniranje sa traženjem razloga.

### 4.11 Modul — Finansijski handoff

- Endpoint/task koji jednom dnevno (ili po zahtevu) generiše batch izvoz za knjigovodstvo:
  - Format zavisno od zemlje (SRB: prilagodljivo e-faktura standardu / SEF; CG: format domaćeg računovodstva; HR: Fina / eRačun; BIH: lokalni standard).
  - Obuhvata fakture i storno za period.
  - Fajl ide u SFTP/S3/email inbox računovodstva (konfigurabilno).
  - Log uspeha/neuspeha; retry mehanizam.
- Webhook/API sinhronizacija stanja plaćenosti (ako ERP može slati nazad); ili manualni update „Plaćeno" od strane role Finance.

### 4.12 Modul — Notifikacije

- In-app + email + opcionalno mobile push.
- Tipovi notifikacija:
  - Novi Opportunity dodeljen meni
  - Follow-up dospeo
  - Opportunity zapela u fazi > X dana
  - Forecast ovog meseca ispod target-a
  - Stara interakcija sa top-partnerom
  - Potvrđena kampanja
  - Istekla kampanja
  - Nova pozicija rezervisana / otpuštena
  - Istekla komunalna naknada
  - Dodano novo vozilo
  - Novi pristup ličnim podacima (za Admin/DPO)
- Svaki tip se može uključiti/isključiti po korisniku.

### 4.13 Modul — Izveštaji i KPI

- Pipeline report (po vlasniku / timu / zemlji).
- Win rate (po vlasniku / po tipu partnera / po fazi gubitka).
- Prosečno trajanje ciklusa (po Stage-u).
- Prosečna veličina posla po segmentu.
- Conversion rate Opportunity → Kampanja.
- Utilizacija inventara (% popunjenosti MediaBook plana po zemlji/gradu/tipu).
- Top-10 klijenata po godišnjem prometu.
- Neplaćena potraživanja (aging buckets: 0–30 / 31–60 / 61–90 / 90+).
- Izvoz svakog izveštaja u XLSX/PDF.

### 4.14 Modul — Multi-company / multi-country

- Entitet `PravnoLice` (IMG MNE, IMG SRB, IMG HRV, IMG BIH) sa svojim poreskim podacima, valutom, bankovnim računima.
- Izolacija podataka po `PravnoLice`. Country Manager pristupa samo svome; Admin sa eksplicitnim pravom preklapanja.
- Lokalizacija UI (sr-Cyrl, sr-Latn, hr, bs, crnogorski / en kao fallback).
- Vremenska zona: podrazumevana po pravnom licu; prikazi u lokalnoj TZ.

### 4.15 Modul — GDPR / ZoZLP

- Registar obrada (jedan po zemlji + konsolidovani pregled).
- Legal basis po tipu ličnog podatka (kontakti partnera, korisnici sistema, log podaci).
- Retention policy u konfiguraciji; automatski task briše/pseudonimizira istekle zapise.
- Operacija „Pravo na zaborav" — Admin unosi subjekta, sistem pretražuje sve entitete, pravi izveštaj, izvršava pseudonimizaciju i ostavlja trag.
- Operacija „Pravo na pristup" — generiše izveštaj svih ličnih podataka subjekta sa izvorima.
- Audit log pristupa ličnim podacima (ko, kada, koji podatak).

### 4.16 Modul — Audit log

- Svaka mutacija bilo kog entiteta: ko, šta (entitet, id), koja promena (diff), kada, sa kojeg IP-a, user agent.
- Read log se vodi samo za klase entiteta koje sadrže lične podatke.
- Log nije modifikabilan iz UI; samo append.
- Retencija minimum 24 meseca.

### 4.17 Modul — Administracija sistema

- Upravljanje korisnicima (sa dropdownom rola, ne slobodnim tekstom).
- Upravljanje pravnim licima i lokalizacijama.
- Konfiguracija Stage-ova, Lost reason-a, tipova aktivnosti, tipova notifikacija.
- Upravljanje šablonima fakture/predračuna po zemlji.
- Pregled audit log-a sa filterima.
- Background jobs status (retention cleanup, finansijski handoff, notifikacije).

---

## 5. Nefunkcionalni zahtevi

**Performanse:** P95 response time API < 300 ms pod opterećenjem 50 istovremenih korisnika; dashboard se učitava < 1.5 s sa podacima za godinu dana.
**Skalabilnost:** horizontalno skaliranje app sloja (stateless); baza kroz read replike ako potrebno.
**Dostupnost:** cilj 99.5% mesečno; plan backupa baze min 1x dnevno sa retencijom 30 dana.
**Bezbednost:** OWASP ASVS L2; HTTPS obavezno; HSTS; secure cookies; CSRF zaštita; SQL injection prevencija (parametarizovane querije); validacija na backendu; rate limiting; security headers.
**Pristupačnost:** WCAG 2.1 AA gde god izvodljivo.
**Posmatranje:** strukturirani JSON log; tracing (OpenTelemetry ili ekvivalent); error tracking (Sentry ili ekvivalent).
**Lokalizacija:** svi tekstovi kroz i18n key-eve, bez hardkodovanih stringova.

---

## 6. Tech stack — preporuka, ne obaveza

Claude Code može izabrati stack, ali **mora obrazložiti izbor i dokumentovati ga u `ADR-0001.md`** (Architecture Decision Record). Preporučeni izbori i njihove prednosti:

**Opcija 1 (preporuka):** TypeScript full-stack.
- Next.js (App Router) + tRPC ili REST + Prisma + PostgreSQL + Tailwind + shadcn/ui
- Prednosti: visok tempo razvoja, jedan jezik, odličan tooling, laka migracija tima.

**Opcija 2:** .NET 8 + Angular + PostgreSQL.
- Bliska postojećem stacku Izvršioca (PrimeNG/Angular); lakše preuzimanje ako tim ostane u regionu.

**Opcija 3:** Laravel 11 + Vue 3 (Inertia) + PostgreSQL.
- Brz MVP ako je dostupan PHP senior tim.

**Obavezno (ne diskutabilno):**
- Baza: PostgreSQL (multi-schema ili tenant kolone za multi-country — odluka u ADR-0002).
- Migracije: obavezne, code-first (Prisma migrate / Flyway / EF migrations / Laravel migrations).
- Testing: unit + integration + end-to-end (Playwright/Cypress).
- CI: GitHub Actions ili ekvivalent sa obaveznim gate-om na PR (lint + test + build).
- Container: Docker + docker-compose za lokalni razvoj.

---

## 7. Struktura repozitorijuma (očekivana)

```
/
├── README.md                  # onboarding za developera
├── CLAUDE.md                  # ovaj dokument (ili prompt.md)
├── docs/
│   ├── adr/                   # Architecture Decision Records
│   │   ├── ADR-0001-tech-stack.md
│   │   ├── ADR-0002-multitenancy.md
│   │   └── …
│   ├── domain-model.md        # entiteti, relacije, ERD
│   ├── api.md                 # API specifikacija
│   ├── rbac-matrix.md         # matrica dozvola
│   ├── i18n.md                # jezici i format
│   ├── deployment.md
│   └── uat/
│       ├── uat-plan.md
│       └── uat-scenarios.md
├── apps/                      # (ili src/, zavisno od stacka)
├── packages/                  # shared libs, tipovi, ui kit
├── prisma/ (ili migrations/)
├── tests/
├── .github/workflows/
├── docker-compose.yml
└── .env.example
```

---

## 8. Model podataka — ključni entiteti (nije iscrpno)

- `PravnoLice` (id, naziv, zemlja, valuta, PIB, šablon fakture, TZ, jezik)
- `Korisnik` (id, pravnoLiceId, email, hash, 2FA, status)
- `Rola` (id, naziv, opis)
- `KorisnikRola` (id, korisnikId, rolaId, pravnoLiceId)
- `Dozvola` (id, rolaId, modul, akcija)
- `Partner` (id, pravnoLiceId, tip, segment, matični broj, PIB/VAT, zemlja, …)
- `Kontakt` (id, partnerId, legalBasis, email, telefon, …)
- `Aktivnost` (id, partnerId, kontaktId, opportunityId, tip, datum, ishod, autorId)
- `Opportunity` (id, pravnoLiceId, vlasnikId, partnerId, stage, probability, expValue, expCloseDate, lostReason, …)
- `Kampanja` (id, opportunityId nullable, partnerId, period, status, …)
- `Vozilo` (id, pravnoLiceId, registracija, tip, grad, agencijaId)
- `Pozicija` (id, voziloId, tip, dimenzije, cenaPoPeriodu)
- `Rezervacija` (id, pozicijaId, kampanjaId nullable, opportunityId nullable, status [hold/confirmed/cancelled], od, do)
- `Dokument` (id, tip, broj, partnerId, kampanjaId, pravnoLiceId, podzbir, pdv, ukupno, valuta, status)
- `DokumentStavka` (id, dokumentId, …)
- `KomunalnaNaknada` (id, voziloId, odDo, iznos, statusPlacanja)
- `Notifikacija` (id, korisnikId, tip, poruka, procitano, datum)
- `AuditLog` (id, korisnikId, entitet, entitetId, akcija, diff, ip, userAgent, timestamp)
- `LicniPodatakPristup` (id, korisnikId, subjektTip, subjektId, timestamp, svrha)

Svi entiteti imaju: `createdAt`, `updatedAt`, `deletedAt` (soft delete gde je semantički opravdano), `createdBy`, `updatedBy`.

---

## 9. API principi

- REST (ili tRPC) po modulu; JSON; konzistentna konvencija imenovanja.
- Pagination kursorska ili offset (dokumentovati odabir).
- Filter/sort/search kroz query parametre; validacija na backendu (Zod/FluentValidation/ekvivalent).
- Error format: `{ code, message, details? }` sa stabilnim kodovima.
- Autorizacija po svakom endpointu kroz RBAC middleware; nijedan endpoint bez eksplicitne dozvole.
- OpenAPI/Swagger spec automatski generisan i serviran u `/api/docs` (samo Admin u produkciji).

---

## 10. UI/UX smernice

- Informaciono gusti ekrani za prodavce (Dashboard „Danas", Pipeline) — što manje klikova do uvida.
- Formulari sa inline validacijom, auto-save drafta za duže forme (Opportunity, Dokument).
- Obavezna podrška tastaturi za osnovne radnje (N za novi, F za filter, / za search, Esc za zatvaranje).
- Dizajn sistem: shadcn/ui ili ekvivalent; jedan dizajn token set; dark mode opcionalan.
- Mobile responsive za Sales Rep tokom terena (pipeline, Opportunity, kontakt).

---

## 11. Seed podaci

Po završetku migracija, obavezan seed skript koji unosi:

- 4 pravna lica (MNE, SRB, HRV, BIH)
- 6 rola sa matricom dozvola
- 8 fiktivnih korisnika raspoređenih po rolama i zemljama
- 30 partnera (mešavina direktnih / agencija / posrednika / regionalnih provajdera)
- 60 kontakata
- 20 vozila sa pozicijama
- 50 Opportunity-ja u različitim Stage-ovima, sa aktivnostima
- 15 potvrđenih kampanja
- 10 predračuna/faktura

Seed skript mora biti idempotentan (može se pokrenuti više puta bez duplikata).

---

## 12. Testovi — obavezni pokrivanje

**Unit:** minimum 70% line coverage na servisima/domenskim funkcijama.
**Integration:** svaki modul ima test koji vrti pravu bazu u docker-compose-u i pokriva happy path + 2-3 edge case-a.
**E2E (Playwright/Cypress):** minimum 8 scenarija:

1. Prijava korisnika + RBAC negativan test (rola ne vidi tuđe podatke).
2. Kreiranje Opportunity → hold pozicije → Won → kampanja → potvrđena rezervacija.
3. Opportunity u Lost sa obaveznim Lost reason-om.
4. Dashboard Sales Rep vs Sales Manager (različita KPI).
5. Multi-country izolacija (korisnik MNE ne vidi partnere SRB).
6. Kreiranje fakture → izvoz za ERP (fajl generisan).
7. Pravo na zaborav — partner pseudonimizovan, audit ostao.
8. Istekla komunalna naknada → notifikacija poslata.

**Testovi zaštite (security):** test da svaki endpoint traži auth; test RBAC leak-a; test rate limit-a na login-u.

---

## 13. Plan rada (predloženi milestoneovi)

Claude Code može predložiti izmenu plana, ali mora dobiti odobrenje. Predlog:

- **M0 — Bootstrap (1–2 dana):** repo, CI, docker-compose, izbor stacka, ADR-0001.
- **M1 — Autentifikacija + RBAC + Admin korisnici (3–5 dana):** role, matrica, korisnici, 2FA.
- **M2 — Partneri + kontakti + aktivnosti (3–4 dana).**
- **M3 — Opportunity + Pipeline + Lost reason (4–6 dana).**
- **M4 — Vozila + pozicije + MediaBook plan + hold (4–6 dana).**
- **M5 — Kampanje + konverzija Opportunity→Kampanja (3–4 dana).**
- **M6 — Dokumenti (predračun/faktura) + finansijski handoff (3–5 dana).**
- **M7 — Dashboard „Danas" + KPI + izveštaji (3–5 dana).**
- **M8 — Multi-country izolacija + lokalizacija (3–4 dana).**
- **M9 — GDPR/ZoZLP modul + audit log (2–3 dana).**
- **M10 — Notifikacije + podsetnici (2 dana).**
- **M11 — Hardening, performanse, security pen test, UAT (3–5 dana).**

Na kraju svakog M-a: prelazi se kroz DoD (poglavlje 14); bez odobrenja DoD-a ne kreće sledeći M.

---

## 14. Definition of Done (obavezno za svaki milestone)

Milestone se smatra isporučenim tek kada:

1. Sav novi kod ima testove u skladu sa zahtevima poglavlja 12.
2. CI (lint + test + build) prolazi na glavnoj grani.
3. Migracije baze su reverzibilne (`up` + `down`) i testirane.
4. Seed skript uspešno puni podatke za novi modul.
5. Dokumentacija ažurirana: `docs/domain-model.md`, `docs/api.md`, `docs/rbac-matrix.md`, ADR-ovi.
6. `README.md` ažuriran: kako pokrenuti lokalno, kako izvršiti seed, kako pustiti testove.
7. UI prolazi manualni smoke test po UAT scenariju iz `docs/uat/uat-scenarios.md`.
8. RBAC zaštita verifikovana automatskim testom.
9. Audit log trag zabeležen za nove akcije.
10. Security check: nove rute proverene protiv OWASP Top 10 šeme.

---

## 15. UAT (user acceptance testing) — šta Naručilac testira na prijemu

UAT se izvodi po scenarijima u `docs/uat/uat-scenarios.md`. Obavezan minimum:

1. Naručilac prijavljuje 3 korisnika sa različitim rolama i verifikuje da svaka vidi samo svoje.
2. Sales Rep prolazi kroz ceo ciklus: partner → Opportunity → Stage kroz Stage → Won → kampanja.
3. Country Manager vidi KPI i pipeline filtrirane po svojoj zemlji.
4. Finance generiše batch izvoz faktura i dobija fajl u očekivanom formatu.
5. Admin pokreće „Pravo na zaborav" i dobija izveštaj + verifikuje pseudonimizaciju.
6. Admin pokreće backup → obriše test podatke → restauriše iz backupa.
7. Performance test 50 paralelnih korisnika na staging-u.
8. Security: penetracioni test minimum po OWASP ZAP pravilima, bez High/Critical otvorenih.

Prijem je potpisan tek nakon što svi UAT scenariji prolaze.

---

## 16. Pravila rada za Claude Code agenta

Kada Claude Code radi na ovom projektu, mora se pridržavati:

- **Pre koda — plan.** Svaki milestone otvara brief plan (`docs/plans/M<N>.md`) sa listom zadataka, rizicima i pitanjima za Naručioca.
- **Male izmene, česti komitovi.** Nema komitova preko 400 LOC izmene bez opravdanja.
- **PR-ovi sa opisom.** Šablon PR opisa: šta je rešeno, kako je testirano, koji scenariji UAT pokriva, šta ne pokriva.
- **Nema tajni u repozitorijumu.** `.env.example` da, `.env` ne. Secrets preko CI/CD secret manager-a.
- **Nikad direktno u `main`.** Svi radovi kroz feature grane i PR-ove.
- **Ako otkrije da PZ nije dovoljno precizan, postavlja pitanje Naručiocu pre nego što pretpostavi.**
- **Kopiranje iz postojećeg Mediabook-a (CODIS instance) je zabranjeno** — novi sistem se gradi od nule, pravno čist.
- **Struktura podataka ne sme sadržati polja kao „slobodan tekst umesto FK"** za bilo šta što je po PZ predefinisana lista (Stage, Rola, tip partnera, Lost reason, itd.).

---

## 17. Ulazi Naručioca koje Claude Code može očekivati

- Ovaj dokument (PZ / prompt).
- Dokument `05_PZ_Faze_1_CRM.docx` — originalni PZ Faze 1 CRM (izvor autoriteta za CRM deo).
- Dokument `01_Evaluacija_postojeceg_resenja.docx` — ocena stare aplikacije Izvršioca.
- Dokument `06_Kritika_Mediabook_vs_PZ_Faze1.docx` — kritika Mediabook aplikacije mereno prema PZ.
- Dokument `04_Predlog_novog_ugovora.docx` — predložene ugovorne odredbe; pravila rada se moraju slagati sa njim.
- Pristupne podatke za demo nalog Izvršioca (samo za referencu, ne za kopiranje koda).
- Primer fiskalnog formata fakture po zemlji (dostavlja IMG finansije).

---

## 18. Šta je van obima ovog prompta (za kasnije faze)

- Integracija sa programatskim/DOOH platformama za dinamički sadržaj na LED vozilima (Faza 2 ili 3).
- Mobilna aplikacija za vozače / kontrolore kampanje.
- Telemetrija sa vozila (GPS dokaz prikaza, impression verification).
- BI warehouse i napredna analitika preko CRM podataka.
- Samouslužni portal za klijenta.

---

## 19. Završne napomene za Claude Code

Ovaj dokument je zahtev Naručioca. Ne menjaj ga iz koda. Ako naiđeš na nesaglasnost u zahtevima, zabeleži pitanje u `docs/open-questions.md` i nastavi sa konzervativnom pretpostavkom koja ne narušava DoD.

Svaka nejasnoća mora biti rešena kroz pitanje Naručiocu, ne kroz pretpostavku koja se „može ispraviti kasnije".

Na kraju projekta, deliverable Naručiocu je:

1. Repozitorijum sa prolaznim CI-em na `main`.
2. Staging deployment sa seed podacima.
3. Kompletna dokumentacija u `docs/`.
4. UAT izveštaj sa potpisom Naručioca.
5. Plan produkcionog deploymenta sa rollback procedurom.

Kraj dokumenta.
