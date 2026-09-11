-- Panel-level video charge tracking for the "animate-panel" micro tier.
-- The game-level videoPaymentRef covers only the hero/montage reservation;
-- per-panel paid jobs record their own payment reference + cost for refunds.
ALTER TABLE "game_artifact_panels"
  ADD COLUMN IF NOT EXISTS "videoPaymentRef" TEXT,
  ADD COLUMN IF NOT EXISTS "videoPaymentUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "videoCost" INTEGER;
