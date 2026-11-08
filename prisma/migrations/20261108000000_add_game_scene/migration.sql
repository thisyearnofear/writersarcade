-- CreateTable
CREATE TABLE "game_scenes" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "sceneJson" JSONB,
    "error" TEXT,
    "thumbnailUrl" TEXT,
    "creditsCharged" INTEGER,
    "paymentRef" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_scenes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "game_scenes_gameId_key" ON "game_scenes"("gameId");

-- CreateIndex
CREATE INDEX "game_scenes_status_updatedAt_idx" ON "game_scenes"("status", "updatedAt");

-- AddForeignKey
ALTER TABLE "game_scenes" ADD CONSTRAINT "game_scenes_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
