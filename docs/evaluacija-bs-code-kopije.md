# Evaluacija Codis rešenja (pilot isporuka 01.10.2025)

## 1. Kontekst

Naručilac (IMG) je tokom jula 2025. doneo odluku o razvoju CRM + pratećih modula za
transit media poslovanje. Razmatrane su dve opcije:

- **Opcija A — SaaS + nadogradnja**: Intrix ili Pipedrive (≈ 10 EUR/mesečno po licenci)
  sa custom nadogradnjom za prodajnu ponudu za autobuse i rezervaciju vozila.
  Kratak time-to-value (1–2 meseca), minimalan vendor lock, predvidiv troškovnik.

- **Opcija B — custom razvoj**: fiks cena (≈ 25 000 EUR) sa fazno plaćanje prema ispunjenim
  funkcionalnim isporukama, održavanje kao zasebna (kratkoročna) usluga.

Finansijski direktor BiH entiteta predložio je firmu **Codis** (vlasnik Marko, poslovni kum),
uz obavezu da prvu fazu isporuči **besplatno kao pilot** kako bi dokazao kompetenciju.

Isporuka je primljena 01.10.2025.

## 2. Nalazi — šta je zapravo isporučeno

### 2.1 Forma
- Aplikacija je 100% funkcionalna **kopija interfejsa i funkcionalnog skeleta BS code (bcMediaBox)** rešenja.
- Imena formi, redosled polja, tok kampanje, brending paleta, layout ekrana — praktično identični.
- Osnovna baza podataka dizajnirana je oko modela "inventar + rezervacija", bez prodajnog layera.

### 2.2 Šta nedostaje u odnosu na Projektni zadatak Faze 1
| Zahtev PZ | Status u isporuci | Opaska |
|---|---|---|
| Klijent (Account) sa statusima Active / Seasonal / High potential / Low potential / Not advertising / Competitor locked | ❌ Ne postoji | Postoji samo "Aktivan/Neaktivan/Blokiran" |
| Komunikacija i aktivnosti (sastanak/poziv/email/follow-up) sa "Next action" | ❌ Parcijalno | Ima slobodno polje "napomena" ali bez tipologije i bez Next action tajmera |
| Notifikacije ("Danas treba da uradiš") | ❌ Ne postoji | Nema per-user tabele obaveza; nema login push-a |
| Opportunity sa fazama Lead → Contacted → Offer sent → Negotiation → Verbal → Won/Lost | ❌ Ne postoji | Sistem nema Opportunity, samo kampanju. Fazu 4.4 PZ interpretira kao status kampanje. |
| Weighted pipeline (Offer 50% / Negotiation 70% / Verbal 90%) | ❌ Ne postoji | Nema bilo kakvog forecast-a ili weighted-a |
| Lost deal mora imati razlog (cena/konkurencija/agencija/budžet) | ❌ Ne postoji | Gubici se ne beleže |
| Ponuda sa statusom draft/poslata/prihvaćena/odbijena + povezivanje sa Opportunity | ⚠️ Delimično | Postoji "predračun" ali je vezan za kampanju, ne za prodajnu priliku |
| Follow-up automation (5 dana bez odgovora, reactivation list) | ❌ Ne postoji | Nema cron-a, nema listi kandidata |
| KPI po prodavcu (sastanci, pozivi, ponude, zatvoreni poslovi, pipeline 90d) | ❌ Ne postoji | Nema KPI modula |
| Forecast accuracy | ❌ Ne postoji | |
| Conversion funnel (Lead→Offer→Negotiation→Won) | ❌ Ne postoji | |
| Time-in-stage alarm | ❌ Ne postoji | |
| Lost reason analytics | ❌ Ne postoji | |
| Most sa finansijama (Won → push) | ❌ Ne postoji | Nema API-ja ka finansijama, nema statusa naplate, nema cash flow projekcije |
| Most je statusu plaćanja (fakturisano/naplaćeno/kasni) | ❌ Ne postoji | |
| Cash flow projekcija | ❌ Ne postoji | |
| RBAC — 6 rola sa matricom dozvola + tenant izolacija (multi-country MNE/SRB/HRV/BIH) | ❌ Ne postoji | Sve su hardkodovane role, bez matrice |
| Audit log / GDPR / Pravo na zaborav | ❌ Ne postoji | |
| 2FA za Admin/Finance/Country Manager | ❌ Ne postoji | |
| Finansijski handoff (SRB SEF / HRV Fina / MNE / BIH formati) | ❌ Ne postoji | |
| Plan fakturisanja sa auto-split po mesecima kad kampanja prelazi mesece | ❌ Ne postoji | |
| Cenovnik + Paketi (BG 5/10/20 vozila nalog za spoljašnjost) | ❌ Ne postoji | |
| Godišnji plan prodavaca po kategoriji delatnosti × mesec | ❌ Ne postoji | |
| Dnevni plan (opis + analiza tržišta) | ❌ Ne postoji | |
| Radni nalog — automatski iz Won ponude + notifikacija logistici | ❌ Ne postoji | |
| MediaBook daily/weekly/monthly view | ❌ Parcijalno | Samo jedan view |
| Bulk import/export (CSV/XLSX) partneri, kontakti, vozila | ❌ Ne postoji | |
| Offer export u XLSX (IMG template) i PDF | ❌ Parcijalno | Ima PDF kampanje, nema "ponude" |

### 2.3 Šta jeste u isporuci
- Osnovni CRUD vozila + pozicija + rezervacija.
- Kalendar rezervacija (MediaBook-like).
- Partneri i kontakti kao flat liste (bez segmentacije).
- Predračun/faktura generisanje vezano za kampanju.

### 2.4 Pravni i IP rizici
- Kopiranje interfejsa i funkcionalnog skeleta BS code rešenja bez licencnog prava
  izlaže naručioca **riziku tužbe za povredu autorskog prava, know-how-a i poslovne tajne**.
- Ovo je ozbiljan razlog za **apsolutno odbijanje** isporuke u trenutnom obliku — čak i da je
  funkcionalno potpuno, pravna rizičnost čini rešenje neupotrebljivim bez čiste refactor-isporuke.

## 3. Proces — dodatni nalazi

- Razvoj je trajao **mesec dana** (jul–septembar interno, isporuka 01.10.2025).
  Obim isporuke (kompletan CRM + prodaja + inventar + finansije) realno zahteva
  4–6 meseci tima od 2–3 seniora. Vreme ukazuje da je rešenje `bcMediaBox` direktno kopirano.
- Od 01.10.2025 do 26.12.2025 (~3 meseca) **developer Marko nije odgovarao na mejlove i pozive**.
  Kontakt je uspostavljen tek nakon direktnog poziva vlasniku (Codis) — što znači da je naručilac
  praktično bio bez support-a tokom testnog perioda.
- BiH tim je popunio bazu i testirao, ali **nije imao ovlašćenje ili interes da formalno
  odbije isporuku** — zaposleni koriste ono što dobiju.
- Finansijski direktor BiH entiteta je predložio **ugovor 25.12.2025** koji:
  - uvodi **neograničeno održavanje** kao obavezu naručioca;
  - retroaktivno obavezuje **prvu tranšu plaćanja 31.12.2025** (6 dana od potpisa);
  - definiše testni period od **15 dana** (nedovoljno za softver ove složenosti);
  - nema specifikaciju po fazama sa cenom po fazi;
  - štiti pretežno **izvođača**, ne naručioca.
- Sam izbor izvođača ima **potencijalni sukob interesa** (kum FD-a BiH).

## 4. Zaključak

**Isporuka se odbija.** Postojeće rešenje:
1. Nije u skladu sa Projektnim zadatkom Faze 1 (>80% zahteva nije pokriveno).
2. Predstavlja IP rizik (kopija BS code).
3. Nema dokumentaciju, test coverage, ni bezbednosne kontrole.

## 5. Preporuka za nastavak

Naručilac nastavlja razvoj po jednom od dva scenarija:

**Scenario A — refactor pod nadzorom**
Codis (ili drugi izvođač) dobija **jasan PZ Faze 1** i **definiciju prihvatanja**, uz:
- fazno plaćanje (5 podfaza × ~5 000 EUR),
- stabilizacioni period 30 dana per fazu bez naknade,
- ograničeno održavanje (npr. 12 meseci proporcionalno učešću faze),
- zabranu reuse-ovanja tuđeg koda (klauzula o IP-ju).

**Scenario B — SaaS + nadogradnja**
IMG uzima **Pipedrive/Intrix** licence (~10 EUR/mes × 8 korisnika ≈ 960 EUR/god) i
naručuje samo **2 custom modula**:
- rezervacija vozila + MediaBook (cca 8 000 EUR),
- offer XLSX/PDF generator (cca 3 000 EUR).

### Referentno rešenje
Ova platforma (`img-crm-platform`, https://img-crm-platform.vercel.app) demonstrira
kompletan opseg Faze 1 i predstavlja **kriterijum prihvatanja** bilo kog ugovorenog izvođača.
Ako Codis ne može da ponudi najmanje funkcionalno ekvivalentnu isporuku pod jasnim PZ-om,
prelazak na Scenario B je racionalno rešenje.

## 6. Pravni sledeći korak

Trenutno predloženi ugovor od 25.12.2025 se **ne potpisuje**. Novi ugovor se priprema
na osnovu principa iz dokumenta `docs/princip-rada-i-ugovor.md`.
