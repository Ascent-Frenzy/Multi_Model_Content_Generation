-- CreateEnum
CREATE TYPE "Tone" AS ENUM ('professional', 'casual', 'humorous', 'inspirational');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('clip', 'image', 'audio');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('carousel', 'reel');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('draft', 'script_pending', 'script_approved', 'generating', 'ready', 'published', 'failed');

-- CreateEnum
CREATE TYPE "QueueName" AS ENUM ('render', 'social');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('carousel_render', 'reel_render', 'instagram_post');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('queued', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('instagram');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('agent_queued', 'awaiting_approval', 'approved', 'posting', 'posted', 'failed');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tone" "Tone" NOT NULL,
    "primaryColor" TEXT NOT NULL,
    "secondaryColor" TEXT NOT NULL,
    "fontFamily" TEXT NOT NULL,
    "logoS3Key" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandAsset" (
    "id" TEXT NOT NULL,
    "brandProfileId" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "s3Key" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "durationSecs" DOUBLE PRECISION,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brandProfileId" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL,
    "script" TEXT,
    "thumbnailS3Key" TEXT,
    "renderedS3Key" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarouselDetail" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "slideCount" INTEGER NOT NULL,
    "slides" JSONB NOT NULL,

    CONSTRAINT "CarouselDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReelDetail" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "voiceoverS3Key" TEXT,
    "durationSecs" DOUBLE PRECISION,
    "segments" JSONB NOT NULL,

    CONSTRAINT "ReelDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenderJob" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "queue" "QueueName" NOT NULL,
    "jobType" "JobType" NOT NULL,
    "bullMqJobId" TEXT,
    "status" "JobStatus" NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "RenderJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledPost" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "PostStatus" NOT NULL,
    "caption" TEXT,
    "agentReasoning" TEXT,
    "postedAt" TIMESTAMP(3),
    "instagramPostId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduledPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "igUserId" TEXT NOT NULL,
    "igUsername" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "scopes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CarouselDetail_contentItemId_key" ON "CarouselDetail"("contentItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ReelDetail_contentItemId_key" ON "ReelDetail"("contentItemId");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramConnection_userId_key" ON "InstagramConnection"("userId");

-- AddForeignKey
ALTER TABLE "BrandProfile" ADD CONSTRAINT "BrandProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAsset" ADD CONSTRAINT "BrandAsset_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "BrandProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "BrandProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarouselDetail" ADD CONSTRAINT "CarouselDetail_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReelDetail" ADD CONSTRAINT "ReelDetail_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenderJob" ADD CONSTRAINT "RenderJob_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramConnection" ADD CONSTRAINT "InstagramConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
