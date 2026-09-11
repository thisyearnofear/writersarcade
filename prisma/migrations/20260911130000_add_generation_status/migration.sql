-- AlterTable
ALTER TABLE "games" ADD COLUMN "generationStatus" TEXT NOT NULL DEFAULT 'ready',
ADD COLUMN "generationError" TEXT,
ADD COLUMN "generationTargetPrivate" BOOLEAN NOT NULL DEFAULT false;
