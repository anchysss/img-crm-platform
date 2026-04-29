-- AktivnostTip: dodaj FOLLOW_UP
ALTER TYPE "AktivnostTip" ADD VALUE IF NOT EXISTS 'FOLLOW_UP';

-- Dokument: + ponudaId, opportunityId, placenoAt
ALTER TABLE "Dokument"
  ADD COLUMN IF NOT EXISTS "ponudaId" TEXT,
  ADD COLUMN IF NOT EXISTS "opportunityId" TEXT,
  ADD COLUMN IF NOT EXISTS "placenoAt" TIMESTAMP(3);

ALTER TABLE "Dokument"
  ADD CONSTRAINT "Dokument_ponudaId_fkey"
  FOREIGN KEY ("ponudaId") REFERENCES "Ponuda"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Dokument"
  ADD CONSTRAINT "Dokument_opportunityId_fkey"
  FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Dokument_ponudaId_idx" ON "Dokument"("ponudaId");
CREATE INDEX IF NOT EXISTS "Dokument_opportunityId_idx" ON "Dokument"("opportunityId");

-- Ponuda: index na vaziDo za "expiring contracts" trigger
CREATE INDEX IF NOT EXISTS "Ponuda_vaziDo_idx" ON "Ponuda"("vaziDo");
