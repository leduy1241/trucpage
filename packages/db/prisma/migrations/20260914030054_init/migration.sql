-- CreateEnum
CREATE TYPE "AIProvider" AS ENUM ('DEEPSEEK', 'OPENAI', 'ANTHROPIC');

-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('INBOX', 'COMMENT');

-- CreateEnum
CREATE TYPE "ConversationMode" AS ENUM ('AI', 'HUMAN', 'PAUSED');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('CUSTOMER', 'HUMAN', 'AI', 'SYSTEM');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('RECEIVED', 'IGNORED', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "OutboundStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'PANCAKE',
    "platformPageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "provider" "AIProvider" NOT NULL DEFAULT 'OPENAI',
    "model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "systemPrompt" TEXT NOT NULL DEFAULT '',
    "debounceSeconds" INTEGER NOT NULL DEFAULT 5,
    "responseDelaySeconds" INTEGER NOT NULL DEFAULT 2,
    "maxResponseChunks" INTEGER NOT NULL DEFAULT 3,
    "contextWindow" INTEGER NOT NULL DEFAULT 30,
    "autoReplyInbox" BOOLEAN NOT NULL DEFAULT true,
    "autoReplyComment" BOOLEAN NOT NULL DEFAULT true,
    "autoPrivateReply" BOOLEAN NOT NULL DEFAULT true,
    "humanTakeoverMinutes" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageSecret" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "encryptedPageAccessToken" TEXT NOT NULL,
    "encryptedGlobalAccessToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageSecret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageRule" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "excludedTagIds" JSONB NOT NULL DEFAULT '[]',
    "orderTagId" TEXT,
    "negativeTagId" TEXT,
    "highPriorityTagId" TEXT,

    CONSTRAINT "PageRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "price" DECIMAL(14,2) NOT NULL,
    "promo" TEXT,
    "description" TEXT,
    "usage" TEXT,
    "faq" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetGroup" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AssetGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "assetGroupId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'IMAGE',
    "pancakeContentId" TEXT,
    "pancakeAttachmentId" TEXT,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "platformConversationId" TEXT NOT NULL,
    "customerPlatformId" TEXT NOT NULL,
    "customerName" TEXT,
    "type" "ConversationType" NOT NULL,
    "mode" "ConversationMode" NOT NULL DEFAULT 'AI',
    "pauseUntil" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3) NOT NULL,
    "lastAiReplyAt" TIMESTAMP(3),
    "tags" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "platformMessageId" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "senderType" "SenderType" NOT NULL,
    "senderName" TEXT,
    "text" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "platformCustomerId" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "shipmentStatus" TEXT,
    "trackingCode" TEXT,
    "total" DECIMAL(14,2),
    "cod" DECIMAL(14,2),
    "items" JSONB NOT NULL,
    "raw" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderIntent" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "customerId" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "customerName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AI_QUALIFIED',
    "aiReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "requestId" TEXT,
    "pageId" TEXT,
    "eventType" TEXT NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'RECEIVED',
    "rawPayload" JSONB NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIExecution" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputText" TEXT NOT NULL,
    "outputText" TEXT,
    "actions" JSONB NOT NULL DEFAULT '[]',
    "latencyMs" INTEGER,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "estimatedCost" DECIMAL(14,6),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolExecution" (
    "id" TEXT NOT NULL,
    "aiExecutionId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "success" BOOLEAN NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "error" TEXT,

    CONSTRAINT "ToolExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "platformMessageId" TEXT,
    "status" "OutboundStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "OutboundMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Page_platformPageId_key" ON "Page"("platformPageId");

-- CreateIndex
CREATE UNIQUE INDEX "PageSecret_pageId_key" ON "PageSecret"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "PageRule_pageId_key" ON "PageRule"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_pageId_sku_key" ON "Product"("pageId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_pageId_platformConversationId_key" ON "Conversation"("pageId", "platformConversationId");

-- CreateIndex
CREATE UNIQUE INDEX "Message_platformMessageId_key" ON "Message"("platformMessageId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_processed_conversationId_idx" ON "Message"("processed", "conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_pageId_platformCustomerId_key" ON "Customer"("pageId", "platformCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_code_key" ON "Order"("code");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_requestId_key" ON "WebhookEvent"("requestId");

-- CreateIndex
CREATE INDEX "WebhookEvent_createdAt_idx" ON "WebhookEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "PageSecret" ADD CONSTRAINT "PageSecret_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageRule" ADD CONSTRAINT "PageRule_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetGroup" ADD CONSTRAINT "AssetGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_assetGroupId_fkey" FOREIGN KEY ("assetGroupId") REFERENCES "AssetGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderIntent" ADD CONSTRAINT "OrderIntent_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderIntent" ADD CONSTRAINT "OrderIntent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIExecution" ADD CONSTRAINT "AIExecution_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolExecution" ADD CONSTRAINT "ToolExecution_aiExecutionId_fkey" FOREIGN KEY ("aiExecutionId") REFERENCES "AIExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundMessage" ADD CONSTRAINT "OutboundMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
