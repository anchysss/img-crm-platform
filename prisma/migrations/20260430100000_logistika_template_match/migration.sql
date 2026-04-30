-- =============================================================
-- NalogStampu/NalogMontazu refaktor sa lookup FK + nova polja iz primer xlsx-a
-- =============================================================

-- NalogStampu: dodaj kampanjaNaziv, masinaId, rnStamparije
ALTER TABLE "NalogStampu"
  ADD COLUMN IF NOT EXISTS "kampanjaNaziv" TEXT,
  ADD COLUMN IF NOT EXISTS "masinaId"      TEXT,
  ADD COLUMN IF NOT EXISTS "rnStamparije"  TEXT;

ALTER TABLE "NalogStampu"
  ADD CONSTRAINT "NalogStampu_masinaId_fkey"
  FOREIGN KEY ("masinaId") REFERENCES "Masina"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "NalogStampu_masinaId_idx" ON "NalogStampu"("masinaId");

-- NalogStampuStavka: dodaj redniBr, fileNaziv, formatX, formatY, folijaId, doradaId
ALTER TABLE "NalogStampuStavka"
  ADD COLUMN IF NOT EXISTS "redniBr"   INTEGER,
  ADD COLUMN IF NOT EXISTS "fileNaziv" TEXT,
  ADD COLUMN IF NOT EXISTS "formatX"   DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS "formatY"   DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS "folijaId"  TEXT,
  ADD COLUMN IF NOT EXISTS "doradaId"  TEXT;

ALTER TABLE "NalogStampuStavka"
  ADD CONSTRAINT "NalogStampuStavka_folijaId_fkey"
  FOREIGN KEY ("folijaId") REFERENCES "Folija"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "NalogStampuStavka"
  ADD CONSTRAINT "NalogStampuStavka_doradaId_fkey"
  FOREIGN KEY ("doradaId") REFERENCES "Dorada"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "NalogStampuStavka_folijaId_idx" ON "NalogStampuStavka"("folijaId");
CREATE INDEX IF NOT EXISTS "NalogStampuStavka_doradaId_idx" ON "NalogStampuStavka"("doradaId");

-- NalogMontazu: dodaj montazerId, prevoznikNaziv, masinaId, vremeMontaze
ALTER TABLE "NalogMontazu"
  ADD COLUMN IF NOT EXISTS "montazerId"     TEXT,
  ADD COLUMN IF NOT EXISTS "prevoznikNaziv" TEXT,
  ADD COLUMN IF NOT EXISTS "masinaId"       TEXT,
  ADD COLUMN IF NOT EXISTS "vremeMontaze"   TEXT;

ALTER TABLE "NalogMontazu"
  ADD CONSTRAINT "NalogMontazu_montazerId_fkey"
  FOREIGN KEY ("montazerId") REFERENCES "Montazer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "NalogMontazu"
  ADD CONSTRAINT "NalogMontazu_masinaId_fkey"
  FOREIGN KEY ("masinaId") REFERENCES "Masina"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "NalogMontazu_montazerId_idx" ON "NalogMontazu"("montazerId");
CREATE INDEX IF NOT EXISTS "NalogMontazu_masinaId_idx"   ON "NalogMontazu"("masinaId");

-- NalogMontazuStavka: dodaj redniBr, skidanjeM2, montazaM2, rnStamparije
ALTER TABLE "NalogMontazuStavka"
  ADD COLUMN IF NOT EXISTS "redniBr"      INTEGER,
  ADD COLUMN IF NOT EXISTS "skidanjeM2"   DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS "montazaM2"    DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS "rnStamparije" TEXT;
