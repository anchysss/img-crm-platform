-- AlterTable: Opportunity dodaje potencijal + potencijalDoDatum + kategorijaId
ALTER TABLE "Opportunity"
  ADD COLUMN "potencijal" DECIMAL(12,2),
  ADD COLUMN "potencijalDoDatum" TIMESTAMP(3),
  ADD COLUMN "kategorijaId" TEXT;

-- ForeignKey: Opportunity → KategorijaDelatnosti
ALTER TABLE "Opportunity"
  ADD CONSTRAINT "Opportunity_kategorijaId_fkey"
  FOREIGN KEY ("kategorijaId") REFERENCES "KategorijaDelatnosti"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Index
CREATE INDEX "Opportunity_kategorijaId_idx" ON "Opportunity"("kategorijaId");
