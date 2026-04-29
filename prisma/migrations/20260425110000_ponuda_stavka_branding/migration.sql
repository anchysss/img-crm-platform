-- PonudaStavka: + tipBrendinga (TipOglasa enum), skicaUrl, voziloId FK
ALTER TABLE "PonudaStavka"
  ADD COLUMN IF NOT EXISTS "tipBrendinga" "TipOglasa",
  ADD COLUMN IF NOT EXISTS "skicaUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "voziloId" TEXT;

ALTER TABLE "PonudaStavka"
  ADD CONSTRAINT "PonudaStavka_voziloId_fkey"
  FOREIGN KEY ("voziloId") REFERENCES "Vozilo"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "PonudaStavka_voziloId_idx" ON "PonudaStavka"("voziloId");
