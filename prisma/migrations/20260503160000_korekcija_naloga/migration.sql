-- Korekcija polja na NalogStampu/Montaza + nove notifikacije
ALTER TABLE "NalogStampu"
  ADD COLUMN IF NOT EXISTS "stamparijaEmail"   TEXT,
  ADD COLUMN IF NOT EXISTS "korekcijaNapomena" TEXT;

ALTER TABLE "NalogMontazu"
  ADD COLUMN IF NOT EXISTS "korekcijaNapomena" TEXT;

ALTER TYPE "NotifikacijaTip" ADD VALUE IF NOT EXISTS 'NALOG_KOREKCIJA';
ALTER TYPE "NotifikacijaTip" ADD VALUE IF NOT EXISTS 'NALOG_KOREKCIJA_ODOBRENA';
ALTER TYPE "NotifikacijaTip" ADD VALUE IF NOT EXISTS 'VOZILO_NEDOSTUPNO_KAMPANJA';
