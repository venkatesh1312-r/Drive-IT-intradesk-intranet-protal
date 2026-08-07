-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastPasswordEmailAt" TIMESTAMP(3),
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "passwordTokenExpires" TIMESTAMP(3),
ADD COLUMN     "passwordTokenHash" TEXT;
