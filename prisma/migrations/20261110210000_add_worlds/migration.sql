-- CreateTable
CREATE TABLE "worlds" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "genre" TEXT NOT NULL DEFAULT 'exploration',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sceneJson" JSONB,
    "error" TEXT,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worlds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "worlds_slug_key" ON "worlds"("slug");

-- CreateIndex
CREATE INDEX "worlds_status_createdAt_idx" ON "worlds"("status", "createdAt");
