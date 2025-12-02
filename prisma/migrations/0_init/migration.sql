-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('user', 'assistant', 'system');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('newsletter', 'blog', 'article', 'unknown');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "author" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_revenues" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),

    CONSTRAINT "asset_revenues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_story_registrations" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "storyIpId" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "metadataUri" TEXT NOT NULL,
    "licenseTerms" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_story_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "articleUrl" TEXT,
    "creatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chats" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_sources" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "title" TEXT,
    "author" TEXT,
    "rssUrl" TEXT,
    "webhookUrl" TEXT,
    "memecoinContract" TEXT,
    "tokenSymbol" TEXT,
    "tokenDecimals" INTEGER DEFAULT 18,
    "royaltyPercentage" INTEGER NOT NULL DEFAULT 10,
    "pricePerGame" INTEGER NOT NULL DEFAULT 100,
    "autoScrapeFreq" TEXT DEFAULT 'daily',
    "lastScrapedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "subgenre" TEXT NOT NULL,
    "primaryColor" TEXT,
    "promptName" TEXT NOT NULL DEFAULT 'GenerateGame-v2',
    "promptText" TEXT,
    "promptModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "imagePromptModel" TEXT,
    "imagePromptName" TEXT,
    "imagePromptText" TEXT,
    "imageData" BYTEA,
    "musicPromptText" TEXT,
    "musicPromptSeedImage" TEXT,
    "articleUrl" TEXT,
    "authorWallet" TEXT,
    "publicationName" TEXT,
    "publicationSummary" TEXT,
    "subscriberCount" INTEGER,
    "articlePublishedAt" TIMESTAMP(3),
    "articleContext" TEXT,
    "writerCoinId" TEXT,
    "difficulty" TEXT,
    "nftTokenId" TEXT,
    "nftTransactionHash" TEXT,
    "nftMintedAt" TIMESTAMP(3),
    "paymentId" TEXT,
    "private" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "imageUrl" TEXT,
    "authorParagraphUsername" TEXT,
    "creatorWallet" TEXT,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games_from_articles" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "generationPrompt" TEXT NOT NULL,
    "tokensSpent" INTEGER NOT NULL,
    "memecoinUsed" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "games_from_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games_from_assets" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "compositionPrompt" TEXT NOT NULL,
    "tokensSpent" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "games_from_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "stripeId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "processed_articles" (
    "id" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "title" TEXT,
    "author" TEXT,
    "content" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "estimatedReadTime" INTEGER NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "sourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processed_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "preferredModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "private" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "articles_slug_key" ON "articles"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "asset_revenues_assetId_gameId_key" ON "asset_revenues"("assetId" ASC, "gameId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "asset_story_registrations_assetId_key" ON "asset_story_registrations"("assetId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "asset_story_registrations_storyIpId_key" ON "asset_story_registrations"("storyIpId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "content_sources_url_key" ON "content_sources"("url" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "games_slug_key" ON "games"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "games_from_assets_gameId_assetId_key" ON "games_from_assets"("gameId" ASC, "assetId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "orders_stripeId_key" ON "orders"("stripeId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "payments_transactionHash_key" ON "payments"("transactionHash" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "processed_articles_sourceId_originalUrl_key" ON "processed_articles"("sourceId" ASC, "originalUrl" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionId_key" ON "sessions"("sessionId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_walletAddress_key" ON "users"("walletAddress" ASC);

-- AddForeignKey
ALTER TABLE "asset_revenues" ADD CONSTRAINT "asset_revenues_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_story_registrations" ADD CONSTRAINT "asset_story_registrations_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "chats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games_from_articles" ADD CONSTRAINT "games_from_articles_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "processed_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games_from_assets" ADD CONSTRAINT "games_from_assets_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processed_articles" ADD CONSTRAINT "processed_articles_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "content_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
