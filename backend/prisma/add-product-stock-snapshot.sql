CREATE TABLE IF NOT EXISTS "ProductStockSnapshot" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductStockSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductStockSnapshot_productId_snapshotDate_key"
  ON "ProductStockSnapshot"("productId", "snapshotDate");

CREATE INDEX IF NOT EXISTS "ProductStockSnapshot_snapshotDate_idx"
  ON "ProductStockSnapshot"("snapshotDate");

DO $$
BEGIN
  ALTER TABLE "ProductStockSnapshot"
    ADD CONSTRAINT "ProductStockSnapshot_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
