-- Adds real "conversation" support to the AI Assistant, so the sidebar can
-- show separate, isolated chats (ChatGPT-style) instead of one continuous
-- list of every prompt the user has ever sent.

-- CreateTable
CREATE TABLE "Conversation" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New chat',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Conversation_userId_idx" ON "Conversation"("userId");

-- AlterTable: link each AiHistory row (one prompt/response turn) to a conversation,
-- and allow storing generated-image URLs alongside a turn.
ALTER TABLE "AiHistory" ADD COLUMN "conversationId" INTEGER;
ALTER TABLE "AiHistory" ADD COLUMN "imageUrls" TEXT;

ALTER TABLE "AiHistory" ADD CONSTRAINT "AiHistory_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "AiHistory_conversationId_idx" ON "AiHistory"("conversationId");

-- Backfill: any pre-existing history rows (from before conversations existed)
-- get grouped into one "Imported history" conversation per user, so nothing
-- is silently lost/orphaned.
INSERT INTO "Conversation" ("userId", "title", "createdAt", "updatedAt")
SELECT DISTINCT "userId", 'Imported history', now(), now()
FROM "AiHistory"
WHERE "conversationId" IS NULL;

UPDATE "AiHistory" h
SET "conversationId" = c."id"
FROM "Conversation" c
WHERE h."userId" = c."userId"
  AND c."title" = 'Imported history'
  AND h."conversationId" IS NULL;
