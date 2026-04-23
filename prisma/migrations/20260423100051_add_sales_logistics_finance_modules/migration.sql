-- CreateEnum
CREATE TYPE "TipOglasa" AS ENUM ('OUTDOOR_TOTAL', 'OUTDOOR_PARCIJAL', 'OUTDOOR_OPEN_TOP', 'INDOOR_STANDARD', 'INDOOR_DIGITAL', 'INDOOR_POSTER', 'INDOOR_BACKLIGHT', 'DIGITAL', 'KOMUNALNA', 'OSTALO');

-- CreateEnum
CREATE TYPE "JedinicaMere" AS ENUM ('PER_DAY', 'PER_WEEK', 'PER_MONTH', 'PER_CAMPAIGN');

-- CreateEnum
CREATE TYPE "RadniNalogStatus" AS ENUM ('NOVO', 'PRIHVACEN_LOGISTIKA', 'PRIPREMA_MONTAZE', 'U_REALIZACIJI', 'ZAVRSEN', 'OTKAZAN');

-- CreateEnum
CREATE TYPE "PlanFakturisanjaStatus" AS ENUM ('NACRT', 'POTVRDENO', 'FAKTURISANO', 'OTKAZAN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotifikacijaTip" ADD VALUE 'RADNI_NALOG_NOVI';
ALTER TYPE "NotifikacijaTip" ADD VALUE 'PLAN_FAKTURISANJA_NOVI';
ALTER TYPE "NotifikacijaTip" ADD VALUE 'PONUDA_PRIHVACENA';

-- CreateTable
CREATE TABLE "KategorijaDelatnosti" (
    "id" TEXT NOT NULL,
    "pravnoLiceId" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "naziv" TEXT NOT NULL,
    "opis" TEXT,
    "aktivna" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "KategorijaDelatnosti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cenovnik" (
    "id" TEXT NOT NULL,
    "pravnoLiceId" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "naziv" TEXT NOT NULL,
    "opis" TEXT,
    "tipOglasa" "TipOglasa" NOT NULL,
    "jedinicaMere" "JedinicaMere" NOT NULL DEFAULT 'PER_WEEK',
    "cena" DECIMAL(12,2) NOT NULL,
    "valuta" TEXT NOT NULL,
    "vaziOd" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vaziDo" TIMESTAMP(3),
    "aktivan" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cenovnik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paket" (
    "id" TEXT NOT NULL,
    "pravnoLiceId" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "naziv" TEXT NOT NULL,
    "opis" TEXT,
    "grad" TEXT NOT NULL,
    "tipOglasa" "TipOglasa" NOT NULL,
    "brojVozila" INTEGER NOT NULL,
    "minTrajanjeDana" INTEGER NOT NULL DEFAULT 14,
    "cena" DECIMAL(12,2) NOT NULL,
    "valuta" TEXT NOT NULL,
    "cenovnikId" TEXT,
    "aktivan" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanRadaGodisnji" (
    "id" TEXT NOT NULL,
    "pravnoLiceId" TEXT NOT NULL,
    "korisnikId" TEXT NOT NULL,
    "godina" INTEGER NOT NULL,
    "napomena" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanRadaGodisnji_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanRadaGodisnjiStavka" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "kategorijaId" TEXT NOT NULL,
    "mesec" INTEGER NOT NULL,
    "target" DECIMAL(12,2) NOT NULL,
    "valuta" TEXT NOT NULL,

    CONSTRAINT "PlanRadaGodisnjiStavka_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanRadaDnevni" (
    "id" TEXT NOT NULL,
    "pravnoLiceId" TEXT NOT NULL,
    "korisnikId" TEXT NOT NULL,
    "datum" DATE NOT NULL,
    "opis" TEXT NOT NULL,
    "analizaTrzista" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanRadaDnevni_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadniNalog" (
    "id" TEXT NOT NULL,
    "pravnoLiceId" TEXT NOT NULL,
    "broj" TEXT NOT NULL,
    "opportunityId" TEXT,
    "kampanjaId" TEXT,
    "partnerId" TEXT NOT NULL,
    "vlasnikProdajaId" TEXT NOT NULL,
    "logistikaId" TEXT,
    "status" "RadniNalogStatus" NOT NULL DEFAULT 'NOVO',
    "odDatum" TIMESTAMP(3) NOT NULL,
    "doDatum" TIMESTAMP(3) NOT NULL,
    "grad" TEXT,
    "napomena" TEXT,
    "kreativaUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RadniNalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanFakturisanja" (
    "id" TEXT NOT NULL,
    "pravnoLiceId" TEXT NOT NULL,
    "broj" TEXT NOT NULL,
    "opportunityId" TEXT,
    "kampanjaId" TEXT,
    "partnerId" TEXT NOT NULL,
    "vlasnikProdajaId" TEXT NOT NULL,
    "valuta" TEXT NOT NULL,
    "grad" TEXT,
    "tipOglasa" "TipOglasa",
    "brojVozila" INTEGER,
    "status" "PlanFakturisanjaStatus" NOT NULL DEFAULT 'NACRT',
    "ukupno" DECIMAL(14,2) NOT NULL,
    "kampanjaOd" TIMESTAMP(3) NOT NULL,
    "kampanjaDo" TIMESTAMP(3) NOT NULL,
    "napomena" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanFakturisanja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanFakturisanjaStavka" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "mesec" INTEGER NOT NULL,
    "godina" INTEGER NOT NULL,
    "iznos" DECIMAL(14,2) NOT NULL,
    "valuta" TEXT NOT NULL,
    "dokumentId" TEXT,
    "fakturisano" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PlanFakturisanjaStavka_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KategorijaDelatnosti_pravnoLiceId_idx" ON "KategorijaDelatnosti"("pravnoLiceId");

-- CreateIndex
CREATE UNIQUE INDEX "KategorijaDelatnosti_pravnoLiceId_kod_key" ON "KategorijaDelatnosti"("pravnoLiceId", "kod");

-- CreateIndex
CREATE INDEX "Cenovnik_pravnoLiceId_tipOglasa_idx" ON "Cenovnik"("pravnoLiceId", "tipOglasa");

-- CreateIndex
CREATE UNIQUE INDEX "Cenovnik_pravnoLiceId_kod_key" ON "Cenovnik"("pravnoLiceId", "kod");

-- CreateIndex
CREATE INDEX "Paket_pravnoLiceId_grad_idx" ON "Paket"("pravnoLiceId", "grad");

-- CreateIndex
CREATE UNIQUE INDEX "Paket_pravnoLiceId_kod_key" ON "Paket"("pravnoLiceId", "kod");

-- CreateIndex
CREATE INDEX "PlanRadaGodisnji_korisnikId_idx" ON "PlanRadaGodisnji"("korisnikId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanRadaGodisnji_pravnoLiceId_korisnikId_godina_key" ON "PlanRadaGodisnji"("pravnoLiceId", "korisnikId", "godina");

-- CreateIndex
CREATE INDEX "PlanRadaGodisnjiStavka_planId_idx" ON "PlanRadaGodisnjiStavka"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanRadaGodisnjiStavka_planId_kategorijaId_mesec_key" ON "PlanRadaGodisnjiStavka"("planId", "kategorijaId", "mesec");

-- CreateIndex
CREATE INDEX "PlanRadaDnevni_pravnoLiceId_datum_idx" ON "PlanRadaDnevni"("pravnoLiceId", "datum");

-- CreateIndex
CREATE UNIQUE INDEX "PlanRadaDnevni_korisnikId_datum_key" ON "PlanRadaDnevni"("korisnikId", "datum");

-- CreateIndex
CREATE UNIQUE INDEX "RadniNalog_opportunityId_key" ON "RadniNalog"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "RadniNalog_kampanjaId_key" ON "RadniNalog"("kampanjaId");

-- CreateIndex
CREATE INDEX "RadniNalog_pravnoLiceId_status_idx" ON "RadniNalog"("pravnoLiceId", "status");

-- CreateIndex
CREATE INDEX "RadniNalog_partnerId_idx" ON "RadniNalog"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "RadniNalog_pravnoLiceId_broj_key" ON "RadniNalog"("pravnoLiceId", "broj");

-- CreateIndex
CREATE UNIQUE INDEX "PlanFakturisanja_opportunityId_key" ON "PlanFakturisanja"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanFakturisanja_kampanjaId_key" ON "PlanFakturisanja"("kampanjaId");

-- CreateIndex
CREATE INDEX "PlanFakturisanja_partnerId_idx" ON "PlanFakturisanja"("partnerId");

-- CreateIndex
CREATE INDEX "PlanFakturisanja_pravnoLiceId_status_idx" ON "PlanFakturisanja"("pravnoLiceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PlanFakturisanja_pravnoLiceId_broj_key" ON "PlanFakturisanja"("pravnoLiceId", "broj");

-- CreateIndex
CREATE INDEX "PlanFakturisanjaStavka_planId_idx" ON "PlanFakturisanjaStavka"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanFakturisanjaStavka_planId_godina_mesec_key" ON "PlanFakturisanjaStavka"("planId", "godina", "mesec");

-- AddForeignKey
ALTER TABLE "Paket" ADD CONSTRAINT "Paket_cenovnikId_fkey" FOREIGN KEY ("cenovnikId") REFERENCES "Cenovnik"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanRadaGodisnjiStavka" ADD CONSTRAINT "PlanRadaGodisnjiStavka_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PlanRadaGodisnji"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanRadaGodisnjiStavka" ADD CONSTRAINT "PlanRadaGodisnjiStavka_kategorijaId_fkey" FOREIGN KEY ("kategorijaId") REFERENCES "KategorijaDelatnosti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanFakturisanjaStavka" ADD CONSTRAINT "PlanFakturisanjaStavka_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PlanFakturisanja"("id") ON DELETE CASCADE ON UPDATE CASCADE;
