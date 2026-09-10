-- CreateTable
CREATE TABLE IF NOT EXISTS "generation_locks" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resultData" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generation_locks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "generation_locks_key_key" ON "generation_locks"("key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "generation_locks_status_expiresAt_idx" ON "generation_locks"("status", "expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "generation_locks_key_status_idx" ON "generation_locks"("key", "status");
