-- AlterTable
ALTER TABLE "games" ADD COLUMN "createdVia" TEXT;
CREATE INDEX "games_createdVia_idx" ON "games"("createdVia");
