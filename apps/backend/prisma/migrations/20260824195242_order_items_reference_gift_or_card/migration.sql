-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_book_id_fkey";

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "card_id" TEXT,
ADD COLUMN     "gift_id" TEXT,
ALTER COLUMN "book_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_gift_id_fkey" FOREIGN KEY ("gift_id") REFERENCES "gifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Enforce that each order line references exactly one product (book, gift, or card).
-- Prisma can't express "exactly one of" in the schema, so it's a raw CHECK constraint.
-- Existing rows all have book_id set (and gift_id/card_id null), so they satisfy it.
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_exactly_one_product" CHECK (
  (("book_id" IS NOT NULL)::int + ("gift_id" IS NOT NULL)::int + ("card_id" IS NOT NULL)::int) = 1
);
