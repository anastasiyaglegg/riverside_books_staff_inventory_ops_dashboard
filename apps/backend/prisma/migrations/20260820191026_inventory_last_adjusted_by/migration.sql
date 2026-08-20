-- AlterTable
ALTER TABLE "inventory" ADD COLUMN     "last_adjusted_by_id" TEXT;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_last_adjusted_by_id_fkey" FOREIGN KEY ("last_adjusted_by_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
