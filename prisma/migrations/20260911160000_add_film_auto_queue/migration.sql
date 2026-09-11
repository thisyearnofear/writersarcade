-- AlterTable
ALTER TABLE "games" ADD COLUMN "filmAutoQueuedAt" TIMESTAMP(3);
CREATE INDEX "games_filmAutoQueuedAt_idx" ON "games"("filmAutoQueuedAt");
