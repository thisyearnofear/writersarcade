-- CreateTable Payment
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "userId" TEXT,
    "writerCoinId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- AddColumn to Game for NFT tracking
ALTER TABLE "games" ADD COLUMN "nftTokenId" TEXT,
ADD COLUMN "nftTransactionHash" TEXT,
ADD COLUMN "nftMintedAt" TIMESTAMP(3),
ADD COLUMN "paymentId" TEXT;

-- CreateIndex for Payment
CREATE UNIQUE INDEX "payments_transactionHash_key" ON "payments"("transactionHash");

-- AddForeignKey for Game
ALTER TABLE "games" ADD CONSTRAINT "games_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey for Payment User
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
