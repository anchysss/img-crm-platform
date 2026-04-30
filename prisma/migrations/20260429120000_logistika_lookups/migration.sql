-- =============================================================
-- Šifarnici / Lookup tabele za logistiku
-- =============================================================

-- PaketVozila (30 predefinisanih paketa za Beograd parcial)
CREATE TABLE IF NOT EXISTS "PaketVozila" (
  "id"           TEXT NOT NULL,
  "pravnoLiceId" TEXT NOT NULL,
  "kod"          TEXT NOT NULL,
  "naziv"        TEXT NOT NULL,
  "brojVozila"   INTEGER NOT NULL,
  "sastav"       TEXT NOT NULL,
  "napomena"     TEXT,
  "aktivan"      BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "PaketVozila_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PaketVozila_pravnoLiceId_kod_key" ON "PaketVozila"("pravnoLiceId", "kod");
CREATE INDEX IF NOT EXISTS "PaketVozila_pravnoLiceId_idx" ON "PaketVozila"("pravnoLiceId");

-- Folija
CREATE TABLE IF NOT EXISTS "Folija" (
  "id"           TEXT NOT NULL,
  "pravnoLiceId" TEXT NOT NULL,
  "kod"          TEXT NOT NULL,
  "naziv"        TEXT NOT NULL,
  "napomena"     TEXT,
  "aktivan"      BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Folija_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Folija_pravnoLiceId_kod_key" ON "Folija"("pravnoLiceId", "kod");
CREATE INDEX IF NOT EXISTS "Folija_pravnoLiceId_idx" ON "Folija"("pravnoLiceId");

-- Dorada
CREATE TABLE IF NOT EXISTS "Dorada" (
  "id"           TEXT NOT NULL,
  "pravnoLiceId" TEXT NOT NULL,
  "kod"          TEXT NOT NULL,
  "naziv"        TEXT NOT NULL,
  "napomena"     TEXT,
  "aktivan"      BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Dorada_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Dorada_pravnoLiceId_kod_key" ON "Dorada"("pravnoLiceId", "kod");
CREATE INDEX IF NOT EXISTS "Dorada_pravnoLiceId_idx" ON "Dorada"("pravnoLiceId");

-- Masina
CREATE TABLE IF NOT EXISTS "Masina" (
  "id"           TEXT NOT NULL,
  "pravnoLiceId" TEXT NOT NULL,
  "kod"          TEXT NOT NULL,
  "naziv"        TEXT NOT NULL,
  "napomena"     TEXT,
  "aktivan"      BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Masina_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Masina_pravnoLiceId_kod_key" ON "Masina"("pravnoLiceId", "kod");
CREATE INDEX IF NOT EXISTS "Masina_pravnoLiceId_idx" ON "Masina"("pravnoLiceId");

-- Montazer
CREATE TABLE IF NOT EXISTS "Montazer" (
  "id"           TEXT NOT NULL,
  "pravnoLiceId" TEXT NOT NULL,
  "naziv"        TEXT NOT NULL,
  "kontakt"      TEXT,
  "email"        TEXT,
  "telefon"      TEXT,
  "napomena"     TEXT,
  "aktivan"      BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Montazer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Montazer_pravnoLiceId_idx" ON "Montazer"("pravnoLiceId");

-- PutniTrosak
CREATE TABLE IF NOT EXISTS "PutniTrosak" (
  "id"           TEXT NOT NULL,
  "pravnoLiceId" TEXT NOT NULL,
  "gradOd"       TEXT NOT NULL,
  "gradDo"       TEXT NOT NULL,
  "kmJedanSmer"  INTEGER NOT NULL,
  "cenaUkupno"   DECIMAL(12,2) NOT NULL,
  "valuta"       TEXT NOT NULL,
  "napomena"     TEXT,
  "aktivan"      BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "PutniTrosak_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PutniTrosak_pravnoLiceId_gradOd_gradDo_key"
  ON "PutniTrosak"("pravnoLiceId", "gradOd", "gradDo");
CREATE INDEX IF NOT EXISTS "PutniTrosak_pravnoLiceId_idx" ON "PutniTrosak"("pravnoLiceId");
