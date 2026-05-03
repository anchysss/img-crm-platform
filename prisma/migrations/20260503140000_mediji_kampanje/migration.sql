-- MedijKampanje + MEDIJI_DODATI notifikacija tip
ALTER TYPE "NotifikacijaTip" ADD VALUE IF NOT EXISTS 'MEDIJI_DODATI';

CREATE TABLE IF NOT EXISTS "MedijKampanje" (
  "id"           TEXT NOT NULL,
  "pravnoLiceId" TEXT NOT NULL,
  "kampanjaId"   TEXT NOT NULL,
  "url"          TEXT NOT NULL,
  "naziv"        TEXT,
  "probnaStampa" BOOLEAN NOT NULL DEFAULT false,
  "redniBr"      INTEGER NOT NULL DEFAULT 0,
  "napomena"     TEXT,
  "dodaoId"      TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedijKampanje_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MedijKampanje_pravnoLiceId_idx" ON "MedijKampanje"("pravnoLiceId");
CREATE INDEX IF NOT EXISTS "MedijKampanje_kampanjaId_idx" ON "MedijKampanje"("kampanjaId");

ALTER TABLE "MedijKampanje"
  ADD CONSTRAINT "MedijKampanje_kampanjaId_fkey"
  FOREIGN KEY ("kampanjaId") REFERENCES "Kampanja"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
