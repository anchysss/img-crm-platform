# Princip rada i okvir ugovora

## 1. Fazno izvršenje

Projekat se realizuje **fazno**, u skladu sa modulima definisanim u:
- Projektnom zadatku Faze 1 (`docs/pz-faza-1-crm.md`)
- Projektnom zadatku Faze 2 (dostavlja Naručilac pre starta Faze 2)

Faze su nezavisne funkcionalne i finansijske celine.
**Naručilac nije u obavezi** da realizuje sve faze — svaka sledeća faza se pokreće
zasebnim nalogom ili aneksom ugovora.

## 2. Funkcionalni zahtevi per fazi

Za svaku fazu se definišu:
- **funkcionalni zahtevi** (šta sistem radi)
- **kriterijumi testiranja** (kako se dokazuje da radi)
- **kriterijumi prihvatanja** (minimum za potpis primopredaje)

Dokumenti moraju biti **potpisani od strane oba ugovorna lica pre starta faze**.
Promene u toku faze rade se kroz pisani change request.

## 3. Primopredaja

Završetak faze potvrđuje se **Zapisnikom o primopredaji**, koji:
- taksativno listira ispunjene kriterijume prihvatanja
- navodi eventualne "minor" nedostatke koji ne blokiraju prihvatanje (sa rokom otklanjanja)
- **predstavlja osnov za plaćanje te faze**

Bez potpisanog zapisnika nema plaćanja.

## 4. Stabilizacioni period (besplatan)

Nakon primopredaje svake faze otvara se **stabilizacioni period od 30 dana** u kojem se
**bez dodatne naknade** otklanjaju:
- funkcionalni nedostaci prema ispunjenim kriterijumima prihvatanja
- UX bug-ovi
- performance problemi koji ne ispunjavaju NFR iz PZ-a

Stabilizacioni period **nije** održavanje i **nije** vreme za nove funkcionalnosti.

## 5. Održavanje (komercijalno)

Održavanje počinje **nakon** stabilizacionog perioda za pojedinačnu fazu.

Trajanje:
- **12 meseci** od dana prihvatanja te faze (preporuka; trajanje se potvrđuje pred potpis).
- Cilj: omogućiti "dotezanje" rešenja uz kontrolisan trošak.

Obuhvata:
- ispravke grešaka
- manje funkcionalne dorade (sitne UI izmene, dodavanje jednostavnih polja, izveštaja)
- optimizacija performansi
- pomoć pri upgrade-u zavisnosti

**Ne obuhvata** (definiše se kao nova faza):
- nove module
- integracije sa eksternim sistemima koji nisu u PZ
- refactor/redizajn

### 5.1 Cena održavanja

Cena održavanja se obračunava **proporcionalno učešću konkretne faze u ukupnoj vrednosti razvoja**.

Primer:
- Ukupni razvoj (Faze 1+2) = 25 000 EUR
- Faza 1 = 15 000 EUR (60% ukupnog)
- Godišnje održavanje za celokupno rešenje = 5 000 EUR (predlog)
- Održavanje Faze 1 = 3 000 EUR/god (60% × 5 000)

Fakturiše se mesečno (npr. 250 EUR/mes za Fazu 1 u ovom primeru).

## 6. Plaćanje

| Trenutak | Iznos | Osnov |
|---|---|---|
| Potpis ugovora | 0 EUR | Avans se **ne plaća** |
| Primopredaja Faze 1 (potpisan zapisnik) | Cena Faze 1 × 70% | Faktura izvođača |
| Kraj stabilizacionog perioda Faze 1 (30 dana) | Cena Faze 1 × 30% | Faktura izvođača |
| Identično za svaku sledeću fazu | | |
| Održavanje | Mesečna rata | Tekući mesec unapred |

**Retroaktivno plaćanje se ne dozvoljava.** Nijedna rata ne sme biti vezana za datum pre potpisivanja
ugovora ili pre primopredaje odgovarajuće faze.

## 7. Intelektualna svojina

- Naručilac stiče **pun imovinski autorski prava** nad izrađenim softverom
  odmah po plaćanju svake faze u celosti.
- Izvođač **garantuje** da ne koristi tuđi tuđi kod, dizajn, bazu, niti funkcionalnu logiku
  nad kojima nema prava (uključujući but not limited to `bcMediaBox` i slična rešenja konkurencije).
- Povreda ove klauzule je **osnov za raskid ugovora** i povraćaj plaćenih iznosa.

## 8. Testiranje i period testiranja

- **Period testiranja** od strane Naručioca traje minimalno **30 radnih dana** po fazi.
- Tokom testiranja Naručilac dostavlja **listu nedostataka** u pisanoj formi.
- Izvođač je dužan da odgovori u roku od 5 radnih dana planom otklanjanja.
- Period testiranja **ne uračunava se u stabilizacioni period**.

## 9. Raskid

Ugovor može da se raskine:

- **Bez naknade**: ako Izvođač ne isporuči fazu u roku + 30 dana tolerancije.
- **Sa naknadom proporcionalnom realizovanom**: ako Naručilac odustane od daljih faza,
  plaća se samo dovršena faza (kroz primopredaju).

## 10. Sukob interesa

Pre potpisivanja ugovora, Izvođač i Naručilac dužni su da pisano izjave:
- eventualne **porodične ili poslovne veze** sa zaposlenima druge strane
- eventualni **finansijski interes** u suprotnoj strani

Nepoštovanje ove klauzule je osnov za **ništavost ugovora**.

## 11. SLA (osnovni)

- Response time na P1 incident (sistem ne radi): 4 radna sata
- Response time na P2 incident (ključna funkcija ne radi): 1 radni dan
- Response time na P3 (minor bug): 3 radna dana
- Dostupnost produkcionog rešenja: 99.5% mesečno

## 12. Dokumentacija

Izvođač je dužan da za svaku fazu isporuči:
- ažurirani **ERD** (domain model)
- **API specifikaciju** (OpenAPI ili ekvivalent)
- **Deployment uputstvo**
- **Rollback procedura**
- **Korisnička uputstva** za krajnje korisnike

Bez kompletne dokumentacije primopredaja se **odbija**.

---

Ovaj dokument je **osnova za novi ugovor** koji zamenjuje predlog od 25.12.2025.
