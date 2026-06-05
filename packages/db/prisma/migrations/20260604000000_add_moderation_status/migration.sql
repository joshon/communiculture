-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Continuum" ADD COLUMN "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'APPROVED';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'APPROVED';
