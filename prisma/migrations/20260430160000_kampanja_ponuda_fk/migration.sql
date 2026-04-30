-- Kampanja: dodaj ponudaId FK
ALTER TABLE "Kampanja"
  ADD COLUMN IF NOT EXISTS "ponudaId" TEXT;

ALTER TABLE "Kampanja"
  ADD CONSTRAINT "Kampanja_ponudaId_fkey"
  FOREIGN KEY ("ponudaId") REFERENCES "Ponuda"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Kampanja_ponudaId_idx" ON "Kampanja"("ponudaId");
