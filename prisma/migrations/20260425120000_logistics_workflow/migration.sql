-- =============================================================
-- Logistics workflow: Resenje, NalogMontazu, NalogStampu, FotoAlbum, Postbrending, RasporedPlakata
-- =============================================================

-- New enums
DO $$ BEGIN
  CREATE TYPE "NalogMontazuTip" AS ENUM ('BEOGRAD', 'GRADOVI');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "NalogStavkaStatus" AS ENUM ('NACRT', 'POSLATO', 'POSTAVLJENO', 'PROBLEM', 'OTKAZANO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "StamparijaTip" AS ENUM ('DPC_BEOGRAD', 'STAMPARIJA_NIS', 'DRUGA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "MaterijalTip" AS ENUM ('FOLIJA_3M_IJ20', 'PAPIR_130GR', 'PAPIR_SV', 'PAPIR_DUPLEKS', 'DRUGO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "FotoAlbumTip" AS ENUM ('MONTAZA', 'SAOBRACAJ', 'POSTBRANDING');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- RadniNalog: dodaj predlogLinija + brojVozilaPoGradu
ALTER TABLE "RadniNalog"
  ADD COLUMN IF NOT EXISTS "predlogLinija" TEXT,
  ADD COLUMN IF NOT EXISTS "brojVozilaPoGradu" JSONB;

-- Resenje (R01, R02, R03 sa raspodelom %)
CREATE TABLE IF NOT EXISTS "Resenje" (
  "id"            TEXT NOT NULL,
  "radniNalogId"  TEXT NOT NULL,
  "oznaka"        TEXT NOT NULL,
  "naziv"         TEXT,
  "procenat"      DECIMAL(5,2) NOT NULL DEFAULT 100,
  "napomena"      TEXT,
  CONSTRAINT "Resenje_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Resenje_radniNalogId_oznaka_key"
  ON "Resenje"("radniNalogId", "oznaka");
CREATE INDEX IF NOT EXISTS "Resenje_radniNalogId_idx"
  ON "Resenje"("radniNalogId");

ALTER TABLE "Resenje"
  ADD CONSTRAINT "Resenje_radniNalogId_fkey"
  FOREIGN KEY ("radniNalogId") REFERENCES "RadniNalog"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- NalogMontazu (Beograd ili Gradovi)
CREATE TABLE IF NOT EXISTS "NalogMontazu" (
  "id"           TEXT NOT NULL,
  "pravnoLiceId" TEXT NOT NULL,
  "radniNalogId" TEXT NOT NULL,
  "broj"         TEXT NOT NULL,
  "tip"          "NalogMontazuTip" NOT NULL,
  "grad"         TEXT,
  "ekipa"        TEXT,
  "datumMontaze" TIMESTAMP(3),
  "status"       "NalogStavkaStatus" NOT NULL DEFAULT 'NACRT',
  "napomena"     TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NalogMontazu_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NalogMontazu_pravnoLiceId_broj_key"
  ON "NalogMontazu"("pravnoLiceId", "broj");
CREATE INDEX IF NOT EXISTS "NalogMontazu_radniNalogId_idx"
  ON "NalogMontazu"("radniNalogId");

ALTER TABLE "NalogMontazu"
  ADD CONSTRAINT "NalogMontazu_radniNalogId_fkey"
  FOREIGN KEY ("radniNalogId") REFERENCES "RadniNalog"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- NalogMontazuStavka
CREATE TABLE IF NOT EXISTS "NalogMontazuStavka" (
  "id"             TEXT NOT NULL,
  "nalogId"        TEXT NOT NULL,
  "voziloId"       TEXT,
  "garazniBroj"    TEXT,
  "garaza"         TEXT,
  "linija"         TEXT,
  "tipVozila"      TEXT,
  "resenjeId"      TEXT,
  "sifraRasporeda" TEXT,
  "brojPanoa"      JSONB,
  "status"         "NalogStavkaStatus" NOT NULL DEFAULT 'NACRT',
  "postavljenoAt"  TIMESTAMP(3),
  "napomena"       TEXT,
  "problemTip"     TEXT,
  CONSTRAINT "NalogMontazuStavka_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "NalogMontazuStavka_nalogId_idx"
  ON "NalogMontazuStavka"("nalogId");
CREATE INDEX IF NOT EXISTS "NalogMontazuStavka_voziloId_idx"
  ON "NalogMontazuStavka"("voziloId");

ALTER TABLE "NalogMontazuStavka"
  ADD CONSTRAINT "NalogMontazuStavka_nalogId_fkey"
  FOREIGN KEY ("nalogId") REFERENCES "NalogMontazu"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NalogMontazuStavka"
  ADD CONSTRAINT "NalogMontazuStavka_voziloId_fkey"
  FOREIGN KEY ("voziloId") REFERENCES "Vozilo"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "NalogMontazuStavka"
  ADD CONSTRAINT "NalogMontazuStavka_resenjeId_fkey"
  FOREIGN KEY ("resenjeId") REFERENCES "Resenje"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- NalogStampu
CREATE TABLE IF NOT EXISTS "NalogStampu" (
  "id"            TEXT NOT NULL,
  "pravnoLiceId"  TEXT NOT NULL,
  "radniNalogId"  TEXT NOT NULL,
  "broj"          TEXT NOT NULL,
  "stamparija"    "StamparijaTip" NOT NULL,
  "datumPredaje"  TIMESTAMP(3) NOT NULL,
  "rokIzrade"     TIMESTAMP(3) NOT NULL,
  "rokIzradeTime" TEXT,
  "masina"        TEXT,
  "status"        "NalogStavkaStatus" NOT NULL DEFAULT 'NACRT',
  "napomena"      TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NalogStampu_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NalogStampu_pravnoLiceId_broj_key"
  ON "NalogStampu"("pravnoLiceId", "broj");
CREATE INDEX IF NOT EXISTS "NalogStampu_radniNalogId_idx"
  ON "NalogStampu"("radniNalogId");

ALTER TABLE "NalogStampu"
  ADD CONSTRAINT "NalogStampu_radniNalogId_fkey"
  FOREIGN KEY ("radniNalogId") REFERENCES "RadniNalog"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- NalogStampuStavka
CREATE TABLE IF NOT EXISTS "NalogStampuStavka" (
  "id"            TEXT NOT NULL,
  "nalogId"       TEXT NOT NULL,
  "grad"          TEXT NOT NULL,
  "resenjeId"     TEXT,
  "resenjeOznaka" TEXT,
  "simpleks"      BOOLEAN NOT NULL DEFAULT true,
  "format"        TEXT NOT NULL,
  "tiraz"         INTEGER NOT NULL,
  "materijal"     "MaterijalTip" NOT NULL,
  "gramatura"     TEXT,
  "dorada"        TEXT,
  "cenaJedinicna" DECIMAL(10,2),
  "cenaUkupno"    DECIMAL(12,2),
  "napomena"      TEXT,
  CONSTRAINT "NalogStampuStavka_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "NalogStampuStavka_nalogId_idx"
  ON "NalogStampuStavka"("nalogId");

ALTER TABLE "NalogStampuStavka"
  ADD CONSTRAINT "NalogStampuStavka_nalogId_fkey"
  FOREIGN KEY ("nalogId") REFERENCES "NalogStampu"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NalogStampuStavka"
  ADD CONSTRAINT "NalogStampuStavka_resenjeId_fkey"
  FOREIGN KEY ("resenjeId") REFERENCES "Resenje"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- StamparijaCenovnik
CREATE TABLE IF NOT EXISTS "StamparijaCenovnik" (
  "id"           TEXT NOT NULL,
  "pravnoLiceId" TEXT NOT NULL,
  "stamparija"   "StamparijaTip" NOT NULL,
  "format"       TEXT NOT NULL,
  "materijal"    "MaterijalTip" NOT NULL,
  "cena"         DECIMAL(10,2) NOT NULL,
  "valuta"       TEXT NOT NULL,
  "vaziOd"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "vaziDo"       TIMESTAMP(3),
  "aktivan"      BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "StamparijaCenovnik_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StamparijaCenovnik_lookup_idx"
  ON "StamparijaCenovnik"("pravnoLiceId", "stamparija", "format", "materijal");

-- FotoAlbum
CREATE TABLE IF NOT EXISTS "FotoAlbum" (
  "id"           TEXT NOT NULL,
  "pravnoLiceId" TEXT NOT NULL,
  "radniNalogId" TEXT NOT NULL,
  "naziv"        TEXT NOT NULL,
  "tip"          "FotoAlbumTip" NOT NULL,
  "pdfUrl"       TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FotoAlbum_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FotoAlbum_radniNalogId_idx"
  ON "FotoAlbum"("radniNalogId");

ALTER TABLE "FotoAlbum"
  ADD CONSTRAINT "FotoAlbum_radniNalogId_fkey"
  FOREIGN KEY ("radniNalogId") REFERENCES "RadniNalog"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Fotografija
CREATE TABLE IF NOT EXISTS "Fotografija" (
  "id"        TEXT NOT NULL,
  "albumId"   TEXT NOT NULL,
  "url"       TEXT NOT NULL,
  "naziv"     TEXT,
  "redosled"  INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Fotografija_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Fotografija_albumId_idx"
  ON "Fotografija"("albumId");

ALTER TABLE "Fotografija"
  ADD CONSTRAINT "Fotografija_albumId_fkey"
  FOREIGN KEY ("albumId") REFERENCES "FotoAlbum"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Postbrending
CREATE TABLE IF NOT EXISTS "Postbrending" (
  "id"           TEXT NOT NULL,
  "pravnoLiceId" TEXT NOT NULL,
  "radniNalogId" TEXT NOT NULL,
  "broj"         TEXT NOT NULL,
  "datum"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fotoAlbumId"  TEXT,
  "pdfUrl"       TEXT,
  "poslatoAt"    TIMESTAMP(3),
  "napomena"     TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Postbrending_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Postbrending_pravnoLiceId_broj_key"
  ON "Postbrending"("pravnoLiceId", "broj");
CREATE INDEX IF NOT EXISTS "Postbrending_radniNalogId_idx"
  ON "Postbrending"("radniNalogId");

ALTER TABLE "Postbrending"
  ADD CONSTRAINT "Postbrending_radniNalogId_fkey"
  FOREIGN KEY ("radniNalogId") REFERENCES "RadniNalog"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- RasporedPlakata
CREATE TABLE IF NOT EXISTS "RasporedPlakata" (
  "id"             TEXT NOT NULL,
  "pravnoLiceId"   TEXT NOT NULL,
  "voziloTipKod"   TEXT NOT NULL,
  "naziv"          TEXT NOT NULL,
  "sifraRasporeda" TEXT NOT NULL,
  "panoi"          JSONB NOT NULL,
  "ukupnoPovrsina" INTEGER NOT NULL,
  "napomena"       TEXT,
  CONSTRAINT "RasporedPlakata_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RasporedPlakata_pravnoLiceId_voziloTipKod_key"
  ON "RasporedPlakata"("pravnoLiceId", "voziloTipKod");
CREATE INDEX IF NOT EXISTS "RasporedPlakata_pravnoLiceId_idx"
  ON "RasporedPlakata"("pravnoLiceId");
