-- AlterEnum
ALTER TYPE "Visibility" ADD VALUE 'NEARBY';

-- AlterTable
-- Coordinates are coarsened to ~2dp (~1km) before insert; see apps/web/src/lib/geo.ts.
ALTER TABLE "Continuum" ADD COLUMN "lat" DOUBLE PRECISION,
ADD COLUMN "lng" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Continuum_lat_lng_idx" ON "Continuum"("lat", "lng");
