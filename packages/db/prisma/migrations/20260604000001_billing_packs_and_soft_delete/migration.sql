ALTER TABLE "User" ADD COLUMN "continuumCredits" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lifetimeContinuums" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Continuum" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Grant lifetime access to known accounts
UPDATE "User" SET "lifetimeContinuums" = true WHERE email IN ('joshononon@gmail.com', 'amy@futurefarmers.com');
