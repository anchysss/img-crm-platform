-- CreateEnum
CREATE TYPE "RolaKod" AS ENUM ('ADMIN', 'COUNTRY_MANAGER', 'SALES_MANAGER', 'SALES_REP', 'FINANCE', 'READ_ONLY');

-- CreateEnum
CREATE TYPE "AkcijaDozvole" AS ENUM ('READ', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'APPROVE');

-- CreateEnum
CREATE TYPE "PartnerTip" AS ENUM ('DIRECT', 'AGENCY', 'RESELLER', 'PROVIDER');

-- CreateEnum
CREATE TYPE "Segment" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('AKTIVAN', 'NEAKTIVAN', 'BLOKIRAN');

-- CreateEnum
CREATE TYPE "LegalBasis" AS ENUM ('CONSENT', 'CONTRACT', 'LEGITIMATE_INTEREST', 'LEGAL_OBLIGATION');

-- CreateEnum
CREATE TYPE "AktivnostTip" AS ENUM ('POZIV', 'SASTANAK', 'MAIL', 'PONUDA', 'POSETA', 'OSTALO');

-- CreateEnum
CREATE TYPE "OppIzvor" AS ENUM ('INBOUND', 'OUTBOUND', 'REFERRAL', 'EXISTING_CLIENT', 'AGENCY');

-- CreateEnum
CREATE TYPE "StageKod" AS ENUM ('NEW', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'VERBALLY_CONFIRMED', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "LostReasonKod" AS ENUM ('CENA', 'KONKURENCIJA', 'TIMING', 'BEZ_ODLUKE', 'DUPLIKAT', 'OSTALO');

-- CreateEnum
CREATE TYPE "VoziloTip" AS ENUM ('BUS', 'MINI', 'DRUGO');

-- CreateEnum
CREATE TYPE "VoziloStatus" AS ENUM ('AKTIVNO', 'SERVIS', 'POVUCENO');

-- CreateEnum
CREATE TYPE "PozicijaTip" AS ENUM ('CELO_VOZILO', 'ZADNJI_DEO', 'BOK_LEVO', 'BOK_DESNO', 'UNUTRA', 'DRUGO');

-- CreateEnum
CREATE TYPE "RezervacijaStatus" AS ENUM ('HOLD', 'CONFIRMED', 'RUNNING', 'CANCELLED', 'RELEASED');

-- CreateEnum
CREATE TYPE "StatusPlacanja" AS ENUM ('NEPLACENO', 'DELIMICNO', 'PLACENO');

-- CreateEnum
CREATE TYPE "KampanjaStatus" AS ENUM ('POTVRDENA', 'U_REALIZACIJI', 'ZAVRSENA', 'OTKAZANA');

-- CreateEnum
CREATE TYPE "DokumentTip" AS ENUM ('PREDRACUN', 'FAKTURA', 'AVANS', 'STORNO');

-- CreateEnum
CREATE TYPE "DokumentStatus" AS ENUM ('OTVOREN', 'PLACEN', 'DELIMICNO_PLACEN', 'STORNIRAN', 'OTKAZAN');

-- CreateEnum
CREATE TYPE "HandoffFormat" AS ENUM ('SRB_SEF', 'MNE_STD', 'HRV_FINA', 'BIH_STD');

-- CreateEnum
CREATE TYPE "HandoffStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "NotifikacijaTip" AS ENUM ('OPP_DODELJEN', 'FOLLOWUP_DOSPEO', 'OPP_ZAPEO', 'FORECAST_ISPOD_TARGETA', 'STARA_INTERAKCIJA', 'KAMPANJA_POTVRDENA', 'KAMPANJA_ISTEKLA', 'POZICIJA_REZERVISANA', 'POZICIJA_OTPUSTENA', 'KOMUNALNA_ISTEKLA', 'VOZILO_DODANO', 'PII_PRISTUP');

-- CreateEnum
CREATE TYPE "AuditAkcija" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'EXPORT', 'STAGE_CHANGE', 'HOLD_CREATE', 'HOLD_RELEASE', 'TENANT_OVERRIDE', 'GDPR_ERASURE', 'GDPR_ACCESS', 'PERMISSION_CHANGE', 'INVOICE_GENERATE', 'HANDOFF_BATCH');

-- CreateTable
CREATE TABLE "PravnoLice" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "naziv" TEXT NOT NULL,
    "zemlja" TEXT NOT NULL,
    "valuta" TEXT NOT NULL,
    "pib" TEXT NOT NULL,
    "tz" TEXT NOT NULL DEFAULT 'Europe/Podgorica',
    "jezik" TEXT NOT NULL DEFAULT 'sr-Latn',
    "sablonFakture" TEXT NOT NULL DEFAULT 'default',
    "stopaPdv" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PravnoLice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Korisnik" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "ime" TEXT NOT NULL,
    "prezime" TEXT NOT NULL,
    "aktivan" BOOLEAN NOT NULL DEFAULT true,
    "twoFaSecret" TEXT,
    "twoFaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Korisnik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rola" (
    "id" TEXT NOT NULL,
    "kod" "RolaKod" NOT NULL,
    "naziv" TEXT NOT NULL,
    "opis" TEXT,

    CONSTRAINT "Rola_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KorisnikRola" (
    "id" TEXT NOT NULL,
    "korisnikId" TEXT NOT NULL,
    "rolaId" TEXT NOT NULL,
    "pravnoLiceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KorisnikRola_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dozvola" (
    "id" TEXT NOT NULL,
    "rolaId" TEXT NOT NULL,
    "modul" TEXT NOT NULL,
    "akcija" "AkcijaDozvole" NOT NULL,

    CONSTRAINT "Dozvola_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "korisnikId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "pravnoLiceId" TEXT NOT NULL,
    "naziv" TEXT NOT NULL,
    "tip" "PartnerTip" NOT NULL,
    "segment" "Segment" NOT NULL DEFAULT 'C',
    "status" "PartnerStatus" NOT NULL DEFAULT 'AKTIVAN',
    "maticniBroj" TEXT,
    "pibVat" TEXT,
    "zemlja" TEXT NOT NULL,
    "adresa" TEXT,
    "grad" TEXT,
    "napomene" TEXT,
    "vlasnikId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kontakt" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "ime" TEXT NOT NULL,
    "pozicija" TEXT,
    "email" TEXT,
    "telefon" TEXT,
    "primarni" BOOLEAN NOT NULL DEFAULT false,
    "legalBasis" "LegalBasis" NOT NULL DEFAULT 'LEGITIMATE_INTEREST',
    "izvor" TEXT,
    "pseudonimizovan" BOOLEAN NOT NULL DEFAULT false,
    "pseudonimizovanAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Kontakt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aktivnost" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT,
    "kontaktId" TEXT,
    "opportunityId" TEXT,
    "tip" "AktivnostTip" NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL,
    "opis" TEXT NOT NULL,
    "ishod" TEXT,
    "autorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Aktivnost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "pravnoLiceId" TEXT NOT NULL,
    "naziv" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "kontaktId" TEXT,
    "vlasnikId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "probability" INTEGER NOT NULL,
    "izvor" "OppIzvor" NOT NULL DEFAULT 'OUTBOUND',
    "valuta" TEXT NOT NULL,
    "expValue" DECIMAL(12,2) NOT NULL,
    "expCloseDate" TIMESTAMP(3) NOT NULL,
    "lostReasonId" TEXT,
    "lostReasonText" TEXT,
    "tags" TEXT[],
    "opis" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stage" (
    "id" TEXT NOT NULL,
    "kod" "StageKod" NOT NULL,
    "naziv" TEXT NOT NULL,
    "defaultProbability" INTEGER NOT NULL,
    "redosled" INTEGER NOT NULL,
    "aktivan" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Stage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LostReason" (
    "id" TEXT NOT NULL,
    "kod" "LostReasonKod" NOT NULL,
    "naziv" TEXT NOT NULL,
    "aktivan" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LostReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vozilo" (
    "id" TEXT NOT NULL,
    "pravnoLiceId" TEXT NOT NULL,
    "registracija" TEXT NOT NULL,
    "tip" "VoziloTip" NOT NULL,
    "agencijaVlasnikId" TEXT,
    "zemlja" TEXT NOT NULL,
    "grad" TEXT NOT NULL,
    "slikaUrl" TEXT,
    "status" "VoziloStatus" NOT NULL DEFAULT 'AKTIVNO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Vozilo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pozicija" (
    "id" TEXT NOT NULL,
    "voziloId" TEXT NOT NULL,
    "tip" "PozicijaTip" NOT NULL,
    "dimenzije" TEXT,
    "minPeriodDana" INTEGER NOT NULL DEFAULT 7,
    "cenaPoPeriodu" DECIMAL(10,2) NOT NULL,
    "valuta" TEXT NOT NULL,

    CONSTRAINT "Pozicija_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rezervacija" (
    "id" TEXT NOT NULL,
    "pozicijaId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "kampanjaId" TEXT,
    "status" "RezervacijaStatus" NOT NULL,
    "odDatum" TIMESTAMP(3) NOT NULL,
    "doDatum" TIMESTAMP(3) NOT NULL,
    "holdIstice" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rezervacija_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KomunalnaNaknada" (
    "id" TEXT NOT NULL,
    "voziloId" TEXT NOT NULL,
    "odDatum" TIMESTAMP(3) NOT NULL,
    "doDatum" TIMESTAMP(3) NOT NULL,
    "iznos" DECIMAL(10,2) NOT NULL,
    "valuta" TEXT NOT NULL,
    "statusPlacanja" "StatusPlacanja" NOT NULL DEFAULT 'NEPLACENO',
    "napomena" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KomunalnaNaknada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kampanja" (
    "id" TEXT NOT NULL,
    "pravnoLiceId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "partnerId" TEXT NOT NULL,
    "naziv" TEXT NOT NULL,
    "odDatum" TIMESTAMP(3) NOT NULL,
    "doDatum" TIMESTAMP(3) NOT NULL,
    "status" "KampanjaStatus" NOT NULL DEFAULT 'POTVRDENA',
    "valuta" TEXT NOT NULL,
    "kreativaUrl" TEXT,
    "napomene" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Kampanja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KampanjaStavka" (
    "id" TEXT NOT NULL,
    "kampanjaId" TEXT NOT NULL,
    "pozicijaId" TEXT NOT NULL,
    "odDatum" TIMESTAMP(3) NOT NULL,
    "doDatum" TIMESTAMP(3) NOT NULL,
    "cena" DECIMAL(10,2) NOT NULL,
    "valuta" TEXT NOT NULL,

    CONSTRAINT "KampanjaStavka_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dokument" (
    "id" TEXT NOT NULL,
    "pravnoLiceId" TEXT NOT NULL,
    "tip" "DokumentTip" NOT NULL,
    "broj" TEXT NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL,
    "rokPlacanja" TIMESTAMP(3),
    "partnerId" TEXT NOT NULL,
    "kampanjaId" TEXT,
    "podzbir" DECIMAL(12,2) NOT NULL,
    "pdv" DECIMAL(12,2) NOT NULL,
    "ukupno" DECIMAL(12,2) NOT NULL,
    "valuta" TEXT NOT NULL,
    "napomene" TEXT,
    "status" "DokumentStatus" NOT NULL DEFAULT 'OTVOREN',
    "stornoOdId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dokument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DokumentStavka" (
    "id" TEXT NOT NULL,
    "dokumentId" TEXT NOT NULL,
    "kampanjaStavkaId" TEXT,
    "opis" TEXT NOT NULL,
    "kolicina" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "jedinicnaCena" DECIMAL(12,2) NOT NULL,
    "popust" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "iznos" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "DokumentStavka_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NumeracijaSkok" (
    "id" TEXT NOT NULL,
    "pravnoLiceId" TEXT NOT NULL,
    "tip" "DokumentTip" NOT NULL,
    "godina" INTEGER NOT NULL,
    "poslednjiRbr" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NumeracijaSkok_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HandoffBatch" (
    "id" TEXT NOT NULL,
    "pravnoLiceId" TEXT NOT NULL,
    "format" "HandoffFormat" NOT NULL,
    "odDatum" TIMESTAMP(3) NOT NULL,
    "doDatum" TIMESTAMP(3) NOT NULL,
    "status" "HandoffStatus" NOT NULL DEFAULT 'QUEUED',
    "brojZapisa" INTEGER NOT NULL DEFAULT 0,
    "odredisteUrl" TEXT,
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HandoffBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HandoffZapis" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "dokumentId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "HandoffZapis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notifikacija" (
    "id" TEXT NOT NULL,
    "pravnoLiceId" TEXT NOT NULL,
    "korisnikId" TEXT NOT NULL,
    "tip" "NotifikacijaTip" NOT NULL,
    "poruka" TEXT NOT NULL,
    "linkUrl" TEXT,
    "procitano" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notifikacija_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "pravnoLiceId" TEXT,
    "korisnikId" TEXT,
    "entitet" TEXT NOT NULL,
    "entitetId" TEXT NOT NULL,
    "akcija" "AuditAkcija" NOT NULL,
    "diff" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicniPodatakPristup" (
    "id" TEXT NOT NULL,
    "korisnikId" TEXT NOT NULL,
    "subjektTip" TEXT NOT NULL,
    "subjektId" TEXT NOT NULL,
    "svrha" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LicniPodatakPristup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SacuvaniFilter" (
    "id" TEXT NOT NULL,
    "korisnikId" TEXT NOT NULL,
    "naziv" TEXT NOT NULL,
    "modul" TEXT NOT NULL,
    "filterJson" JSONB NOT NULL,

    CONSTRAINT "SacuvaniFilter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PravnoLice_kod_key" ON "PravnoLice"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "Korisnik_email_key" ON "Korisnik"("email");

-- CreateIndex
CREATE INDEX "Korisnik_email_idx" ON "Korisnik"("email");

-- CreateIndex
CREATE INDEX "Korisnik_aktivan_idx" ON "Korisnik"("aktivan");

-- CreateIndex
CREATE UNIQUE INDEX "Rola_kod_key" ON "Rola"("kod");

-- CreateIndex
CREATE INDEX "KorisnikRola_korisnikId_idx" ON "KorisnikRola"("korisnikId");

-- CreateIndex
CREATE INDEX "KorisnikRola_pravnoLiceId_idx" ON "KorisnikRola"("pravnoLiceId");

-- CreateIndex
CREATE UNIQUE INDEX "KorisnikRola_korisnikId_rolaId_pravnoLiceId_key" ON "KorisnikRola"("korisnikId", "rolaId", "pravnoLiceId");

-- CreateIndex
CREATE INDEX "Dozvola_modul_akcija_idx" ON "Dozvola"("modul", "akcija");

-- CreateIndex
CREATE UNIQUE INDEX "Dozvola_rolaId_modul_akcija_key" ON "Dozvola"("rolaId", "modul", "akcija");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_korisnikId_idx" ON "Session"("korisnikId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Partner_pravnoLiceId_idx" ON "Partner"("pravnoLiceId");

-- CreateIndex
CREATE INDEX "Partner_tip_idx" ON "Partner"("tip");

-- CreateIndex
CREATE INDEX "Partner_segment_idx" ON "Partner"("segment");

-- CreateIndex
CREATE INDEX "Partner_vlasnikId_idx" ON "Partner"("vlasnikId");

-- CreateIndex
CREATE INDEX "Kontakt_partnerId_idx" ON "Kontakt"("partnerId");

-- CreateIndex
CREATE INDEX "Kontakt_email_idx" ON "Kontakt"("email");

-- CreateIndex
CREATE INDEX "Aktivnost_partnerId_idx" ON "Aktivnost"("partnerId");

-- CreateIndex
CREATE INDEX "Aktivnost_opportunityId_idx" ON "Aktivnost"("opportunityId");

-- CreateIndex
CREATE INDEX "Aktivnost_autorId_datum_idx" ON "Aktivnost"("autorId", "datum");

-- CreateIndex
CREATE INDEX "Opportunity_pravnoLiceId_stageId_idx" ON "Opportunity"("pravnoLiceId", "stageId");

-- CreateIndex
CREATE INDEX "Opportunity_vlasnikId_idx" ON "Opportunity"("vlasnikId");

-- CreateIndex
CREATE INDEX "Opportunity_expCloseDate_idx" ON "Opportunity"("expCloseDate");

-- CreateIndex
CREATE UNIQUE INDEX "Stage_kod_key" ON "Stage"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "LostReason_kod_key" ON "LostReason"("kod");

-- CreateIndex
CREATE INDEX "Vozilo_grad_idx" ON "Vozilo"("grad");

-- CreateIndex
CREATE UNIQUE INDEX "Vozilo_pravnoLiceId_registracija_key" ON "Vozilo"("pravnoLiceId", "registracija");

-- CreateIndex
CREATE INDEX "Pozicija_voziloId_idx" ON "Pozicija"("voziloId");

-- CreateIndex
CREATE INDEX "Rezervacija_pozicijaId_odDatum_doDatum_idx" ON "Rezervacija"("pozicijaId", "odDatum", "doDatum");

-- CreateIndex
CREATE INDEX "Rezervacija_status_idx" ON "Rezervacija"("status");

-- CreateIndex
CREATE INDEX "KomunalnaNaknada_voziloId_idx" ON "KomunalnaNaknada"("voziloId");

-- CreateIndex
CREATE INDEX "KomunalnaNaknada_doDatum_idx" ON "KomunalnaNaknada"("doDatum");

-- CreateIndex
CREATE UNIQUE INDEX "Kampanja_opportunityId_key" ON "Kampanja"("opportunityId");

-- CreateIndex
CREATE INDEX "Kampanja_pravnoLiceId_status_idx" ON "Kampanja"("pravnoLiceId", "status");

-- CreateIndex
CREATE INDEX "Kampanja_partnerId_idx" ON "Kampanja"("partnerId");

-- CreateIndex
CREATE INDEX "KampanjaStavka_kampanjaId_idx" ON "KampanjaStavka"("kampanjaId");

-- CreateIndex
CREATE INDEX "KampanjaStavka_pozicijaId_idx" ON "KampanjaStavka"("pozicijaId");

-- CreateIndex
CREATE UNIQUE INDEX "Dokument_stornoOdId_key" ON "Dokument"("stornoOdId");

-- CreateIndex
CREATE INDEX "Dokument_pravnoLiceId_datum_idx" ON "Dokument"("pravnoLiceId", "datum");

-- CreateIndex
CREATE INDEX "Dokument_partnerId_idx" ON "Dokument"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "Dokument_pravnoLiceId_tip_broj_key" ON "Dokument"("pravnoLiceId", "tip", "broj");

-- CreateIndex
CREATE INDEX "DokumentStavka_dokumentId_idx" ON "DokumentStavka"("dokumentId");

-- CreateIndex
CREATE UNIQUE INDEX "NumeracijaSkok_pravnoLiceId_tip_godina_key" ON "NumeracijaSkok"("pravnoLiceId", "tip", "godina");

-- CreateIndex
CREATE INDEX "HandoffBatch_pravnoLiceId_status_idx" ON "HandoffBatch"("pravnoLiceId", "status");

-- CreateIndex
CREATE INDEX "HandoffZapis_batchId_idx" ON "HandoffZapis"("batchId");

-- CreateIndex
CREATE INDEX "Notifikacija_korisnikId_procitano_idx" ON "Notifikacija"("korisnikId", "procitano");

-- CreateIndex
CREATE INDEX "AuditLog_entitet_entitetId_idx" ON "AuditLog"("entitet", "entitetId");

-- CreateIndex
CREATE INDEX "AuditLog_korisnikId_idx" ON "AuditLog"("korisnikId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "LicniPodatakPristup_subjektTip_subjektId_idx" ON "LicniPodatakPristup"("subjektTip", "subjektId");

-- CreateIndex
CREATE INDEX "LicniPodatakPristup_korisnikId_idx" ON "LicniPodatakPristup"("korisnikId");

-- CreateIndex
CREATE INDEX "SacuvaniFilter_korisnikId_modul_idx" ON "SacuvaniFilter"("korisnikId", "modul");

-- AddForeignKey
ALTER TABLE "KorisnikRola" ADD CONSTRAINT "KorisnikRola_korisnikId_fkey" FOREIGN KEY ("korisnikId") REFERENCES "Korisnik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KorisnikRola" ADD CONSTRAINT "KorisnikRola_rolaId_fkey" FOREIGN KEY ("rolaId") REFERENCES "Rola"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KorisnikRola" ADD CONSTRAINT "KorisnikRola_pravnoLiceId_fkey" FOREIGN KEY ("pravnoLiceId") REFERENCES "PravnoLice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dozvola" ADD CONSTRAINT "Dozvola_rolaId_fkey" FOREIGN KEY ("rolaId") REFERENCES "Rola"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_korisnikId_fkey" FOREIGN KEY ("korisnikId") REFERENCES "Korisnik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_pravnoLiceId_fkey" FOREIGN KEY ("pravnoLiceId") REFERENCES "PravnoLice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kontakt" ADD CONSTRAINT "Kontakt_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aktivnost" ADD CONSTRAINT "Aktivnost_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aktivnost" ADD CONSTRAINT "Aktivnost_kontaktId_fkey" FOREIGN KEY ("kontaktId") REFERENCES "Kontakt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aktivnost" ADD CONSTRAINT "Aktivnost_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aktivnost" ADD CONSTRAINT "Aktivnost_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Korisnik"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_pravnoLiceId_fkey" FOREIGN KEY ("pravnoLiceId") REFERENCES "PravnoLice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_vlasnikId_fkey" FOREIGN KEY ("vlasnikId") REFERENCES "Korisnik"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_lostReasonId_fkey" FOREIGN KEY ("lostReasonId") REFERENCES "LostReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vozilo" ADD CONSTRAINT "Vozilo_pravnoLiceId_fkey" FOREIGN KEY ("pravnoLiceId") REFERENCES "PravnoLice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pozicija" ADD CONSTRAINT "Pozicija_voziloId_fkey" FOREIGN KEY ("voziloId") REFERENCES "Vozilo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rezervacija" ADD CONSTRAINT "Rezervacija_pozicijaId_fkey" FOREIGN KEY ("pozicijaId") REFERENCES "Pozicija"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rezervacija" ADD CONSTRAINT "Rezervacija_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rezervacija" ADD CONSTRAINT "Rezervacija_kampanjaId_fkey" FOREIGN KEY ("kampanjaId") REFERENCES "Kampanja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KomunalnaNaknada" ADD CONSTRAINT "KomunalnaNaknada_voziloId_fkey" FOREIGN KEY ("voziloId") REFERENCES "Vozilo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kampanja" ADD CONSTRAINT "Kampanja_pravnoLiceId_fkey" FOREIGN KEY ("pravnoLiceId") REFERENCES "PravnoLice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kampanja" ADD CONSTRAINT "Kampanja_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kampanja" ADD CONSTRAINT "Kampanja_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KampanjaStavka" ADD CONSTRAINT "KampanjaStavka_kampanjaId_fkey" FOREIGN KEY ("kampanjaId") REFERENCES "Kampanja"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KampanjaStavka" ADD CONSTRAINT "KampanjaStavka_pozicijaId_fkey" FOREIGN KEY ("pozicijaId") REFERENCES "Pozicija"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dokument" ADD CONSTRAINT "Dokument_pravnoLiceId_fkey" FOREIGN KEY ("pravnoLiceId") REFERENCES "PravnoLice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dokument" ADD CONSTRAINT "Dokument_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dokument" ADD CONSTRAINT "Dokument_kampanjaId_fkey" FOREIGN KEY ("kampanjaId") REFERENCES "Kampanja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dokument" ADD CONSTRAINT "Dokument_stornoOdId_fkey" FOREIGN KEY ("stornoOdId") REFERENCES "Dokument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DokumentStavka" ADD CONSTRAINT "DokumentStavka_dokumentId_fkey" FOREIGN KEY ("dokumentId") REFERENCES "Dokument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DokumentStavka" ADD CONSTRAINT "DokumentStavka_kampanjaStavkaId_fkey" FOREIGN KEY ("kampanjaStavkaId") REFERENCES "KampanjaStavka"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NumeracijaSkok" ADD CONSTRAINT "NumeracijaSkok_pravnoLiceId_fkey" FOREIGN KEY ("pravnoLiceId") REFERENCES "PravnoLice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandoffBatch" ADD CONSTRAINT "HandoffBatch_pravnoLiceId_fkey" FOREIGN KEY ("pravnoLiceId") REFERENCES "PravnoLice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandoffZapis" ADD CONSTRAINT "HandoffZapis_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "HandoffBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandoffZapis" ADD CONSTRAINT "HandoffZapis_dokumentId_fkey" FOREIGN KEY ("dokumentId") REFERENCES "Dokument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notifikacija" ADD CONSTRAINT "Notifikacija_pravnoLiceId_fkey" FOREIGN KEY ("pravnoLiceId") REFERENCES "PravnoLice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notifikacija" ADD CONSTRAINT "Notifikacija_korisnikId_fkey" FOREIGN KEY ("korisnikId") REFERENCES "Korisnik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_pravnoLiceId_fkey" FOREIGN KEY ("pravnoLiceId") REFERENCES "PravnoLice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_korisnikId_fkey" FOREIGN KEY ("korisnikId") REFERENCES "Korisnik"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicniPodatakPristup" ADD CONSTRAINT "LicniPodatakPristup_korisnikId_fkey" FOREIGN KEY ("korisnikId") REFERENCES "Korisnik"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
