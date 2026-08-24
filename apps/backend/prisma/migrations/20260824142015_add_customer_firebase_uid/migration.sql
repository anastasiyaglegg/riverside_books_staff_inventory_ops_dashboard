-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "firebase_uid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "customers_firebase_uid_key" ON "customers"("firebase_uid");
