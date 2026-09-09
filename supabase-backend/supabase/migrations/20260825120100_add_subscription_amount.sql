-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "amountCents" INTEGER,
ADD COLUMN     "currency" TEXT DEFAULT 'usd';
