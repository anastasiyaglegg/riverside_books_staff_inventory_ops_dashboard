-- CreateTable
CREATE TABLE "book_marketing_content" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "body_copy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "source_fields" TEXT[],
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_marketing_content_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "book_marketing_content_book_id_key" ON "book_marketing_content"("book_id");

-- AddForeignKey
ALTER TABLE "book_marketing_content" ADD CONSTRAINT "book_marketing_content_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
