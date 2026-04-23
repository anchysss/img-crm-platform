-- CreateEnum
CREATE TYPE "OppTip" AS ENUM ('NEW', 'RENEWAL', 'UPSELL');

-- CreateEnum
CREATE TYPE "PonudaStatus" AS ENUM ('DRAFT', 'POSLATA', 'PRIHVACENA', 'ODBIJENA', 'ISTEKLA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LostReasonKod" ADD VALUE 'AGENCIJA';
ALTER TYPE "LostReasonKod" ADD VALUE 'BUDZET_NIJE_ODOBREN';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PartnerStatus" ADD VALUE 'SEASONAL';
ALTER TYPE "PartnerStatus" ADD VALUE 'HIGH_POTENTIAL';
ALTER TYPE "PartnerStatus" ADD VALUE 'LOW_POTENTIAL';
ALTER TYPE "PartnerStatus" ADD VALUE 'NOT_ADVERTISING';
ALTER TYPE "PartnerStatus" ADD VALUE 'COMPETITOR_LOCKED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StageKod" ADD VALUE 'LEAD';
ALTER TYPE "StageKod" ADD VALUE 'CONTACTED';

-- AlterTable
ALTER TABLE "Aktivnost" ADD COLUMN     "nextActionDatum" TIMESTAMP(3),
ADD COLUMN     "nextActionOpis" TEXT;

-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "realizacijaGodina" INTEGER,
ADD COLUMN     "realizacijaMesec" INTEGER,
ADD COLUMN     "stageUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "tip" "OppTip" NOT NULL DEFAULT 'NEW';

-- CreateTable
CREATE TABLE "Ponuda" (
    "id" TEXT NOT NULL,
    "pravnoLiceId" TEXT NOT NULL,
    "broj" TEXT NOT NULL,
    "opportunityId" TEXT,
    "partnerId" TEXT NOT NULL,
    "vlasnikId" TEXT NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vaziDo" TIMESTAMP(3) NOT NULL,
    "status" "PonudaStatus" NOT NULL DEFAULT 'DRAFT',
    "poslataAt" TIMESTAMP(3),
    "prihvacenaAt" TIMESTAMP(3),
    "odbijenaAt" TIMESTAMP(3),
    "valuta" TEXT NOT NULL,
    "ukupno" DECIMAL(14,2) NOT NULL,
    "stopaPdv" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "napomena" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ponuda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PonudaStavka" (
    "id" TEXT NOT NULL,
    "ponudaId" TEXT NOT NULL,
    "rb" INTEGER NOT NULL,
    "opis" TEXT NOT NULL,
    "grad" TEXT,
    "brojVozila" INTEGER NOT NULL DEFAULT 1,
    "cena" DECIMAL(12,2) NOT NULL,
    "popustPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "iznos" DECIMAL(14,2) NOT NULL,
    "valuta" TEXT NOT NULL,

    CONSTRAINT "PonudaStavka_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ponuda_opportunityId_key" ON "Ponuda"("opportunityId");

-- CreateIndex
CREATE INDEX "Ponuda_partnerId_idx" ON "Ponuda"("partnerId");

-- CreateIndex
CREATE INDEX "Ponuda_pravnoLiceId_status_idx" ON "Ponuda"("pravnoLiceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Ponuda_pravnoLiceId_broj_key" ON "Ponuda"("pravnoLiceId", "broj");

-- CreateIndex
CREATE INDEX "PonudaStavka_ponudaId_idx" ON "PonudaStavka"("ponudaId");

-- AddForeignKey
ALTER TABLE "PonudaStavka" ADD CONSTRAINT "PonudaStavka_ponudaId_fkey" FOREIGN KEY ("ponudaId") REFERENCES "Ponuda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
