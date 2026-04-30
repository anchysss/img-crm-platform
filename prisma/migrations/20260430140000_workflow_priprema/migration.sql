-- =============================================================
-- Workflow priprema fajlova + kolorna proba + pro\u0161iren status flow
-- =============================================================

-- RadniNalogStatus: dodaj nove vrednosti
ALTER TYPE "RadniNalogStatus" ADD VALUE IF NOT EXISTS 'PRIPREMA_FAJLOVA';
ALTER TYPE "RadniNalogStatus" ADD VALUE IF NOT EXISTS 'KOLORNA_PROBA';
ALTER TYPE "RadniNalogStatus" ADD VALUE IF NOT EXISTS 'PROBA_ODOBRENA';
ALTER TYPE "RadniNalogStatus" ADD VALUE IF NOT EXISTS 'STAMPA_U_TOKU';
ALTER TYPE "RadniNalogStatus" ADD VALUE IF NOT EXISTS 'MONTAZA_U_TOKU';

-- PripremaStatus: novi enum
DO $$ BEGIN
  CREATE TYPE "PripremaStatus" AS ENUM (
    'NEMA_PRIPREME',
    'U_PRIPREMI',
    'POSLATA',
    'KOLORNA_PROBA_NA_OVERAVANJU',
    'ODOBRENA',
    'KOREKCIJA',
    'GOTOVO'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- RadniNalog: dodaj kolornaProba + priprema polja
ALTER TABLE "RadniNalog"
  ADD COLUMN IF NOT EXISTS "kolornaProba"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "pripremaStatus"     "PripremaStatus" NOT NULL DEFAULT 'NEMA_PRIPREME',
  ADD COLUMN IF NOT EXISTS "pripremaUrl"        TEXT,
  ADD COLUMN IF NOT EXISTS "pripremaPoslataAt"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "pripremaOdobrenaAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "pripremaOdobrioId"  TEXT,
  ADD COLUMN IF NOT EXISTS "korekcijaNapomena"  TEXT;
