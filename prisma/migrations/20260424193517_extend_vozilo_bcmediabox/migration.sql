-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "VoziloStatus" ADD VALUE 'U_ZAKUPU';
ALTER TYPE "VoziloStatus" ADD VALUE 'KVAR';
ALTER TYPE "VoziloStatus" ADD VALUE 'NA_FARBANJU';
ALTER TYPE "VoziloStatus" ADD VALUE 'SIHTA';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "VoziloTip" ADD VALUE 'BUS_ZGLOBNI';
ALTER TYPE "VoziloTip" ADD VALUE 'TRAMVAJ';
ALTER TYPE "VoziloTip" ADD VALUE 'TROLEJBUS';

-- AlterTable
ALTER TABLE "Vozilo" ADD COLUMN     "aktivan" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "brojUgovora" TEXT,
ADD COLUMN     "dobavljac" TEXT,
ADD COLUMN     "garaza" TEXT,
ADD COLUMN     "gps" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inventurniBroj" TEXT,
ADD COLUMN     "komNaknadaDatumDo" TIMESTAMP(3),
ADD COLUMN     "linija" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "model" TEXT,
ADD COLUMN     "opis" TEXT,
ADD COLUMN     "oznaka" TEXT,
ADD COLUMN     "sifra" TEXT,
ADD COLUMN     "tipVozilaTxt" TEXT,
ADD COLUMN     "zakupDo" TIMESTAMP(3),
ADD COLUMN     "zakupOd" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Vozilo_pravnoLiceId_garaza_idx" ON "Vozilo"("pravnoLiceId", "garaza");

-- CreateIndex
CREATE INDEX "Vozilo_pravnoLiceId_inventurniBroj_idx" ON "Vozilo"("pravnoLiceId", "inventurniBroj");
