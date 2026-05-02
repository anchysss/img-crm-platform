-- TipStampe enum + NalogStampu.tipStampe kolona
DO $$ BEGIN
  CREATE TYPE "TipStampe" AS ENUM ('PROBNA', 'REDOVNA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "NalogStampu"
  ADD COLUMN IF NOT EXISTS "tipStampe" "TipStampe" NOT NULL DEFAULT 'REDOVNA';
